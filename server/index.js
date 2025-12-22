import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import winston from 'winston';
import path from 'path';

// Import routes
import authRoutes from './routes/auth.js';
import organizationRoutes from './routes/organizations.js';
import conversationRoutes from './routes/conversations.js';
import knowledgeBaseRoutes from './routes/knowledgeBase.js';
import analyticsRoutes from './routes/analytics.js';
import widgetRoutes from './routes/widget.js';
import billingRoutes from './routes/billing.js';
import aiRoutes from './routes/ai.js';
import voiceRoutes, { setVoiceService } from './routes/voice.js';

// Import middleware
import { authenticateToken } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';

// Import socket handlers
import { setupSocketHandlers } from './socket/handlers.js';

// Import AI service
import { AIService } from './services/aiService.js';
import BillingService from './services/billingService.js';
import VoiceService from './services/voiceService.js';

dotenv.config();

// Logger setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: true,
    methods: ["GET", "POST"]
  }
});

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.'
});

// Middleware
app.use(helmet());
app.use(limiter);
app.use(cors({
  origin: true, // Allow all origins for widget testing
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use('/uploads', express.static('uploads'));

// Serve widget script
app.get('/widget.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.sendFile(path.join(process.cwd(), '../client/public/widget.js'));
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/organizations', authenticateToken, organizationRoutes);
app.use('/api/conversations', authenticateToken, conversationRoutes);
app.use('/api/knowledge-base', authenticateToken, knowledgeBaseRoutes);
app.use('/api/analytics', authenticateToken, analyticsRoutes);
app.use('/api/billing', authenticateToken, billingRoutes);
app.use('/api/ai', authenticateToken, aiRoutes);
app.use('/api/voice', voiceRoutes); // Mixed auth - some endpoints public for webhooks
app.use('/api/widget', widgetRoutes); // Public widget API

// Public endpoint for organizations (for customer portal)
app.get('/api/public/organizations', async (req, res) => {
  try {
    const { default: Organization } = await import('./models/Organization.js')
    const organizations = await Organization.find({ isActive: true })
      .select('_id name')
      .limit(10)
    res.json(organizations)
  } catch (error) {
    console.error('Error fetching organizations:', error)
    res.status(500).json({ error: 'Failed to fetch organizations' })
  }
})

// CORS preflight for health check
app.options('/health', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.sendStatus(200);
});

// Health check
app.get('/health', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling
app.use(errorHandler);

// Socket.IO setup
setupSocketHandlers(io);

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/echo-support')
  .then(() => {
    logger.info('Connected to MongoDB');
  })
  .catch((error) => {
    logger.error('MongoDB connection error:', error);
    process.exit(1);
  });

// Initialize AI Service
const aiService = new AIService();
const billingService = new BillingService();
const voiceService = new VoiceService(aiService); // Pass AI service to voice service

const PORT = process.env.PORT || 5000;

// Start server and initialize AI service
async function startServer() {
  try {
    await aiService.initialize();
    await voiceService.initialize();
    
    // Inject voice service into routes
    setVoiceService(voiceService);
    
    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      console.log(`🚀 Echo Support AI Server running on http://localhost:${PORT}`);
      console.log(`📞 Voice webhooks available at http://localhost:${PORT}/api/voice/webhook/`);
      console.log(`💳 Billing webhooks available at http://localhost:${PORT}/api/billing/webhook`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    mongoose.connection.close();
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    mongoose.connection.close();
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

export { io, aiService, billingService, voiceService };