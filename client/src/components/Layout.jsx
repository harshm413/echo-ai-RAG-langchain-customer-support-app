import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useSocket } from '../contexts/SocketContext'
import {
  HomeIcon,
  ChatBubbleLeftRightIcon,
  BookOpenIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  Bars3Icon,
  XMarkIcon,
  BellIcon,
  SparklesIcon,
  BoltIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline'

const navigation = [
  { 
    name: 'Dashboard', 
    href: '/dashboard', 
    icon: HomeIcon,
    description: 'Overview & Analytics'
  },
  { 
    name: 'Conversations', 
    href: '/conversations', 
    icon: ChatBubbleLeftRightIcon,
    description: 'Customer Chats'
  },
  { 
    name: 'Widget', 
    href: '/widget', 
    icon: ChatBubbleLeftRightIcon,
    description: 'Live Chat Interface'
  },
  { 
    name: 'Knowledge Base', 
    href: '/knowledge-base', 
    icon: BookOpenIcon,
    description: 'AI Training Data'
  },
  { 
    name: 'Widget Setup', 
    href: '/widget-setup', 
    icon: Cog6ToothIcon,
    description: 'Embed Configuration'
  },
  { 
    name: 'Settings', 
    href: '/settings', 
    icon: Cog6ToothIcon,
    description: 'System Settings'
  },
]

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const { user, organization, logout } = useAuth()
  const { connected } = useSocket()
  const location = useLocation()

  const handleLogout = () => {
    logout()
    setUserMenuOpen(false)
  }

  return (
    <div className="app-layout">
      {/* Mobile Overlay */}
      <div 
        className={`mobile-overlay ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        {/* Mobile Close Button */}
        <button 
          className="mobile-menu-btn"
          onClick={() => setSidebarOpen(false)}
          style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 60 }}
        >
          <XMarkIcon />
        </button>

        {/* Sidebar Header */}
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">
              <SparklesIcon />
            </div>
            <div className="sidebar-logo-text">
              <h1>Echo Support</h1>
              <p>AI-Powered Platform</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={`sidebar-nav-item ${location.pathname === item.href ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <item.icon />
              <div className="sidebar-nav-item-content">
                <div className="sidebar-nav-item-title">{item.name}</div>
                <div className="sidebar-nav-item-desc">{item.description}</div>
              </div>
            </Link>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="sidebar-footer">
          <div className="sidebar-status">
            <div className="sidebar-status-indicator">
              <div className={`status-dot ${connected ? '' : 'offline'}`} />
              <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--slate-300)' }}>
                {connected ? 'AI System Online' : 'System Offline'}
              </span>
            </div>
            <BoltIcon style={{ width: '16px', height: '16px', color: 'var(--yellow-400)' }} />
          </div>
          
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user?.name || 'User'}</div>
              <div className="sidebar-user-org">{organization?.name || 'Organization'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {/* Header */}
        <header className="main-header">
          {/* Mobile Menu Button */}
          <button 
            className="mobile-menu-btn"
            onClick={() => setSidebarOpen(true)}
          >
            <Bars3Icon />
          </button>

          <div className="main-header-actions">
            {/* AI Status */}
            <div className="status-badge">
              <div className={`status-dot ${connected ? '' : 'offline'}`} />
              <span>{connected ? 'AI Active' : 'AI Offline'}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {/* Try Customer Chat Button */}
              <button 
                onClick={() => {
                  console.log('User:', user)
                  console.log('Organization:', organization)
                  const orgId = organization?._id || user?.organizationId
                  if (orgId) {
                    window.open(`/customer-chat?org=${orgId}`, '_blank')
                  } else {
                    alert('No organization found. Please refresh and try again.')
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              >
                <ChatBubbleLeftRightIcon style={{ width: '18px', height: '18px' }} />
                Try Customer Chat
              </button>

              {/* Notifications */}
              <button className="notification-btn">
                <BellIcon />
                <span className="notification-badge">3</span>
              </button>

              {/* User Menu */}
              <div className="user-menu">
                <button 
                  className="user-menu-button"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                >
                  <div className="user-avatar">
                    {user?.name?.charAt(0) || 'U'}
                  </div>
                  <div className="user-info">
                    <p className="user-name">{user?.name || 'User'}</p>
                    <p className="user-role">{user?.role || 'Admin'}</p>
                  </div>
                </button>

                {/* User Dropdown */}
                {userMenuOpen && (
                  <div 
                    style={{
                      position: 'absolute',
                      top: '100%',
                      right: 0,
                      marginTop: '8px',
                      width: '200px',
                      background: 'rgba(255, 255, 255, 0.9)',
                      backdropFilter: 'blur(12px)',
                      borderRadius: '16px',
                      boxShadow: 'var(--shadow-xl)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      padding: '8px',
                      zIndex: 50
                    }}
                  >
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255, 255, 255, 0.2)' }}>
                      <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--gray-900)', margin: 0 }}>
                        {user?.name}
                      </p>
                      <p style={{ fontSize: '12px', color: 'var(--gray-500)', margin: 0 }}>
                        {user?.email}
                      </p>
                      <p style={{ fontSize: '12px', color: 'var(--gray-400)', margin: '4px 0 0 0' }}>
                        {organization?.name}
                      </p>
                    </div>
                    
                    <Link
                      to="/settings"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '8px 16px',
                        fontSize: '14px',
                        color: 'var(--gray-700)',
                        textDecoration: 'none',
                        borderRadius: '8px',
                        transition: 'background-color 0.15s'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.5)'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <Cog6ToothIcon style={{ width: '16px', height: '16px', marginRight: '12px' }} />
                      Settings
                    </Link>
                    
                    <button
                      onClick={handleLogout}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        width: '100%',
                        padding: '8px 16px',
                        fontSize: '14px',
                        color: 'var(--gray-700)',
                        background: 'none',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'background-color 0.15s'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.5)'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                    >
                      <ArrowRightOnRectangleIcon style={{ width: '16px', height: '16px', marginRight: '12px' }} />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main Body */}
        <main className="main-body">
          {children}
        </main>
      </div>
    </div>
  )
}