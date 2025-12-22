import pkg from 'twilio';
const { Twilio } = pkg;
import speech from '@google-cloud/speech';
import textToSpeech from '@google-cloud/text-to-speech';
import winston from 'winston';
import { AIService } from './aiService.js';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.simple(),
  transports: [new winston.transports.Console()]
});

export class VoiceService {
  constructor(aiService = null) {
    // Initialize Twilio for phone calls (only if credentials are valid)
    if (process.env.TWILIO_ACCOUNT_SID && 
        process.env.TWILIO_AUTH_TOKEN && 
        process.env.TWILIO_ACCOUNT_SID.startsWith('AC')) {
      this.twilio = new Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    } else {
      this.twilio = null;
      console.log('Twilio not configured - voice features disabled');
    }
    
    // Initialize Google Cloud Speech-to-Text
    this.speechClient = process.env.GOOGLE_APPLICATION_CREDENTIALS ? 
      new speech.SpeechClient() : null;
    
    // Initialize Google Cloud Text-to-Speech
    this.ttsClient = process.env.GOOGLE_APPLICATION_CREDENTIALS ? 
      new textToSpeech.TextToSpeechClient() : null;
    
    // Use shared AI service instance
    this.aiService = aiService;
    
    // Voice configuration
    this.voiceConfig = {
      languageCode: 'en-US',
      ssmlGender: 'NEUTRAL',
      audioEncoding: 'MP3'
    };
    
    // Active calls tracking
    this.activeCalls = new Map();
  }

  async initialize() {
    try {
      // AI service is already initialized, just log success
      logger.info('Voice Service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Voice Service:', error);
      throw error;
    }
  }

  // Create outbound call
  async createOutboundCall(organizationId, phoneNumber, customerInfo = {}) {
    if (!this.twilio) {
      throw new Error('Twilio not configured');
    }

    try {
      const call = await this.twilio.calls.create({
        url: `${process.env.SERVER_URL}/api/voice/webhook/outbound`,
        to: phoneNumber,
        from: process.env.TWILIO_PHONE_NUMBER,
        statusCallback: `${process.env.SERVER_URL}/api/voice/status`,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
        statusCallbackMethod: 'POST'
      });

      // Store call information
      this.activeCalls.set(call.sid, {
        organizationId,
        phoneNumber,
        customerInfo,
        status: 'initiated',
        startTime: new Date(),
        conversation: []
      });

      logger.info(`Outbound call created: ${call.sid} to ${phoneNumber}`);
      return call;
    } catch (error) {
      logger.error('Failed to create outbound call:', error);
      throw error;
    }
  }

  // Handle inbound call webhook
  async handleInboundCall(organizationId, callSid, from) {
    try {
      // Store call information
      this.activeCalls.set(callSid, {
        organizationId,
        phoneNumber: from,
        customerInfo: { phone: from },
        status: 'answered',
        startTime: new Date(),
        conversation: []
      });

      // Generate TwiML response for greeting
      const greeting = await this.generateGreeting(organizationId);
      const twiml = this.createTwiMLResponse(greeting, callSid);

      logger.info(`Inbound call handled: ${callSid} from ${from}`);
      return twiml;
    } catch (error) {
      logger.error('Failed to handle inbound call:', error);
      throw error;
    }
  }

  // Generate greeting message
  async generateGreeting(organizationId) {
    try {
      const defaultGreeting = "Hello, you've reached our customer support. My name is Echo. How may I assist you today?";
      
      // You can customize this based on organization settings
      return defaultGreeting;
    } catch (error) {
      logger.error('Failed to generate greeting:', error);
      return "Hello, how can I help you today?";
    }
  }

  // Create TwiML response
  createTwiMLResponse(message, callSid, gatherInput = true) {
    const VoiceResponse = pkg.twiml?.VoiceResponse || class {
      constructor() { this.instructions = []; }
      say(text) { this.instructions.push({ action: 'say', text }); return this; }
      gather(options) { this.instructions.push({ action: 'gather', options }); return this; }
      toString() { return JSON.stringify(this.instructions); }
    };

    const twiml = new VoiceResponse();
    
    if (gatherInput) {
      const gather = twiml.gather({
        input: 'speech',
        timeout: 10,
        speechTimeout: 'auto',
        action: `/api/voice/webhook/speech/${callSid}`,
        method: 'POST'
      });
      gather.say(message);
      
      // Fallback if no input
      twiml.say("I didn't hear anything. Please try calling again.");
    } else {
      twiml.say(message);
    }

    return twiml.toString();
  }

  // Handle speech input
  async handleSpeechInput(callSid, speechResult) {
    try {
      const callData = this.activeCalls.get(callSid);
      if (!callData) {
        throw new Error('Call not found');
      }

      // Add user message to conversation
      callData.conversation.push({
        role: 'user',
        content: speechResult,
        timestamp: new Date()
      });

      // Generate AI response
      const aiResponse = await this.aiService.generateResponse(
        callData.organizationId,
        speechResult,
        callData.conversation
      );

      // Add AI response to conversation
      callData.conversation.push({
        role: 'assistant',
        content: aiResponse.response,
        timestamp: new Date(),
        metadata: aiResponse
      });

      // Check if should escalate to human
      const shouldEscalate = await this.aiService.shouldEscalate(
        callData.conversation,
        speechResult
      );

      if (shouldEscalate) {
        const escalationMessage = "Let me connect you with one of our human agents who can better assist you. Please hold on.";
        return this.createTwiMLResponse(escalationMessage, callSid, false);
      }

      // Continue conversation
      return this.createTwiMLResponse(aiResponse.response, callSid, true);
    } catch (error) {
      logger.error('Failed to handle speech input:', error);
      const errorMessage = "I'm sorry, I'm having trouble understanding. Let me connect you with a human agent.";
      return this.createTwiMLResponse(errorMessage, callSid, false);
    }
  }

