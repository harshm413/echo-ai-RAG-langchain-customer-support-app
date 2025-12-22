import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { organizationsAPI } from '../services/api'
import toast from 'react-hot-toast'

const WidgetEmbed = () => {
  const { organization } = useAuth()
  const [widgetConfig, setWidgetConfig] = useState({
    primaryColor: '#3B82F6',
    welcomeMessage: 'Hi! How can I help you today?',
    position: 'bottom-right',
    showAvatar: true,
    collectEmail: true,
    collectName: true,
    enableVoice: false,
    workingHours: {
      enabled: false,
      timezone: 'UTC',
      schedule: {
        monday: { start: '09:00', end: '17:00', enabled: true },
        tuesday: { start: '09:00', end: '17:00', enabled: true },
        wednesday: { start: '09:00', end: '17:00', enabled: true },
        thursday: { start: '09:00', end: '17:00', enabled: true },
        friday: { start: '09:00', end: '17:00', enabled: true },
        saturday: { start: '09:00', end: '17:00', enabled: false },
        sunday: { start: '09:00', end: '17:00', enabled: false }
      }
    }
  })
  const [embedCode, setEmbedCode] = useState('')
  const [previewMode, setPreviewMode] = useState('desktop')

  useEffect(() => {
    loadWidgetConfig()
  }, [])

  useEffect(() => {
    generateEmbedCode()
  }, [widgetConfig, organization])

  const loadWidgetConfig = async () => {
    try {
      const response = await organizationsAPI.getWidgetConfig()
      if (response.data.config) {
        setWidgetConfig({ ...widgetConfig, ...response.data.config })
      }
    } catch (error) {
      console.error('Failed to load widget config:', error)
    }
  }

  const saveWidgetConfig = async () => {
    try {
      await organizationsAPI.updateWidgetConfig(widgetConfig)
      toast.success('Widget configuration saved!')
      generateEmbedCode()
    } catch (error) {
      toast.error('Failed to save widget configuration')
    }
  }

  const generateEmbedCode = () => {
    if (!organization) return

    const config = {
      organizationId: organization._id,
      ...widgetConfig
    }

    const code = `<!-- Echo Support Widget -->
<script>
  window.EchoSupportConfig = ${JSON.stringify(config, null, 2)};
  (function() {
    var script = document.createElement('script');
    script.src = '${window.location.origin}/widget.js';
    script.async = true;
    document.head.appendChild(script);
  })();
</script>
<!-- End Echo Support Widget -->`

    setEmbedCode(code)
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(embedCode)
    toast.success('Embed code copied to clipboard!')
  }

  const handleConfigChange = (key, value) => {
    setWidgetConfig(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const handleWorkingHoursChange = (day, field, value) => {
    setWidgetConfig(prev => ({
      ...prev,
      workingHours: {
        ...prev.workingHours,
        schedule: {
          ...prev.workingHours.schedule,
          [day]: {
            ...prev.workingHours.schedule[day],
            [field]: value
          }
        }
      }
    }))
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="card" style={{ marginBottom: '32px' }}>
        <div className="card-body">
          <h1 style={{ fontSize: '32px', fontWeight: 700, color: 'var(--gray-900)', margin: '0 0 8px 0' }}>
            Widget Configuration
          </h1>
          <p style={{ fontSize: '16px', color: 'var(--gray-600)', margin: 0 }}>
            Customize your customer support widget and generate embed code for your website.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2">
        {/* Configuration Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="card">
            <div className="card-header">
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--gray-900)', margin: 0 }}>Appearance</h2>
            </div>
            <div className="card-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="form-group">
                  <label className="form-label">Primary Color</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input
                      type="color"
                      value={widgetConfig.primaryColor}
                      onChange={(e) => handleConfigChange('primaryColor', e.target.value)}
                      style={{ width: '48px', height: '48px', border: '1px solid var(--gray-300)', borderRadius: '8px', cursor: 'pointer' }}
                    />
                    <input
                      type="text"
                      value={widgetConfig.primaryColor}
                      onChange={(e) => handleConfigChange('primaryColor', e.target.value)}
                      className="input"
                      style={{ flex: 1 }}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Welcome Message</label>
                  <textarea
                    value={widgetConfig.welcomeMessage}
                    onChange={(e) => handleConfigChange('welcomeMessage', e.target.value)}
                    rows={3}
                    className="input"
                    style={{ resize: 'vertical' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Position</label>
                  <select
                    value={widgetConfig.position}
                    onChange={(e) => handleConfigChange('position', e.target.value)}
                    className="input"
                  >
                    <option value="bottom-right">Bottom Right</option>
                    <option value="bottom-left">Bottom Left</option>
                    <option value="top-right">Top Right</option>
                    <option value="top-left">Top Left</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {[
                    { key: 'showAvatar', label: 'Show Avatar' },
                    { key: 'collectEmail', label: 'Collect Email' },
                    { key: 'collectName', label: 'Collect Name' },
                    { key: 'enableVoice', label: 'Enable Voice Support (Coming Soon)' }
                  ].map((option) => (
                    <label key={option.key} style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={widgetConfig[option.key]}
                        onChange={(e) => handleConfigChange(option.key, e.target.checked)}
                        style={{ width: '16px', height: '16px', accentColor: 'var(--blue-600)' }}
                      />
                      <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--gray-700)' }}>
                        {option.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Working Hours */}
          <div className="card">
            <div className="card-header">
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--gray-900)', margin: 0 }}>Working Hours</h2>
            </div>
            <div className="card-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={widgetConfig.workingHours.enabled}
                    onChange={(e) => handleConfigChange('workingHours', {
                      ...widgetConfig.workingHours,
                      enabled: e.target.checked
                    })}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--blue-600)' }}
                  />
                  <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--gray-700)' }}>
                    Enable Working Hours
                  </span>
                </label>

                {widgetConfig.workingHours.enabled && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {Object.entries(widgetConfig.workingHours.schedule).map(([day, schedule]) => (
                      <div key={day} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', backgroundColor: 'var(--gray-50)', borderRadius: '8px' }}>
                        <div style={{ width: '80px', fontSize: '14px', fontWeight: 500, color: 'var(--gray-700)', textTransform: 'capitalize' }}>
                          {day}
                        </div>
                        <input
                          type="checkbox"
                          checked={schedule.enabled}
                          onChange={(e) => handleWorkingHoursChange(day, 'enabled', e.target.checked)}
                          style={{ width: '16px', height: '16px', accentColor: 'var(--blue-600)' }}
                        />
                        {schedule.enabled && (
                          <>
                            <input
                              type="time"
                              value={schedule.start}
                              onChange={(e) => handleWorkingHoursChange(day, 'start', e.target.value)}
                              className="input"
                              style={{ width: '120px', padding: '8px 12px', fontSize: '14px' }}
                            />
                            <span style={{ fontSize: '14px', color: 'var(--gray-500)' }}>to</span>
                            <input
                              type="time"
                              value={schedule.end}
                              onChange={(e) => handleWorkingHoursChange(day, 'end', e.target.value)}
                              className="input"
                              style={{ width: '120px', padding: '8px 12px', fontSize: '14px' }}
                            />
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={saveWidgetConfig}
            className="btn btn-primary btn-lg"
            style={{ width: '100%' }}
          >
            Save Configuration
          </button>
        </div>

        {/* Preview and Embed Code */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Preview */}
          <div className="card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--gray-900)', margin: 0 }}>Preview</h2>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setPreviewMode('desktop')}
                    className={previewMode === 'desktop' ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
                  >
                    Desktop
                  </button>
                  <button
                    onClick={() => setPreviewMode('mobile')}
                    className={previewMode === 'mobile' ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
                  >
                    Mobile
                  </button>
                </div>
              </div>
            </div>
            <div className="card-body">
              <div style={{
                border: '1px solid var(--gray-300)',
                borderRadius: '12px',
                overflow: 'hidden',
                maxWidth: previewMode === 'mobile' ? '320px' : '100%',
                margin: previewMode === 'mobile' ? '0 auto' : '0'
              }}>
                <div style={{
                  backgroundColor: 'var(--gray-100)',
                  padding: '32px',
                  height: '300px',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <div style={{ textAlign: 'center', color: 'var(--gray-500)', fontSize: '16px' }}>
                    Your Website Content
                  </div>
                  
                  {/* Widget Preview */}
                  <div
                    style={{
                      position: 'absolute',
                      [widgetConfig.position.includes('bottom') ? 'bottom' : 'top']: '16px',
                      [widgetConfig.position.includes('right') ? 'right' : 'left']: '16px'
                    }}
                  >
                    <div
                      style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        cursor: 'pointer',
                        boxShadow: 'var(--shadow-lg)',
                        backgroundColor: widgetConfig.primaryColor,
                        fontSize: '24px'
                      }}
                    >
                      💬
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Embed Code */}
          <div className="card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--gray-900)', margin: 0 }}>Embed Code</h2>
                <button
                  onClick={copyToClipboard}
                  className="btn btn-secondary btn-sm"
                >
                  Copy Code
                </button>
              </div>
            </div>
            <div className="card-body">
              <div style={{
                backgroundColor: 'var(--gray-900)',
                color: 'var(--green-400)',
                padding: '20px',
                borderRadius: '12px',
                overflowX: 'auto',
                fontFamily: 'Monaco, Consolas, "Courier New", monospace'
              }}>
                <pre style={{ fontSize: '14px', lineHeight: 1.5, margin: 0 }}>
                  <code>{embedCode}</code>
                </pre>
              </div>
              
              <div style={{
                marginTop: '20px',
                padding: '20px',
                backgroundColor: 'var(--blue-50)',
                borderRadius: '12px',
                border: '1px solid var(--blue-200)'
              }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--blue-900)', margin: '0 0 12px 0' }}>
                  Installation Instructions:
                </h3>
                <ol style={{ fontSize: '14px', color: 'var(--blue-800)', margin: 0, paddingLeft: '20px', lineHeight: 1.6 }}>
                  <li>Copy the embed code above</li>
                  <li>Paste it before the closing &lt;/body&gt; tag on your website</li>
                  <li>The widget will automatically appear on your site</li>
                  <li>Customize the appearance and behavior using the settings on the left</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WidgetEmbed