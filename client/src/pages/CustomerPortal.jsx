import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { PaperAirplaneIcon, BoltIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline'
import LoadingSpinner from '../components/LoadingSpinner'

export default function CustomerPortal() {
  const [searchParams] = useSearchParams()
  const orgId = searchParams.get('org') || '676a0b8b123456789abcdef0' // Use a default org ID for testing
  
  console.log('Customer Portal - Organization ID:', orgId)
  const [customer, setCustomer] = useState(null)
  const [conversations, setConversations] = useState([])
  const [selectedConversation, setSelectedConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [showLogin, setShowLogin] = useState(true)
  const [customerInfo, setCustomerInfo] = useState({ name: '', email: '' })
  const messagesEndRef = useRef(null)

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!customerInfo.name.trim()) return
    
    // First, get a valid organization ID
    try {
      const orgResponse = await fetch('/api/organizations')
      if (orgResponse.ok) {
        const orgs = await orgResponse.json()
        if (orgs.length > 0) {
          // Use the first available organization
          const validOrgId = orgs[0]._id
          console.log('Using organization ID:', validOrgId)
          
          setCustomer({
            name: customerInfo.name,
            email: customerInfo.email || null,
            sessionId: `customer-${Date.now()}`,
            organizationId: validOrgId
          })
          setShowLogin(false)
          loadConversations()
        } else {
          alert('No organizations found. Please contact support.')
        }
      } else {
        // Fallback - use demo organization
        setCustomer({
          name: customerInfo.name,
          email: customerInfo.email || null,
          sessionId: `customer-${Date.now()}`,
          organizationId: 'demo'
        })
        setShowLogin(false)
        loadConversations()
      }
    } catch (error) {
      console.error('Error getting organization:', error)
      // Fallback - use demo organization
      setCustomer({
        name: customerInfo.name,
        email: customerInfo.email || null,
        sessionId: `customer-${Date.now()}`,
        organizationId: 'demo'
      })
      setShowLogin(false)
      loadConversations()
    }
  }

  const loadConversations = async () => {
    // In a real app, this would load customer's conversation history
    setConversations([])
  }

  const startNewConversation = async () => {
    const newConv = {
      _id: `conv-${Date.now()}`,
      title: 'New Conversation',
      createdAt: new Date(),
      messages: []
    }
    setConversations(prev => [newConv, ...prev])
    setSelectedConversation(newConv)
    setMessages([])
  }

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || loading) return

    const userMessage = {
      content: newMessage,
      role: 'user',
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setNewMessage('')
    setLoading(true)

    try {
      // If no conversation ID, start a new conversation first
      if (!selectedConversation.conversationId) {
        const startResponse = await fetch('/api/widget/start', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            organizationId: customer.organizationId || orgId,
            sessionId: customer.sessionId,
            customer: {
              name: customer.name,
              email: customer.email
            },
            metadata: {
              userAgent: navigator.userAgent,
              url: window.location.href,
              referrer: document.referrer
            }
          })
        })

        if (startResponse.ok) {
          const startData = await startResponse.json()
          const updatedConv = {
            ...selectedConversation,
            conversationId: startData.conversationId
          }
          setSelectedConversation(updatedConv)
          setConversations(prev => prev.map(c => c._id === selectedConversation._id ? updatedConv : c))
        }
      }

      // Send the message
      const response = await fetch('/api/widget/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          organizationId: customer.organizationId || orgId,
          sessionId: customer.sessionId,
          conversationId: selectedConversation.conversationId,
          message: {
            content: userMessage.content
          }
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.response) {
          setMessages(prev => [...prev, {
            content: data.response.content,
            role: 'assistant',
            timestamp: new Date(),
            confidence: data.response.metadata?.confidence
          }])
        } else if (data.escalated) {
          setMessages(prev => [...prev, {
            content: data.message || 'Your conversation has been escalated to a human agent.',
            role: 'assistant',
            timestamp: new Date()
          }])
        }
      }
    } catch (error) {
      console.error('Error sending message:', error)
      setMessages(prev => [...prev, {
        content: 'Sorry, I encountered an error. Please try again.',
        role: 'assistant',
        timestamp: new Date()
      }])
    } finally {
      setLoading(false)
    }
  }

  if (showLogin) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '40px',
          maxWidth: '400px',
          width: '100%',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <ChatBubbleLeftRightIcon style={{ width: '64px', height: '64px', color: '#667eea', margin: '0 auto 16px' }} />
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#1f2937', margin: '0 0 8px 0' }}>
              Customer Support
            </h1>
            <p style={{ fontSize: '16px', color: '#6b7280', margin: 0 }}>
              Get instant help from our AI assistant
            </p>
          </div>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '8px' }}>
                Your Name *
              </label>
              <input
                type="text"
                value={customerInfo.name}
                onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter your name"
                required
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '8px' }}>
                Email (Optional)
              </label>
              <input
                type="email"
                value={customerInfo.email}
                onChange={(e) => setCustomerInfo(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Enter your email"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>

            <button
              type="submit"
              style={{
                width: '100%',
                padding: '12px 24px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Start Chat
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div style={{ height: '100vh', display: 'flex', background: '#f9fafb' }}>
      {/* Sidebar */}
      <div style={{ width: '320px', background: 'white', borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '24px', borderBottom: '1px solid #e5e7eb' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#1f2937', margin: '0 0 8px 0' }}>
            Welcome, {customer.name}
          </h2>
          <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
            Your support conversations
          </p>
        </div>

        <div style={{ padding: '16px' }}>
          <button
            onClick={startNewConversation}
            style={{
              width: '100%',
              padding: '12px 16px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            + New Conversation
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {conversations.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center' }}>
              <ChatBubbleLeftRightIcon style={{ width: '48px', height: '48px', color: '#d1d5db', margin: '0 auto 16px' }} />
              <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
                No conversations yet. Start a new one!
              </p>
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv._id}
                onClick={() => {
                  setSelectedConversation(conv)
                  setMessages(conv.messages)
                }}
                style={{
                  padding: '16px 20px',
                  borderBottom: '1px solid #f3f4f6',
                  cursor: 'pointer',
                  backgroundColor: selectedConversation?._id === conv._id ? '#f0f9ff' : 'transparent'
                }}
              >
                <h3 style={{ fontSize: '14px', fontWeight: 500, color: '#1f2937', margin: '0 0 4px 0' }}>
                  {conv.title}
                </h3>
                <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
                  {new Date(conv.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div style={{ padding: '20px 24px', background: 'white', borderBottom: '1px solid #e5e7eb' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1f2937', margin: 0 }}>
                Customer Support Chat
              </h3>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
              {messages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '64px 24px' }}>
                  <BoltIcon style={{ width: '64px', height: '64px', color: '#d1d5db', margin: '0 auto 16px' }} />
                  <h3 style={{ fontSize: '18px', fontWeight: 500, color: '#1f2937', margin: '0 0 8px 0' }}>
                    How can we help you today?
                  </h3>
                  <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
                    Ask any question and our AI assistant will help you instantly.
                  </p>
                </div>
              ) : (
                <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {messages.map((message, index) => (
                    <div
                      key={index}
                      style={{
                        display: 'flex',
                        justifyContent: message.role === 'user' ? 'flex-start' : 'flex-end'
                      }}
                    >
                      <div style={{
                        maxWidth: '70%',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px'
                      }}>
                        <div style={{
                          padding: '12px 16px',
                          borderRadius: '16px',
                          fontSize: '14px',
                          lineHeight: '1.5',
                          ...(message.role === 'user' ? {
                            background: 'white',
                            color: '#1f2937',
                            border: '1px solid #e5e7eb',
                            borderBottomLeftRadius: '4px'
                          } : {
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white',
                            borderBottomRightRadius: '4px'
                          })
                        }}>
                          {message.role === 'assistant' ? (
                            <ReactMarkdown
                              components={{
                                p: ({children}) => <p style={{margin: '0 0 8px 0'}}>{children}</p>,
                                ul: ({children}) => <ul style={{margin: '8px 0', paddingLeft: '24px'}}>{children}</ul>,
                                ol: ({children}) => <ol style={{margin: '8px 0', paddingLeft: '24px'}}>{children}</ol>,
                                li: ({children}) => <li style={{margin: '4px 0'}}>{children}</li>
                              }}
                            >
                              {message.content}
                            </ReactMarkdown>
                          ) : (
                            message.content
                          )}
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: '#6b7280',
                          textAlign: message.role === 'user' ? 'left' : 'right',
                          padding: '0 4px'
                        }}>
                          {message.role === 'assistant' && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginRight: '8px' }}>
                              <BoltIcon style={{ width: '12px', height: '12px' }} />
                              AI Assistant
                            </span>
                          )}
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}
                  {loading && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <div style={{
                        padding: '12px 16px',
                        borderRadius: '16px',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white'
                      }}>
                        <LoadingSpinner size="sm" />
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Message Input */}
            <div style={{ padding: '20px 24px', background: 'white', borderTop: '1px solid #e5e7eb' }}>
              <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                <form onSubmit={sendMessage} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    disabled={loading}
                    style={{
                      flex: 1,
                      padding: '12px 16px',
                      border: '1px solid #d1d5db',
                      borderRadius: '24px',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || loading}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      background: newMessage.trim() && !loading 
                        ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                        : '#d1d5db',
                      color: 'white',
                      border: 'none',
                      cursor: newMessage.trim() && !loading ? 'pointer' : 'not-allowed'
                    }}
                  >
                    {loading ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <PaperAirplaneIcon style={{ width: '20px', height: '20px' }} />
                    )}
                  </button>
                </form>
              </div>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <ChatBubbleLeftRightIcon style={{ width: '64px', height: '64px', color: '#d1d5db', margin: '0 auto 16px' }} />
              <h3 style={{ fontSize: '18px', fontWeight: 500, color: '#1f2937', margin: '0 0 8px 0' }}>
                Welcome to Customer Support
              </h3>
              <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
                Start a new conversation to get help from our AI assistant
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}