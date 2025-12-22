import mongoose from 'mongoose';

const knowledgeBaseSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: false, // Allow empty content initially for file uploads
    default: ''
  },
  type: {
    type: String,
    enum: ['document', 'faq', 'article', 'manual'],
    default: 'document'
  },
  category: {
    type: String,
    trim: true
  },
  tags: [String],
  metadata: {
    filename: String,
    fileType: String,
    fileSize: Number,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    processedAt: Date,
    chunkCount: Number,
    vectorIds: [String] // ChromaDB vector IDs
  },
  status: {
    type: String,
    enum: ['processing', 'ready', 'error'],
    default: 'processing'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  usage: {
    searchCount: { type: Number, default: 0 },
    lastUsed: Date
  }
}, {
  timestamps: true
});

// Indexes
knowledgeBaseSchema.index({ organizationId: 1, status: 1 });
knowledgeBaseSchema.index({ organizationId: 1, category: 1 });
knowledgeBaseSchema.index({ tags: 1 });

export default mongoose.model('KnowledgeBase', knowledgeBaseSchema);