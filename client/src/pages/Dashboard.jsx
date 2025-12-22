import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import { 
  ChatBubbleLeftRightIcon, 
  UserGroupIcon, 
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowUpIcon,
  SparklesIcon,
  BoltIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'

export default function Dashboard() {
  const { user, organization } = useAuth()
  const [stats, setStats] = useState({
    totalConversations: 0,
    activeConversations: 0,
    resolvedToday: 0,
    avgResponseTime: 0,
    aiResolutionRate: 0,
    customerSatisfaction: 0
  })
  const [recentActivity, setRecentActivity] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      // Fetch real analytics data
      const analyticsResponse = await api.get('/analytics/overview')
      const conversationsResponse = await api.get('/conversations?limit=5')
      
      setStats(analyticsResponse.data)
      
      // Convert conversations to activity feed
      const activities = conversationsResponse.data.conversations.map(conv => ({
        id: conv._id,
        type: conv.status === 'resolved' ? 'resolved' : conv.status === 'escalated' ? 'escalated' : 'new',
        message: `${conv.status === 'resolved' ? 'Resolved' : conv.status === 'escalated' ? 'Escalated' : 'New'} conversation with ${conv.customer?.name || 'Customer'}`,
        time: new Date(conv.updatedAt).toLocaleString(),
        icon: conv.status === 'resolved' ? CheckCircleIcon : conv.status === 'escalated' ? ExclamationTriangleIcon : ChatBubbleLeftRightIcon,
        color: conv.status === 'resolved' ? 'var(--green-500)' : conv.status === 'escalated' ? 'var(--yellow-500)' : 'var(--blue-500)'
      }))
      
      setRecentActivity(activities)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      // Keep dummy data as fallback
      setStats({
        totalConversations: 0,
        activeConversations: 0,
        resolvedToday: 0,
        avgResponseTime: 0,
        aiResolutionRate: 0,
        customerSatisfaction: 0
      })
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    {
      name: 'Total Conversations',
      value: stats.totalConversations.toLocaleString(),
      change: '+12%',
      icon: ChatBubbleLeftRightIcon,
      description: 'All time conversations'
    },
    {
      name: 'Active Now',
      value: stats.activeConversations,
      change: '+3',
      icon: UserGroupIcon,
      description: 'Currently active chats'
    },
    {
      name: 'Resolved Today',
      value: stats.resolvedToday,
      change: '+18%',
      icon: CheckCircleIcon,
      description: 'Successfully resolved'
    },
    {
      name: 'Response Time',
      value: `${stats.avgResponseTime}min`,
      change: '-0.3min',
      icon: ClockIcon,
      description: 'Average response time'
    }
  ]

  if (loading) {
    return (
      <div className="page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="loading-spinner lg"></div>
          <p style={{ marginTop: '16px', color: 'var(--gray-600)' }}>Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="card" style={{ marginBottom: '32px', position: 'relative', overflow: 'hidden' }}>
        {/* Background decoration */}
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '256px',
          height: '256px',
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 51, 234, 0.1) 100%)',
          borderRadius: '50%',
          transform: 'translate(128px, -128px)'
        }}></div>
        
        <div className="card-body" style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{ fontSize: '36px', fontWeight: 700, color: 'var(--gray-900)', margin: '0 0 8px 0' }}>
                Welcome back, {user?.name?.split(' ')[0]}! 👋
              </h1>
              <p style={{ fontSize: '18px', color: 'var(--gray-600)', margin: 0 }}>
                Your AI support system is running smoothly. Here's today's overview.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  background: 'linear-gradient(135deg, var(--blue-500) 0%, var(--purple-600) 100%)',
                  color: 'white',
                  padding: '12px 24px',
                  borderRadius: '16px',
                  fontSize: '14px',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: 'var(--shadow-lg)'
                }}>
                  <BoltIcon style={{ width: '20px', height: '20px' }} />
                  AI Powered
                </div>
                <div style={{ fontSize: '12px', color: 'var(--gray-500)', marginTop: '8px' }}>Next-gen support</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '14px', color: 'var(--gray-500)' }}>Organization</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--gray-900)' }}>{organization?.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--gray-500)' }}>Premium Plan</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4" style={{ marginBottom: '32px' }}>
        {statCards.map((stat, index) => (
          <div key={stat.name} className="stat-card">
            <div className="stat-card-header">
              <div className="stat-card-icon">
                <stat.icon />
              </div>
              <div className="stat-card-change">
                <ArrowUpIcon style={{ width: '12px', height: '12px' }} />
                <span>{stat.change}</span>
              </div>
            </div>
            <div>
              <p className="stat-card-title">{stat.name}</p>
              <p className="stat-card-value">{stat.value}</p>
              <p className="stat-card-desc">{stat.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-1" style={{ marginBottom: '32px' }}>
        {/* Recent Activity */}
        <div className="card">
          <div className="card-body">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--gray-900)', margin: '0 0 4px 0' }}>Live Activity</h3>
                <p style={{ fontSize: '14px', color: 'var(--gray-600)', margin: 0 }}>Real-time system events</p>
              </div>
              <div className="status-dot"></div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {recentActivity.map((activity) => (
                <div key={activity.id} style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '16px',
                  borderRadius: '12px',
                  border: '1px solid var(--gray-100)',
                  transition: 'background-color 0.2s ease'
                }} 
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--gray-50)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '12px',
                    background: `${activity.color}20`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <activity.icon style={{ width: '20px', height: '20px', color: activity.color }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--gray-900)', margin: '0 0 4px 0' }}>
                      {activity.message}
                    </p>
                    <p style={{ fontSize: '12px', color: 'var(--gray-500)', margin: 0 }}>
                      {activity.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            
            <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--gray-100)' }}>
              <button style={{
                width: '100%',
                textAlign: 'center',
                fontSize: '14px',
                color: 'var(--blue-600)',
                fontWeight: 500,
                padding: '8px 16px',
                borderRadius: '12px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--blue-50)'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
              onClick={() => window.location.href = '/conversations'}
              >
                View all conversations →
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}