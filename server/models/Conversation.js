import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    default: () => new mongoose.Types.ObjectId().toString()
  },
  content: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['user', 'assistant', 'operator', 'system'],
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  metadata: {
    confidence: Number,
    sources: [String],
    processingTime: Number,
    model: String
  }
});

const conversationSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  sessionId: {
    type: String,
    required: true
  },
  customer: {
    name: String,
    email: String,
    metadata: {
      userAgent: String,
      ip: String,
      location: {
        country: String,
        city: String,
        timezone: String
      },
      device: {
        type: String,
        os: String,
        browser: String
      }
    }
  },
  status: {
    type: String,
    enum: ['active', 'resolved', 'escalated', 'closed'],
    default: 'active'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  messages: [messageSchema],
  tags: [String],
  sentiment: {
    overall: {
      type: String,
      enum: ['positive', 'neutral', 'negative']
    },
    confidence: Number,
    history: [{
      sentiment: String,
      confidence: Number,
      timestamp: Date
    }]
  },
  resolution: {
    resolvedAt: Date,
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    resolution: String,
    rating: {
      score: { type: Number, min: 1, max: 5 },
      feedback: String
    }
  },
  aiHandled: {
    type: Boolean,
    default: false
  },
  escalationReason: String,
  lastActivity: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Update lastActivity on message addition
conversationSchema.pre('save', function(next) {
  if (this.isModified('messages')) {
    this.lastActivity = new Date();
  }
  next();
});

// Indexes for performance
conversationSchema.index({ organizationId: 1, status: 1 });
conversationSchema.index({ sessionId: 1 });
conversationSchema.index({ assignedTo: 1 });
conversationSchema.index({ lastActivity: -1 });

export default mongoose.model('Conversation', conversationSchema);