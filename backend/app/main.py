# backend/app/main.py

import os
import shutil
from typing import List, Tuple # Import List and Tuple for type hinting
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import pandas as pd
from sklearn.manifold import TSNE

from langchain.chains import create_history_aware_retriever, create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain_community.document_loaders import PyPDFLoader, TextLoader, UnstructuredWordDocumentLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder, PromptTemplate
from langchain_core.messages import HumanMessage, AIMessage



# --- Pydantic Models for API ---
class ChatHistoryItem(BaseModel):
    sender: str
    text: str

class QueryRequest(BaseModel):
    question: str
    model_name: str = Field(default="gpt-4o", description="The name of the model to use for the chat.")
    chat_history: List[ChatHistoryItem] = Field(default=[], description="The previous messages in the conversation.")


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
        
        # --- COMPLETELY NEW RAG CHAIN LOGIC FOR CONVERSATION ---

        # 1. Instantiate the LLM
        llm = ChatOpenAI(model=request.model_name, temperature=0)

        # 2. Create a history-aware retriever chain
        # This first chain condenses the user's question and the chat history into a single, standalone question.
        contextualize_q_system_prompt = """Given a chat history and the latest user question \
        which might reference context in the chat history, formulate a standalone question \
        which can be understood without the chat history. Do NOT answer the question, \
        just reformulate it if needed and otherwise return it as is."""
        contextualize_q_prompt = ChatPromptTemplate.from_messages([
            ("system", contextualize_q_system_prompt),
            MessagesPlaceholder("chat_history"),
            ("human", "{input}"),
        ])
        history_aware_retriever = create_history_aware_retriever(llm, retriever, contextualize_q_prompt)

        # 3. Create the main question-answering chain
        # This chain takes the original question and the retrieved documents and generates an answer.
        qa_system_prompt = """You are an assistant for question-answering tasks. \
        Use the following pieces of retrieved context to answer the question. \
        If you don't know the answer, just say that you don't know. \
        Your answer should be detailed and well-formatted. Use Markdown for lists, bullet points, and bolding to improve readability.

        {context}"""
        qa_prompt = ChatPromptTemplate.from_messages([
            ("system", qa_system_prompt),
            MessagesPlaceholder("chat_history"),
            ("human", "{input}"),
        ])
        question_answer_chain = create_stuff_documents_chain(llm, qa_prompt)

        # 4. Combine them into the final RAG chain
        rag_chain = create_retrieval_chain(history_aware_retriever, question_answer_chain)

        # 5. Format the chat history from the request into the format LangChain expects
        formatted_chat_history = []
        for msg in request.chat_history:
            if msg.sender == 'user':
                formatted_chat_history.append(HumanMessage(content=msg.text))
            elif msg.sender == 'ai':
                formatted_chat_history.append(AIMessage(content=msg.text))

        # 6. Invoke the chain with the new question and the formatted history
        result = rag_chain.invoke({
            "chat_history": formatted_chat_history,
            "input": request.question
        })

        # 7. Format sources for the response
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