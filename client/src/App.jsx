import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Conversations from './pages/Conversations'
import ConversationDetail from './pages/ConversationDetail'
import KnowledgeBase from './pages/KnowledgeBase'
import Settings from './pages/Settings'
import Widget from './pages/Widget'
import TestChat from './pages/TestChat'
import CustomerPortal from './pages/CustomerPortal'
import CustomerChat from './pages/CustomerChat'
import WidgetEmbed from './pages/WidgetEmbed'
import LoadingSpinner from './components/LoadingSpinner'

function App() {
  const { user, loading } = useAuth()
  
  console.log('App render - loading:', loading, 'user:', user)

  if (loading) {
    console.log('App showing loading spinner')
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, var(--slate-50) 0%, var(--blue-50) 50%, var(--indigo-100) 100%)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <LoadingSpinner size="lg" />
          <p style={{ marginTop: '16px', color: 'var(--gray-600)', fontSize: '16px' }}>
            Loading Echo Support...
          </p>
        </div>
      </div>
    )
  }

  return (
    <Routes>
      {/* Public routes - no authentication required */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/customer-chat" element={<CustomerChat />} />
      
      {/* Protected routes - authentication required */}
      <Route path="/*" element={
        user ? (
          <Layout>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/conversations" element={<Conversations />} />
              <Route path="/conversations/:id" element={<ConversationDetail />} />
              <Route path="/knowledge-base" element={<KnowledgeBase />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/widget" element={<Widget />} />
              <Route path="/widget-setup" element={<WidgetEmbed />} />
              <Route path="/test-chat" element={<TestChat />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Layout>
        ) : (
          <Navigate to="/login" replace />
        )
      } />
    </Routes>
  )
}

export default App