import { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error for debugging
    console.error('🚨 ErrorBoundary caught an error:', error);
    console.error('📍 Error info:', errorInfo);
    
    // Log to backend if possible
    this.logErrorToBackend(error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
      hasError: true
    });
  }

  logErrorToBackend = async (error, errorInfo) => {
    try {
      const errorData = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      };
      
      // Try to send to backend
      await fetch('/api/logs/frontend-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorData)
      }).catch(() => {
        // If backend is down, store locally
        const errors = JSON.parse(localStorage.getItem('edulens_errors') || '[]');
        errors.push(errorData);
        // Keep only last 10 errors
        if (errors.length > 10) errors.shift();
        localStorage.setItem('edulens_errors', JSON.stringify(errors));
      });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }
  };

  handleRetry = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null,
      retryCount: this.state.retryCount + 1
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const { error, retryCount } = this.state;
      
      return (
        <div className="error-boundary-container" style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '20px',
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          color: '#ffffff',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '40px',
            maxWidth: '600px',
            textAlign: 'center',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>
              🔧
            </div>
            
            <h1 style={{ 
              marginBottom: '16px', 
              fontSize: '24px',
              fontWeight: 'bold'
            }}>
              Something went wrong
            </h1>
            
            <p style={{ 
              marginBottom: '24px', 
              opacity: 0.8,
              lineHeight: '1.6'
            }}>
              EduLens encountered an unexpected error. Don't worry - your data is safe and the issue has been logged.
            </p>
            
            <div style={{
              background: 'rgba(255, 0, 0, 0.1)',
              border: '1px solid rgba(255, 0, 0, 0.3)',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'left',
              fontSize: '14px',
              fontFamily: 'monospace'
            }}>
              <strong>Error:</strong> {error?.message || 'Unknown error'}
            </div>
            
            <div style={{ 
              display: 'flex', 
              gap: '12px', 
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}>
              {retryCount < 3 && (
                <button
                  onClick={this.handleRetry}
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '12px 24px',
                    fontSize: '16px',
                    cursor: 'pointer',
                    transition: 'transform 0.2s',
                    fontWeight: 'bold'
                  }}
                  onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
                  onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                >
                  Try Again {retryCount > 0 && `(${retryCount}/3)`}
                </button>
              )}
              
              <button
                onClick={this.handleReload}
                style={{
                  background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 24px',
                  fontSize: '16px',
                  cursor: 'pointer',
                  transition: 'transform 0.2s',
                  fontWeight: 'bold'
                }}
                onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
                onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
              >
                Reload App
              </button>
            </div>
            
            {retryCount >= 3 && (
              <div style={{
                marginTop: '20px',
                padding: '16px',
                background: 'rgba(255, 165, 0, 0.1)',
                borderRadius: '8px',
                border: '1px solid rgba(255, 165, 0, 0.3)'
              }}>
                <p style={{ margin: 0, fontSize: '14px' }}>
                  ⚠️ Persistent error detected. Please try reloading the app or check the console for more details.
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;