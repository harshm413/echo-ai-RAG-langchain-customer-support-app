# Echo Support AI - Complete B2B SaaS Customer Support Platform

A production-ready AI-powered customer support platform built with modern developer tools. Complete implementation featuring RAG-powered AI, real-time chat, and embeddable widgets with **full markdown support**.

## 🚀 What's Included

### Core AI Features
- **RAG (Retrieval Augmented Generation)** using LangChain + ChromaDB + Groq
- **Fast AI responses** with Groq's Llama 3.1 model
- **Intelligent document processing** (PDF, DOCX, TXT, CSV, JSON, HTML, **Markdown**)
- **Markdown rendering** across all interfaces (dashboard, widget, test-chat)
- **Sentiment analysis** and auto-escalation
- **Knowledge base** with vector embeddings

### Real-time Communication
- **WebSocket-based chat** using Socket.IO
- **Real-time typing indicators** and live conversation updates
- **Multi-device synchronization**
- **Operator dashboard** with live updates
- **Formatted AI responses** with proper markdown rendering

### Multi-tenant Architecture
- **Organization-based isolation**
- **Role-based access control**
- **Custom branding** per organization
- **API key management**
- **Usage analytics**

### Embeddable Widget
- **Fully customizable chat widget**
- **Markdown-formatted responses**
- **File upload capability** (including .md files)
- **Mobile responsive design**
- **Theme customization**
- **Easy integration** (just add script tag)

## 📁 Project Structure

```
echo-support-ai/
├── server/                 # Backend API (Node.js + Express)
│   ├── models/            # Database models (MongoDB + Mongoose)
│   ├── routes/            # API routes
│   ├── services/          # Business logic
│   │   ├── aiService.js   # RAG + LLM integration
│   │   └── documentProcessor.js # File processing + Markdown
│   ├── socket/            # WebSocket handlers
│   └── uploads/           # File storage
├── client/                # Frontend Dashboard (React + Vite)
│   ├── src/               # React source code
│   └── public/widget.js   # Embeddable widget with markdown support
├── test-chat.html         # AI testing interface with markdown rendering
├── widget-demo.html       # Interactive widget demo
└── company-policies/      # Sample markdown documents
```

## 🛠 Tech Stack

### Backend
- **Node.js** + Express.js
- **MongoDB** + Mongoose
- **Socket.IO** for real-time communication
- **LangChain** for AI orchestration
- **ChromaDB** for vector storage
- **Groq** for fast LLM inference
- **markdown-it** for markdown processing
- **JWT** for authentication

### Frontend
- **React 18** + Vite
- **React Router** for navigation
- **ReactMarkdown** for markdown rendering
- **Tailwind CSS** for styling
- **Socket.IO Client** for real-time features

### AI & ML
- **Groq** - Fast LLM inference with Llama 3.1
- **ChromaDB** vector database
- **LangChain** for RAG pipeline
- **SimpleEmbeddings** (upgradeable to OpenAI/Cohere)

## 📋 Prerequisites

