import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
  BuildingOfficeIcon,
  BoltIcon,
  ClockIcon,
  ShieldCheckIcon,
  BellIcon,
  UserGroupIcon,
  KeyIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline'
import LoadingSpinner from '../components/LoadingSpinner'

export default function Settings() {
  const { user, organization } = useAuth()
  const [settings, setSettings] = useState({
    organizationName: '',
    aiModel: 'gpt-3.5-turbo',
    autoEscalation: true,
    responseTimeout: 30,
    workingHours: {
      start: '09:00',
      end: '17:00',
      timezone: 'UTC'
    },
    notifications: {
      email: true,
      push: true,
      escalations: true
    },
    security: {
      twoFactor: false,
      sessionTimeout: 60
    }
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('general')

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setSettings(prev => ({
        ...prev,
        organizationName: organization?.name || ''
      }))
    } catch (error) {
      console.error('Error fetching settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async (e) => {
    e.preventDefault()
    setSaving(true)

    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      alert('Settings saved successfully!')
    } catch (error) {
      console.error('Error saving settings:', error)
      alert('Error saving settings')
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (section, field, value) => {
    if (section) {
      setSettings(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value
        }
      }))
    } else {
      setSettings(prev => ({
        ...prev,
        [field]: value
      }))
    }
  }

  const tabs = [
    { id: 'general', name: 'General', icon: BuildingOfficeIcon },
    { id: 'ai', name: 'AI Settings', icon: BoltIcon },
    { id: 'notifications', name: 'Notifications', icon: BellIcon },
    { id: 'security', name: 'Security', icon: ShieldCheckIcon }
  ]

  if (loading) {
    return (
      <div className="page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
        <div style={{ textAlign: 'center' }}>
          <LoadingSpinner size="lg" />
          <p style={{ marginTop: '16px', color: 'var(--gray-600)' }}>Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="card" style={{ marginBottom: '32px' }}>
        <div className="card-body">
          <h1 style={{ fontSize: '32px', fontWeight: 700, color: 'var(--gray-900)', margin: '0 0 8px 0' }}>
            Settings
          </h1>
          <p style={{ fontSize: '16px', color: 'var(--gray-600)', margin: 0 }}>
            Configure your AI assistant and organization preferences
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '32px' }}>
        {/* Sidebar Navigation */}
        <div style={{ width: '240px', flexShrink: 0 }}>
          <div className="card">
            <div style={{ padding: '16px' }}>
              <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      border: 'none',
                      background: activeTab === tab.id ? 'var(--blue-50)' : 'transparent',
                      color: activeTab === tab.id ? 'var(--blue-600)' : 'var(--gray-700)',
                      fontSize: '14px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      textAlign: 'left',
                      width: '100%'
                    }}
                    onMouseEnter={(e) => {
                      if (activeTab !== tab.id) {
                        e.target.style.backgroundColor = 'var(--gray-50)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (activeTab !== tab.id) {
                        e.target.style.backgroundColor = 'transparent'
                      }
                    }}
                  >
                    <tab.icon style={{ width: '18px', height: '18px' }} />
                    {tab.name}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div style={{ flex: 1 }}>
          <form onSubmit={saveSettings}>
            {activeTab === 'general' && (
              <div className="card">
                <div className="card-header">
                  <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--gray-900)', margin: 0 }}>
                    Organization Settings
                  </h3>
                </div>
                <div className="card-body">
                  <div className="grid grid-cols-1 md:grid-cols-2">
                    <div className="form-group">
                      <label className="form-label">
                        <BuildingOfficeIcon style={{ width: '16px', height: '16px', marginRight: '8px' }} />
                        Organization Name
                      </label>
                      <input
                        type="text"
                        value={settings.organizationName}
                        onChange={(e) => handleInputChange(null, 'organizationName', e.target.value)}
                        className="input"
                        placeholder={organization?.name || 'Your Organization'}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        <GlobeAltIcon style={{ width: '16px', height: '16px', marginRight: '8px' }} />
                        Website Domain
                      </label>
                      <input
                        type="text"
                        value={organization?.domain || ''}
                        className="input"
                        placeholder="example.com"
                        disabled
                      />
                      <p style={{ fontSize: '12px', color: 'var(--gray-500)', marginTop: '4px' }}>
                        Contact support to change your domain
                      </p>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      <ClockIcon style={{ width: '16px', height: '16px', marginRight: '8px' }} />
                      Working Hours
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-3">
                      <div>
                        <label style={{ fontSize: '12px', color: 'var(--gray-600)', marginBottom: '4px', display: 'block' }}>
                          Start Time
                        </label>
                        <input
                          type="time"
                          value={settings.workingHours.start}
                          onChange={(e) => handleInputChange('workingHours', 'start', e.target.value)}
                          className="input"
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', color: 'var(--gray-600)', marginBottom: '4px', display: 'block' }}>
                          End Time
                        </label>
                        <input
                          type="time"
                          value={settings.workingHours.end}
                          onChange={(e) => handleInputChange('workingHours', 'end', e.target.value)}
                          className="input"
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', color: 'var(--gray-600)', marginBottom: '4px', display: 'block' }}>
                          Timezone
                        </label>
                        <select
                          value={settings.workingHours.timezone}
                          onChange={(e) => handleInputChange('workingHours', 'timezone', e.target.value)}
                          className="input"
                        >
                          <option value="UTC">UTC</option>
                          <option value="America/New_York">Eastern Time</option>
                          <option value="America/Chicago">Central Time</option>
                          <option value="America/Denver">Mountain Time</option>
                          <option value="America/Los_Angeles">Pacific Time</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'ai' && (
              <div className="card">
                <div className="card-header">
                  <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--gray-900)', margin: 0 }}>
                    AI Assistant Configuration
                  </h3>
                </div>
                <div className="card-body">
                  <div className="grid grid-cols-1 md:grid-cols-2">
                    <div className="form-group">
                      <label className="form-label">
                        <BoltIcon style={{ width: '16px', height: '16px', marginRight: '8px' }} />
                        AI Model
                      </label>
                      <select
                        value={settings.aiModel}
                        onChange={(e) => handleInputChange(null, 'aiModel', e.target.value)}
                        className="input"
                      >
                        <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Recommended)</option>
                        <option value="gpt-4">GPT-4 (Advanced)</option>
                      </select>
                      <p style={{ fontSize: '12px', color: 'var(--gray-500)', marginTop: '4px' }}>
                        GPT-4 provides better responses but costs more
                      </p>
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        <ClockIcon style={{ width: '16px', height: '16px', marginRight: '8px' }} />
                        Response Timeout (seconds)
                      </label>
                      <input
                        type="number"
                        value={settings.responseTimeout}
                        onChange={(e) => handleInputChange(null, 'responseTimeout', parseInt(e.target.value))}
                        className="input"
                        min="10"
                        max="300"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={settings.autoEscalation}
                        onChange={(e) => handleInputChange(null, 'autoEscalation', e.target.checked)}
                        style={{ width: '16px', height: '16px', accentColor: 'var(--blue-600)' }}
                      />
                      <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--gray-700)' }}>
                        Enable automatic escalation to human agents
                      </span>
                    </label>
                    <p style={{ fontSize: '12px', color: 'var(--gray-500)', marginTop: '4px', marginLeft: '28px' }}>
                      AI will automatically escalate complex issues to human agents
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="card">
                <div className="card-header">
                  <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--gray-900)', margin: 0 }}>
                    Notification Preferences
                  </h3>
                </div>
                <div className="card-body">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {[
                      { key: 'email', label: 'Email Notifications', desc: 'Receive notifications via email' },
                      { key: 'push', label: 'Push Notifications', desc: 'Browser push notifications' },
                      { key: 'escalations', label: 'Escalation Alerts', desc: 'Immediate alerts for escalated conversations' }
                    ].map((notification) => (
                      <label key={notification.key} style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={settings.notifications[notification.key]}
                          onChange={(e) => handleInputChange('notifications', notification.key, e.target.checked)}
                          style={{ width: '16px', height: '16px', accentColor: 'var(--blue-600)' }}
                        />
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--gray-700)' }}>
                            {notification.label}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--gray-500)' }}>
                            {notification.desc}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="card">
                <div className="card-header">
                  <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--gray-900)', margin: 0 }}>
                    Security Settings
                  </h3>
                </div>
                <div className="card-body">
                  <div className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={settings.security.twoFactor}
                        onChange={(e) => handleInputChange('security', 'twoFactor', e.target.checked)}
                        style={{ width: '16px', height: '16px', accentColor: 'var(--blue-600)' }}
                      />
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--gray-700)' }}>
                          <KeyIcon style={{ width: '16px', height: '16px', marginRight: '8px', display: 'inline' }} />
                          Two-Factor Authentication
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--gray-500)' }}>
                          Add an extra layer of security to your account
                        </div>
                      </div>
                    </label>
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      <ClockIcon style={{ width: '16px', height: '16px', marginRight: '8px' }} />
                      Session Timeout (minutes)
                    </label>
                    <select
                      value={settings.security.sessionTimeout}
                      onChange={(e) => handleInputChange('security', 'sessionTimeout', parseInt(e.target.value))}
                      className="input"
                      style={{ maxWidth: '200px' }}
                    >
                      <option value={30}>30 minutes</option>
                      <option value={60}>1 hour</option>
                      <option value={120}>2 hours</option>
                      <option value={480}>8 hours</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Save Button */}
            <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                disabled={saving}
                className="btn btn-primary btn-lg"
                style={{ minWidth: '120px' }}
              >
                {saving ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <LoadingSpinner size="sm" />
                    <span>Saving...</span>
                  </div>
                ) : (
                  'Save Settings'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}