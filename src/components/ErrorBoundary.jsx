import React from 'react';
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react';
import Card from './Card';
import Button from './Button';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[Global Error Boundary] Caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-canvas flex items-center justify-center p-6">
          <Card className="max-w-md w-full p-8 text-center animate-rise-in">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            
            <h1 className="text-xl font-bold text-ink mb-2">Something went wrong</h1>
            <p className="text-sm text-ink-tertiary mb-8">
              The application encountered an unexpected error. Don't worry, your data is likely safe in the cloud.
            </p>

            <div className="space-y-3">
              <Button 
                variant="primary" 
                className="w-full"
                onClick={() => window.location.reload()}
              >
                <RefreshCcw className="w-4 h-4 mr-2" />
                Reload Dashboard
              </Button>
              
              <Button 
                variant="secondary" 
                className="w-full"
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.href = '/';
                }}
              >
                <Home className="w-4 h-4 mr-2" />
                Return Home
              </Button>
            </div>

            {process.env.NODE_ENV === 'development' && (
              <div className="mt-8 p-4 rounded-lg bg-red-500/5 border border-red-500/10 text-left overflow-auto max-h-40">
                <p className="text-[10px] font-mono text-red-400 whitespace-pre-wrap">
                  {this.state.error?.toString()}
                </p>
              </div>
            )}
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
