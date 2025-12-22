import express from 'express';
import Conversation from '../models/Conversation.js';
import { aiService } from '../index.js';
import { io } from '../index.js';

const router = express.Router();

// Get all conversations for organization
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, status, assignedTo } = req.query;
    const skip = (page - 1) * limit;

    const filter = { organizationId: req.user.organizationId };
    
    if (status) filter.status = status;
    if (assignedTo) filter.assignedTo = assignedTo;

    const conversations = await Conversation.find(filter)
      .populate('assignedTo', 'name email')
      .sort({ lastActivity: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Conversation.countDocuments(filter);

    res.json({
      conversations,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get specific conversation
router.get('/:id', async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      organizationId: req.user.organizationId
    }).populate('assignedTo', 'name email');

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json(conversation);
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new conversation (usually from widget)
router.post('/', async (req, res) => {
  try {
    const { sessionId, customer, initialMessage } = req.body;

    // Check if conversation already exists for this session
    let conversation = await Conversation.findOne({
      organizationId: req.user.organizationId,
      sessionId
    });

    if (!conversation) {
      conversation = new Conversation({
        organizationId: req.user.organizationId,
        sessionId,
        customer,
        messages: []
      });
    }

    // Add initial message if provided
    if (initialMessage) {
      conversation.messages.push({
        content: initialMessage,
        role: 'user',
        timestamp: new Date()
      });

      // Generate AI response (always enabled for test conversations)
      try {
        console.log('Generating AI response for org:', req.user.organizationId, 'message:', initialMessage)
        const aiResponse = await aiService.generateResponse(
          req.user.organizationId,
          initialMessage,
          conversation.messages
        );
        console.log('AI Response received:', aiResponse)

        conversation.messages.push({
          content: aiResponse.response,
          role: 'assistant',
          timestamp: new Date(),
          metadata: {
            confidence: aiResponse.confidence,
            sources: aiResponse.sources.map(source => typeof source === 'string' ? source : JSON.stringify(source)),
            model: 'gpt-3.5-turbo'
          }
        });

        conversation.aiHandled = true;
      } catch (error) {
        console.error('AI response error:', error);
      }
    }

    await conversation.save();

    // Emit to dashboard users
    io.to(`org_${req.user.organizationId}`).emit('conversation_created', conversation);

    res.status(201).json(conversation);
  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add message to conversation
router.post('/:id/messages', async (req, res) => {
  try {
    const { content, role = 'user' } = req.body;

    const conversation = await Conversation.findOne({
      _id: req.params.id,
      organizationId: req.user.organizationId
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Add user message
    const userMessage = {
      content,
      role,
      timestamp: new Date()
    };

    if (role === 'operator') {
      userMessage.metadata = { operatorId: req.user.userId };
    }

    conversation.messages.push(userMessage);

    // Generate AI response if it's a user message (always enabled for test conversations)
    if (role === 'user') {
      try {
        console.log('Generating AI response for message:', content)
        const aiResponse = await aiService.generateResponse(
          req.user.organizationId,
          content,
          conversation.messages
        );
        console.log('AI Response generated:', aiResponse)

        conversation.messages.push({
          content: aiResponse.response,
          role: 'assistant',
          timestamp: new Date(),
          metadata: {
            confidence: aiResponse.confidence,
            sources: aiResponse.sources.map(source => typeof source === 'string' ? source : JSON.stringify(source)),
            model: 'gpt-3.5-turbo'
          }
        });

        conversation.aiHandled = true;
      } catch (error) {
        console.error('AI response error:', error);
      }
    }

    // Analyze sentiment
    try {
      const sentiment = await aiService.analyzeSentiment(content);
      if (!conversation.sentiment.history) {
        conversation.sentiment.history = [];
      }
      conversation.sentiment.history.push({
        sentiment,
        confidence: 0.8,
        timestamp: new Date()
      });
      conversation.sentiment.overall = sentiment;
    } catch (error) {
      console.error('Sentiment analysis error:', error);
    }

    await conversation.save();

    // Emit to all connected clients for this conversation
    io.to(`conversation_${conversation._id}`).emit('message_added', {
      conversationId: conversation._id,
      message: conversation.messages[conversation.messages.length - 1]
    });

    // Emit to dashboard users
    io.to(`org_${req.user.organizationId}`).emit('conversation_updated', conversation);

    res.json(conversation);
  } catch (error) {
    console.error('Add message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update conversation status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status, resolution } = req.body;

    const conversation = await Conversation.findOne({
      _id: req.params.id,
      organizationId: req.user.organizationId
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    conversation.status = status;

    if (status === 'resolved' || status === 'closed') {
      conversation.resolution = {
        resolvedAt: new Date(),
        resolvedBy: req.user.userId,
        resolution: resolution || 'Resolved by operator'
      };
    }

    if (status === 'escalated' && !conversation.assignedTo) {
      conversation.assignedTo = req.user.userId;
    }

    await conversation.save();

    // Emit update
    io.to(`org_${req.user.organizationId}`).emit('conversation_updated', conversation);

    res.json(conversation);
  } catch (error) {
    console.error('Update conversation status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Assign conversation to operator
router.patch('/:id/assign', async (req, res) => {
  try {
    const { operatorId } = req.body;

    const conversation = await Conversation.findOne({
      _id: req.params.id,
      organizationId: req.user.organizationId
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    conversation.assignedTo = operatorId;
    if (conversation.status === 'active') {
      conversation.status = 'escalated';
    }

    await conversation.save();

    // Emit update
    io.to(`org_${req.user.organizationId}`).emit('conversation_updated', conversation);

    res.json(conversation);
  } catch (error) {
    console.error('Assign conversation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add tags to conversation
router.patch('/:id/tags', async (req, res) => {
  try {
    const { tags } = req.body;

    const conversation = await Conversation.findOne({
      _id: req.params.id,
      organizationId: req.user.organizationId
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    conversation.tags = tags;
    await conversation.save();

    res.json(conversation);
  } catch (error) {
    console.error('Update tags error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Take over conversation (for operators)
router.post('/:id/takeover', async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      organizationId: req.user.organizationId
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    conversation.assignedTo = req.user.userId;
    conversation.status = 'escalated';
    conversation.aiHandled = false;

    // Add system message
    conversation.messages.push({
      content: `${req.user.name} has taken over this conversation`,
      role: 'system',
      timestamp: new Date(),
      metadata: { operatorId: req.user.userId }
    });

    await conversation.save();

    // Emit update
    io.to(`org_${req.user.organizationId}`).emit('conversation_updated', conversation);
    io.to(`conversation_${conversation._id}`).emit('operator_joined', {
      conversationId: conversation._id,
      operator: { id: req.user.userId, name: req.user.name }
    });

    res.json({ message: 'Conversation taken over successfully', conversation });
  } catch (error) {
    console.error('Take over conversation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Resolve conversation
router.post('/:id/resolve', async (req, res) => {
  try {
    const { resolution, rating } = req.body;

    const conversation = await Conversation.findOne({
      _id: req.params.id,
      organizationId: req.user.organizationId
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    conversation.status = 'resolved';
    conversation.resolution = {
      resolvedAt: new Date(),
      resolvedBy: req.user.userId,
      resolution: resolution || 'Resolved by operator'
    };

    if (rating) {
      conversation.resolution.rating = rating;
    }

    // Add system message
    conversation.messages.push({
      content: `Conversation resolved by ${req.user.name}`,
      role: 'system',
      timestamp: new Date(),
      metadata: { operatorId: req.user.userId }
    });

    await conversation.save();

    // Emit update
    io.to(`org_${req.user.organizationId}`).emit('conversation_updated', conversation);
    io.to(`conversation_${conversation._id}`).emit('conversation_resolved', {
      conversationId: conversation._id,
      resolution: conversation.resolution
    });

    res.json({ message: 'Conversation resolved successfully', conversation });
  } catch (error) {
    console.error('Resolve conversation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Escalate conversation
router.post('/:id/escalate', async (req, res) => {
  try {
    const { reason, priority } = req.body;

    const conversation = await Conversation.findOne({
      _id: req.params.id,
      organizationId: req.user.organizationId
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    conversation.status = 'escalated';
    conversation.escalationReason = reason || 'Manual escalation';
    
    if (priority) {
      conversation.priority = priority;
    }

    // Add system message
    conversation.messages.push({
      content: `Conversation escalated: ${reason || 'Manual escalation'}`,
      role: 'system',
      timestamp: new Date(),
      metadata: { operatorId: req.user.userId }
    });

    await conversation.save();

    // Emit update
    io.to(`org_${req.user.organizationId}`).emit('conversation_escalated', {
      conversationId: conversation._id,
      reason: conversation.escalationReason,
      priority: conversation.priority
    });

    res.json({ message: 'Conversation escalated successfully', conversation });
  } catch (error) {
    console.error('Escalate conversation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
