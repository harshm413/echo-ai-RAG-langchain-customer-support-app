import { ChatGroq } from '@langchain/groq';
import { Chroma } from '@langchain/community/vectorstores/chroma';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { PromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { ChromaClient } from 'chromadb';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.simple(),
  transports: [new winston.transports.Console()]
});

// Simple embeddings implementation for Groq (since Groq doesn't provide embeddings)
class SimpleEmbeddings {
  constructor() {
    this.dimension = 384; // Standard embedding dimension
  }

  async embedDocuments(texts) {
    // Simple TF-IDF like embeddings
    return texts.map(text => this.textToVector(text));
  }

  async embedQuery(text) {
    return this.textToVector(text);
  }

  textToVector(text) {
    const words = text.toLowerCase().match(/\b\w+\b/g) || [];
    const vector = new Array(this.dimension).fill(0);
    
    // Simple hash-based embedding
    words.forEach((word, index) => {
      const hash = this.simpleHash(word);
      const pos = Math.abs(hash) % this.dimension;
      vector[pos] += 1 / (index + 1); // Weight by position
    });
    
    // Normalize vector
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return magnitude > 0 ? vector.map(val => val / magnitude) : vector;
  }

  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }
}

export class AIService {
  constructor() {
    this.llm = null;
    this.embeddings = null;
    this.chromaClient = null;
    this.vectorStores = new Map(); // organizationId -> vectorStore
    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
  }

  async initialize() {
    try {
      const groqApiKey = process.env.GROQ_API_KEY;
      
      if (!groqApiKey || groqApiKey === 'your_groq_api_key_here') {
        throw new Error('Groq API key is required. Please set GROQ_API_KEY in your .env file');
      }

      // Initialize Groq LLM
      this.llm = new ChatGroq({
        apiKey: groqApiKey,
        model: 'llama-3.1-8b-instant',
        temperature: 0.3,
        maxTokens: 1000,
      });

      // Initialize simple embeddings (since Groq doesn't provide embeddings)
      this.embeddings = new SimpleEmbeddings();

      // Initialize ChromaDB client
      this.chromaClient = new ChromaClient({
        path: `http://${process.env.CHROMA_HOST || 'localhost'}:${process.env.CHROMA_PORT || 8000}`
      });

      // Load existing documents
      await this.loadExistingDocuments();

      logger.info('AI Service initialized successfully with LangChain + Groq');
    } catch (error) {
      logger.error('Failed to initialize AI Service:', error);
      throw error;
    }
  }

