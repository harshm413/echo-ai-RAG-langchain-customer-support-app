import { useState } from 'react'
import { useQuery } from 'react-query'
import { Link } from 'react-router-dom'
import { conversationsAPI } from '../services/api'
import { useSocket } from '../contexts/SocketContext'
import {
  ChatBubbleLeftRightIcon,
  UserIcon,
  ClockIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  PlusIcon
} from '@heroicons/react/24/outline'
import LoadingSpinner from '../components/LoadingSpinner'

const statusColors = {
  active: { bg: '#dcfce7', color: '#166534', border: '#bbf7d0' },
  resolved: { bg: '#dbeafe', color: '#1e40af', border: '#bfdbfe' },
  escalated: { bg: '#fef3c7', color: '#92400e', border: '#fde68a' },
  closed: { bg: '#f3f4f6', color: '#374151', border: '#d1d5db' }
}

export default function Conversations() {
  const [filters, setFilters] = useState({
    status: '',
    search: '',
    page: 1,
    limit: 20
  })
  const { connected } = useSocket()

  const { data, isLoading, refetch } = useQuery(
    ['conversations', filters],
    () => {
      console.log('Fetching conversations with filters:', filters)
      return conversationsAPI.getAll(filters)
    },
    {
      refetchInterval: connected ? 30000 : false,
      keepPreviousData: true,
      onSuccess: (data) => {
        console.log('Conversations API response:', data)
      },
      onError: (error) => {
        console.error('Conversations API error:', error)
      }
    }
  )

  const conversations = data?.data?.conversations || []
  const pagination = data?.data?.pagination || {}

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1
    }))
  }

  const handlePageChange = (page) => {
    setFilters(prev => ({ ...prev, page }))
  }

  if (isLoading && !conversations.length) {
    return (
      <div className="page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
        <div style={{ textAlign: 'center' }}>
          <LoadingSpinner size="lg" />
          <p style={{ marginTop: '16px', color: 'var(--gray-600)' }}>Loading conversations...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="card" style={{ marginBottom: '32px' }}>
        <div className="card-body">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{ fontSize: '32px', fontWeight: 700, color: 'var(--gray-900)', margin: '0 0 8px 0' }}>
                Conversations
              </h1>
              <p style={{ fontSize: '16px', color: 'var(--gray-600)', margin: 0 }}>
                Manage customer conversations and support requests
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div className={`status-dot ${connected ? '' : 'offline'}`} />
                <span style={{ fontSize: '14px', color: 'var(--gray-500)', fontWeight: 500 }}>
                  {connected ? 'Live updates' : 'Offline'}
                </span>
              </div>
              <Link 
                to="/test-chat"
                className="btn btn-primary"
              >
                <PlusIcon style={{ width: '16px', height: '16px', marginRight: '8px' }} />
                Test AI Chat
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-body">
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <FunnelIcon style={{ width: '20px', height: '20px', color: 'var(--gray-400)' }} />
              <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--gray-700)' }}>Filters:</span>
            </div>
            
            <div style={{ flex: 1, maxWidth: '300px', position: 'relative' }}>
              <MagnifyingGlassIcon style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '16px',
                height: '16px',
                color: 'var(--gray-400)'
              }} />
              <input
                type="text"
                placeholder="Search conversations..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="input"
                style={{ paddingLeft: '40px' }}
              />
            </div>

            <div>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="input"
                style={{ minWidth: '150px' }}
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="escalated">Escalated</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Conversations List */}
      <div className="card">
        {conversations.length > 0 ? (
          <div>
            {conversations.map((conversation, index) => (
              <Link
                key={conversation._id}
                to={`/conversations/${conversation._id}`}
                style={{
                  display: 'block',
                  padding: '24px',
                  textDecoration: 'none',
                  color: 'inherit',
                  borderBottom: index < conversations.length - 1 ? '1px solid var(--gray-100)' : 'none',
                  transition: 'background-color 0.2s ease'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--gray-50)'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0, maxWidth: 'calc(100% - 140px)' }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, var(--blue-500) 0%, var(--purple-600) 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: '16px',
                      flexShrink: 0
                    }}>
                      {conversation.customer?.name ? (
                        <span style={{ color: 'white', fontWeight: 600, fontSize: '16px' }}>
                          {conversation.customer.name.charAt(0).toUpperCase()}
                        </span>
                      ) : (
                        <UserIcon style={{ width: '24px', height: '24px', color: 'white' }} />
                      )}
                    </div>
                    
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                        <h3 style={{
                          fontSize: '16px',
                          fontWeight: 600,
                          color: 'var(--gray-900)',
                          margin: 0,
                          marginRight: '12px'
                        }}>
                          {conversation.customer?.name || 'Anonymous User'}
                        </h3>
                        {conversation.customer?.email && (
                          <span style={{ fontSize: '14px', color: 'var(--gray-500)' }}>
                            ({conversation.customer.email})
                          </span>
                        )}
                      </div>
                      
                      <p style={{
                        fontSize: '14px',
                        color: 'var(--gray-600)',
                        margin: '0 0 8px 0',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        lineHeight: '1.4',
                        maxHeight: '2.8em'
                      }}>
                        {conversation.messages?.length > 0
                          ? conversation.messages[conversation.messages.length - 1].content
                          : 'No messages yet'
                        }
                      </p>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: 'var(--gray-500)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <ChatBubbleLeftRightIcon style={{ width: '14px', height: '14px' }} />
                          <span>{conversation.messages?.length || 0} messages</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <ClockIcon style={{ width: '14px', height: '14px' }} />
                          <span>
                            {new Date(conversation.lastActivity).toLocaleDateString()} at{' '}
                            {new Date(conversation.lastActivity).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', flexShrink: 0, width: '120px' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '6px 12px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: 600,
                      backgroundColor: statusColors[conversation.status]?.bg || '#f3f4f6',
                      color: statusColors[conversation.status]?.color || '#374151',
                      border: `1px solid ${statusColors[conversation.status]?.border || '#d1d5db'}`,
                      textTransform: 'capitalize',
                      whiteSpace: 'nowrap'
                    }}>
                      {conversation.status}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '64px 24px' }}>
            <ChatBubbleLeftRightIcon style={{
              width: '64px',
              height: '64px',
              color: 'var(--gray-400)',
              margin: '0 auto 16px'
            }} />
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--gray-900)', margin: '0 0 8px 0' }}>
              No conversations found
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--gray-500)', margin: '0 0 24px 0' }}>
              Customer conversations will appear here when they start chatting.
            </p>
            <Link 
              to="/test-chat"
              className="btn btn-primary"
            >
              <PlusIcon style={{ width: '16px', height: '16px', marginRight: '8px' }} />
              Start Test Chat
            </Link>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="card" style={{ marginTop: '24px' }}>
          <div className="card-body">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: '14px', color: 'var(--gray-700)', margin: 0 }}>
                  Showing{' '}
                  <span style={{ fontWeight: 500 }}>
                    {(pagination.page - 1) * pagination.limit + 1}
                  </span>{' '}
                  to{' '}
                  <span style={{ fontWeight: 500 }}>
                    {Math.min(pagination.page * pagination.limit, pagination.total)}
                  </span>{' '}
                  of <span style={{ fontWeight: 500 }}>{pagination.total}</span> results
                </p>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="btn btn-secondary btn-sm"
                  style={{ opacity: pagination.page <= 1 ? 0.5 : 1 }}
                >
                  Previous
                </button>
                
                {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                  const page = i + 1;
                  return (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={page === pagination.page ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
                    >
                      {page}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.pages}
                  className="btn btn-secondary btn-sm"
                  style={{ opacity: pagination.page >= pagination.pages ? 0.5 : 1 }}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}