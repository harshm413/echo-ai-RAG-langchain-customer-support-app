import express from 'express';
import Conversation from '../models/Conversation.js';
import Organization from '../models/Organization.js';
import { aiService } from '../index.js';
import { io } from '../index.js';
import winston from 'winston';

const router = express.Router();

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.simple(),
  transports: [new winston.transports.Console()]
});

// Start a new conversation from widget
router.post('/start', async (req, res) => {
  try {
    const { organizationId, sessionId, customer, metadata } = req.body;

    // Validate required fields
    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID is required' });
    }

    // Validate organization
    const organization = await Organization.findById(organizationId);
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Create new conversation
    const conversation = new Conversation({
      organizationId,
      sessionId: sessionId || `customer-${Date.now()}`,
      customer: {
        name: customer?.name || 'Anonymous',
        email: customer?.email,
        metadata: {
          userAgent: metadata?.userAgent,
          ip: req.ip,
          url: metadata?.url,
          referrer: metadata?.referrer
        }
      },
      status: 'active',
      messages: [],
      aiHandled: true
    });

    await conversation.save();

    // Join socket room for real-time updates
    if (req.io) {
      req.io.join(`conversation_${conversation._id}`);
    }

    logger.info(`New widget conversation started: ${conversation._id}`);

    res.json({
      conversationId: conversation._id,
      sessionId: conversation.sessionId,
      status: 'started'
    });

  } catch (error) {
    logger.error('Error starting widget conversation:', error);
    res.status(500).json({ error: 'Failed to start conversation' });
  }
});

// Send message from widget
router.post('/message', async (req, res) => {
  try {
    const { organizationId, sessionId, conversationId, message } = req.body;

    // Validate required fields
    if (!organizationId || !message?.content) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Find conversation
    let conversation;
    if (conversationId) {
      conversation = await Conversation.findById(conversationId);
    } else if (sessionId) {
      conversation = await Conversation.findOne({ 
        organizationId, 
        sessionId,
        status: { $in: ['active', 'escalated'] }
      });
    }

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found. Please start a new conversation.' });
    }

    // Add user message
    const userMessage = {
      id: new Date().getTime().toString(),
      content: message.content,
      role: 'user',
      timestamp: new Date()
    };

    conversation.messages.push(userMessage);
    await conversation.save();

    // Emit message to operators
    io.to(`org_${organizationId}`).emit('new_message', {
      conversationId: conversation._id,
      message: userMessage
    });

    // Check if conversation should be escalated
    const shouldEscalate = await aiService.shouldEscalate(
      conversation.messages,
      message.content
    );

    if (shouldEscalate && conversation.status !== 'escalated') {
      conversation.status = 'escalated';
      conversation.escalationReason = 'AI determined escalation needed';
      await conversation.save();

      // Notify operators of escalation
      io.to(`org_${organizationId}`).emit('conversation_escalated', {
        conversationId: conversation._id,
        reason: conversation.escalationReason
      });

      return res.json({
        conversationId: conversation._id,
        escalated: true,
        message: 'Your conversation has been escalated to a human agent.'
      });
    }

    // Generate AI response if not escalated
    if (conversation.status === 'active') {
      try {
        const aiResponse = await aiService.generateResponse(
          organizationId,
          message.content,
          conversation.messages.slice(-10) // Last 10 messages for context
        );

        const assistantMessage = {
          id: new Date().getTime().toString(),
          content: aiResponse.response,
          role: 'assistant',
          timestamp: new Date(),
          metadata: {
            confidence: aiResponse.confidence,
            sources: aiResponse.sources.map(source => typeof source === 'string' ? source : JSON.stringify(source)),
            model: 'llama-3.1-8b-instant'
          }
        };

        conversation.messages.push(assistantMessage);
        
        // Analyze sentiment
        const sentiment = await aiService.analyzeSentiment(message.content);
        if (sentiment) {
          if (!conversation.sentiment.history) {
            conversation.sentiment.history = [];
          }
          conversation.sentiment.history.push({
            sentiment,
            confidence: 0.8,
            timestamp: new Date()
          });
          conversation.sentiment.overall = sentiment;
        }

        await conversation.save();

        // Emit AI response to operators
        io.to(`org_${organizationId}`).emit('new_message', {
          conversationId: conversation._id,
          message: assistantMessage
        });

        res.json({
          conversationId: conversation._id,
          response: {
            content: aiResponse.response,
            metadata: assistantMessage.metadata
          }
        });

      } catch (aiError) {
        logger.error('AI response generation failed:', aiError);
        
        // Fallback response
        const fallbackMessage = {
          id: new Date().getTime().toString(),
          content: "I'm sorry, I'm having trouble processing your request right now. A human agent will be with you shortly.",
          role: 'assistant',
          timestamp: new Date(),
          metadata: {
            confidence: 0,
            error: true
          }
        };

        conversation.messages.push(fallbackMessage);
        conversation.status = 'escalated';
        conversation.escalationReason = 'AI service unavailable';
        await conversation.save();

        res.json({
          conversationId: conversation._id,
          response: {
            content: fallbackMessage.content,
            metadata: fallbackMessage.metadata
          },
          escalated: true
        });
      }
    } else {
      // Conversation is escalated, just acknowledge the message
      res.json({
        conversationId: conversation._id,
        escalated: true,
        message: 'A human agent will respond to you shortly.'
      });
    }

  } catch (error) {
    logger.error('Error processing widget message:', error);
    res.status(500).json({ error: 'Failed to process message' });
  }
});

// Get conversation history for widget
router.get('/conversation/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { organizationId } = req.query;

    const conversation = await Conversation.findOne({
      organizationId,
      sessionId,
      status: { $in: ['active', 'escalated'] }
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json({
      conversationId: conversation._id,
      messages: conversation.messages,
      status: conversation.status,
      customer: conversation.customer
    });

  } catch (error) {
    logger.error('Error fetching widget conversation:', error);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

// Simple endpoint to get organizations for customer portal
router.get('/organizations', async (req, res) => {
  try {
    const organizations = await Organization.find({ isActive: true })
      .select('_id name')
      .limit(10)
    res.json(organizations)
  } catch (error) {
    console.error('Error fetching organizations:', error)
    res.status(500).json({ error: 'Failed to fetch organizations' })
  }
})

// Widget configuration endpoint
router.get('/config/:organizationId', async (req, res) => {
  try {
    const { organizationId } = req.params;

    const organization = await Organization.findById(organizationId);
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const config = {
      organizationId: organization._id,
      name: organization.name,
      primaryColor: organization.settings?.widget?.primaryColor || '#3B82F6',
      welcomeMessage: organization.settings?.widget?.welcomeMessage || 'Hi! How can I help you today?',
      position: organization.settings?.widget?.position || 'bottom-right',
      showAvatar: organization.settings?.widget?.showAvatar !== false,
      collectEmail: organization.settings?.widget?.collectEmail !== false,
      collectName: organization.settings?.widget?.collectName !== false,
      enableVoice: organization.settings?.widget?.enableVoice || false,
      workingHours: organization.settings?.widget?.workingHours || {
        enabled: false,
        timezone: 'UTC',
        schedule: {}
      }
    };

    res.json({ config });

  } catch (error) {
    logger.error('Error fetching widget config:', error);
    res.status(500).json({ error: 'Failed to fetch widget configuration' });
  }
});

import rateLimit from 'express-rate-limit';

const widgetLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // limit each IP to 30 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all widget routes
router.use(widgetLimiter);

export default router;