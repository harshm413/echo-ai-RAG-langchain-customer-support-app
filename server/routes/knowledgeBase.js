import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import KnowledgeBase from '../models/KnowledgeBase.js';
import DocumentProcessor from '../services/documentProcessor.js';
import { aiService } from '../index.js';

const router = express.Router();
const documentProcessor = new DocumentProcessor();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(), // Store in memory first
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = documentProcessor.getSupportedTypes();
    
    // Handle markdown files that might have different MIME types
    const isMarkdown = file.originalname.toLowerCase().endsWith('.md') || 
                      file.originalname.toLowerCase().endsWith('.markdown');
    
    if (allowedTypes.includes(file.mimetype) || isMarkdown) {
      // Override MIME type for markdown files
      if (isMarkdown) {
        file.mimetype = 'text/markdown';
      }
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  }
});

// Get all knowledge base documents
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, category, type, search } = req.query;
    const skip = (page - 1) * limit;

    const filter = { 
      organizationId: req.user.organizationId,
      isActive: true 
    };
    
    if (category) filter.category = category;
    if (type) filter.type = type;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const documents = await KnowledgeBase.find(filter)
      .populate('metadata.uploadedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-content'); // Exclude content for list view

    const total = await KnowledgeBase.countDocuments(filter);

    res.json({
      documents,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get knowledge base error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get specific document
router.get('/:id', async (req, res) => {
  try {
    const document = await KnowledgeBase.findOne({
      _id: req.params.id,
      organizationId: req.user.organizationId
    }).populate('metadata.uploadedBy', 'name email');

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Update usage statistics
    document.usage.searchCount += 1;
    document.usage.lastUsed = new Date();
    await document.save();

    res.json(document);
  } catch (error) {
    console.error('Get document error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload and process document
router.post('/upload', upload.single('document'), async (req, res) => {
  try {
    console.log('Upload request received');
    console.log('User:', req.user);
    console.log('OrganizationId type:', typeof req.user?.organizationId);
    console.log('OrganizationId value:', req.user?.organizationId);
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { title, category, tags } = req.body;

    // Create upload directory and save file
    const orgId = req.user.organizationId.toString();
    const uploadPath = path.join(process.cwd(), 'uploads', orgId);
    await fs.mkdir(uploadPath, { recursive: true });
    
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = 'document-' + uniqueSuffix + path.extname(req.file.originalname);
    const filePath = path.join(uploadPath, filename);
    
    // Write file to disk
    await fs.writeFile(filePath, req.file.buffer);

    // Create knowledge base entry
    const kbDocument = new KnowledgeBase({
      organizationId: req.user.organizationId,
      title: title || req.file.originalname,
      content: '', // Will be filled after processing
      category: category || 'general',
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      metadata: {
        filename: req.file.originalname,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        uploadedBy: req.user.userId
      },
      status: 'processing'
    });

    await kbDocument.save();

    // Process document asynchronously
    processDocumentAsync(filePath, req.file.mimetype, kbDocument._id, req.user.organizationId);

    res.status(201).json({
      message: 'Document uploaded successfully and is being processed',
      documentId: kbDocument._id,
      status: 'processing'
    });
  } catch (error) {
    console.error('Upload document error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Process document asynchronously
async function processDocumentAsync(filePath, mimeType, documentId, organizationId) {
  try {
    // Process the file
    const processed = await documentProcessor.processFile(filePath, mimeType);
    
    // Update document with processed content
    const document = await KnowledgeBase.findById(documentId);
    document.content = processed.content;
    document.metadata = { ...document.metadata, ...processed.metadata };
    document.status = 'ready';

    // Add to vector database
    const vectorResult = await aiService.addDocumentToKnowledgeBase(
      organizationId,
      {
        id: documentId,
        title: document.title,
        content: processed.content,
        category: document.category
      },
      {
        documentId: documentId.toString(),
        title: document.title,
        category: document.category,
        type: document.type
      }
    );

    document.metadata.vectorIds = vectorResult.vectorIds;
    document.metadata.chunkCount = vectorResult.chunkCount;
    document.metadata.processedAt = new Date();

    await document.save();

    // Clean up uploaded file
    await fs.unlink(filePath);

    console.log(`Document ${documentId} processed successfully`);
  } catch (error) {
    console.error(`Failed to process document ${documentId}:`, error);
    
    // Update document status to error
    try {
      await KnowledgeBase.findByIdAndUpdate(documentId, { 
        status: 'error',
        'metadata.error': error.message 
      });
    } catch (updateError) {
      console.error('Failed to update document status:', updateError);
    }
  }
}

// Create document manually (text input)
router.post('/', async (req, res) => {
  try {
    const { title, content, category, type, tags } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    const document = new KnowledgeBase({
      organizationId: req.user.organizationId,
      title,
      content,
      category: category || 'general',
      type: type || 'article',
      tags: tags || [],
      metadata: {
        uploadedBy: req.user.userId
      },
      status: 'processing'
    });

    await document.save();

    // Add to vector database
    try {
      const vectorResult = await aiService.addDocumentToKnowledgeBase(
        req.user.organizationId,
        {
          id: document._id,
          title: document.title,
          content: document.content,
          category: document.category
        },
        {
          documentId: document._id.toString(),
          title: document.title,
          category: document.category,
          type: document.type
        }
      );

      document.metadata.vectorIds = vectorResult.vectorIds;
      document.metadata.chunkCount = vectorResult.chunkCount;
      document.metadata.processedAt = new Date();
      document.status = 'ready';

      await document.save();
    } catch (error) {
      console.error('Failed to add document to vector store:', error);
      document.status = 'error';
      document.metadata.error = error.message;
      await document.save();
    }

    res.status(201).json(document);
  } catch (error) {
    console.error('Create document error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update document
router.put('/:id', async (req, res) => {
  try {
    const { title, content, category, type, tags } = req.body;

    const document = await KnowledgeBase.findOne({
      _id: req.params.id,
      organizationId: req.user.organizationId
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Update document
    if (title) document.title = title;
    if (content) document.content = content;
    if (category) document.category = category;
    if (type) document.type = type;
    if (tags) document.tags = tags;

    // If content changed, update vector store
    if (content && content !== document.content) {
      try {
        // Remove old vectors
        if (document.metadata.vectorIds) {
          await aiService.removeDocumentFromKnowledgeBase(
            req.user.organizationId,
            document.metadata.vectorIds
          );
        }

        // Add new vectors
        const vectorResult = await aiService.addDocumentToKnowledgeBase(
          req.user.organizationId,
          {
            id: document._id,
            title: document.title,
            content: content,
            category: document.category
          },
          {
            documentId: document._id.toString(),
            title: document.title,
            category: document.category,
            type: document.type
          }
        );

        document.metadata.vectorIds = vectorResult.vectorIds;
        document.metadata.chunkCount = vectorResult.chunkCount;
        document.metadata.processedAt = new Date();
      } catch (error) {
        console.error('Failed to update vectors:', error);
      }
    }

    await document.save();

    res.json(document);
  } catch (error) {
    console.error('Update document error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete document
router.delete('/:id', async (req, res) => {
  try {
    const document = await KnowledgeBase.findOne({
      _id: req.params.id,
      organizationId: req.user.organizationId
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Remove from vector store
    if (document.metadata.vectorIds) {
      try {
        await aiService.removeDocumentFromKnowledgeBase(
          req.user.organizationId,
          document.metadata.vectorIds
        );
      } catch (error) {
        console.error('Failed to remove vectors:', error);
      }
    }

    // Soft delete
    document.isActive = false;
    await document.save();

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Search knowledge base
router.post('/search', async (req, res) => {
  try {
    const { query, limit = 5 } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const results = await aiService.searchKnowledgeBase(
      req.user.organizationId,
      query,
      limit
    );

    res.json({ results });
  } catch (error) {
    console.error('Search knowledge base error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;