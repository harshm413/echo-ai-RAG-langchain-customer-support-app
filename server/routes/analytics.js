import express from 'express';
import Conversation from '../models/Conversation.js';
import KnowledgeBase from '../models/KnowledgeBase.js';

const router = express.Router();

// Get dashboard analytics
router.get('/overview', async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    
    // Get conversation stats
    const totalConversations = await Conversation.countDocuments({ organizationId });
    const activeConversations = await Conversation.countDocuments({ 
      organizationId, 
      status: 'active' 
    });
    
    // Get today's resolved conversations
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const resolvedToday = await Conversation.countDocuments({
      organizationId,
      status: 'resolved',
      'resolution.resolvedAt': { $gte: today }
    });
    
    // Calculate AI resolution rate
    const aiHandledConversations = await Conversation.countDocuments({
      organizationId,
      aiHandled: true,
      status: { $in: ['resolved', 'closed'] }
    });
    
    const totalResolvedConversations = await Conversation.countDocuments({
      organizationId,
      status: { $in: ['resolved', 'closed'] }
    });
    
    const aiResolutionRate = totalResolvedConversations > 0 
      ? Math.round((aiHandledConversations / totalResolvedConversations) * 100)
      : 0;
    
    // Calculate average customer satisfaction
    const conversationsWithRating = await Conversation.find({
      organizationId,
      'resolution.rating.score': { $exists: true }
    });
    
    const avgSatisfaction = conversationsWithRating.length > 0
      ? conversationsWithRating.reduce((sum, conv) => sum + conv.resolution.rating.score, 0) / conversationsWithRating.length
      : 0;
    
    res.json({
      totalConversations,
      activeConversations,
      resolvedToday,
      avgResponseTime: 1.2, // This would need more complex calculation
      aiResolutionRate,
      customerSatisfaction: Math.round(avgSatisfaction * 10) / 10
    });
  } catch (error) {
    console.error('Analytics overview error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get conversation analytics
router.get('/conversations', async (req, res) => {
  try {
    const { period = 'week' } = req.query;
    
    const now = new Date();
    let startDate;
    let groupBy;
    
    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        groupBy = { $dayOfYear: '$createdAt' };
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        groupBy = { $dayOfMonth: '$createdAt' };
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        groupBy = { $month: '$createdAt' };
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        groupBy = { $dayOfYear: '$createdAt' };
    }

    const conversationTrends = await Conversation.aggregate([
      {
        $match: {
          organizationId: req.user.organizationId,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: groupBy,
          total: { $sum: 1 },
          resolved: {
            $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] }
          },
          escalated: {
            $sum: { $cond: [{ $eq: ['$status', 'escalated'] }, 1, 0] }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Get status distribution
    const statusDistribution = await Conversation.aggregate([
      { $match: { organizationId: req.user.organizationId } },
      { $group: {
        _id: '$status',
        count: { $sum: 1 }
      }}
    ]);

    res.json({
      conversationTrends,
      statusDistribution: statusDistribution.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {})
    });
  } catch (error) {
    console.error('Conversation analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get performance analytics
router.get('/performance', async (req, res) => {
  try {
    // AI vs Human resolution stats
    const aiResolutions = await Conversation.countDocuments({
      organizationId: req.user.organizationId,
      aiHandled: true,
      status: 'resolved'
    });

    const humanResolutions = await Conversation.countDocuments({
      organizationId: req.user.organizationId,
      aiHandled: false,
      status: 'resolved'
    });

    // Knowledge base usage
    const kbStats = await KnowledgeBase.aggregate([
      { $match: { organizationId: req.user.organizationId } },
      { $group: {
        _id: null,
        totalDocuments: { $sum: 1 },
        totalSearches: { $sum: '$usage.searchCount' },
        avgSearches: { $avg: '$usage.searchCount' }
      }}
    ]);

    // Most used knowledge base documents
    const topDocuments = await KnowledgeBase.find({
      organizationId: req.user.organizationId
    })
    .sort({ 'usage.searchCount': -1 })
    .limit(5)
    .select('title usage.searchCount category');

    res.json({
      resolutionStats: {
        ai: aiResolutions,
        human: humanResolutions,
        total: aiResolutions + humanResolutions
      },
      knowledgeBase: {
        stats: kbStats[0] || { totalDocuments: 0, totalSearches: 0, avgSearches: 0 },
        topDocuments
      }
    });
  } catch (error) {
    console.error('Performance analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;