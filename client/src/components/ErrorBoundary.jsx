import React from 'react'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, var(--slate-50) 0%, var(--blue-50) 50%, var(--indigo-100) 100%)',
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '40px',
            boxShadow: 'var(--shadow-xl)',
            textAlign: 'center',
            maxWidth: '500px'
          }}>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--red-600)', marginBottom: '16px' }}>
              Something went wrong
            </h1>
            <p style={{ fontSize: '16px', color: 'var(--gray-600)', marginBottom: '24px' }}>
              There was an error loading the application. Please check the console for more details.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: 'linear-gradient(135deg, var(--blue-500) 0%, var(--purple-600) 100%)',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              Reload Page
            </button>
            {process.env.NODE_ENV === 'development' && (
              <details style={{ marginTop: '20px', textAlign: 'left' }}>
                <summary style={{ cursor: 'pointer', fontSize: '14px', color: 'var(--gray-500)' }}>
                  Error Details
                </summary>
                <pre style={{ 
                  fontSize: '12px', 
                  color: 'var(--red-600)', 
                  background: 'var(--red-50)', 
                  padding: '12px', 
                  borderRadius: '8px',
                  marginTop: '8px',
                  overflow: 'auto'
                }}>
                  {this.state.error?.toString()}
                </pre>
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary