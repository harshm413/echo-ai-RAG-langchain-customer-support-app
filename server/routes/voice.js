import express from 'express';
import pkg from 'twilio';
import Organization from '../models/Organization.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Voice service will be injected by the main server
let voiceService = null;

// Function to set the voice service instance
export function setVoiceService(service) {
  voiceService = service;
}

// Create outbound call (authenticated)
router.post('/call', authenticateToken, async (req, res) => {
  try {
    if (!voiceService) {
      return res.status(503).json({ error: 'Voice service not available' });
    }
    
    const { phoneNumber, customerInfo } = req.body;
    const organization = await Organization.findById(req.user.organizationId);
    
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    if (!organization.canAccessFeature('voiceAgents')) {
      return res.status(403).json({ error: 'Voice agents not available in your plan' });
    }

    const call = await voiceService.createOutboundCall(
      req.user.organizationId,
      phoneNumber,
      customerInfo
    );

    res.json({
      callSid: call.sid,
      status: call.status,
      message: 'Call initiated successfully'
    });
  } catch (error) {
    console.error('Create call error:', error);
    res.status(500).json({ error: error.message || 'Failed to create call' });
  }
});

// Get active calls (authenticated)
router.get('/calls', authenticateToken, async (req, res) => {
  try {
    const activeCalls = voiceService.getActiveCalls(req.user.organizationId);
    res.json({ calls: activeCalls });
  } catch (error) {
    console.error('Get calls error:', error);
    res.status(500).json({ error: 'Failed to get calls' });
  }
});

// End call (authenticated)
router.delete('/call/:callSid', authenticateToken, async (req, res) => {
  try {
    const { callSid } = req.params;
    await voiceService.endCall(callSid);
    res.json({ message: 'Call ended successfully' });
  } catch (error) {
    console.error('End call error:', error);
    res.status(500).json({ error: error.message || 'Failed to end call' });
  }
});

// Transfer call to human (authenticated)
router.post('/call/:callSid/transfer', authenticateToken, async (req, res) => {
  try {
    const { callSid } = req.params;
    const { agentPhoneNumber } = req.body;
    
    const conference = await voiceService.transferToHuman(callSid, agentPhoneNumber);
    res.json({ 
      message: 'Call transferred successfully',
      conferenceSid: conference.sid
    });
  } catch (error) {
    console.error('Transfer call error:', error);
    res.status(500).json({ error: error.message || 'Failed to transfer call' });
  }
});

// Webhook for inbound calls (public)
router.post('/webhook/inbound', async (req, res) => {
  try {
    const { CallSid, From, To } = req.body;
    
    // Find organization by phone number
    const organization = await Organization.findOne({
      'settings.voice.phoneNumber': To,
      'settings.voice.enabled': true
    });

    if (!organization) {
      const VoiceResponse = pkg.twiml.VoiceResponse;
      const twiml = new VoiceResponse();
      twiml.say('Sorry, this number is not configured for customer support.');
      return res.type('text/xml').send(twiml.toString());
    }

    const twiml = await voiceService.handleInboundCall(
      organization._id,
      CallSid,
      From
    );

    res.type('text/xml').send(twiml);
  } catch (error) {
    console.error('Inbound webhook error:', error);
    const VoiceResponse = pkg.twiml.VoiceResponse;
    const twiml = new VoiceResponse();
    twiml.say('Sorry, we are experiencing technical difficulties. Please try again later.');
    res.type('text/xml').send(twiml.toString());
  }
});

// Webhook for outbound calls (public)
router.post('/webhook/outbound', async (req, res) => {
  try {
    const { CallSid } = req.body;
    
    // Generate greeting for outbound call
    const greeting = "Hello, this is Echo from customer support. We're calling regarding your recent inquiry. How can I help you today?";
    const twiml = voiceService.createTwiMLResponse(greeting, CallSid, true);

    res.type('text/xml').send(twiml);
  } catch (error) {
    console.error('Outbound webhook error:', error);
    const VoiceResponse = pkg.twiml.VoiceResponse;
    const twiml = new VoiceResponse();
    twiml.say('Hello, we are experiencing technical difficulties. A human agent will call you back shortly.');
    res.type('text/xml').send(twiml.toString());
  }
});

// Webhook for speech processing (public)
router.post('/webhook/speech/:callSid', async (req, res) => {
  try {
    const { callSid } = req.params;
    const { SpeechResult, Confidence } = req.body;

    if (!SpeechResult || Confidence < 0.5) {
      const twiml = voiceService.createTwiMLResponse(
        "I'm sorry, I didn't catch that. Could you please repeat?",
        callSid,
        true
      );
      return res.type('text/xml').send(twiml);
    }

    const twiml = await voiceService.handleSpeechInput(callSid, SpeechResult);
    res.type('text/xml').send(twiml);
  } catch (error) {
    console.error('Speech webhook error:', error);
    const twiml = voiceService.createTwiMLResponse(
      "I'm experiencing technical difficulties. Let me connect you with a human agent.",
      req.params.callSid,
      false
    );
    res.type('text/xml').send(twiml);
  }
});

// Webhook for call status updates (public)
router.post('/status', async (req, res) => {
  try {
    const { CallSid, CallStatus } = req.body;
    await voiceService.handleCallStatus(CallSid, CallStatus);
    res.status(200).send('OK');
  } catch (error) {
    console.error('Status webhook error:', error);
    res.status(200).send('OK'); // Always return 200 to Twilio
  }
});

// Conference webhook (public)
router.post('/conference/:conferenceSid', async (req, res) => {
  try {
    const VoiceResponse = pkg.twiml.VoiceResponse;
    const twiml = new VoiceResponse();
    
    const dial = twiml.dial();
    dial.conference(req.params.conferenceSid, {
      startConferenceOnEnter: true,
      endConferenceOnExit: false
    });

    res.type('text/xml').send(twiml.toString());
  } catch (error) {
    console.error('Conference webhook error:', error);
    res.status(500).send('Conference error');
  }
});

// Text-to-speech endpoint (authenticated)
router.post('/tts', authenticateToken, async (req, res) => {
  try {
    const { text, voiceConfig } = req.body;
    const audioContent = await voiceService.textToSpeech(text, voiceConfig);
    
    if (!audioContent) {
      return res.status(400).json({ error: 'Text-to-speech not available' });
    }

    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioContent.length
    });
    res.send(audioContent);
  } catch (error) {
    console.error('TTS error:', error);
    res.status(500).json({ error: 'Text-to-speech failed' });
  }
});

// Speech-to-text endpoint (authenticated)
router.post('/stt', authenticateToken, async (req, res) => {
  try {
    const { audioData, config } = req.body;
    
    if (!audioData) {
      return res.status(400).json({ error: 'Audio data required' });
    }

    const audioBuffer = Buffer.from(audioData, 'base64');
    const transcription = await voiceService.speechToText(audioBuffer, config);
    
    if (!transcription) {
      return res.status(400).json({ error: 'Speech-to-text not available' });
    }

    res.json({ transcription });
  } catch (error) {
    console.error('STT error:', error);
    res.status(500).json({ error: 'Speech-to-text failed' });
  }
});

export default router;