# Echo Support AI - Development Guide

## 🎯 Project Overview

Complete B2B SaaS customer support AI platform with RAG-powered responses, real-time chat, and embeddable widgets.

### ✨ Core Features

#### 🤖 AI System
- **RAG Pipeline**: LangChain + ChromaDB + Groq LLM
- **Document Processing**: PDF, DOCX, TXT, CSV, JSON, HTML, **Markdown**
- **Semantic Search**: Vector embeddings for intelligent retrieval
- **Auto-escalation**: Sentiment analysis and escalation detection
- **Markdown Rendering**: Formatted AI responses across all interfaces

#### 💬 Real-time Communication
- **WebSocket Chat**: Socket.IO for instant messaging
- **Multi-tenant**: Organization-based isolation
- **Live Dashboard**: Real-time conversation management
- **Embeddable Widget**: Customizable chat widget for websites

#### 📊 Management System
- **Knowledge Base**: Document upload and AI training
- **Analytics**: Performance metrics and insights
- **User Management**: Role-based access control
- **Widget Configuration**: Brand customization and embed codes

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.8+ (ChromaDB)
- MongoDB
- Groq API Key

### Setup
```bash
# 1. Clone and install
git clone <repository>
cd echo-support-ai
npm run setup

# 2. Configure environment
cp server/.env.example server/.env
# Add your GROQ_API_KEY and MONGODB_URI

# 3. Start services
npm run start:all
```

### Services
- **API Server**: http://localhost:5000
- **Dashboard**: http://localhost:3000
- **ChromaDB**: http://localhost:8000

## 📁 Project Structure

```
echo-support-ai/
├── server/                 # Backend API (Node.js + Express)
│   ├── models/            # MongoDB models
│   ├── routes/            # API endpoints
│   ├── services/          # Business logic
│   │   ├── aiService.js   # RAG + LLM integration
│   │   └── documentProcessor.js # File processing + Markdown
│   ├── socket/            # WebSocket handlers
│   └── uploads/           # File storage
├── client/                # Frontend Dashboard (React + Vite)
│   ├── src/pages/         # Dashboard pages
│   └── public/widget.js   # Embeddable widget
├── test-chat.html         # AI testing interface
└── widget-demo.html      # Widget demo
```

## 🔧 Environment Configuration

### server/.env
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

## 🤖 AI System Architecture

### Document Processing Flow
1. **File Upload** → Multer handles file validation
2. **Document Processing** → Extract text from various formats
3. **Markdown Processing** → Convert MD to structured text
4. **Text Chunking** → Split into 1000-char chunks with 200-char overlap
5. **Embedding Generation** → Create vectors using SimpleEmbeddings
6. **Vector Storage** → Store in ChromaDB with metadata
7. **Status Update** → Mark document as "ready"

### Query Processing Flow
1. **User Question** → Convert to embedding vector
2. **Similarity Search** → Find relevant document chunks
3. **Context Building** → Combine top matching chunks
4. **LLM Generation** → Groq Llama 3.1 generates response
5. **Markdown Rendering** → Format response for display

### Current Embedding System
- **Type**: Custom SimpleEmbeddings (hash-based)
- **Dimensions**: 384
- **Quality**: Basic (suitable for demos)
- **Upgrade Path**: OpenAI, Cohere, or HuggingFace embeddings

## 📱 Application Features

### Dashboard (/dashboard)
- Real-time metrics and activity feed
- Conversation management with live updates
- AI performance monitoring
- System health indicators

### Conversations (/conversations)
- Live chat interface for operators
- Real-time message updates via WebSocket
- Conversation takeover from AI
- Status management (active/escalated/resolved)

### Knowledge Base (/knowledge-base)
- Document upload with drag-and-drop
- **Markdown support** (.md, .markdown files)
- Auto-processing with status tracking
- Document filtering and search

### Widget Setup (/widget-setup)
- Visual customization (colors, position)
- Embed code generation
- Preview modes (desktop/mobile)
- Configuration options