  async loadExistingDocuments() {
    try {
      // Import KnowledgeBase model dynamically to avoid circular imports
      const { default: KnowledgeBase } = await import('../models/KnowledgeBase.js');
      
      // Get all active documents
      const documents = await KnowledgeBase.find({ 
        isActive: true, 
        status: 'ready',
        content: { $exists: true, $ne: '' }
      });

      logger.info(`Loading ${documents.length} existing documents into vector store`);

      // Group documents by organization
      const docsByOrg = {};
      documents.forEach(doc => {
        const orgId = doc.organizationId.toString();
        if (!docsByOrg[orgId]) {
          docsByOrg[orgId] = [];
        }
        docsByOrg[orgId].push(doc);
      });

      // Load documents into vector stores
      for (const [orgId, orgDocs] of Object.entries(docsByOrg)) {
        for (const doc of orgDocs) {
          await this.addDocumentToKnowledgeBase(
            orgId,
            {
              id: doc._id,
              title: doc.title,
              content: doc.content,
              category: doc.category
            },
            {
              documentId: doc._id.toString(),
              title: doc.title,
              category: doc.category,
              type: doc.type
            }
          );
        }
        logger.info(`Loaded ${orgDocs.length} documents for organization ${orgId}`);
      }

      // Add test content for the main organization
      const testOrgId = '6949214395fa5a662e37934d';
      
      // Add FAQ content
      const testContent = `Customer Support FAQ

Q: How do I reset my password?
A: To reset your password, go to the login page and click "Forgot Password". Enter your email address and we'll send you a reset link.

Q: What are your business hours?
A: Our customer support is available Monday through Friday, 9 AM to 6 PM EST. We also offer 24/7 chat support through our website.

Q: How do I cancel my subscription?
A: You can cancel your subscription by going to Account Settings > Billing > Cancel Subscription. Your access will continue until the end of your current billing period.

Q: Do you offer refunds?
A: We offer a 30-day money-back guarantee for all new subscriptions. Contact our support team to process your refund request.

Q: How do I contact technical support?
A: For technical issues, you can reach us through:
- Live chat on our website
- Email: support@example.com
- Phone: 1-800-123-4567

Q: What payment methods do you accept?
A: We accept all major credit cards (Visa, MasterCard, American Express), PayPal, and bank transfers for enterprise customers.`;

      await this.addDocumentToKnowledgeBase(
        testOrgId,
        {
          id: 'test-faq',
          title: 'Customer Support FAQ',
          content: testContent,
          category: 'faq'
        },
        {
          documentId: 'test-faq',
          title: 'Customer Support FAQ',
          category: 'faq',
          type: 'faq'
        }
      );

      // Add security policy content
      const securityPolicyContent = `Information Technology Security Policy

Purpose and Scope
This policy establishes comprehensive security standards and procedures to protect our organization's information assets, technology infrastructure, and data from unauthorized access, disclosure, modification, or destruction.

Information Security Governance
Our security program is built on the following principles:
- Confidentiality: Information is accessible only to authorized individuals
- Integrity: Information remains accurate and unaltered
- Availability: Information and systems are accessible when needed
- Accountability: All actions are traceable to responsible parties

Access Control and Authentication
Password Requirements:
- Minimum 12 characters in length
- Combination of uppercase, lowercase, numbers, and symbols
- No dictionary words or personal information
- Unique passwords for each system
- Password change every 90 days for privileged accounts

Multi-Factor Authentication (MFA):
- Required for all remote access
- Mandatory for administrative accounts
- Enforced for cloud services and applications
- Hardware tokens for high-privilege users

Data Protection and Classification
Data Classification Levels:
- Public Information: No access restrictions
- Internal Information: Restricted to employees and authorized parties
- Confidential Information: Limited access on need-to-know basis
- Restricted Information: Highest level of protection

Incident Response
Security Incident Types:
- Unauthorized access attempts
- Malware infections
- Data breaches or leaks
- System compromises
- Denial of service attacks

Response Procedures:
- Immediate Response (0-1 hours): Incident identification and classification
- Investigation Phase (1-24 hours): Detailed forensic analysis
- Recovery Phase (24-72 hours): System restoration and hardening`;

      await this.addDocumentToKnowledgeBase(
        testOrgId,
        {
          id: 'security-policy',
          title: 'Information Technology Security Policy',
          content: securityPolicyContent,
          category: 'policy'
        },
        {
          documentId: 'security-policy',
          title: 'Information Technology Security Policy',
          category: 'policy',
          type: 'policy'
        }
      );

      logger.info('Added test FAQ content to vector store');
      logger.info('Finished loading existing documents');
    } catch (error) {
      logger.error('Failed to load existing documents:', error);
      // Don't throw error - continue with empty storage
    }
  }

  async getOrCreateVectorStore(organizationId) {
    if (this.vectorStores.has(organizationId)) {
      return this.vectorStores.get(organizationId);
    }

    try {
      const collectionName = `org_${organizationId}`;
      
      // Create or get collection
      let collection;
      try {
        collection = await this.chromaClient.getCollection({ name: collectionName });
      } catch (error) {
        collection = await this.chromaClient.createCollection({ name: collectionName });
      }

      const vectorStore = new Chroma(this.embeddings, {
        collectionName,
        url: `http://${process.env.CHROMA_HOST || 'localhost'}:${process.env.CHROMA_PORT || 8000}`,
      });

      this.vectorStores.set(organizationId, vectorStore);
      return vectorStore;
    } catch (error) {
      logger.error(`Failed to create vector store for org ${organizationId}:`, error);
      throw error;
    }
  }

  async addDocumentToKnowledgeBase(organizationId, document, metadata = {}) {
    try {
      logger.info(`Adding document to knowledge base for org ${organizationId}`);
      
      // Split document into chunks
      const chunks = await this.textSplitter.splitText(document.content);
      
      // Get or create collection
      const collectionName = `org_${organizationId}`;
      let collection;
      try {
        collection = await this.chromaClient.getCollection({ name: collectionName });
      } catch (error) {
        collection = await this.chromaClient.createCollection({ name: collectionName });
      }
      
      // Prepare documents for ChromaDB
      const documents = [];
      const embeddings = [];
      const metadatas = [];
      const ids = [];
      
      for (let i = 0; i < chunks.length; i++) {
        const chunkId = `${document.id || metadata.documentId}_chunk_${i}`;
        const chunkMetadata = {
          ...metadata,
          chunkIndex: i,
          totalChunks: chunks.length,
          documentId: document.id || metadata.documentId,
          title: document.title || metadata.title,
          category: document.category || metadata.category,
        };
        
        documents.push(chunks[i]);
        embeddings.push(await this.embeddings.embedQuery(chunks[i]));
        metadatas.push(chunkMetadata);
        ids.push(chunkId);
      }
      
      // Add to ChromaDB directly
      await collection.add({
        ids: ids,
        embeddings: embeddings,
        documents: documents,
        metadatas: metadatas
      });
      
      logger.info(`Added ${chunks.length} chunks to knowledge base for org ${organizationId}`);
      return { vectorIds: ids, chunkCount: chunks.length };
    } catch (error) {
      logger.error('Failed to add document to knowledge base:', error);
      throw error;
    }
  }

