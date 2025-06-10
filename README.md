# My Personal RAG AI Application

This is a full-stack application that provides a private, Retrieval-Augmented Generation (RAG) environment. Users can upload personal PDF documents, which are then processed and stored in a vector database. The application provides a chat interface to ask questions about the uploaded documents, leveraging multiple Large Language Models. It also includes a data visualization feature to see how document chunks are conceptually related.

## Features

- **Multi-Page Web Interface:** A clean, modern UI built with React, featuring separate pages for document management and chat.
- **Document Upload:** Users can upload PDF documents directly through the web interface.
- **RAG Pipeline:** The backend automatically processes uploaded documents, splits them into chunks, generates vector embeddings, and stores them in a persistent ChromaDB database.
- **Multi-Provider LLM Chat:** Chat with your documents using a selection of models from different providers like OpenAI, Google, and Anthropic.
- **Document Visualization:** An interactive 2D scatter plot (using t-SNE) to visualize the semantic relationships between all document chunks in the vector store.
- **Professional Tooling:** The project is set up with a clear monorepo structure, version-controlled with Git, and uses professional development practices for both frontend and backend.

## Tech Stack

| Component | Technology |
| :--- | :--- |
| **Backend** | Python, FastAPI |
| **Frontend** | React, Tailwind CSS |
| **AI / RAG** | LangChain |
| **Vector Database**| ChromaDB |
| **Embeddings** | Hugging Face Sentence-Transformers |
| **LLM Integrations**| OpenAI, Google Gemini, Anthropic Claude |
| **Data Visualization**| Scikit-learn (t-SNE), Plotly.js |
| **API Client** | Axios |
| **Routing** | React Router |


## Setup and Installation

### Prerequisites
- Git
- Python 3.10+
- Node.js and npm
- An active terminal or command line

### 1. Clone the Repository
```bash
git clone <your-github-repo-url>
cd rag-ai-app

### 2. Backend Setup
Navigate to the backend directory and set up the Python environment.

```bash
# Navigate to the backend directory
cd backend

# Create and activate a Python virtual environment
python3 -m venv venv
source venv/bin/activate

# Install the required Python packages
pip install -r requirements.txt

# Set up your API Keys
# You will need to get keys from OpenAI, Google, and Anthropic
# and set them as environment variables in your terminal.
export OPENAI_API_KEY="sk-..."
export GOOGLE_API_KEY="..."
export ANTHROPIC_API_KEY="sk-ant-..."

### 3. Frontend Setup
Navigate to the frontend directory from the root and install the Node packages.

```bash
# From the root directory, navigate to the frontend directory
cd frontend

# Install the required Node packages
npm install

### Running the Application
You will need to run the backend and frontend servers in two separate terminal windows.

#### Start the Backend Server
# In a terminal at the /backend directory (with venv active)
# Make sure your API keys are set in this terminal session
# Set TOKENIZERS_PARALLELISM to avoid warnings
export TOKENIZERS_PARALLELISM=false; uvicorn app.main:app --reload

The backend will be running on http://localhost:8000.

#### Start the Frontend Server

# In a second terminal at the /frontend directory
npm start