import React from "react";
// LogRocket removed - replace with your preferred error tracking service

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };



  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-50 p-8 text-center">
          <h1 className="text-2xl font-bold mb-4 text-red-600">Something went wrong</h1>
          <p className="mb-6 text-neutral-700">An unexpected error occurred. Please try reloading the page.</p>
          
          {this.state.error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg max-w-2xl">
              <h2 className="text-sm font-semibold text-red-800 mb-2">Error Details:</h2>
              <p className="text-xs text-red-700 font-mono text-left">
                {this.state.error.message}
              </p>
            </div>
          )}

          <div className="flex gap-4">
            <button
              onClick={this.handleReload}
              className="px-6 py-2 bg-primary text-white rounded shadow hover:bg-primary-dark transition"
            >
              Reload Page
            </button>
            
          </div>
        </div>
      );
    }
    return this.props.children;
  }
} 