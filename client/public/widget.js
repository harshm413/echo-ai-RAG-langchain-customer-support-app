(function() {
  'use strict';

  // Widget configuration
  const WIDGET_CONFIG = {
    apiUrl: window.ECHO_API_URL || 'http://localhost:5000',
    position: 'bottom-right',
    theme: 'light',
    primaryColor: '#3B82F6',
    secondaryColor: '#1F2937',
    welcomeMessage: 'Hi! How can I help you today?',
    enableVoice: false,
    enableFileUpload: true,
    showBranding: true,
    autoOpen: false,
    sessionTimeout: 30 * 60 * 1000, // 30 minutes
    typingIndicatorDelay: 1000,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedFileTypes: ['image/*', '.pdf', '.doc', '.docx', '.txt']
  };

  // Widget state
  let widgetState = {
    isOpen: false,
    isConnected: false,
    isTyping: false,
    conversationId: null,
    sessionId: null,
    socket: null,
    messages: [],
    isRecording: false,
    mediaRecorder: null,
    audioChunks: [],
    organizationId: null,
    customerInfo: {},
    unreadCount: 0,
    isMinimized: false
  };

  // Initialize widget
  function initWidget() {
    // Generate session ID
    widgetState.sessionId = generateSessionId();
    
    // Get organization ID from script tag
    const scriptTag = document.querySelector('script[data-organization-id]');
    if (scriptTag) {
      widgetState.organizationId = scriptTag.getAttribute('data-organization-id');
    }

    // Merge custom config
    const customConfig = window.EchoWidgetConfig || {};
    Object.assign(WIDGET_CONFIG, customConfig);

    // Create widget HTML
    createWidgetHTML();
    
    // Initialize socket connection
    initSocket();
    
    // Bind events
    bindEvents();
    
    // Auto-open if configured
    if (WIDGET_CONFIG.autoOpen) {
      setTimeout(() => openWidget(), 1000);
    }

    // Load conversation history
    loadConversationHistory();
  }

  function generateSessionId() {
    return 'session_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  }

  function createWidgetHTML() {
    const widgetContainer = document.createElement('div');
    widgetContainer.id = 'echo-widget-container';
    widgetContainer.className = `echo-widget-${WIDGET_CONFIG.position} echo-widget-${WIDGET_CONFIG.theme}`;
    
    widgetContainer.innerHTML = `
      <style>
        /* Widget Styles */
        #echo-widget-container {
          position: fixed;
          z-index: 2147483647;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 14px;
          line-height: 1.4;
        }
        
        .echo-widget-bottom-right {
          bottom: 20px;
          right: 20px;
        }
        
        .echo-widget-bottom-left {
          bottom: 20px;
          left: 20px;
        }
        
        .echo-widget-top-right {
          top: 20px;
          right: 20px;
        }
        
        .echo-widget-top-left {
          top: 20px;
          left: 20px;
        }

        .echo-widget-button {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: linear-gradient(135deg, ${WIDGET_CONFIG.primaryColor}, ${WIDGET_CONFIG.secondaryColor});
          border: none;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
          position: relative;
        }

        .echo-widget-button:hover {
          transform: scale(1.1);
          box-shadow: 0 6px 20px rgba(0,0,0,0.2);
        }

        .echo-widget-button svg {
          width: 24px;
          height: 24px;
          fill: white;
        }

        .echo-widget-notification {
          position: absolute;
          top: -5px;
          right: -5px;
          background: #ef4444;
          color: white;
          border-radius: 50%;
          width: 20px;
          height: 20px;
          font-size: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
        }

        .echo-widget-chat {
          position: absolute;
          bottom: 80px;
          right: 0;
          width: 380px;
          height: 600px;
          background: white;
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.12);
          display: none;
          flex-direction: column;
          overflow: hidden;
          border: 1px solid #e5e7eb;
        }

        .echo-widget-chat.open {
          display: flex;
          animation: slideUp 0.3s ease-out;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .echo-widget-header {
          background: linear-gradient(135deg, ${WIDGET_CONFIG.primaryColor}, ${WIDGET_CONFIG.secondaryColor});
          color: white;
          padding: 16px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .echo-widget-header-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .echo-widget-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(255,255,255,0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
        }

        .echo-widget-status {
          font-size: 12px;
          opacity: 0.9;
        }

        .echo-widget-controls {
          display: flex;
          gap: 8px;
        }

        .echo-widget-control-btn {
          background: rgba(255,255,255,0.2);
          border: none;
          border-radius: 6px;
          width: 32px;
          height: 32px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
        }

        .echo-widget-control-btn:hover {
          background: rgba(255,255,255,0.3);
        }

        .echo-widget-control-btn svg {
          width: 16px;
          height: 16px;
          fill: white;
        }

        .echo-widget-messages {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .echo-widget-message {
          display: flex;
          gap: 12px;
          max-width: 85%;
        }

        .echo-widget-message.user {
          align-self: flex-end;
          flex-direction: row-reverse;
        }

        .echo-widget-message-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: bold;
          flex-shrink: 0;
        }

        .echo-widget-message.assistant .echo-widget-message-avatar {
          background: ${WIDGET_CONFIG.primaryColor};
          color: white;
        }

        .echo-widget-message.user .echo-widget-message-avatar {
          background: #e5e7eb;
          color: #374151;
        }

        .echo-widget-message-content {
          background: #f9fafb;
          padding: 12px 16px;
          border-radius: 16px;
          position: relative;
        }

        .echo-widget-message.user .echo-widget-message-content {
          background: ${WIDGET_CONFIG.primaryColor};
          color: white;
        }

        .echo-widget-message-time {
          font-size: 11px;
          color: #6b7280;
          margin-top: 4px;
        }

        .echo-widget-typing {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 0;
        }

        .echo-widget-typing-dots {
          display: flex;
          gap: 4px;
        }

        .echo-widget-typing-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #9ca3af;
          animation: typing 1.4s infinite;
        }

        .echo-widget-typing-dot:nth-child(2) {
          animation-delay: 0.2s;
        }

        .echo-widget-typing-dot:nth-child(3) {
          animation-delay: 0.4s;
        }

        @keyframes typing {
          0%, 60%, 100% {
            transform: translateY(0);
          }
          30% {
            transform: translateY(-10px);
          }
        }

        .echo-widget-input-area {
          padding: 16px 20px;
          border-top: 1px solid #e5e7eb;
          background: #f9fafb;
        }

        .echo-widget-input-container {
          display: flex;
          gap: 8px;
          align-items: flex-end;
        }

        .echo-widget-input {
          flex: 1;
          border: 1px solid #d1d5db;
          border-radius: 20px;
          padding: 10px 16px;
          resize: none;
          outline: none;
          font-family: inherit;
          font-size: 14px;
          max-height: 100px;
          min-height: 40px;
        }

        .echo-widget-input:focus {
          border-color: ${WIDGET_CONFIG.primaryColor};
        }

        .echo-widget-send-btn {
          background: ${WIDGET_CONFIG.primaryColor};
          border: none;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
        }

        .echo-widget-send-btn:hover {
          background: ${WIDGET_CONFIG.secondaryColor};
        }

        .echo-widget-send-btn:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }

        .echo-widget-send-btn svg {
          width: 16px;
          height: 16px;
          fill: white;
        }

        .echo-widget-voice-btn {
          background: #ef4444;
          border: none;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .echo-widget-voice-btn.recording {
          animation: pulse 1s infinite;
        }

        .echo-widget-voice-btn svg {
          width: 16px;
          height: 16px;
          fill: white;
        }

        @keyframes pulse {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
          }
          100% {
            transform: scale(1);
          }
        }

        .echo-widget-file-btn {
          background: #6b7280;
          border: none;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
        }

        .echo-widget-file-btn:hover {
          background: #374151;
        }

        .echo-widget-file-btn svg {
          width: 16px;
          height: 16px;
          fill: white;
        }

        .echo-widget-branding {
          text-align: center;
          padding: 8px;
          font-size: 11px;
          color: #6b7280;
          border-top: 1px solid #e5e7eb;
        }

        .echo-widget-branding a {
          color: ${WIDGET_CONFIG.primaryColor};
          text-decoration: none;
        }

        /* Dark theme */
        .echo-widget-dark .echo-widget-chat {
          background: #1f2937;
          border-color: #374151;
        }

        .echo-widget-dark .echo-widget-messages {
          background: #1f2937;
        }

        .echo-widget-dark .echo-widget-message-content {
          background: #374151;
          color: white;
        }

        .echo-widget-dark .echo-widget-input-area {
          background: #374151;
          border-color: #4b5563;
        }

        .echo-widget-dark .echo-widget-input {
          background: #1f2937;
          border-color: #4b5563;
          color: white;
        }

        .echo-widget-dark .echo-widget-branding {
          background: #374151;
          border-color: #4b5563;
          color: #9ca3af;
        }

        /* Mobile responsive */
        @media (max-width: 480px) {
          .echo-widget-chat {
            width: calc(100vw - 40px);
            height: calc(100vh - 100px);
            bottom: 80px;
            right: 20px;
          }
        }

        /* File upload styles */
        .echo-widget-file-upload {
          display: none;
        }

        .echo-widget-file-preview {
          background: #f3f4f6;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          padding: 8px 12px;
          margin: 8px 0;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
        }

        .echo-widget-file-preview-remove {
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 4px;
          width: 20px;
          height: 20px;
          cursor: pointer;
          font-size: 12px;
        }
      </style>

      <!-- Widget Button -->
      <button class="echo-widget-button" id="echo-widget-toggle">
        <svg viewBox="0 0 24 24">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
        </svg>
        <div class="echo-widget-notification" id="echo-widget-notification" style="display: none;">0</div>
      </button>

      <!-- Chat Window -->
      <div class="echo-widget-chat" id="echo-widget-chat">
        <!-- Header -->
        <div class="echo-widget-header">
          <div class="echo-widget-header-info">
            <div class="echo-widget-avatar">E</div>
            <div>
              <div style="font-weight: 600;">Echo Support</div>
              <div class="echo-widget-status" id="echo-widget-status">Online</div>
            </div>
          </div>
          <div class="echo-widget-controls">
            ${WIDGET_CONFIG.enableVoice ? `
              <button class="echo-widget-control-btn" id="echo-widget-voice-toggle" title="Voice Chat">
                <svg viewBox="0 0 24 24">
                  <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
                </svg>
              </button>
            ` : ''}
            <button class="echo-widget-control-btn" id="echo-widget-minimize" title="Minimize">
              <svg viewBox="0 0 24 24">
                <path d="M19 13H5v-2h14v2z"/>
              </svg>
            </button>
            <button class="echo-widget-control-btn" id="echo-widget-close" title="Close">
              <svg viewBox="0 0 24 24">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Messages -->
        <div class="echo-widget-messages" id="echo-widget-messages">
          <div class="echo-widget-message assistant">
            <div class="echo-widget-message-avatar">E</div>
            <div class="echo-widget-message-content">
              ${WIDGET_CONFIG.welcomeMessage}
              <div class="echo-widget-message-time">${new Date().toLocaleTimeString()}</div>
            </div>
          </div>
        </div>

        <!-- Typing Indicator -->
        <div class="echo-widget-typing" id="echo-widget-typing" style="display: none;">
          <div class="echo-widget-message-avatar" style="background: ${WIDGET_CONFIG.primaryColor}; color: white;">E</div>
          <div>
            <div class="echo-widget-typing-dots">
              <div class="echo-widget-typing-dot"></div>
              <div class="echo-widget-typing-dot"></div>
              <div class="echo-widget-typing-dot"></div>
            </div>
          </div>
        </div>

        <!-- Input Area -->
        <div class="echo-widget-input-area">
          <div id="echo-widget-file-preview"></div>
          <div class="echo-widget-input-container">
            <textarea 
              class="echo-widget-input" 
              id="echo-widget-input" 
              placeholder="Type your message..."
              rows="1"
            ></textarea>
            
            ${WIDGET_CONFIG.enableFileUpload ? `
              <button class="echo-widget-file-btn" id="echo-widget-file-btn" title="Attach File">
                <svg viewBox="0 0 24 24">
                  <path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z"/>
                </svg>
              </button>
              <input type="file" class="echo-widget-file-upload" id="echo-widget-file-input" accept="${WIDGET_CONFIG.allowedFileTypes.join(',')}">
            ` : ''}
            
            ${WIDGET_CONFIG.enableVoice ? `
              <button class="echo-widget-voice-btn" id="echo-widget-voice-btn" title="Voice Message">
                <svg viewBox="0 0 24 24">
                  <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
                </svg>
              </button>
            ` : ''}
            
            <button class="echo-widget-send-btn" id="echo-widget-send-btn" disabled>
              <svg viewBox="0 0 24 24">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Branding -->
        ${WIDGET_CONFIG.showBranding ? `
          <div class="echo-widget-branding">
            Powered by <a href="https://echo-support.ai" target="_blank">Echo Support AI</a>
          </div>
        ` : ''}
      </div>
    `;

    document.body.appendChild(widgetContainer);
  }

  function initSocket() {
    try {
      widgetState.socket = io(`${WIDGET_CONFIG.apiUrl}/widget`, {
        transports: ['websocket', 'polling']
      });

      widgetState.socket.on('connect', () => {
        widgetState.isConnected = true;
        updateStatus('Online');
        
        // Authenticate with organization
        widgetState.socket.emit('authenticate', {
          organizationId: widgetState.organizationId,
          sessionId: widgetState.sessionId,
          customerInfo: getCustomerInfo()
        });
      });

      widgetState.socket.on('disconnect', () => {
        widgetState.isConnected = false;
        updateStatus('Offline');
      });

      widgetState.socket.on('authenticated', (data) => {
        if (data.success) {
          updateStatus('Online');
        }
      });

      widgetState.socket.on('message_response', (data) => {
        hideTypingIndicator();
        addMessage(data.message.content, 'assistant', data.message.metadata);
        
        if (!widgetState.isOpen) {
          widgetState.unreadCount++;
          updateNotificationBadge();
        }
      });

      widgetState.socket.on('operator_joined', (data) => {
        addSystemMessage(`${data.operator.name} has joined the conversation`);
        updateStatus('Agent Online');
      });

      widgetState.socket.on('conversation_resolved', () => {
        addSystemMessage('This conversation has been resolved. Feel free to start a new conversation if you need further assistance.');
      });

      widgetState.socket.on('error', (error) => {
        console.error('Socket error:', error);
        addSystemMessage('Sorry, there was a connection error. Please try again.');
      });

    } catch (error) {
      console.error('Failed to initialize socket:', error);
    }
  }

  function bindEvents() {
    // Toggle widget
    document.getElementById('echo-widget-toggle').addEventListener('click', toggleWidget);
    
    // Close widget
    document.getElementById('echo-widget-close').addEventListener('click', closeWidget);
    
    // Minimize widget
    document.getElementById('echo-widget-minimize').addEventListener('click', minimizeWidget);
    
    // Send message
    document.getElementById('echo-widget-send-btn').addEventListener('click', sendMessage);
    
    // Input events
    const input = document.getElementById('echo-widget-input');
    input.addEventListener('keydown', handleInputKeydown);
    input.addEventListener('input', handleInputChange);
    
    // File upload
    if (WIDGET_CONFIG.enableFileUpload) {
      document.getElementById('echo-widget-file-btn').addEventListener('click', () => {
        document.getElementById('echo-widget-file-input').click();
      });
      
      document.getElementById('echo-widget-file-input').addEventListener('change', handleFileUpload);
    }
    
    // Voice recording
    if (WIDGET_CONFIG.enableVoice) {
      document.getElementById('echo-widget-voice-btn').addEventListener('click', toggleVoiceRecording);
    }
    
    // Auto-resize textarea
    input.addEventListener('input', autoResizeTextarea);
  }

  function toggleWidget() {
    if (widgetState.isOpen) {
      closeWidget();
    } else {
      openWidget();
    }
  }

  function openWidget() {
    widgetState.isOpen = true;
    widgetState.unreadCount = 0;
    document.getElementById('echo-widget-chat').classList.add('open');
    document.getElementById('echo-widget-input').focus();
    updateNotificationBadge();
    
    // Track widget open event
    trackEvent('widget_opened');
  }

  function closeWidget() {
    widgetState.isOpen = false;
    document.getElementById('echo-widget-chat').classList.remove('open');
    
    // Track widget close event
    trackEvent('widget_closed');
  }

  function minimizeWidget() {
    widgetState.isMinimized = !widgetState.isMinimized;
    // Implementation for minimize functionality
  }

  function sendMessage() {
    const input = document.getElementById('echo-widget-input');
    const message = input.value.trim();
    
    if (!message || !widgetState.isConnected) return;
    
    // Add user message
    addMessage(message, 'user');
    
    // Clear input
    input.value = '';
    updateSendButton();
    
    // Show typing indicator
    showTypingIndicator();
    
    // Send to server
    widgetState.socket.emit('customer_message', {
      content: message,
      timestamp: new Date().toISOString(),
      metadata: {
        userAgent: navigator.userAgent,
        url: window.location.href,
        referrer: document.referrer
      }
    });
    
    // Track message sent event
    trackEvent('message_sent', { message_length: message.length });
  }

  function addMessage(content, role, metadata = {}) {
    const messagesContainer = document.getElementById('echo-widget-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `echo-widget-message ${role}`;
    
    const avatar = role === 'assistant' ? 'E' : 'U';
    const time = new Date().toLocaleTimeString();
    
    messageDiv.innerHTML = `
      <div class="echo-widget-message-avatar">${avatar}</div>
      <div class="echo-widget-message-content">
        ${formatMessage(content)}
        <div class="echo-widget-message-time">${time}</div>
        ${metadata.confidence ? `<div style="font-size: 11px; opacity: 0.7;">Confidence: ${Math.round(metadata.confidence)}%</div>` : ''}
      </div>
    `;
    
    messagesContainer.appendChild(messageDiv);
    scrollToBottom();
    
    // Store message
    widgetState.messages.push({
      content,
      role,
      timestamp: new Date(),
      metadata
    });
  }

  function addSystemMessage(content) {
    const messagesContainer = document.getElementById('echo-widget-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'echo-widget-message system';
    messageDiv.style.textAlign = 'center';
    messageDiv.style.fontSize = '12px';
    messageDiv.style.color = '#6b7280';
    messageDiv.style.fontStyle = 'italic';
    messageDiv.innerHTML = content;
    
    messagesContainer.appendChild(messageDiv);
    scrollToBottom();
  }

  function formatMessage(content) {
    // Enhanced markdown-like formatting
    return content
      // Headers
      .replace(/^### (.*$)/gim, '<h3 style="font-size: 14px; font-weight: 600; margin: 8px 0 4px 0;">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 style="font-size: 16px; font-weight: 600; margin: 8px 0 4px 0;">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 style="font-size: 18px; font-weight: 600; margin: 8px 0 4px 0;">$1</h1>')
      // Bold and italic
      .replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight: 600;">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Lists
      .replace(/^\* (.*$)/gim, '<li style="margin: 2px 0;">$1</li>')
      .replace(/^\d+\. (.*$)/gim, '<li style="margin: 2px 0;">$1</li>')
      // Wrap consecutive list items in ul/ol
      .replace(/((<li[^>]*>.*<\/li>\s*)+)/g, '<ul style="margin: 8px 0; padding-left: 20px;">$1</ul>')
      // Line breaks
      .replace(/\n/g, '<br>');
  }

  function showTypingIndicator() {
    document.getElementById('echo-widget-typing').style.display = 'flex';
    scrollToBottom();
  }

  function hideTypingIndicator() {
    document.getElementById('echo-widget-typing').style.display = 'none';
  }

  function scrollToBottom() {
    const messagesContainer = document.getElementById('echo-widget-messages');
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  function updateStatus(status) {
    document.getElementById('echo-widget-status').textContent = status;
  }

  function updateNotificationBadge() {
    const badge = document.getElementById('echo-widget-notification');
    if (widgetState.unreadCount > 0) {
      badge.textContent = widgetState.unreadCount;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  }

  function handleInputKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function handleInputChange(e) {
    updateSendButton();
  }

  function updateSendButton() {
    const input = document.getElementById('echo-widget-input');
    const sendBtn = document.getElementById('echo-widget-send-btn');
    sendBtn.disabled = !input.value.trim() || !widgetState.isConnected;
  }

  function autoResizeTextarea() {
    const textarea = document.getElementById('echo-widget-input');
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 100) + 'px';
  }

  function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    // Check file size
    if (file.size > WIDGET_CONFIG.maxFileSize) {
      alert(`File size must be less than ${WIDGET_CONFIG.maxFileSize / 1024 / 1024}MB`);
      return;
    }
    
    // Show file preview
    showFilePreview(file);
    
    // Upload file
    uploadFile(file);
  }

  function showFilePreview(file) {
    const preview = document.getElementById('echo-widget-file-preview');
    preview.innerHTML = `
      <div class="echo-widget-file-preview">
        <span>📎 ${file.name} (${formatFileSize(file.size)})</span>
        <button class="echo-widget-file-preview-remove" onclick="removeFilePreview()">×</button>
      </div>
    `;
  }

  function removeFilePreview() {
    document.getElementById('echo-widget-file-preview').innerHTML = '';
    document.getElementById('echo-widget-file-input').value = '';
  }

  function uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('sessionId', widgetState.sessionId);
    
    fetch(`${WIDGET_CONFIG.apiUrl}/api/widget/upload`, {
      method: 'POST',
      body: formData
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        addMessage(`File uploaded: ${file.name}`, 'user');
        removeFilePreview();
      } else {
        alert('File upload failed: ' + data.error);
      }
    })
    .catch(error => {
      console.error('File upload error:', error);
      alert('File upload failed');
    });
  }

  function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function toggleVoiceRecording() {
    if (widgetState.isRecording) {
      stopVoiceRecording();
    } else {
      startVoiceRecording();
    }
  }

  function startVoiceRecording() {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        widgetState.mediaRecorder = new MediaRecorder(stream);
        widgetState.audioChunks = [];
        
        widgetState.mediaRecorder.ondataavailable = (event) => {
          widgetState.audioChunks.push(event.data);
        };
        
        widgetState.mediaRecorder.onstop = () => {
          const audioBlob = new Blob(widgetState.audioChunks, { type: 'audio/wav' });
          sendVoiceMessage(audioBlob);
          stream.getTracks().forEach(track => track.stop());
        };
        
        widgetState.mediaRecorder.start();
        widgetState.isRecording = true;
        
        const voiceBtn = document.getElementById('echo-widget-voice-btn');
        voiceBtn.classList.add('recording');
        voiceBtn.title = 'Stop Recording';
        
        addSystemMessage('Recording... Click the microphone again to stop.');
      })
      .catch(error => {
        console.error('Voice recording error:', error);
        alert('Voice recording not supported or permission denied');
      });
  }

  function stopVoiceRecording() {
    if (widgetState.mediaRecorder && widgetState.isRecording) {
      widgetState.mediaRecorder.stop();
      widgetState.isRecording = false;
      
      const voiceBtn = document.getElementById('echo-widget-voice-btn');
      voiceBtn.classList.remove('recording');
      voiceBtn.title = 'Voice Message';
    }
  }

  function sendVoiceMessage(audioBlob) {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'voice-message.wav');
    formData.append('sessionId', widgetState.sessionId);
    
    addSystemMessage('Processing voice message...');
    
    fetch(`${WIDGET_CONFIG.apiUrl}/api/widget/voice`, {
      method: 'POST',
      body: formData
    })
    .then(response => response.json())
    .then(data => {
      if (data.success && data.transcription) {
        addMessage(data.transcription, 'user');
        
        // Send transcribed message
        widgetState.socket.emit('customer_message', {
          content: data.transcription,
          timestamp: new Date().toISOString(),
          metadata: {
            type: 'voice',
            confidence: data.confidence
          }
        });
      } else {
        addSystemMessage('Sorry, could not process voice message. Please try typing instead.');
      }
    })
    .catch(error => {
      console.error('Voice message error:', error);
      addSystemMessage('Voice message failed. Please try again.');
    });
  }

  function getCustomerInfo() {
    // Try to get customer info from various sources
    const info = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      url: window.location.href,
      referrer: document.referrer,
      screenResolution: `${screen.width}x${screen.height}`,
      timestamp: new Date().toISOString()
    };
    
    // Try to get email from forms or localStorage
    const emailInputs = document.querySelectorAll('input[type="email"]');
    if (emailInputs.length > 0 && emailInputs[0].value) {
      info.email = emailInputs[0].value;
    }
    
    // Check localStorage for user info
    const storedInfo = localStorage.getItem('echo_customer_info');
    if (storedInfo) {
      try {
        Object.assign(info, JSON.parse(storedInfo));
      } catch (e) {
        console.warn('Failed to parse stored customer info');
      }
    }
    
    return info;
  }

  function loadConversationHistory() {
    // Load previous conversation from localStorage
    const storedMessages = localStorage.getItem(`echo_messages_${widgetState.sessionId}`);
    if (storedMessages) {
      try {
        const messages = JSON.parse(storedMessages);
        messages.forEach(msg => {
          if (msg.role !== 'system') {
            addMessage(msg.content, msg.role, msg.metadata);
          }
        });
      } catch (e) {
        console.warn('Failed to load conversation history');
      }
    }
  }

  function saveConversationHistory() {
    // Save conversation to localStorage
    localStorage.setItem(`echo_messages_${widgetState.sessionId}`, JSON.stringify(widgetState.messages));
  }

  function trackEvent(eventName, properties = {}) {
    // Track widget events for analytics
    if (widgetState.socket && widgetState.isConnected) {
      widgetState.socket.emit('track_event', {
        event: eventName,
        properties: {
          ...properties,
          sessionId: widgetState.sessionId,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  // Auto-save conversation periodically
  setInterval(saveConversationHistory, 30000); // Every 30 seconds

  // Initialize widget when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidget);
  } else {
    initWidget();
  }

  // Expose global functions for external use
  window.EchoWidget = {
    open: openWidget,
    close: closeWidget,
    sendMessage: (message) => {
      document.getElementById('echo-widget-input').value = message;
      sendMessage();
    },
    setCustomerInfo: (info) => {
      Object.assign(widgetState.customerInfo, info);
      localStorage.setItem('echo_customer_info', JSON.stringify(widgetState.customerInfo));
    },
    getState: () => ({ ...widgetState })
  };

})();