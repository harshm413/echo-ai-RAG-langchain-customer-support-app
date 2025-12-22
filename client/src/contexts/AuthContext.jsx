import { createContext, useContext, useState, useEffect } from 'react'
import { authAPI } from '../services/api'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [organization, setOrganization] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  console.log('AuthProvider render - loading:', loading, 'user:', user, 'error:', error)

  useEffect(() => {
    console.log('AuthProvider useEffect triggered')
    const token = localStorage.getItem('token')
    console.log('Token from localStorage:', token ? 'exists' : 'not found')
    
    if (token) {
      checkAuth()
    } else {
      console.log('No token found, setting loading to false')
      setLoading(false)
    }
  }, [])

  const checkAuth = async () => {
    try {
      setError(null)
      const response = await authAPI.me()
      setUser(response.data.user)
      setOrganization(response.data.organization)
    } catch (error) {
      console.warn('Auth check failed:', error.message)
      
      // If it's a network error (backend not running), just clear auth state
      if (error.message === 'Backend server is not available' || 
          error.code === 'ECONNABORTED' || 
          error.message === 'Network Error') {
        console.warn('Backend server is not running - showing login page')
        localStorage.removeItem('token')
        setUser(null)
        setOrganization(null)
        setError(null) // Don't show error for network issues
      } else {
        // For other errors (like 401), show the error
        localStorage.removeItem('token')
        setError(error.response?.data?.error || error.message || 'Authentication failed')
        setUser(null)
        setOrganization(null)
      }
    } finally {
      setLoading(false)
    }
  }

  const login = async (email, password) => {
    try {
      setError(null)
      const response = await authAPI.login(email, password)
      const { token, user: userData, organization: orgData } = response.data
      
      localStorage.setItem('token', token)
      setUser(userData)
      setOrganization(orgData)
      
      return response.data
    } catch (error) {
      let errorMessage = 'Login failed'
      
      if (error.message === 'Backend server is not available') {
        errorMessage = 'Cannot connect to server. Please make sure the backend is running.'
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error
      } else if (error.message) {
        errorMessage = error.message
      }
      
      setError(errorMessage)
      throw error
    }
  }

  const register = async (userData) => {
    try {
      setError(null)
      const response = await authAPI.register(userData)
      const { token, user: newUser, organization: newOrg } = response.data
      
      localStorage.setItem('token', token)
      setUser(newUser)
      setOrganization(newOrg)
      
      return response.data
    } catch (error) {
      let errorMessage = 'Registration failed'
      
      if (error.message === 'Backend server is not available') {
        errorMessage = 'Cannot connect to server. Please make sure the backend is running.'
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error
      } else if (error.message) {
        errorMessage = error.message
      }
      
      setError(errorMessage)
      throw error
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    setUser(null)
    setOrganization(null)
    setError(null)
  }

  const value = {
    user,
    organization,
    loading,
    error,
    login,
    register,
    logout,
    checkAuth
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}