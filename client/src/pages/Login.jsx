import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { 
  EyeIcon, 
  EyeSlashIcon, 
  SparklesIcon,
  BoltIcon,
  ChatBubbleLeftRightIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import LoadingSpinner from '../components/LoadingSpinner'

export default function Login() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [backendStatus, setBackendStatus] = useState('checking') // 'checking', 'online', 'offline'
  const { login, error } = useAuth()

  // Check backend status on component mount
  useEffect(() => {
    const checkBackendStatus = async () => {
      try {
        const response = await fetch('http://localhost:5000/health', { 
          method: 'GET',
          timeout: 3000 
        })
        if (response.ok) {
          setBackendStatus('online')
        } else {
          setBackendStatus('offline')
        }
      } catch (error) {
        setBackendStatus('offline')
      }
    }

    checkBackendStatus()
    // Check status every 30 seconds
    const interval = setInterval(checkBackendStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      await login(formData.email, formData.password)
      toast.success('Welcome back! 🎉')
    } catch (error) {
      toast.error(error.response?.data?.error || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, var(--slate-900) 0%, var(--blue-900) 50%, var(--indigo-900) 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '48px 16px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background Elements */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        <div style={{
          position: 'absolute',
          top: '-160px',
          right: '-160px',
          width: '320px',
          height: '320px',
          background: 'rgba(59, 130, 246, 0.2)',
          borderRadius: '50%',
          filter: 'blur(60px)'
        }}></div>
        <div style={{
          position: 'absolute',
          bottom: '-160px',
          left: '-160px',
          width: '320px',
          height: '320px',
          background: 'rgba(147, 51, 234, 0.2)',
          borderRadius: '50%',
          filter: 'blur(60px)'
        }}></div>
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '384px',
          height: '384px',
          background: 'rgba(99, 102, 241, 0.1)',
          borderRadius: '50%',
          filter: 'blur(60px)'
        }}></div>
      </div>

      <div style={{ maxWidth: '400px', width: '100%', position: 'relative', zIndex: 10 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
            <div style={{
              width: '64px',
              height: '64px',
              background: 'linear-gradient(135deg, var(--blue-500) 0%, var(--purple-600) 100%)',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-2xl)'
            }}>
              <SparklesIcon style={{ width: '32px', height: '32px', color: 'white' }} />
            </div>
          </div>
          <h2 style={{
            fontSize: '36px',
            fontWeight: 700,
            color: 'white',
            margin: '0 0 8px 0'
          }}>
            Welcome Back
          </h2>
          <p style={{
            fontSize: '18px',
            color: 'var(--slate-300)',
            margin: 0
          }}>
            Sign in to your Echo Support dashboard
          </p>
        </div>

        {/* Features Preview */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '16px',
          marginBottom: '32px'
        }}>
          {[
            { icon: BoltIcon, label: 'AI Powered', color: 'var(--yellow-400)' },
            { icon: ChatBubbleLeftRightIcon, label: 'Real-time Chat', color: 'var(--blue-400)' },
            { icon: ShieldCheckIcon, label: 'Secure', color: 'var(--green-400)' }
          ].map((feature, index) => (
            <div key={index} style={{ textAlign: 'center' }}>
              <div style={{
                width: '48px',
                height: '48px',
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(8px)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 8px'
              }}>
                <feature.icon style={{ width: '24px', height: '24px', color: feature.color }} />
              </div>
              <p style={{ fontSize: '12px', color: 'var(--slate-300)', margin: 0 }}>
                {feature.label}
              </p>
            </div>
          ))}
        </div>

        {/* Login Form */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.8)',
          backdropFilter: 'blur(12px)',
          borderRadius: '24px',
          padding: '32px',
          boxShadow: 'var(--shadow-2xl)',
          border: '1px solid rgba(71, 85, 105, 0.5)'
        }}>
          {/* Backend Status Indicator */}
          {backendStatus !== 'checking' && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 16px',
              borderRadius: '12px',
              marginBottom: '24px',
              background: backendStatus === 'online' 
                ? 'rgba(34, 197, 94, 0.1)' 
                : 'rgba(239, 68, 68, 0.1)',
              border: `1px solid ${backendStatus === 'online' 
                ? 'rgba(34, 197, 94, 0.3)' 
                : 'rgba(239, 68, 68, 0.3)'}`
            }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: backendStatus === 'online' ? 'var(--green-400)' : 'var(--red-400)'
              }} />
              <span style={{
                fontSize: '12px',
                color: backendStatus === 'online' ? 'var(--green-300)' : 'var(--red-300)',
                fontWeight: 500
              }}>
                {backendStatus === 'online' 
                  ? 'Server Online' 
                  : 'Server Offline - Please start the backend server'}
              </span>
              {backendStatus === 'offline' && (
                <ExclamationTriangleIcon style={{ width: '16px', height: '16px', color: 'var(--red-400)' }} />
              )}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div style={{
              padding: '12px 16px',
              borderRadius: '12px',
              marginBottom: '24px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: 'var(--red-300)',
              fontSize: '14px'
            }}>
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 500,
                color: 'var(--slate-200)',
                marginBottom: '8px'
              }}>
                Email Address
              </label>
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'rgba(30, 41, 59, 0.5)',
                  border: '1px solid var(--slate-600)',
                  borderRadius: '12px',
                  fontSize: '14px',
                  color: 'white',
                  transition: 'all 0.2s ease'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--blue-500)'
                  e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'var(--slate-600)'
                  e.target.style.boxShadow = 'none'
                }}
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 500,
                color: 'var(--slate-200)',
                marginBottom: '8px'
              }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  style={{
                    width: '100%',
                    padding: '12px 48px 12px 16px',
                    background: 'rgba(30, 41, 59, 0.5)',
                    border: '1px solid var(--slate-600)',
                    borderRadius: '12px',
                    fontSize: '14px',
                    color: 'white',
                    transition: 'all 0.2s ease'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'var(--blue-500)'
                    e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'var(--slate-600)'
                    e.target.style.boxShadow = 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px'
                  }}
                >
                  {showPassword ? (
                    <EyeSlashIcon style={{ width: '20px', height: '20px', color: 'var(--slate-400)' }} />
                  ) : (
                    <EyeIcon style={{ width: '20px', height: '20px', color: 'var(--slate-400)' }} />
                  )}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  style={{
                    width: '16px',
                    height: '16px',
                    accentColor: 'var(--blue-600)',
                    borderRadius: '4px'
                  }}
                />
                <span style={{ fontSize: '14px', color: 'var(--slate-300)' }}>Remember me</span>
              </label>

              <a href="#" style={{
                fontSize: '14px',
                color: 'var(--blue-400)',
                textDecoration: 'none',
                transition: 'color 0.2s ease'
              }}
              onMouseEnter={(e) => e.target.style.color = 'var(--blue-300)'}
              onMouseLeave={(e) => e.target.style.color = 'var(--blue-400)'}
              >
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              disabled={loading || backendStatus === 'offline'}
              className="btn btn-primary btn-lg"
              style={{
                width: '100%',
                position: 'relative',
                overflow: 'hidden',
                opacity: backendStatus === 'offline' ? 0.5 : 1
              }}
            >
              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <LoadingSpinner size="sm" />
                  <span>Signing in...</span>
                </div>
              ) : backendStatus === 'offline' ? (
                'Server Offline'
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Divider */}
          <div style={{ margin: '24px 0', position: 'relative' }}>
            <div style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center'
            }}>
              <div style={{ width: '100%', borderTop: '1px solid var(--slate-600)' }} />
            </div>
            <div style={{
              position: 'relative',
              display: 'flex',
              justifyContent: 'center',
              fontSize: '14px'
            }}>
              <span style={{
                padding: '0 8px',
                background: 'rgba(30, 41, 59, 0.8)',
                color: 'var(--slate-400)'
              }}>
                New to Echo Support?
              </span>
            </div>
          </div>

          {/* Sign Up Link */}
          <div style={{ textAlign: 'center' }}>
            <Link
              to="/register"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '12px 24px',
                border: '1px solid var(--slate-600)',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 500,
                color: 'var(--slate-300)',
                background: 'rgba(30, 41, 59, 0.3)',
                textDecoration: 'none',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(51, 65, 85, 0.5)'
                e.target.style.color = 'white'
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(30, 41, 59, 0.3)'
                e.target.style.color = 'var(--slate-300)'
              }}
            >
              Create New Account
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <p style={{ fontSize: '12px', color: 'var(--slate-400)', margin: 0 }}>
            By signing in, you agree to our{' '}
            <a href="#" style={{ color: 'var(--blue-400)', textDecoration: 'none' }}>Terms of Service</a>
            {' '}and{' '}
            <a href="#" style={{ color: 'var(--blue-400)', textDecoration: 'none' }}>Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  )
}