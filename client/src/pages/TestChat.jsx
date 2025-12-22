import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { PaperAirplaneIcon, BoltIcon, ArrowLeftIcon } from '@heroicons/react/24/outline'
import LoadingSpinner from '../components/LoadingSpinner'

export default function TestChat() {
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState(null)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
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
      if (!conversationId) {
        // Create new conversation that will appear in conversations list
        const response = await fetch('/api/conversations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            sessionId: `test-${Date.now()}`,
            customer: { name: 'Test User', email: 'test@example.com' },
            initialMessage: userMessage.content
          })
        })

        if (response.ok) {
          const data = await response.json()
          setConversationId(data._id)
          const aiMessage = data.messages.find(msg => msg.role === 'assistant')
          if (aiMessage) {
            setMessages(prev => [...prev, {
              content: aiMessage.content,
              role: 'assistant',
              timestamp: new Date(aiMessage.timestamp)
            }])
          }
        }
      } else {
        // Add message to existing conversation
        const response = await fetch(`/api/conversations/${conversationId}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            content: userMessage.content,
            role: 'user'
          })
        })

        if (response.ok) {
          const data = await response.json()
          console.log('Message response:', data)
          // Update all messages from server to sync properly
          setMessages(data.messages.map(msg => ({
            content: msg.content,
            role: msg.role,
            timestamp: new Date(msg.timestamp)
          })))
        } else {
          console.error('Message send failed:', response.status)
          throw new Error('Failed to send message')
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

  return (
    <div style={{ 
      height: 'calc(100vh - 60px)',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--gray-50)',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        background: 'white',
        borderBottom: '1px solid var(--gray-200)',
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px'
      }}>
        <Link 
          to="/conversations"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40px',
            height: '40px',
            borderRadius: '8px',
            background: 'var(--gray-100)',
            color: 'var(--gray-600)',
            textDecoration: 'none'
          }}
        >
          <ArrowLeftIcon style={{ width: '20px', height: '20px' }} />
        </Link>
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--gray-900)', margin: 0 }}>
            AI Test Chat
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--gray-500)', margin: '4px 0 0 0' }}>
            Test your AI knowledge base responses
          </p>
        </div>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '24px',
        minHeight: 0
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          {messages.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '64px 24px' }}>
              <BoltIcon style={{ width: '64px', height: '64px', color: 'var(--gray-400)', margin: '0 auto 16px' }} />
              <h3 style={{ fontSize: '16px', fontWeight: 500, color: 'var(--gray-900)', margin: '0 0 8px 0' }}>
                Start testing your AI
              </h3>
              <p style={{ fontSize: '14px', color: 'var(--gray-500)', margin: 0 }}>
                Ask questions to test your knowledge base responses
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
                        color: 'var(--gray-900)',
                        border: '1px solid var(--gray-200)',
                        borderBottomLeftRadius: '4px'
                      } : {
                        background: 'linear-gradient(135deg, var(--purple-500) 0%, var(--indigo-600) 100%)',
                        color: 'white',
                        borderBottomRightRadius: '4px'
                      })
                    }}>
                      {message.role === 'assistant' ? (
                        <ReactMarkdown
                          components={{
                            p: ({children}) => <p style={{margin: '0 0 8px 0'}}>{children}</p>,
                            strong: ({children}) => <strong style={{fontWeight: 600}}>{children}</strong>,
                            ul: ({children}) => <ul style={{margin: '8px 0', paddingLeft: '24px'}}>{children}</ul>,
                            ol: ({children}) => <ol style={{margin: '8px 0', paddingLeft: '24px'}}>{children}</ol>,
                            li: ({children}) => <li style={{margin: '4px 0'}}>{children}</li>,
                            h1: ({children}) => <h1 style={{fontSize: '18px', fontWeight: 600, margin: '8px 0 4px 0'}}>{children}</h1>,
                            h2: ({children}) => <h2 style={{fontSize: '16px', fontWeight: 600, margin: '8px 0 4px 0'}}>{children}</h2>,
                            h3: ({children}) => <h3 style={{fontSize: '14px', fontWeight: 600, margin: '8px 0 4px 0'}}>{children}</h3>
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
                      color: 'var(--gray-500)',
                      textAlign: message.role === 'user' ? 'left' : 'right',
                      padding: '0 4px'
                    }}>
                      {message.role === 'assistant' && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginRight: '8px' }}>
                          <BoltIcon style={{ width: '12px', height: '12px' }} />
                          AI
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
                    background: 'linear-gradient(135deg, var(--purple-500) 0%, var(--indigo-600) 100%)',
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
      </div>

      {/* Input - Fixed at bottom */}
      <div style={{
        background: 'white',
        borderTop: '1px solid var(--gray-200)',
        padding: '16px 24px',
        flexShrink: 0
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <form onSubmit={sendMessage} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Ask a question to test the AI..."
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid var(--gray-300)',
                  borderRadius: '12px',
                  fontSize: '14px',
                  outline: 'none'
                }}
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              disabled={!newMessage.trim() || loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: newMessage.trim() && !loading 
                  ? 'linear-gradient(135deg, var(--purple-500) 0%, var(--indigo-600) 100%)' 
                  : 'var(--gray-300)',
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
    </div>
  )
}