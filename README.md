# Echo AI — RAG-Powered Customer Support Platform

A full-stack AI customer support platform using Retrieval-Augmented Generation (RAG) with LangChain, ChromaDB vector database, and Groq LLM. Businesses upload their knowledge base documents, and the AI agent answers customer queries grounded in that data — with real-time chat via WebSockets, sentiment analysis, escalation detection, and an embeddable widget.

## Features

- **RAG Pipeline** — Documents chunked, embedded, stored in ChromaDB; retrieved at query time for grounded AI responses
- **LangChain Integration** — Prompt templates, runnable sequences, output parsers for structured AI workflows
- **Real-time Chat** — Socket.IO for instant messaging between customers and AI agent
- **Knowledge Base Management** — Upload PDFs, CSVs, web pages; auto-processed into vector embeddings
- **Sentiment Analysis** — AI-powered detection of customer mood (positive/negative/neutral)
- **Auto-Escalation** — Detects frustrated customers and escalates to human agents
- **Embeddable Widget** — Drop a script tag on any website to add AI support chat
- **Multi-Organization** — Each business gets isolated knowledge base and conversations
- **Analytics Dashboard** — Conversation metrics, response times, satisfaction scores
- **Voice Support** — Google Cloud Speech-to-Text and Text-to-Speech integration

## Tech Stack

**Backend:**
- Node.js, Express.js
- LangChain (RAG chains, prompt templates, output parsers)
- Groq LLM (Llama 3.1)
- ChromaDB (vector database for embeddings)
- MongoDB + Mongoose (conversations, users, organizations)
- Socket.IO (real-time messaging)
- JWT authentication, Helmet, Rate limiting
- Winston (structured logging)

**Frontend:**
- React, Vite, JavaScript
- Socket.IO client
- Context API for state management
- Embeddable widget (vanilla JS)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      React Frontend                          │
│  Dashboard | Conversations | Knowledge Base | Analytics      │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP + WebSocket
┌──────────────────────▼──────────────────────────────────────┐
│                    Express Server                             │
│  Auth | Organizations | Conversations | Widget | Analytics   │
└──────┬───────────────────────┬──────────────────────────────┘
       │                       │
┌──────▼──────┐    ┌───────────▼────────────────────────────┐
│  MongoDB    │    │         AI Service (LangChain)          │
│  Users      │    │  1. Receive query                       │
│  Orgs       │    │  2. Search ChromaDB (vector similarity) │
│  Convos     │    │  3. Build RAG prompt with context       │
│  KnowledgeBase│  │  4. Call Groq LLM                       │
└─────────────┘    │  5. Return grounded response            │
                   └───────────────┬────────────────────────┘
                                   │
                   ┌───────────────▼────────────────────────┐
                   │           ChromaDB                       │
                   │  Vector embeddings of knowledge base     │
                   │  Per-organization collections            │
                   └─────────────────────────────────────────┘
```

## RAG Pipeline Flow

1. **Ingest**: Documents uploaded → split into chunks (1000 chars, 200 overlap) → embedded → stored in ChromaDB
2. **Retrieve**: User query → embedded → vector similarity search → top 3-5 relevant chunks returned
3. **Generate**: Retrieved chunks + conversation history + user query → LangChain prompt template → Groq LLM → grounded response

## Running Locally

```bash
# Start ChromaDB (vector database)
docker run -p 8000:8000 chromadb/chroma

# Start MongoDB
docker run -p 27017:27017 mongo

# Backend
cd server
npm install
cp .env.example .env  # Add GROQ_API_KEY
npm run dev

# Frontend
cd client
npm install
npm run dev
```

## Key Design Decisions

- **ChromaDB for vectors**: Lightweight, runs locally, per-organization collections for data isolation
- **Groq + Llama 3.1**: Fast inference, cost-effective for real-time chat responses
- **LangChain chains**: Structured prompt engineering with RunnableSequence for maintainable AI logic
- **Socket.IO**: Real-time bidirectional communication for instant chat experience
- **Embeddable widget**: Single script tag deployment for any website — no iframe needed
