# backend/app/main.py

import os
import shutil
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import pandas as pd
from sklearn.manifold import TSNE

# LangChain imports
from langchain_community.document_loaders import PyPDFLoader, Docx2txtLoader, TextLoader, UnstructuredWordDocumentLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_openai import ChatOpenAI
from langchain.prompts import PromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough, RunnableParallel


# --- Pydantic Models for API ---
class QueryRequest(BaseModel):
    question: str
    model_name: str = Field(default="gpt-4o", description="The name of the model to use for the chat.")


# --- Application Setup ---

# Define persistent paths
UPLOAD_DIRECTORY = "uploads"
CHROMA_DB_PATH = "chroma_db"

# Create directories if they don't exist
os.makedirs(UPLOAD_DIRECTORY, exist_ok=True)
os.makedirs(CHROMA_DB_PATH, exist_ok=True)


# --- RAG Components Initialization ---
# (This happens once when the app starts)

# 1. Embedding Model
print("Loading HuggingFace Embeddings model...")
embedding_function = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
print("Model loaded.")

# 2. ChromaDB Vector Store
vector_store = Chroma(
    persist_directory=CHROMA_DB_PATH,
    embedding_function=embedding_function
)

# 3. Retriever
# This object is responsible for fetching relevant documents from the vector store.
retriever = vector_store.as_retriever(search_kwargs={"k": 5})

# 4. Prompt Template
# This template will be used to structure the input to the LLM.
prompt_template = """
You are a helpful assistant.
Use the following pieces of retrieved context to answer the question.
Your answer should be detailed and well-formatted.
Use Markdown for lists, bullet points, and bolding to improve readability.
If you don't know the answer, just say that you don't know.

Question: {question}
Context: {context}

Answer:
"""
prompt = PromptTemplate.from_template(prompt_template)


# --- FastAPI App Initialization ---

app = FastAPI(
    title="RAG App API",
    description="API for document uploads and chat with a RAG pipeline.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- API Endpoints ---

@app.get("/", tags=["Root"])
async def read_root():
    """A simple root endpoint to confirm the API is running."""
    return {"message": "RAG API is running and ready to chat."}


@app.post("/chat/", tags=["Chat"])
async def chat_with_document(request: QueryRequest):
    """
    Accepts a question and model name, returns an answer from the RAG pipeline.
    """
    try:
        print(f"Received chat request with model: {request.model_name}")
        
        # --- DYNAMICALLY BUILD THE RAG CHAIN ---
        # 1. Instantiate the LLM with the requested model name
        llm = ChatOpenAI(model=request.model_name, temperature=0)

        # 2. Define a function to format the retrieved documents
        def format_docs(docs):
            return "\n\n".join(doc.page_content for doc in docs)

        # 3. Define the RAG chain with the dynamic LLM
        rag_chain_from_docs = (
            RunnablePassthrough.assign(context=(lambda x: format_docs(x["context"])))
            | prompt
            | llm
            | StrOutputParser()
        )
        
        # 4. Create a parallel chain that retrieves docs and generates the answer,
        #    but also passes the original documents (context) through.
        rag_chain_with_source = RunnableParallel(
            {"context": retriever, "question": RunnablePassthrough()}
        ).assign(answer=rag_chain_from_docs)

        # 5. Invoke the chain and get the result
        result = rag_chain_with_source.invoke(request.question)

        # 6. Format the sources for the frontend
        sources = []
        for doc in result["context"]:
            sources.append({
                "source": doc.metadata.get("source", "Unknown"),
                "page_content": doc.page_content
            })

        return {"answer": result["answer"], "sources": sources}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred in the chat endpoint: {e}")


@app.post("/upload/", tags=["Documents"])
async def upload_document(file: UploadFile = File(...)):
    """
    Accepts a PDF, docx, and txt files, processes it, and stores its embeddings in ChromaDB.
    """
    file_path = os.path.join(UPLOAD_DIRECTORY, file.filename)
    file_extension = os.path.splitext(file.filename)[1].lower()

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # --- Select loader based on file extension ---
        if file_extension == ".pdf":
            loader = PyPDFLoader(file_path)
        elif file_extension == ".docx":
            loader = UnstructuredWordDocumentLoader(file_path)
        elif file_extension == ".txt":
            loader = TextLoader(file_path)
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported file type: {file_extension}")

        print(f"Processing {file.filename} with {loader.__class__.__name__}...")
        documents = loader.load()

        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)
        chunks = text_splitter.split_documents(documents)
        
        if not chunks:
            raise HTTPException(status_code=500, detail="Could not extract text from the PDF.")

        print(f"Splitting document into {len(chunks)} chunks.")
        vector_store.add_documents(chunks)
        print(f"Successfully embedded and stored document chunks.")
        
        return {
            "filename": file.filename,
            "detail": f"Successfully processed and stored in vector DB.",
            "chunks_count": len(chunks)
        }

    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"An error occurred: {e}")
    finally:
        file.file.close()
        if os.path.exists(file_path):
            os.remove(file_path)

@app.get("/documents/visualize/", tags=["Documents"])
async def visualize_documents():
    """
    Fetches all embeddings, performs t-SNE dimensionality reduction,
    and returns 2D coordinates for visualization.
    """
    try:
        # 1. Fetch all data from ChromaDB
        # --- FIX 1: We need to include "documents" to get the text content ---
        existing_data = vector_store.get(include=["metadatas", "embeddings", "documents"])
        
        if not existing_data or not existing_data.get("ids"):
             raise HTTPException(status_code=404, detail="No documents found to visualize.")

        embeddings = existing_data["embeddings"]
        metadatas = existing_data["metadatas"]
        documents = existing_data["documents"] # <-- Grab the documents list

        if len(embeddings) < 3:
            raise HTTPException(status_code=400, detail="Not enough documents (need at least 3) to create a meaningful visualization.")

        print(f"Running t-SNE on {len(embeddings)} vectors...")
        tsne = TSNE(n_components=2, perplexity=min(30, len(embeddings) - 1), random_state=42)
        tsne_results = tsne.fit_transform(embeddings)
        print("t-SNE complete.")

        vis_data = []
        for i, metadata in enumerate(metadatas):
            vis_data.append({
                "x": float(tsne_results[i, 0]),
                "y": float(tsne_results[i, 1]),
                # --- FIX 2: Get the text from the 'documents' list ---
                "text": documents[i], 
                "source": metadata.get("source", "Unknown source")
            })

        return vis_data

    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred during visualization: {e}")

@app.get("/documents/list/", tags=["Documents"])
async def list_documents():
    """
    Fetches metadata for all documents and returns a list of unique source filenames.
    """
    try:
        existing_data = vector_store.get(include=["metadatas"])
        
        if not existing_data or not existing_data.get("ids"):
             return []

        # Use a set to automatically handle uniqueness of source filenames
        unique_sources = set(metadata['source'] for metadata in existing_data['metadatas'])
        
        return sorted(list(unique_sources)) # Return a sorted list

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred while listing documents: {e}")