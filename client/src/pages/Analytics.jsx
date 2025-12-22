import { useState, useEffect } from 'react'
import { 
  ChartBarIcon, 
  ChatBubbleLeftRightIcon, 
  UserGroupIcon, 
  ClockIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CalendarIcon,
  ArrowPathIcon,
  BoltIcon,
  StarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  EyeIcon,
  DocumentChartBarIcon,
  PresentationChartLineIcon
} from '@heroicons/react/24/outline'
import LoadingSpinner from '../components/LoadingSpinner'

export default function Analytics() {
  const [stats, setStats] = useState({
    totalConversations: 0,
    activeConversations: 0,
    avgResponseTime: 0,
    customerSatisfaction: 0,
    aiResolutionRate: 0,
    humanEscalationRate: 0,
    dailyVolume: 0,
    weeklyGrowth: 0,
    monthlyGrowth: 0,
    totalResolved: 0,
    avgSessionDuration: 0
  })
  const [timeRange, setTimeRange] = useState('7d')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchAnalytics()
  }, [timeRange])

  const fetchAnalytics = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    
    try {
      // Mock data for demo
      await new Promise(resolve => setTimeout(resolve, isRefresh ? 500 : 1000))
      
      setStats({
        totalConversations: 1247,
        activeConversations: 23,
        avgResponseTime: 1.2,
        customerSatisfaction: 4.2,
        aiResolutionRate: 84,
        humanEscalationRate: 16,
        dailyVolume: 45,
        weeklyGrowth: 12.5,
        monthlyGrowth: 28.3,
        totalResolved: 1156,
        avgSessionDuration: 8.5
      })
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const statCards = [
    {
      name: 'Total Conversations',
      value: stats.totalConversations.toLocaleString(),
      change: '+12.5%',
      trend: 'up',
      icon: ChatBubbleLeftRightIcon,
      gradient: 'from-blue-500 to-blue-600',
      description: 'vs last period',
      bgColor: 'bg-blue-50'
    },
    {
      name: 'Active Now',
      value: stats.activeConversations,
      change: '+3',
      trend: 'up',
      icon: UserGroupIcon,
      gradient: 'from-green-500 to-green-600',
      description: 'currently active',
      bgColor: 'bg-green-50'
    },
    {
      name: 'Avg Response Time',
      value: `${stats.avgResponseTime}min`,
      change: '-0.3min',
      trend: 'down',
      icon: ClockIcon,
      gradient: 'from-orange-500 to-orange-600',
      description: 'improvement',
      bgColor: 'bg-orange-50'
    },
    {
      name: 'Customer Satisfaction',
      value: `${stats.customerSatisfaction}/5`,
      change: '+0.2',
      trend: 'up',
      icon: StarIcon,
      gradient: 'from-purple-500 to-purple-600',
      description: 'rating average',
      bgColor: 'bg-purple-50'
    }
  ]

  const performanceMetrics = [
    {
      name: 'AI Resolution Rate',
      value: stats.aiResolutionRate,
      target: 80,
      color: 'var(--blue-500)',
      bgColor: 'var(--blue-50)',
      description: 'Conversations resolved by AI without human intervention',
      icon: BoltIcon
    },
    {
      name: 'Human Escalation Rate',
      value: stats.humanEscalationRate,
      target: 20,
      color: 'var(--yellow-500)',
      bgColor: 'var(--yellow-50)',
      description: 'Conversations that required human agent assistance',
      icon: ExclamationTriangleIcon
    },
    {
      name: 'Customer Satisfaction',
      value: (stats.customerSatisfaction / 5) * 100,
      target: 85,
      color: 'var(--green-500)',
      bgColor: 'var(--green-50)',
      description: 'Overall customer satisfaction score',
      icon: StarIcon
    },
    {
      name: 'Resolution Success',
      value: (stats.totalResolved / stats.totalConversations) * 100,
      target: 90,
      color: 'var(--purple-500)',
      bgColor: 'var(--purple-50)',
      description: 'Successfully resolved conversations',
      icon: CheckCircleIcon
    }
  ]

  const timeRangeLabels = {
    '24h': 'Last 24 hours',
    '7d': 'Last 7 days',
    '30d': 'Last 30 days',
    '90d': 'Last 90 days'
  }

  if (loading) {
    return (
      <div className="page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
        <div style={{ textAlign: 'center' }}>
          <LoadingSpinner size="lg" />
          <p style={{ marginTop: '16px', color: 'var(--gray-600)' }}>Loading analytics...</p>
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
          width: '200px',
          height: '200px',
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 51, 234, 0.1) 100%)',
          borderRadius: '50%',
          transform: 'translate(100px, -100px)'
        }}></div>
        
        <div className="card-body" style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  background: 'linear-gradient(135deg, var(--blue-500) 0%, var(--purple-600) 100%)',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <DocumentChartBarIcon style={{ width: '20px', height: '20px', color: 'white' }} />
                </div>
                <h1 style={{ fontSize: '32px', fontWeight: 700, color: 'var(--gray-900)', margin: 0 }}>
                  Analytics Dashboard
                </h1>
              </div>
              <p style={{ fontSize: '16px', color: 'var(--gray-600)', margin: 0 }}>
                Monitor your customer support performance and AI effectiveness for {timeRangeLabels[timeRange].toLowerCase()}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="input"
                style={{ minWidth: '150px' }}
              >
                <option value="24h">Last 24 hours</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
              </select>
              <button 
                onClick={() => fetchAnalytics(true)}
                className="btn btn-ghost btn-sm"
                disabled={refreshing}
                style={{ minWidth: '44px' }}
              >
                {refreshing ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <ArrowPathIcon style={{ width: '16px', height: '16px' }} />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4" style={{ marginBottom: '32px' }}>
        {statCards.map((stat, index) => (
          <div key={stat.name} className="card-hover" style={{
            background: 'white',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: 'var(--shadow-sm)',
            border: '1px solid var(--gray-200)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Background gradient */}
            <div style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: '80px',
              height: '80px',
              background: `linear-gradient(135deg, ${stat.gradient.includes('blue') ? 'rgba(59, 130, 246, 0.1)' : 
                stat.gradient.includes('green') ? 'rgba(34, 197, 94, 0.1)' :
                stat.gradient.includes('orange') ? 'rgba(249, 115, 22, 0.1)' :
                'rgba(147, 51, 234, 0.1)'} 0%, transparent 70%)`,
              borderRadius: '50%',
              transform: 'translate(40px, -40px)'
            }}></div>
            
            <div style={{ position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  background: `linear-gradient(135deg, ${stat.gradient.replace('from-', 'var(--').replace('to-', 'var(--').replace('-500', '-500)').replace('-600', '-600)')})`,
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: 'var(--shadow-lg)'
                }}>
                  <stat.icon style={{ width: '24px', height: '24px', color: 'white' }} />
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 600,
                  backgroundColor: stat.trend === 'up' ? 'var(--green-100)' : 'var(--red-100)',
                  color: stat.trend === 'up' ? 'var(--green-700)' : 'var(--red-700)'
                }}>
                  {stat.trend === 'up' ? (
                    <ArrowTrendingUpIcon style={{ width: '12px', height: '12px' }} />
                  ) : (
                    <ArrowTrendingDownIcon style={{ width: '12px', height: '12px' }} />
                  )}
                  <span>{stat.change}</span>
                </div>
              </div>
              <div>
                <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--gray-600)', margin: '0 0 8px 0' }}>
                  {stat.name}
                </p>
                <p style={{ fontSize: '32px', fontWeight: 700, color: 'var(--gray-900)', margin: '0 0 4px 0' }}>
                  {stat.value}
                </p>
                <p style={{ fontSize: '12px', color: 'var(--gray-500)', margin: 0 }}>
                  {stat.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Enhanced Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2" style={{ marginBottom: '32px' }}>
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                background: 'linear-gradient(135deg, var(--blue-500) 0%, var(--purple-600) 100%)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <PresentationChartLineIcon style={{ width: '16px', height: '16px', color: 'white' }} />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--gray-900)', margin: 0 }}>
                Performance Metrics
              </h3>
            </div>
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {performanceMetrics.map((metric) => (
                <div key={metric.name} style={{
                  padding: '20px',
                  borderRadius: '12px',
                  border: '1px solid var(--gray-200)',
                  background: 'linear-gradient(135deg, white 0%, var(--gray-50) 100%)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: '24px',
                        height: '24px',
                        backgroundColor: metric.bgColor,
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <metric.icon style={{ width: '14px', height: '14px', color: metric.color }} />
                      </div>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--gray-700)' }}>
                        {metric.name}
                      </span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--gray-900)' }}>
                        {Math.round(metric.value)}%
                      </span>
                      <div style={{ fontSize: '10px', color: 'var(--gray-500)' }}>
                        Target: {metric.target}%
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ position: 'relative' }}>
                    <div style={{
                      width: '100%',
                      height: '8px',
                      backgroundColor: 'var(--gray-200)',
                      borderRadius: '4px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${metric.value}%`,
                        height: '100%',
                        background: `linear-gradient(90deg, ${metric.color} 0%, ${metric.color}dd 100%)`,
                        borderRadius: '4px',
                        transition: 'width 0.8s ease',
                        position: 'relative'
                      }}>
                        <div style={{
                          position: 'absolute',
                          right: 0,
                          top: 0,
                          width: '4px',
                          height: '100%',
                          backgroundColor: metric.color,
                          borderRadius: '2px'
                        }}></div>
                      </div>
                    </div>
                    {/* Target line */}
                    <div style={{
                      position: 'absolute',
                      left: `${metric.target}%`,
                      top: '-2px',
                      width: '2px',
                      height: '12px',
                      backgroundColor: 'var(--gray-400)',
                      borderRadius: '1px'
                    }}></div>
                  </div>
                  
                  <p style={{ fontSize: '12px', color: 'var(--gray-500)', margin: '8px 0 0 0' }}>
                    {metric.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Enhanced Chart Section */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                background: 'linear-gradient(135deg, var(--green-500) 0%, var(--blue-500) 100%)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <ChartBarIcon style={{ width: '16px', height: '16px', color: 'white' }} />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--gray-900)', margin: 0 }}>
                Volume Trends
              </h3>
            </div>
          </div>
          <div className="card-body">
            {/* Mock Chart Area */}
            <div style={{
              height: '200px',
              background: 'linear-gradient(135deg, var(--blue-50) 0%, var(--purple-50) 100%)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px dashed var(--blue-300)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Mock chart bars */}
              <div style={{
                position: 'absolute',
                bottom: '20px',
                left: '20px',
                right: '20px',
                height: '120px',
                display: 'flex',
                alignItems: 'end',
                gap: '8px'
              }}>
                {[65, 45, 78, 56, 89, 67, 92, 74, 83, 91, 76, 88].map((height, index) => (
                  <div key={index} style={{
                    flex: 1,
                    height: `${height}%`,
                    background: `linear-gradient(180deg, var(--blue-400) 0%, var(--blue-600) 100%)`,
                    borderRadius: '2px 2px 0 0',
                    opacity: 0.7,
                    animation: `fadeIn 0.5s ease ${index * 0.1}s both`
                  }}></div>
                ))}
              </div>
              
              <div style={{ textAlign: 'center', color: 'var(--gray-600)', zIndex: 1 }}>
                <ChartBarIcon style={{ width: '48px', height: '48px', margin: '0 auto 12px', color: 'var(--blue-400)' }} />
                <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--gray-700)' }}>Interactive Charts</div>
                <div style={{ fontSize: '14px', color: 'var(--gray-500)' }}>Coming in next update</div>
              </div>
            </div>
            
            {/* Stats below chart */}
            <div style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ textAlign: 'center', padding: '16px', backgroundColor: 'var(--green-50)', borderRadius: '8px' }}>
                <p style={{ fontSize: '12px', color: 'var(--gray-500)', margin: '0 0 4px 0' }}>Daily Average</p>
                <p style={{ fontSize: '20px', fontWeight: 700, color: 'var(--green-600)', margin: 0 }}>
                  {stats.dailyVolume}
                </p>
                <p style={{ fontSize: '10px', color: 'var(--gray-500)', margin: 0 }}>conversations</p>
              </div>
              <div style={{ textAlign: 'center', padding: '16px', backgroundColor: 'var(--blue-50)', borderRadius: '8px' }}>
                <p style={{ fontSize: '12px', color: 'var(--gray-500)', margin: '0 0 4px 0' }}>Growth Rate</p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                  <ArrowTrendingUpIcon style={{ width: '16px', height: '16px', color: 'var(--blue-600)' }} />
                  <span style={{ fontSize: '20px', fontWeight: 700, color: 'var(--blue-600)' }}>
                    +{stats.weeklyGrowth}%
                  </span>
                </div>
                <p style={{ fontSize: '10px', color: 'var(--gray-500)', margin: 0 }}>this week</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Detailed Analytics */}
      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                background: 'linear-gradient(135deg, var(--purple-500) 0%, var(--pink-500) 100%)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <EyeIcon style={{ width: '16px', height: '16px', color: 'white' }} />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--gray-900)', margin: 0 }}>
                Detailed Insights
              </h3>
            </div>
            <button className="btn btn-secondary btn-sm">
              <CalendarIcon style={{ width: '16px', height: '16px', marginRight: '8px' }} />
              Export Report
            </button>
          </div>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-3">
            {[
              {
                title: 'Response Time Distribution',
                description: 'Breakdown of response times across different periods',
                value: '< 2 min',
                subValue: 'average',
                trend: 'Improving by 15%',
                icon: ClockIcon,
                color: 'var(--orange-500)',
                bgColor: 'var(--orange-50)'
              },
              {
                title: 'Resolution Categories',
                description: 'Most common types of issues being resolved',
                value: 'Technical',
                subValue: '45% of issues',
                trend: 'Billing: 30%',
                icon: CheckCircleIcon,
                color: 'var(--green-500)',
                bgColor: 'var(--green-50)'
              },
              {
                title: 'Customer Feedback',
                description: 'Recent satisfaction ratings and comments',
                value: '4.2/5',
                subValue: 'stars',
                trend: '89% positive',
                icon: StarIcon,
                color: 'var(--yellow-500)',
                bgColor: 'var(--yellow-50)'
              }
            ].map((item, index) => (
              <div key={index} style={{
                padding: '24px',
                border: '1px solid var(--gray-200)',
                borderRadius: '16px',
                textAlign: 'center',
                background: 'linear-gradient(135deg, white 0%, var(--gray-50) 100%)',
                position: 'relative',
                overflow: 'hidden'
              }}>
                {/* Background decoration */}
                <div style={{
                  position: 'absolute',
                  top: '-20px',
                  right: '-20px',
                  width: '60px',
                  height: '60px',
                  backgroundColor: item.bgColor,
                  borderRadius: '50%',
                  opacity: 0.5
                }}></div>
                
                <div style={{ position: 'relative' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    backgroundColor: item.bgColor,
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px'
                  }}>
                    <item.icon style={{ width: '24px', height: '24px', color: item.color }} />
                  </div>
                  
                  <h4 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--gray-900)', margin: '0 0 8px 0' }}>
                    {item.title}
                  </h4>
                  <p style={{ fontSize: '14px', color: 'var(--gray-600)', margin: '0 0 16px 0', lineHeight: 1.4 }}>
                    {item.description}
                  </p>
                  
                  <div style={{ marginBottom: '8px' }}>
                    <span style={{ fontSize: '24px', fontWeight: 700, color: item.color }}>
                      {item.value}
                    </span>
                    <span style={{ fontSize: '14px', color: 'var(--gray-500)', marginLeft: '4px' }}>
                      {item.subValue}
                    </span>
                  </div>
                  
                  <div style={{
                    fontSize: '12px',
                    color: 'var(--gray-500)',
                    padding: '4px 8px',
                    backgroundColor: item.bgColor,
                    borderRadius: '12px',
                    display: 'inline-block'
                  }}>
                    {item.trend}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add keyframes for animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}