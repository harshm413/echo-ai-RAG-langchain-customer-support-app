import axios from 'axios'

const API_BASE_URL = 'http://localhost:5000/api'

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 5000, // 5 second timeout
})

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle auth errors and network errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle network errors (server not running)
    if (error.code === 'ECONNABORTED' ||
      error.message === 'Network Error' ||
      error.code === 'ERR_NETWORK' ||
      !error.response) {
      console.warn('Backend server is not running or not reachable')
      return Promise.reject(new Error('Backend server is not available'))
    }

    // Handle authentication errors
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname
      // Only redirect if not already on login/register page
      if (currentPath !== '/login' && currentPath !== '/register') {
        localStorage.removeItem('token')
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  }
)

// Auth API
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (userData) => api.post('/auth/register', userData),
  me: () => api.get('/auth/me'),
  refresh: () => api.post('/auth/refresh'),
}

// Conversations API
export const conversationsAPI = {
  getAll: (params) => api.get('/conversations', { params }),
  getById: (id) => api.get(`/conversations/${id}`),
  create: (data) => api.post('/conversations', data),
  addMessage: (id, data) => api.post(`/conversations/${id}/messages`, data),
  updateStatus: (id, data) => api.patch(`/conversations/${id}/status`, data),
  assign: (id, data) => api.patch(`/conversations/${id}/assign`, data),
  updateTags: (id, data) => api.patch(`/conversations/${id}/tags`, data),
}

// Knowledge Base API
export const knowledgeBaseAPI = {
  getAll: (params) => api.get('/knowledge-base', { params }),
  getById: (id) => api.get(`/knowledge-base/${id}`),
  create: (data) => api.post('/knowledge-base', data),
  update: (id, data) => api.put(`/knowledge-base/${id}`, data),
  delete: (id) => api.delete(`/knowledge-base/${id}`),
  upload: (formData) => api.post('/knowledge-base/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  search: (data) => api.post('/knowledge-base/search', data),
}

// Organizations API
export const organizationsAPI = {
  getCurrent: () => api.get('/organizations/current'),
  update: (data) => api.put('/organizations/current', data),
  getSettings: () => api.get('/organizations/settings'),
  updateSettings: (data) => api.put('/organizations/settings', data),
  getWidgetConfig: () => api.get('/organizations/widget-config'),
  updateWidgetConfig: (data) => api.put('/organizations/widget-config', data),
}

// Conversation API (for widget interface)
export const conversationAPI = {
  getAll: (params) => api.get('/conversations', { params }),
  getById: (id) => api.get(`/conversations/${id}`),
  sendMessage: (id, data) => api.post(`/conversations/${id}/messages`, data),
  takeOver: (id) => api.post(`/conversations/${id}/takeover`),
  resolve: (id) => api.post(`/conversations/${id}/resolve`),
  escalate: (id, data) => api.post(`/conversations/${id}/escalate`, data),
}

// Analytics API
export const analyticsAPI = {
  getDashboard: (params) => api.get('/analytics/dashboard', { params }),
  getConversations: (params) => api.get('/analytics/conversations', { params }),
  getPerformance: (params) => api.get('/analytics/performance', { params }),
}

export default api