  async searchKnowledgeBase(organizationId, query, k = 5) {
    try {
      logger.info(`Searching knowledge base for org ${organizationId} with query: "${query}"`);
      
      const collectionName = `org_${organizationId}`;
      
      try {
        const collection = await this.chromaClient.getCollection({ name: collectionName });
        
        // First try semantic search with embeddings
        const queryEmbedding = await this.embeddings.embedQuery(query);
        
        const results = await collection.query({
          queryEmbeddings: [queryEmbedding],
          nResults: k
        });
        
        let docs = [];
        if (results.documents && results.documents[0]) {
          docs = results.documents[0].map((doc, index) => ({
            content: doc,
            metadata: results.metadatas?.[0]?.[index] || {},
            relevanceScore: Math.max(0, 1 - (results.distances?.[0]?.[index] || 1))
          }));
        }
        
        // If no good results, try keyword-based search
        if (docs.length === 0 || docs[0].relevanceScore < 0.3) {
          logger.info('Trying keyword-based search as fallback');
          
          // Extract keywords from query
          const keywords = query.toLowerCase().split(/\s+/).filter(word => word.length > 2);
          
          // Get all documents and search by keywords
          const allResults = await collection.get();
          
          if (allResults.documents) {
            const keywordMatches = [];
            
            allResults.documents.forEach((doc, index) => {
              const docLower = doc.toLowerCase();
              let score = 0;
              
              keywords.forEach(keyword => {
                const matches = (docLower.match(new RegExp(keyword, 'g')) || []).length;
                score += matches;
                
                // Boost score for exact phrase matches
                if (docLower.includes(query.toLowerCase())) {
                  score += 10;
                }
              });
              
              if (score > 0) {
                keywordMatches.push({
                  content: doc,
                  metadata: allResults.metadatas?.[index] || {},
                  relevanceScore: Math.min(score / keywords.length, 1),
                  keywordScore: score
                });
              }
            });
            
            // Sort by keyword score and take top results
            keywordMatches.sort((a, b) => b.keywordScore - a.keywordScore);
            docs = keywordMatches.slice(0, k);
          }
        }
        
        logger.info(`Found ${docs.length} relevant documents (${docs.length > 0 ? 'score: ' + docs[0].relevanceScore.toFixed(2) : 'no matches'})`);
        return docs;
        
      } catch (collectionError) {
        logger.warn(`Collection ${collectionName} not found or empty:`, collectionError.message);
        return [];
      }
    } catch (error) {
      logger.error('Failed to search knowledge base:', error);
      return [];
    }
  }

  async generateResponse(organizationId, userMessage, conversationHistory = [], systemPrompt = null) {
    try {
      // Search knowledge base for relevant context
      const relevantDocs = await this.searchKnowledgeBase(organizationId, userMessage, 3);
      
      // Build context from relevant documents
      const context = relevantDocs
        .map(doc => doc.content)
        .join('\n\n');

      // Create RAG prompt template
      const ragPrompt = PromptTemplate.fromTemplate(`
You are a helpful customer support assistant. Use the provided context to answer the user's question accurately and helpfully.

Context from knowledge base:
{context}

Conversation history:
{history}

User question: {question}

Instructions:
- Answer based primarily on the provided context
- If the context doesn't contain relevant information, say so politely
- Be concise but thorough
- Maintain a professional and friendly tone
- If you need to escalate to a human agent, suggest it

Answer:`);

      // Format conversation history
      const historyText = conversationHistory
        .slice(-5) // Last 5 messages for context
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n');

      // Create the RAG chain
      const ragChain = RunnableSequence.from([
        ragPrompt,
        this.llm,
        new StringOutputParser(),
      ]);

      // Generate response
      const response = await ragChain.invoke({
        context: context || 'No relevant information found in knowledge base.',
        history: historyText || 'No previous conversation.',
        question: userMessage
      });

      return {
        response: response.trim(),
        sources: relevantDocs.map(doc => doc.metadata),
        confidence: this.calculateConfidence(relevantDocs, userMessage)
      };

    } catch (error) {
      logger.error('Failed to generate AI response:', error);
      
      // Fallback response
      return {
        response: "I apologize, but I'm having trouble processing your request right now. Please try again or contact our support team for assistance.",
        sources: [],
        confidence: 0
      };
    }
  }