### Analytics (/analytics)
- Performance metrics and trends
- AI effectiveness tracking
- Customer satisfaction scores
- Usage statistics

## 🎯 Widget Integration

### Basic Integration
```html
<script 
  src="http://localhost:5000/widget.js" 
  data-organization-id="your-org-id"
></script>
```

### Advanced Configuration
```javascript
window.EchoWidgetConfig = {
  primaryColor: '#3B82F6',
  position: 'bottom-right',
  welcomeMessage: 'Hi! How can I help you?',
  enableVoice: false,
  enableFileUpload: true,
  showBranding: true
};
```

## 🔌 API Documentation

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

### Knowledge Base
```javascript
// Upload document (including Markdown)
POST /api/knowledge-base/upload
Content-Type: multipart/form-data
File: document.md

// Search knowledge base
POST /api/knowledge-base/search
{
  "query": "How to reset password?",
  "limit": 5
}
```

### Widget API
```javascript
// Customer message
POST /api/widget/message
{
  "organizationId": "org-id",
  "content": "I need help!"
}
```

## 🔄 WebSocket Events

### Dashboard Events
```javascript
// Join conversation
socket.emit('join_conversation', conversationId);

// Send operator message
socket.emit('send_message', {
  conversationId,
  content: 'Hello!',
  role: 'operator'
});

// Listen for updates
socket.on('conversation_updated', (data) => {
  // Handle real-time updates
});
```

### Widget Events
```javascript
// Authenticate widget
socket.emit('authenticate', {
  organizationId: 'org-id',
  sessionId: 'session-id'
});

// Send customer message
socket.emit('customer_message', {
  content: 'I need help!'
});

// Receive AI response
socket.on('message_response', (data) => {
  // Display formatted markdown response
});
```

## 🧪 Testing

### Test Chat Interface
Open `test-chat.html` in browser to test AI responses with markdown formatting.

### Widget Demo
Open `widget-demo.html` to test the embeddable widget functionality.

### Manual Testing Checklist
- [ ] Document upload (including .md files)
- [ ] AI responses with markdown formatting
- [ ] Real-time chat functionality
- [ ] Widget embedding and customization
- [ ] User authentication and organization management

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
cd server && npm start
```

## 🔧 Development Tips

### Adding New Document Types
1. Update `documentProcessor.js` with new processor method
2. Add MIME type to supported types
3. Update frontend file filters
4. Test processing and embedding generation

### Improving AI Responses
1. Upgrade to professional embeddings (OpenAI/Cohere)
2. Tune chunk size and overlap parameters
3. Optimize prompt templates
4. Add more context to knowledge base

### Widget Customization
1. Modify `widget.js` for new features
2. Update CSS styles for appearance changes
3. Add new configuration options
4. Test across different websites

## 🐛 Troubleshooting

### Common Issues
- **ChromaDB not starting**: Install Python 3.8+ and chromadb package
- **AI responses not working**: Check Groq API key and ChromaDB connection
- **Markdown not rendering**: Verify markdown-it installation and formatMessage functions
- **Widget not loading**: Check CORS settings and organization ID

### Debug Commands
```bash
# Check server logs
tail -f server/logs/app.log

# Test ChromaDB connection
curl http://localhost:8000/api/v1/heartbeat

# Verify document processing
node -e "console.log(require('./server/services/documentProcessor.js'))"
```

## 📈 Performance Optimization

### Database Optimization
- Index frequently queried fields
- Use MongoDB aggregation pipelines
- Implement proper pagination

### AI Performance
- Upgrade to professional embeddings
- Optimize chunk sizes for your content
- Cache frequent queries
- Use streaming responses for long answers

### Frontend Optimization
- Implement virtual scrolling for large conversation lists
- Use React.memo for expensive components
- Optimize bundle size with code splitting
- Add service worker for offline functionality

---

**Built with modern technologies**: Node.js, React, MongoDB, LangChain, ChromaDB, Socket.IO, and Groq AI.