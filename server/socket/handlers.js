import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Conversation from '../models/Conversation.js';
import { aiService } from '../index.js';

export const setupSocketHandlers = (io) => {
  // Authentication middleware for socket connections
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);

      if (!user || !user.isActive) {
        return next(new Error('Invalid user'));
      }

      socket.userId = user._id;
      socket.organizationId = user.organizationId;
      socket.userRole = user.role;

      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User ${socket.userId} connected`);

    // Join organization room for dashboard updates
    socket.join(`org_${socket.organizationId}`);

    // Handle joining conversation rooms
    socket.on('join_conversation', (conversationId) => {
      socket.join(`conversation_${conversationId}`);
      console.log(`User ${socket.userId} joined conversation ${conversationId}`);
    });

    // Handle leaving conversation rooms
    socket.on('leave_conversation', (conversationId) => {
      socket.leave(`conversation_${conversationId}`);
      console.log(`User ${socket.userId} left conversation ${conversationId}`);
    });

    // Handle typing indicators
    socket.on('typing_start', (data) => {
      socket.to(`conversation_${data.conversationId}`).emit('user_typing', {
        userId: socket.userId,
        conversationId: data.conversationId,
        isTyping: true
      });
    });

    socket.on('typing_stop', (data) => {
      socket.to(`conversation_${data.conversationId}`).emit('user_typing', {
        userId: socket.userId,
        conversationId: data.conversationId,
        isTyping: false
      });
    });

    // Handle real-time message sending
    socket.on('send_message', async (data) => {
      try {
        const { conversationId, content, role = 'operator' } = data;

        // Verify user has access to this conversation
        const conversation = await Conversation.findOne({
          _id: conversationId,
          organizationId: socket.organizationId
        });

        if (!conversation) {
          socket.emit('error', { message: 'Conversation not found' });
          return;
        }

        // Add message
        const message = {
          content,
          role,
          timestamp: new Date(),
          metadata: role === 'operator' ? { operatorId: socket.userId } : {}
        };

        conversation.messages.push(message);
        await conversation.save();

        // Emit to all clients in the conversation
        io.to(`conversation_${conversationId}`).emit('message_received', {
          conversationId,
          message: conversation.messages[conversation.messages.length - 1]
        });

        // Also emit to widget namespace for customer chat
        widgetNamespace.to(`conversation_${conversationId}`).emit('operator_message', {
          conversationId,
          message: conversation.messages[conversation.messages.length - 1]
        });

        // Emit to dashboard users
        io.to(`org_${socket.organizationId}`).emit('conversation_updated', conversation);

      } catch (error) {
        console.error('Send message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle conversation status updates
    socket.on('update_conversation_status', async (data) => {
      try {
        const { conversationId, status, resolution } = data;

        const conversation = await Conversation.findOne({
          _id: conversationId,
          organizationId: socket.organizationId
        });

        if (!conversation) {
          socket.emit('error', { message: 'Conversation not found' });
          return;
        }

        conversation.status = status;

        if (status === 'resolved' || status === 'closed') {
          conversation.resolution = {
            resolvedAt: new Date(),
            resolvedBy: socket.userId,
            resolution: resolution || 'Resolved by operator'
          };
        }

        await conversation.save();

        // Emit to all organization users
        io.to(`org_${socket.organizationId}`).emit('conversation_updated', conversation);

      } catch (error) {
        console.error('Update conversation status error:', error);
        socket.emit('error', { message: 'Failed to update conversation' });
      }
    });

    // Handle assignment changes
    socket.on('assign_conversation', async (data) => {
      try {
        const { conversationId, operatorId } = data;

        const conversation = await Conversation.findOne({
          _id: conversationId,
          organizationId: socket.organizationId
        });

        if (!conversation) {
          socket.emit('error', { message: 'Conversation not found' });
          return;
        }

        conversation.assignedTo = operatorId;
        if (conversation.status === 'active') {
          conversation.status = 'escalated';
        }

        await conversation.save();

        // Emit to all organization users
        io.to(`org_${socket.organizationId}`).emit('conversation_updated', conversation);

      } catch (error) {
        console.error('Assign conversation error:', error);
        socket.emit('error', { message: 'Failed to assign conversation' });
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`User ${socket.userId} disconnected`);
    });
  });

  // Widget socket handlers (for customer-facing widget)
  const widgetNamespace = io.of('/widget');
  
  widgetNamespace.on('connection', (socket) => {
    console.log('Widget client connected');

    // Handle widget authentication (using session ID or API key)
    socket.on('authenticate', async (data) => {
      try {
        const { organizationId, sessionId, customerInfo } = data;

        // Validate organization exists and is active
        // In a real implementation, you'd validate the API key here
        
        socket.organizationId = organizationId;
        socket.sessionId = sessionId;
        socket.customerInfo = customerInfo;

        socket.emit('authenticated', { success: true });
      } catch (error) {
        socket.emit('authentication_error', { message: 'Authentication failed' });
      }
    });

    // Handle joining conversation rooms for customers
    socket.on('join_conversation_room', (conversationId) => {
      socket.join(`conversation_${conversationId}`);
      console.log(`Widget client joined conversation ${conversationId}`);
    });

    // Handle customer messages
    socket.on('customer_message', async (data) => {
      try {
        const { content } = data;

        if (!socket.organizationId || !socket.sessionId) {
          socket.emit('error', { message: 'Not authenticated' });
          return;
        }

        // Find or create conversation
        let conversation = await Conversation.findOne({
          organizationId: socket.organizationId,
          sessionId: socket.sessionId
        });

        if (!conversation) {
          conversation = new Conversation({
            organizationId: socket.organizationId,
            sessionId: socket.sessionId,
            customer: socket.customerInfo,
            messages: []
          });
        }

        // Add customer message
        conversation.messages.push({
          content,
          role: 'user',
          timestamp: new Date()
        });

        // Generate AI response if enabled
        try {
          const aiResponse = await aiService.generateResponse(
            socket.organizationId,
            content,
            conversation.messages
          );

          conversation.messages.push({
            content: aiResponse.response,
            role: 'assistant',
            timestamp: new Date(),
            metadata: {
              confidence: aiResponse.confidence,
              sources: (aiResponse.sources || []).map(source => 
                typeof source === 'string' ? source : JSON.stringify(source)
              ),
              model: 'simple-text-matching'
            }
          });

          conversation.aiHandled = true;

          // Check if should escalate
          const shouldEscalate = await aiService.shouldEscalate(
            conversation.messages,
            content
          );

          if (shouldEscalate) {
            conversation.status = 'escalated';
            conversation.escalationReason = 'AI determined escalation needed';
          }

        } catch (error) {
          console.error('AI response error:', error);
        }

        await conversation.save();

        // Send response back to widget
        const lastMessage = conversation.messages[conversation.messages.length - 1];
        socket.emit('message_response', {
          message: lastMessage,
          conversationStatus: conversation.status
        });

        // Notify dashboard users
        io.to(`org_${socket.organizationId}`).emit('conversation_updated', conversation);

      } catch (error) {
        console.error('Customer message error:', error);
        socket.emit('error', { message: 'Failed to process message' });
      }
    });

    socket.on('disconnect', () => {
      console.log('Widget client disconnected');
    });
  });
};