  calculateConfidence(relevantDocs, query) {
    if (!relevantDocs.length) return 20;
    
    // Calculate confidence based on document relevance and query match
    const avgScore = relevantDocs.reduce((sum, doc) => sum + (doc.relevanceScore || 0), 0) / relevantDocs.length;
    const queryWords = query.toLowerCase().split(/\s+/);
    
    let matchScore = 0;
    relevantDocs.forEach(doc => {
      const content = doc.content.toLowerCase();
      queryWords.forEach(word => {
        if (content.includes(word)) matchScore += 1;
      });
    });
    
    const normalizedMatchScore = Math.min(matchScore / (queryWords.length * relevantDocs.length), 1);
    const confidence = (avgScore * 0.7 + normalizedMatchScore * 0.3) * 100;
    
    return Math.min(Math.max(confidence, 30), 95); // Between 30-95%
  }

  async shouldEscalate(conversationHistory, currentMessage) {
    try {
      // Use LangChain + Groq for escalation detection
      const escalationPrompt = PromptTemplate.fromTemplate(`
Analyze this customer support conversation and determine if it should be escalated to a human agent.

Consider escalation if:
- Customer is frustrated, angry, or upset
- Issue is complex or requires human judgment
- Customer explicitly asks for human help
- AI cannot provide adequate assistance
- Customer is unsatisfied with previous responses
- Customer mentions legal action, complaints, or refunds

Recent conversation:
{conversation}

Current message: {message}

Respond with only "true" or "false":`);

      const recentMessages = conversationHistory.slice(-5);
      const conversationText = recentMessages
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n');

      const escalationChain = RunnableSequence.from([
        escalationPrompt,
        this.llm,
        new StringOutputParser(),
      ]);

      const result = await escalationChain.invoke({
        conversation: conversationText,
        message: currentMessage
      });

      return result.trim().toLowerCase() === 'true';
    } catch (error) {
      logger.error('Failed to determine escalation:', error);
      
      // Fallback to simple keyword detection
      const text = (conversationHistory.map(msg => msg.content).join(' ') + ' ' + currentMessage).toLowerCase();
      const escalationKeywords = [
        'human', 'agent', 'person', 'manager', 'supervisor', 'speak to someone',
        'frustrated', 'angry', 'upset', 'disappointed', 'terrible', 'awful',
        'cancel', 'refund', 'complaint', 'legal', 'lawyer'
      ];
      
      return escalationKeywords.some(keyword => text.includes(keyword));
    }
  }

  async analyzeSentiment(text) {
    try {
      const sentimentPrompt = PromptTemplate.fromTemplate(`
Analyze the sentiment of the following customer message and respond with only one word: "positive", "negative", or "neutral".

Consider:
- Positive: Happy, satisfied, grateful, complimentary
- Negative: Frustrated, angry, disappointed, complaining
- Neutral: Informational, neutral tone, factual questions

Message: {text}

Sentiment:`);

      const sentimentChain = RunnableSequence.from([
        sentimentPrompt,
        this.llm,
        new StringOutputParser(),
      ]);

      const result = await sentimentChain.invoke({ text });
      const sentiment = result.trim().toLowerCase();
      
      // Validate result
      if (['positive', 'negative', 'neutral'].includes(sentiment)) {
        return sentiment;
      }
      
      return 'neutral'; // Default fallback
    } catch (error) {
      logger.error('Failed to analyze sentiment:', error);
      
      // Fallback to simple keyword analysis
      const lowerText = text.toLowerCase();
      const positiveWords = ['good', 'great', 'excellent', 'happy', 'satisfied', 'love', 'amazing', 'perfect', 'wonderful', 'thanks', 'thank you'];
      const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'angry', 'frustrated', 'disappointed', 'horrible', 'worst', 'problem', 'issue'];
      
      let positiveCount = 0;
      let negativeCount = 0;
      
      positiveWords.forEach(word => {
        if (lowerText.includes(word)) positiveCount++;
      });
      
      negativeWords.forEach(word => {
        if (lowerText.includes(word)) negativeCount++;
      });
      
      if (positiveCount > negativeCount) return 'positive';
      if (negativeCount > positiveCount) return 'negative';
      return 'neutral';
    }
  }

  // Utility method to get vector store statistics
  async getKnowledgeBaseStats(organizationId) {
    try {
      const vectorStore = await this.getOrCreateVectorStore(organizationId);
      const collectionName = `org_${organizationId}`;
      
      const collection = await this.chromaClient.getCollection({ name: collectionName });
      const count = await collection.count();
      
      return {
        documentCount: count,
        collectionName: collectionName,
        status: 'active'
      };
    } catch (error) {
      logger.error('Failed to get knowledge base stats:', error);
      return {
        documentCount: 0,
        collectionName: `org_${organizationId}`,
        status: 'error'
      };
    }
  }
}

export default AIService;