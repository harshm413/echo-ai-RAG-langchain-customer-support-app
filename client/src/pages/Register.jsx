import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { 
  EyeIcon, 
  EyeSlashIcon, 
  SparklesIcon,
  BuildingOfficeIcon,
  UserIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  KeyIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import LoadingSpinner from '../components/LoadingSpinner'

export default function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    organizationName: '',
    domain: ''
  })
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const { register } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    if (formData.password.length < 8) {
      toast.error('Password must be at least 8 characters long')
      return
    }

    setLoading(true)

    try {
      await register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        organizationName: formData.organizationName,
        domain: formData.domain
      })
      toast.success('Account created successfully! 🎉')
    } catch (error) {
      toast.error(error.response?.data?.error || 'Registration failed')
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
      </div>

      <div style={{ maxWidth: '500px', width: '100%', position: 'relative', zIndex: 10 }}>
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
            Create Account
          </h2>
          <p style={{
            fontSize: '18px',
            color: 'var(--slate-300)',
            margin: 0
          }}>
            Start your AI-powered customer support journey
          </p>
        </div>

        {/* Registration Form */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.8)',
          backdropFilter: 'blur(12px)',
          borderRadius: '24px',
          padding: '32px',
          boxShadow: 'var(--shadow-2xl)',
          border: '1px solid rgba(71, 85, 105, 0.5)'
        }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Personal Information */}
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--slate-200)', margin: '0 0 16px 0' }}>
                Personal Information
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: 'var(--slate-200)',
                    marginBottom: '8px'
                  }}>
                    <UserIcon style={{ width: '16px', height: '16px', marginRight: '8px', display: 'inline' }} />
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="John Doe"
                    className="input"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      background: 'rgba(30, 41, 59, 0.5)',
                      border: '1px solid var(--slate-600)',
                      borderRadius: '12px',
                      fontSize: '14px',
                      color: 'white'
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
                    <EnvelopeIcon style={{ width: '16px', height: '16px', marginRight: '8px', display: 'inline' }} />
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="john@company.com"
                    className="input"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      background: 'rgba(30, 41, 59, 0.5)',
                      border: '1px solid var(--slate-600)',
                      borderRadius: '12px',
                      fontSize: '14px',
                      color: 'white'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Organization Information */}
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--slate-200)', margin: '0 0 16px 0' }}>
                Organization Information
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: 'var(--slate-200)',
                    marginBottom: '8px'
                  }}>
                    <BuildingOfficeIcon style={{ width: '16px', height: '16px', marginRight: '8px', display: 'inline' }} />
                    Organization Name
                  </label>
                  <input
                    type="text"
                    name="organizationName"
                    required
                    value={formData.organizationName}
                    onChange={handleChange}
                    placeholder="Acme Corp"
                    className="input"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      background: 'rgba(30, 41, 59, 0.5)',
                      border: '1px solid var(--slate-600)',
                      borderRadius: '12px',
                      fontSize: '14px',
                      color: 'white'
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
                    <GlobeAltIcon style={{ width: '16px', height: '16px', marginRight: '8px', display: 'inline' }} />
                    Domain
                  </label>
                  <input
                    type="text"
                    name="domain"
                    required
                    value={formData.domain}
                    onChange={handleChange}
                    placeholder="acme.com"
                    className="input"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      background: 'rgba(30, 41, 59, 0.5)',
                      border: '1px solid var(--slate-600)',
                      borderRadius: '12px',
                      fontSize: '14px',
                      color: 'white'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Security */}
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--slate-200)', margin: '0 0 16px 0' }}>
                Security
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: 'var(--slate-200)',
                    marginBottom: '8px'
                  }}>
                    <KeyIcon style={{ width: '16px', height: '16px', marginRight: '8px', display: 'inline' }} />
                    Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      required
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Enter password"
                      className="input"
                      style={{
                        width: '100%',
                        padding: '12px 48px 12px 16px',
                        background: 'rgba(30, 41, 59, 0.5)',
                        border: '1px solid var(--slate-600)',
                        borderRadius: '12px',
                        fontSize: '14px',
                        color: 'white'
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

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: 'var(--slate-200)',
                    marginBottom: '8px'
                  }}>
                    Confirm Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      required
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="Confirm password"
                      className="input"
                      style={{
                        width: '100%',
                        padding: '12px 48px 12px 16px',
                        background: 'rgba(30, 41, 59, 0.5)',
                        border: '1px solid var(--slate-600)',
                        borderRadius: '12px',
                        fontSize: '14px',
                        color: 'white'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
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
                      {showConfirmPassword ? (
                        <EyeSlashIcon style={{ width: '20px', height: '20px', color: 'var(--slate-400)' }} />
                      ) : (
                        <EyeIcon style={{ width: '20px', height: '20px', color: 'var(--slate-400)' }} />
                      )}
                    </button>
                  </div>
                </div>
              </div>
              
              <p style={{ fontSize: '12px', color: 'var(--slate-400)', marginTop: '8px' }}>
                Password must be at least 8 characters long
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary btn-lg"
              style={{ width: '100%', marginTop: '8px' }}
            >
              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <LoadingSpinner size="sm" />
                  <span>Creating account...</span>
                </div>
              ) : (
                'Create Account'
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
                Already have an account?
              </span>
            </div>
          </div>

          {/* Sign In Link */}
          <div style={{ textAlign: 'center' }}>
            <Link
              to="/login"
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
              Sign In to Existing Account
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <p style={{ fontSize: '12px', color: 'var(--slate-400)', margin: 0 }}>
            By creating an account, you agree to our{' '}
            <a href="#" style={{ color: 'var(--blue-400)', textDecoration: 'none' }}>Terms of Service</a>
            {' '}and{' '}
            <a href="#" style={{ color: 'var(--blue-400)', textDecoration: 'none' }}>Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  )
}