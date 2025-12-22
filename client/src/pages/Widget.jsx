import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { useAuth } from '../contexts/AuthContext'
import { useSocket } from '../contexts/SocketContext'
import { conversationAPI } from '../services/api'
import { BoltIcon, UserIcon } from '@heroicons/react/24/outline'
import LoadingSpinner from '../components/LoadingSpinner'
import toast from 'react-hot-toast'

const Widget = () => {
  const { user, organization } = useAuth()
  const { socket } = useSocket()
  const [searchParams] = useSearchParams()
  const conversationParam = searchParams.get('conversation')
  const [conversations, setConversations] = useState([])
  const [selectedConversation, setSelectedConversation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    scrollToBottom()
  }, [selectedConversation?.messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    loadConversations()
  }, [])

  useEffect(() => {
    // Auto-select conversation from URL parameter
    if (conversationParam && conversations.length > 0) {
      const targetConversation = conversations.find(conv => conv._id === conversationParam)
      if (targetConversation) {
        setSelectedConversation(targetConversation)
      }
    }
  }, [conversationParam, conversations])

  useEffect(() => {
    if (socket) {
      socket.on('new_message', handleNewMessage)
      socket.on('conversation_updated', handleConversationUpdate)
      socket.on('typing', handleTyping)
      socket.on('stop_typing', handleStopTyping)

      return () => {
        socket.off('new_message', handleNewMessage)
        socket.off('conversation_updated', handleConversationUpdate)
        socket.off('typing', handleTyping)
        socket.off('stop_typing', handleStopTyping)
      }
    }
  }, [socket])

  const loadConversations = async () => {
    try {
      const response = await conversationAPI.getAll()
      setConversations(response.data.conversations)
      if (response.data.conversations.length > 0) {
        setSelectedConversation(response.data.conversations[0])
      }
    } catch (error) {
      toast.error('Failed to load conversations')
    } finally {
      setLoading(false)
    }
  }

  const handleNewMessage = (data) => {
    if (selectedConversation && data.conversationId === selectedConversation._id) {
      setSelectedConversation(prev => ({
        ...prev,
        messages: [...prev.messages, data.message]
      }))
    }
    
    setConversations(prev => 
      prev.map(conv => 
        conv._id === data.conversationId 
          ? { ...conv, messages: [...conv.messages, data.message] }
          : conv
      )
    )
  }

  const handleConversationUpdate = (updatedConversation) => {
    setConversations(prev => 
      prev.map(conv => 
        conv._id === updatedConversation._id 
          ? updatedConversation
          : conv
      )
    )
    
    // Update selected conversation if it's the one being updated
    if (selectedConversation && selectedConversation._id === updatedConversation._id) {
      setSelectedConversation(updatedConversation)
    }
  }

  const handleTyping = (data) => {
    if (selectedConversation && data.conversationId === selectedConversation._id) {
      setIsTyping(true)
    }
  }

  const handleStopTyping = (data) => {
    if (selectedConversation && data.conversationId === selectedConversation._id) {
      setIsTyping(false)
    }
  }

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!message.trim() || !selectedConversation) return

    const messageData = {
      content: message,
      role: 'operator'
    }

    try {
      await conversationAPI.sendMessage(selectedConversation._id, messageData)
      setMessage('')
    } catch (error) {
      toast.error('Failed to send message')
    }
  }

  const takeOverConversation = async (conversationId) => {
    try {
      const response = await conversationAPI.takeOver(conversationId)
      // Update local state immediately
      const updatedConversation = response.data.conversation
      setConversations(prev => 
        prev.map(conv => 
          conv._id === conversationId 
            ? updatedConversation
            : conv
        )
      )
      if (selectedConversation && selectedConversation._id === conversationId) {
        setSelectedConversation(updatedConversation)
      }
      toast.success('Conversation taken over')
    } catch (error) {
      toast.error('Failed to take over conversation')
    }
  }

  const resolveConversation = async (conversationId) => {
    try {
      const response = await conversationAPI.resolve(conversationId)
      // Update local state immediately
      const updatedConversation = response.data.conversation
      setConversations(prev => 
        prev.map(conv => 
          conv._id === conversationId 
            ? updatedConversation
            : conv
        )
      )
      if (selectedConversation && selectedConversation._id === conversationId) {
        setSelectedConversation(updatedConversation)
      }
      toast.success('Conversation resolved')
    } catch (error) {
      toast.error('Failed to resolve conversation')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="page-container" style={{ height: 'calc(100vh - 64px)', padding: 0 }}>
      <div style={{ display: 'flex', height: '100%' }}>
        {/* Conversation List */}
        <div style={{ width: '400px', borderRight: '1px solid var(--gray-200)', background: 'white', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '24px', borderBottom: '1px solid var(--gray-100)' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--gray-900)', margin: '0 0 4px 0' }}>Active Conversations</h2>
            <p style={{ fontSize: '14px', color: 'var(--gray-600)', margin: 0 }}>{conversations.length} conversations</p>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {conversations.map((conversation) => (
              <div
                key={conversation._id}
                onClick={() => setSelectedConversation(conversation)}
                style={{
                  padding: '20px 24px',
                  borderBottom: '1px solid var(--gray-100)',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s ease',
                  backgroundColor: selectedConversation?._id === conversation._id ? '#e0f2fe' : 'transparent',
                  borderLeft: selectedConversation?._id === conversation._id ? '4px solid #0ea5e9' : '4px solid transparent'
                }}
                onMouseEnter={(e) => {
                  if (selectedConversation?._id !== conversation._id) {
                    e.target.style.backgroundColor = 'var(--gray-50)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedConversation?._id !== conversation._id) {
                    e.target.style.backgroundColor = 'transparent'
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--gray-900)', margin: 0 }}>
                    {conversation.customer?.name || 'Anonymous'}
                  </h3>
                  <span style={{
                    padding: '4px 12px',
                    fontSize: '12px',
                    fontWeight: 500,
                    borderRadius: '20px',
                    backgroundColor: conversation.status === 'active' ? '#dcfce7' :
                      conversation.status === 'escalated' ? '#fef3c7' :
                      conversation.status === 'resolved' ? '#e5e7eb' : '#fde68a',
                    color: conversation.status === 'active' ? '#166534' :
                      conversation.status === 'escalated' ? '#92400e' :
                      conversation.status === 'resolved' ? '#374151' : '#d97706'
                  }}>
                    {conversation.status}
                  </span>
                </div>
                
                <p style={{
                  fontSize: '14px',
                  color: 'var(--gray-600)',
                  margin: '0 0 8px 0',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {conversation.messages[conversation.messages.length - 1]?.content || 'No messages'}
                </p>
                
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', color: 'var(--gray-500)' }}>
                    {new Date(conversation.lastActivity).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chat Interface */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'white' }}>
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div style={{ padding: '24px', borderBottom: '1px solid var(--gray-200)', background: 'white' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--gray-900)', margin: '0 0 4px 0' }}>
                      {selectedConversation.customer?.name || 'Anonymous'}
                    </h3>
                    <p style={{ fontSize: '14px', color: 'var(--gray-600)', margin: 0 }}>
                      {selectedConversation.customer?.email || 'No email'}
                    </p>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {/* Status Tab */}
                    <div style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: 600,
                      backgroundColor: selectedConversation.status === 'active' ? '#dcfce7' :
                        selectedConversation.status === 'escalated' ? '#fef3c7' :
                        selectedConversation.status === 'resolved' ? '#e5e7eb' : '#fde68a',
                      color: selectedConversation.status === 'active' ? '#166534' :
                        selectedConversation.status === 'escalated' ? '#92400e' :
                        selectedConversation.status === 'resolved' ? '#374151' : '#d97706',
                      border: `2px solid ${selectedConversation.status === 'active' ? '#bbf7d0' :
                        selectedConversation.status === 'escalated' ? '#fde68a' :
                        selectedConversation.status === 'resolved' ? '#d1d5db' : '#fed7aa'}`
                    }}>
                      {selectedConversation.status === 'active' ? 'AI Handling' :
                       selectedConversation.status === 'escalated' ? 'Human Required' :
                       selectedConversation.status === 'resolved' ? 'Resolved' : selectedConversation.status}
                    </div>
                    
                    {/* Action Buttons */}
                    {selectedConversation.status === 'active' && (
                      <button
                        onClick={() => takeOverConversation(selectedConversation._id)}
                        className="btn btn-primary btn-sm"
                      >
                        Take Over
                      </button>
                    )}
                    
                    {(selectedConversation.status === 'active' || selectedConversation.status === 'escalated') && (
                      <button
                        onClick={() => resolveConversation(selectedConversation._id)}
                        className="btn btn-secondary btn-sm"
                        style={{ backgroundColor: 'var(--green-600)', color: 'white', border: 'none' }}
                      >
                        Resolve
                      </button>
                    )}
                    
                    {selectedConversation.status === 'resolved' && (
                      <span style={{
                        padding: '8px 16px',
                        fontSize: '14px',
                        fontWeight: 600,
                        color: '#374151',
                        backgroundColor: '#f3f4f6',
                        borderRadius: '6px',
                        border: '1px solid #d1d5db'
                      }}>
                        Conversation Closed
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--gray-50)' }}>
                {selectedConversation.messages.map((msg, index) => (
                  <div
                    key={index}
                    style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-start' : 'flex-end' }}
                  >
                    <div style={{
                      maxWidth: '70%',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}>
                      <div
                        style={{
                          padding: '12px 16px',
                          borderRadius: '16px',
                          fontSize: '14px',
                          lineHeight: '1.5',
                          ...(msg.role === 'user' ? {
                            background: 'white',
                            color: 'var(--gray-900)',
                            border: '1px solid var(--gray-200)',
                            borderBottomLeftRadius: '4px'
                          } : msg.role === 'assistant' ? {
                            background: 'linear-gradient(135deg, var(--purple-500) 0%, var(--indigo-600) 100%)',
                            color: 'white',
                            borderBottomRightRadius: '4px'
                          } : {
                            background: 'linear-gradient(135deg, var(--blue-500) 0%, var(--purple-600) 100%)',
                            color: 'white',
                            borderBottomRightRadius: '4px'
                          })
                        }}
                      >
                        {msg.role === 'assistant' ? (
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
                            {msg.content}
                          </ReactMarkdown>
                        ) : (
                          msg.content
                        )}
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: 'var(--gray-500)',
                        textAlign: msg.role === 'user' ? 'left' : 'right',
                        padding: '0 4px'
                      }}>
                        {msg.role === 'assistant' && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginRight: '8px' }}>
                            <BoltIcon style={{ width: '12px', height: '12px' }} />
                            AI
                          </span>
                        )}
                        {new Date(msg.timestamp).toLocaleTimeString()}
                        {msg.metadata?.confidence && (
                          <span style={{ marginLeft: '8px' }}>
                            ({Math.round(msg.metadata.confidence)}% confidence)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {isTyping && (
                  <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                    <div style={{ backgroundColor: 'white', padding: '12px 16px', borderRadius: '16px', border: '1px solid var(--gray-200)' }}>
                      <LoadingSpinner size="sm" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input - Only show for escalated conversations or resolved status message */}
              {selectedConversation.status === 'escalated' ? (
                <form onSubmit={sendMessage} style={{ padding: '24px', borderTop: '1px solid var(--gray-200)', background: 'white' }}>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <input
                      type="text"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Type your message..."
                      className="input"
                      style={{ flex: 1 }}
                    />
                    <button
                      type="submit"
                      disabled={!message.trim()}
                      className="btn btn-primary"
                      style={{ minWidth: '80px' }}
                    >
                      Send
                    </button>
                  </div>
                </form>
              ) : selectedConversation.status === 'resolved' ? (
                <div style={{ padding: '24px', borderTop: '1px solid var(--gray-200)', background: '#f9fafb', textAlign: 'center' }}>
                  <p style={{ fontSize: '14px', color: '#6b7280', margin: 0, fontStyle: 'italic' }}>
                    This conversation has been resolved and is now closed.
                  </p>
                </div>
              ) : (
                <div style={{ padding: '24px', borderTop: '1px solid var(--gray-200)', background: '#f0f9ff', textAlign: 'center' }}>
                  <p style={{ fontSize: '14px', color: '#0369a1', margin: 0, fontWeight: 500 }}>
                    AI is handling this conversation. Click "Take Over" to join the chat.
                  </p>
                </div>
              )}
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ fontSize: '16px', color: 'var(--gray-500)' }}>Select a conversation to start chatting</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Widget

const styles = `
  @keyframes bounce {
    0%, 80%, 100% {
      transform: scale(0);
    }
    40% {
      transform: scale(1);
    }
  }
`

// Add styles to head
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style')
  styleSheet.type = 'text/css'
  styleSheet.innerText = styles
  document.head.appendChild(styleSheet)
}