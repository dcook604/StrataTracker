import React from "react";
import { captureException, getSessionURL } from "@/lib/logrocket";

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  sessionURL?: string | null;
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
    // Capture error in LogRocket
    captureException(error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: true,
      timestamp: new Date().toISOString()
    });

    // Get session URL for debugging
    const sessionURL = getSessionURL();
    this.setState({ sessionURL });

    // Log error to console
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    
    if (sessionURL) {
      console.log("LogRocket session URL:", sessionURL);
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleCopySessionURL = () => {
    if (this.state.sessionURL) {
      navigator.clipboard.writeText(this.state.sessionURL);
      alert("Session URL copied to clipboard!");
    }
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
            
            {this.state.sessionURL && (
              <button
                onClick={this.handleCopySessionURL}
                className="px-6 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700 transition"
                title="Copy LogRocket session URL for debugging"
              >
                Copy Debug URL
              </button>
            )}
          </div>

          {this.state.sessionURL && (
            <p className="mt-4 text-xs text-neutral-600">
              A debugging session has been recorded. Use the "Copy Debug URL" button to share with support.
            </p>
          )}
        </div>
      );
    }
    return this.props.children;
  }
} 