  // Convert text to speech (for advanced use cases)
  async textToSpeech(text, voiceConfig = {}) {
    if (!this.ttsClient) {
      logger.warn('Google Cloud TTS not configured');
      return null;
    }

    try {
      const request = {
        input: { text },
        voice: {
          languageCode: voiceConfig.languageCode || this.voiceConfig.languageCode,
          ssmlGender: voiceConfig.ssmlGender || this.voiceConfig.ssmlGender
        },
        audioConfig: {
          audioEncoding: voiceConfig.audioEncoding || this.voiceConfig.audioEncoding
        }
      };

      const [response] = await this.ttsClient.synthesizeSpeech(request);
      return response.audioContent;
    } catch (error) {
      logger.error('Text-to-speech conversion failed:', error);
      throw error;
    }
  }

  // Convert speech to text (for advanced use cases)
  async speechToText(audioBuffer, config = {}) {
    if (!this.speechClient) {
      logger.warn('Google Cloud Speech not configured');
      return null;
    }

    try {
      const request = {
        audio: { content: audioBuffer.toString('base64') },
        config: {
          encoding: config.encoding || 'WEBM_OPUS',
          sampleRateHertz: config.sampleRateHertz || 16000,
          languageCode: config.languageCode || 'en-US'
        }
      };

      const [response] = await this.speechClient.recognize(request);
      const transcription = response.results
        .map(result => result.alternatives[0].transcript)
        .join('\n');

      return transcription;
    } catch (error) {
      logger.error('Speech-to-text conversion failed:', error);
      throw error;
    }
  }

  // Handle call status updates
  async handleCallStatus(callSid, status) {
    try {
      const callData = this.activeCalls.get(callSid);
      if (callData) {
        callData.status = status;
        
        if (status === 'completed' || status === 'failed') {
          callData.endTime = new Date();
          callData.duration = callData.endTime - callData.startTime;
          
          // Save call record to database
          await this.saveCallRecord(callSid, callData);
          
          // Remove from active calls
          this.activeCalls.delete(callSid);
        }
      }

      logger.info(`Call ${callSid} status updated to: ${status}`);
    } catch (error) {
      logger.error('Failed to handle call status:', error);
    }
  }

  // Save call record to database
  async saveCallRecord(callSid, callData) {
    try {
      // Import Conversation model dynamically to avoid circular imports
      const { default: Conversation } = await import('../models/Conversation.js');
      
      const conversation = new Conversation({
        organizationId: callData.organizationId,
        sessionId: `voice_${callSid}`,
        customer: {
          ...callData.customerInfo,
          phone: callData.phoneNumber
        },
        messages: callData.conversation.map(msg => ({
          content: msg.content,
          role: msg.role,
          timestamp: msg.timestamp,
          metadata: {
            ...msg.metadata,
            callSid,
            channel: 'voice'
          }
        })),
        status: callData.status === 'completed' ? 'resolved' : 'closed',
        metadata: {
          callSid,
          duration: callData.duration,
          channel: 'voice'
        }
      });

      await conversation.save();
      logger.info(`Saved call record for ${callSid}`);
    } catch (error) {
      logger.error('Failed to save call record:', error);
    }
  }

  // Get active calls for organization
  getActiveCalls(organizationId) {
    const orgCalls = [];
    for (const [callSid, callData] of this.activeCalls.entries()) {
      if (callData.organizationId === organizationId) {
        orgCalls.push({
          callSid,
          ...callData
        });
      }
    }
    return orgCalls;
  }

  // End call
  async endCall(callSid) {
    if (!this.twilio) {
      throw new Error('Twilio not configured');
    }

    try {
      await this.twilio.calls(callSid).update({ status: 'completed' });
      logger.info(`Call ${callSid} ended`);
    } catch (error) {
      logger.error('Failed to end call:', error);
      throw error;
    }
  }

  // Transfer call to human agent
  async transferToHuman(callSid, agentPhoneNumber) {
    if (!this.twilio) {
      throw new Error('Twilio not configured');
    }

    try {
      // Create conference for call transfer
      const conference = await this.twilio.conferences.create({
        friendlyName: `transfer_${callSid}`
      });

      // Add customer to conference
      await this.twilio.calls(callSid).update({
        url: `${process.env.SERVER_URL}/api/voice/conference/${conference.sid}`,
        method: 'POST'
      });

      // Call agent and add to conference
      await this.twilio.calls.create({
        url: `${process.env.SERVER_URL}/api/voice/conference/${conference.sid}`,
        to: agentPhoneNumber,
        from: process.env.TWILIO_PHONE_NUMBER
      });

      logger.info(`Call ${callSid} transferred to agent ${agentPhoneNumber}`);
      return conference;
    } catch (error) {
      logger.error('Failed to transfer call:', error);
      throw error;
    }
  }
}

export default VoiceService;