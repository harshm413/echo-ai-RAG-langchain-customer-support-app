import express from 'express';
import { aiService } from '../index.js';

const router = express.Router();

// Test chat endpoint
router.post('/chat', async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Generate AI response
    const aiResponse = await aiService.generateResponse(
      req.user.organizationId,
      message,
      conversationHistory
    );

    res.json({
      response: aiResponse.response,
      confidence: aiResponse.confidence,
      sources: aiResponse.sources
    });
  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({ error: 'Failed to generate AI response' });
  }
});

export default router;