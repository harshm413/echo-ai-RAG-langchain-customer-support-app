import { useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { useSocket } from '../contexts/SocketContext'
import {
  ArrowLeftIcon,
  PaperAirplaneIcon,
  UserIcon,
  BoltIcon,
  PhoneIcon,
  VideoCameraIcon,
  EllipsisVerticalIcon
} from '@heroicons/react/24/outline'
import LoadingSpinner from '../components/LoadingSpinner'

export default function ConversationDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { socket } = useSocket()
  const [conversation, setConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    fetchConversation()
    
    if (socket) {
      socket.emit('join_conversation', { conversationId: id })
      
      socket.on('new_message', (message) => {
        setMessages(prev => [...prev, message])
        scrollToBottom()
      })
    }

    return () => {
      if (socket) {
        socket.off('new_message')
      }
    }
  }, [id, socket])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchConversation = async () => {
    try {
      console.log('Fetching conversation with ID:', id)
      const response = await fetch(`/api/conversations/${id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      console.log('Response status:', response.status)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('API Error:', errorData)
        throw new Error('Conversation not found')
      }
      
      const data = await response.json()
      console.log('Conversation data:', data)
      setConversation(data)
      setMessages(data.messages || [])
    } catch (error) {
      console.error('Error fetching conversation:', error)
      setConversation(null)
    } finally {
      setLoading(false)
    }
  }

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || sending) return

    setSending(true)
    try {
      const response = await fetch(`/api/conversations/${id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          content: newMessage,
          role: 'operator'
        })
      })

      if (response.ok) {
        const data = await response.json()
        // Update messages with the new conversation data
        setMessages(data.messages || [])
        setNewMessage('')
      } else {
        throw new Error('Failed to send message')
      }
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setSending(false)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return { bg: '#dcfce7', color: '#166534' }
      case 'resolved': return { bg: '#dbeafe', color: '#1e40af' }
      case 'escalated': return { bg: '#fef3c7', color: '#92400e' }
      default: return { bg: '#f3f4f6', color: '#374151' }
    }
  }

  if (loading) {
    return (
      <div className="page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
        <div style={{ textAlign: 'center' }}>
          <LoadingSpinner size="lg" />
          <p style={{ marginTop: '16px', color: 'var(--gray-600)' }}>Loading conversation...</p>
        </div>
      </div>
    )
  }

  if (!conversation) {
    return (
      <div className="page-container">
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center', padding: '64px 24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--gray-900)', margin: '0 0 8px 0' }}>
              Conversation not found
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--gray-500)', margin: '0 0 24px 0' }}>
              The conversation you're looking for doesn't exist or has been deleted.
            </p>
            <Link to="/conversations" className="btn btn-primary">
              <ArrowLeftIcon style={{ width: '16px', height: '16px', marginRight: '8px' }} />
              Back to Conversations
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const statusColor = getStatusColor(conversation.status)

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        background: 'white',
        borderBottom: '1px solid var(--gray-200)',
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
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
              textDecoration: 'none',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => e.target.style.background = 'var(--gray-200)'}
            onMouseLeave={(e) => e.target.style.background = 'var(--gray-100)'}
          >
            <ArrowLeftIcon style={{ width: '20px', height: '20px' }} />
          </Link>
          
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, var(--blue-500) 0%, var(--purple-600) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {conversation.customer?.name ? (
              <span style={{ color: 'white', fontWeight: 600, fontSize: '18px' }}>
                {conversation.customer.name.charAt(0).toUpperCase()}
              </span>
            ) : (
              <UserIcon style={{ width: '24px', height: '24px', color: 'white' }} />
            )}
          </div>
          
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--gray-900)', margin: '0 0 4px 0' }}>
              {conversation.customer?.name || 'Anonymous User'}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: 500,
                backgroundColor: statusColor.bg,
                color: statusColor.color
              }}>
                {conversation.status}
              </span>
              {conversation.customer?.email && (
                <span style={{ fontSize: '14px', color: 'var(--gray-500)' }}>
                  {conversation.customer.email}
                </span>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button 
            className="btn btn-primary"
            onClick={() => navigate(`/widget?conversation=${id}`)}
          >
            Open in Widget
          </button>
        </div>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '24px',
        background: 'var(--gray-50)'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          {messages.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '64px 24px' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'var(--gray-200)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px'
              }}>
                <BoltIcon style={{ width: '32px', height: '32px', color: 'var(--gray-400)' }} />
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 500, color: 'var(--gray-900)', margin: '0 0 8px 0' }}>
                No messages yet
              </h3>
              <p style={{ fontSize: '14px', color: 'var(--gray-500)', margin: 0 }}>
                Start the conversation by sending a message below.
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
                        background: message.role === 'assistant' 
                          ? 'linear-gradient(135deg, var(--purple-500) 0%, var(--indigo-600) 100%)'
                          : message.role === 'system'
                          ? 'linear-gradient(135deg, var(--gray-400) 0%, var(--gray-600) 100%)'
                          : 'linear-gradient(135deg, var(--blue-500) 0%, var(--purple-600) 100%)',
                        color: 'white',
                        borderBottomRightRadius: '4px'
                      })
                    }}>
                      {message.role === 'assistant' ? (
                        <ReactMarkdown
                          components={{
                            p: ({children}) => <p style={{margin: '0 0 8px 0'}}>{children}</p>,
                            strong: ({children}) => <strong style={{fontWeight: 600}}>{children}</strong>,
                            ul: ({children}) => <ul style={{margin: '8px 0', paddingLeft: '20px'}}>{children}</ul>,
                            ol: ({children}) => <ol style={{margin: '8px 0', paddingLeft: '20px'}}>{children}</ol>,
                            li: ({children}) => <li style={{margin: '2px 0'}}>{children}</li>,
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
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          marginRight: '8px'
                        }}>
                          <BoltIcon style={{ width: '12px', height: '12px' }} />
                          AI
                        </span>
                      )}
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Message Input - Removed, use Widget tab instead */}
      <div style={{
        background: 'white',
        borderTop: '1px solid var(--gray-200)',
        padding: '16px 24px'
      }}>
      </div>
    </div>
  )
}