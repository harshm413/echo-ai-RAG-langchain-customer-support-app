import mongoose from 'mongoose';

const organizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  domain: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  subscription: {
    id: String, // Stripe subscription ID
    status: {
      type: String,
      enum: ['active', 'canceled', 'past_due', 'unpaid', 'trialing'],
      default: 'active'
    },
    planId: {
      type: String,
      enum: ['free', 'starter', 'professional', 'enterprise'],
      default: 'free'
    },
    features: {
      maxTeamMembers: {
        type: Number,
        default: 1
      },
      maxConversations: {
        type: Number,
        default: 100
      },
      aiSupport: {
        type: Boolean,
        default: false
      },
      voiceAgents: {
        type: Boolean,
        default: false
      },
      knowledgeBase: {
        type: Boolean,
        default: false
      },
      analytics: {
        type: Boolean,
        default: false
      },
      customization: {
        type: Boolean,
        default: false
      }
    },
    currentPeriodEnd: Date,
    cancelAtPeriodEnd: {
      type: Boolean,
      default: false
    },
    trialEnd: Date
  },
  billing: {
    customerId: String, // Stripe customer ID
    email: String,
    address: {
      line1: String,
      line2: String,
      city: String,
      state: String,
      postalCode: String,
      country: String
    },
    taxId: String
  },
  settings: {
    branding: {
      logo: String,
      primaryColor: {
        type: String,
        default: '#3B82F6'
      },
      secondaryColor: {
        type: String,
        default: '#1F2937'
      }
    },
    ai: {
      enabled: {
        type: Boolean,
        default: true
      },
      model: {
        type: String,
        default: 'gpt-3.5-turbo'
      },
      temperature: {
        type: Number,
        default: 0.7,
        min: 0,
        max: 2
      },
      maxTokens: {
        type: Number,
        default: 500
      },
      systemPrompt: {
        type: String,
        default: 'You are a helpful customer support assistant. Be friendly, professional, and helpful.'
      }
    },
    voice: {
      enabled: {
        type: Boolean,
        default: false
      },
      phoneNumber: String,
      greeting: {
        type: String,
        default: "Hello, you've reached our customer support. How may I assist you today?"
      },
      voiceModel: {
        type: String,
        default: 'en-US-Neural2-F'
      }
    },
    widget: {
      enabled: {
        type: Boolean,
        default: true
      },
      position: {
        type: String,
        enum: ['bottom-right', 'bottom-left', 'top-right', 'top-left'],
        default: 'bottom-right'
      },
      theme: {
        type: String,
        enum: ['light', 'dark', 'auto'],
        default: 'light'
      },
      welcomeMessage: {
        type: String,
        default: 'Hi! How can I help you today?'
      }
    },
    notifications: {
      email: {
        enabled: {
          type: Boolean,
          default: true
        },
        newConversation: {
          type: Boolean,
          default: true
        },
        escalation: {
          type: Boolean,
          default: true
        }
      },
      slack: {
        enabled: {
          type: Boolean,
          default: false
        },
        webhookUrl: String
      }
    }
  },
  apiKeys: {
    widget: {
      type: String,
      default: () => 'ek_' + Math.random().toString(36).substr(2, 32)
    },
    webhook: {
      type: String,
      default: () => 'wh_' + Math.random().toString(36).substr(2, 32)
    }
  },
  usage: {
    conversations: {
      current: {
        type: Number,
        default: 0
      },
      limit: {
        type: Number,
        default: 100
      }
    },
    teamMembers: {
      current: {
        type: Number,
        default: 1
      },
      limit: {
        type: Number,
        default: 1
      }
    },
    knowledgeBase: {
      documents: {
        type: Number,
        default: 0
      },
      storage: {
        type: Number,
        default: 0 // in MB
      }
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes
organizationSchema.index({ domain: 1 });
organizationSchema.index({ 'subscription.status': 1 });
organizationSchema.index({ 'apiKeys.widget': 1 });

// Methods
organizationSchema.methods.canAccessFeature = function(feature) {
  return this.subscription?.features?.[feature] || false;
};

organizationSchema.methods.isWithinLimit = function(metric, currentCount) {
  const limit = this.subscription?.features?.[metric] || 0;
  return limit === -1 || currentCount < limit;
};

organizationSchema.methods.incrementUsage = function(metric, amount = 1) {
  if (!this.usage[metric]) {
    this.usage[metric] = { current: 0 };
  }
  this.usage[metric].current += amount;
};

// Generate API keys before saving
organizationSchema.pre('save', function(next) {
  if (this.isNew && !this.apiKeys.widget) {
    this.apiKeys.widget = 'ek_' + Math.random().toString(36).substr(2, 32);
    this.apiKeys.webhook = 'wh_' + Math.random().toString(36).substr(2, 32);
  }
  next();
});

export default mongoose.model('Organization', organizationSchema);