### Required:
1. **Node.js 18+** - [Download](https://nodejs.org/)
2. **MongoDB** - Local or [MongoDB Atlas](https://www.mongodb.com/atlas)
3. **Python 3.8+** - For ChromaDB - [Download](https://www.python.org/downloads/)
4. **Groq API Key** - [Get free key](https://console.groq.com/)

## 🚀 Quick Start

### 1. Clone and Setup
```bash
git clone <repository-url>
cd echo-support-ai
```

### 2. Install Dependencies
```bash
# Install server dependencies
cd server && npm install

# Install client dependencies
cd ../client && npm install

# Install ChromaDB
pip install chromadb
```

### 3. Configure Environment
Create `server/.env`:
```env
# Database
MONGODB_URI=mongodb://localhost:27017/echo-support
JWT_SECRET=your-super-secret-jwt-key-here

# AI - Groq (Free and Fast)
GROQ_API_KEY=your-groq-api-key-here

# ChromaDB
CHROMA_HOST=localhost
CHROMA_PORT=8000

# Server
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000
```

### 4. Start Services
```bash
# Terminal 1: Start ChromaDB
chroma run --host localhost --port 8000

# Terminal 2: Start server
cd server && npm run dev

# Terminal 3: Start client
cd client && npm run dev
```

### 5. Access Application
- **Dashboard**: http://localhost:3000
- **API Server**: http://localhost:5000
- **ChromaDB**: http://localhost:8000

## 📖 Usage Guide

### 1. Dashboard Setup
1. Open http://localhost:3000
2. Register new account and organization
3. Navigate to Knowledge Base
4. Upload documents (including .md files)
5. Test AI responses in Conversations

### 2. Knowledge Base with Markdown
- Upload markdown files (.md, .markdown)
- AI processes and indexes markdown content
- Responses include proper formatting (headers, lists, bold text)
- Test with sample files in `company-policies/` folder

### 3. Widget Integration
Add to your website:
```html
<script 
  src="http://localhost:5000/widget.js" 
  data-organization-id="your-org-id"
></script>
```

### 4. Testing AI Responses
- Use `test-chat.html` for quick AI testing
- Try questions like "What's the harassment policy?"
- Responses will be properly formatted with markdown

## 🔧 API Documentation

### Authentication
```javascript
// Register
POST /api/auth/register
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password",
  "organizationName": "Acme Corp"
}

// Login
POST /api/auth/login
{
  "email": "john@example.com",
  "password": "password"
}
```

### Knowledge Base (with Markdown Support)
```javascript
// Upload document (including Markdown)
POST /api/knowledge-base/upload
Content-Type: multipart/form-data
File: document.md

// Search knowledge base
POST /api/knowledge-base/search
{
  "query": "What are the consequences of harassment?",
  "limit": 5
}
```

### Conversations
```javascript
// Get conversations
GET /api/conversations
Headers: { Authorization: "Bearer <token>" }

// Send message
POST /api/conversations/:id/messages
{
  "content": "Hello, I need help!",
  "role": "user"
}
```

## 🔌 WebSocket Events

### Dashboard Events
```javascript
// Join conversation
socket.emit('join_conversation', conversationId);

// Send message
socket.emit('send_message', {
  conversationId,
  content: 'Hello!',
  role: 'operator'
});

// Listen for updates
socket.on('conversation_updated', (conversation) => {
  // Handle conversation update
});
```

### Widget Events
```javascript
// Authenticate widget
socket.emit('authenticate', {
  organizationId: 'org-id',
  sessionId: 'session-id',
  customerInfo: { name: 'John' }
});

// Send customer message
socket.emit('customer_message', {
  content: 'I need help!'
});

// Receive AI response (with markdown formatting)
socket.on('message_response', (data) => {
  console.log('AI Response:', data.message.content);
});
```

## 🏗 Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Client  │    │  Express Server │    │    MongoDB      │
│                 │◄──►│                 │◄──►│                 │
│  - Dashboard    │    │  - REST API     │    │  - Users        │
│  - Markdown UI  │    │  - WebSocket    │    │  - Conversations│
│                 │    │  - Auth         │    │  - Knowledge    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │   LangChain     │    │    ChromaDB     │
                       │                 │◄──►│                 │
                       │  - AI Service   │    │  - Vector Store │
                       │  - RAG Pipeline │    │  - Embeddings   │
                       │  - Markdown Proc│    │  - Similarity   │
                       └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │  External APIs  │
                       │                 │
                       │  - Groq LLM     │
                       │  - markdown-it  │
                       └─────────────────┘
```

## 🧪 Testing

### Manual Testing
1. Register account and create organization
2. Upload markdown documents from `company-policies/` folder
3. Test AI responses with markdown formatting
4. Try questions about uploaded policies
5. Verify formatting in dashboard and widget

### Widget Testing
1. Open `widget-demo.html` in browser
2. Test chat functionality with markdown responses
3. Upload markdown files
4. Test different themes and positions

### Test Chat Interface
1. Open `test-chat.html` in browser
2. Connect to AI system
3. Ask questions about uploaded documents
4. Verify markdown formatting in responses

### API Testing
```bash
# Health check
curl http://localhost:5000/health

# Test authentication
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

## 🚀 Deployment

### Production Environment
```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/echo-support
GROQ_API_KEY=your-production-groq-key
CLIENT_URL=https://yourdomain.com
```

### Build Commands
```bash
# Build client
cd client && npm run build

# Start production server
cd ../server && npm start
```

## 🔧 Configuration

### AI Model
- **Groq**: Fast inference with Llama 3.1 (Free tier available)
- Get your API key at [Groq Console](https://console.groq.com/)

### Embedding Options
- **Current**: SimpleEmbeddings (basic, for demos)
- **Upgrade**: OpenAI, Cohere, or HuggingFace embeddings
- **Professional**: Better semantic understanding and accuracy

### Markdown Support
- **Backend**: markdown-it for processing
- **Frontend**: ReactMarkdown for rendering
- **Widget**: Custom formatMessage function
- **Test Chat**: Built-in markdown formatting

## 🆘 Troubleshooting

### Common Issues

**Markdown Not Rendering**
- Check markdown-it installation: `npm list markdown-it`
- Verify ReactMarkdown in client: `npm list react-markdown`
- Check formatMessage functions in widget and test-chat

**Document Processing Stuck**
- Check ChromaDB is running on port 8000
- Verify file upload permissions
- Check server logs for processing errors

**AI Responses Not Working**
- Check Groq API key in `.env`
- Verify ChromaDB connection
- Test with `test-chat.html`

**Widget Not Loading**
- Check CORS settings
- Verify organization ID
- Check browser console for errors

### Getting Help

1. Check server logs for errors
2. Verify all services are running
3. Test API endpoints individually
4. Check database connections
5. Verify environment variables

## 🔮 Features

### Current Features ✅
- Complete RAG-powered AI system
- Real-time chat with WebSocket
- Markdown document processing and rendering
- Multi-tenant architecture
- Embeddable widget
- Knowledge base management
- User authentication and authorization

### Potential Enhancements 🚀
- Professional embeddings (OpenAI/Cohere)
- Advanced analytics dashboard
- Multi-language support
- Voice message support
- CRM integrations
- Mobile app
- Advanced workflow automation

---

**Built with ❤️ using modern developer tools and AI technologies.**

This is a complete, production-ready implementation showcasing:
- Advanced AI/ML integration with RAG
- Real-time communication systems
- Multi-tenant SaaS architecture
- Modern web development practices
- Full markdown support across all interfaces

Perfect for demonstrating full-stack development skills and AI integration capabilities.