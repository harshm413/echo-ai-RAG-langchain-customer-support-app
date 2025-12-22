import React, { createContext, useContext, useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from './AuthContext'
import toast from 'react-hot-toast'

const SocketContext = createContext()

export const useSocket = () => {
  const context = useContext(SocketContext)
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider')
  }
  return context
}

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null)
  const [connected, setConnected] = useState(false)
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      const token = localStorage.getItem('token')
      
      try {
        const newSocket = io('http://localhost:5000', {
          auth: { token },
          timeout: 5000,
          forceNew: true
        })

        newSocket.on('connect', () => {
          console.log('Connected to server')
          setConnected(true)
        })

        newSocket.on('disconnect', () => {
          console.log('Disconnected from server')
          setConnected(false)
        })

        newSocket.on('connect_error', (error) => {
          console.warn('Socket connection error:', error.message)
          setConnected(false)
          // Don't show toast for connection errors to avoid spam
        })

        // Listen for conversation updates
        newSocket.on('conversation_created', (conversation) => {
          toast.success('New conversation started')
        })

        newSocket.on('conversation_updated', (conversation) => {
          // Handle conversation updates
        })

        newSocket.on('message_received', (data) => {
          // Handle new messages
        })

        newSocket.on('user_typing', (data) => {
          // Handle typing indicators
        })

        setSocket(newSocket)

        return () => {
          newSocket.close()
        }
      } catch (error) {
        console.warn('Failed to initialize socket:', error)
        setConnected(false)
      }
    } else {
      if (socket) {
        socket.close()
        setSocket(null)
        setConnected(false)
      }
    }
  }, [user])

  const joinConversation = (conversationId) => {
    if (socket && connected) {
      socket.emit('join_conversation', conversationId)
    }
  }

  const leaveConversation = (conversationId) => {
    if (socket && connected) {
      socket.emit('leave_conversation', conversationId)
    }
  }

  const sendMessage = (conversationId, content, role = 'operator') => {
    if (socket && connected) {
      socket.emit('send_message', { conversationId, content, role })
    }
  }

  const updateConversationStatus = (conversationId, status, resolution) => {
    if (socket && connected) {
      socket.emit('update_conversation_status', { conversationId, status, resolution })
    }
  }

  const assignConversation = (conversationId, operatorId) => {
    if (socket && connected) {
      socket.emit('assign_conversation', { conversationId, operatorId })
    }
  }

  const startTyping = (conversationId) => {
    if (socket && connected) {
      socket.emit('typing_start', { conversationId })
    }
  }

  const stopTyping = (conversationId) => {
    if (socket && connected) {
      socket.emit('typing_stop', { conversationId })
    }
  }

  const value = {
    socket,
    connected,
    joinConversation,
    leaveConversation,
    sendMessage,
    updateConversationStatus,
    assignConversation,
    startTyping,
    stopTyping
  }

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  )
}