'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AuthError, AuthErrorHandler, AuthErrorType } from '@/lib/auth/error-handler';

interface Props {
  children: ReactNode;
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  authError: AuthError | null;
  retryCount: number;
}

class AuthErrorBoundary extends Component<Props, State> {
  private static readonly MAX_RETRIES = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      authError: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Convert generic error to AuthError if possible
    const authError = AuthErrorHandler.handleFirebaseError(error, {
      boundary: 'AuthErrorBoundary',
      timestamp: new Date().toISOString()
    });

    AuthErrorHandler.logError(authError);

    return {
      hasError: true,
      error,
      authError,
      retryCount: 0
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('AuthErrorBoundary caught an error:', error);
    console.error('Error info:', errorInfo);
    
    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    if (this.state.retryCount < AuthErrorBoundary.MAX_RETRIES) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        authError: null,
        retryCount: prevState.retryCount + 1
      }));
    }
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      authError: null,
      retryCount: 0
    });
  };

  render() {
    if (this.state.hasError) {
      const { error, authError } = this.state;
      
      // Use custom fallback if provided
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={error!} retry={this.handleRetry} />;
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full space-y-8">
            <div className="text-center">
              <div className="mx-auto h-12 w-12 text-red-600">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              
              <h2 className="mt-6 text-2xl font-bold text-gray-900">
                {authError ? 
                  AuthErrorHandler.formatErrorForUser(authError).title : 
                  'エラーが発生しました'
                }
              </h2>
              
              <p className="mt-2 text-sm text-gray-600">
                {authError ? 
                  authError.userMessage : 
                  '予期しないエラーが発生しました。'
                }
              </p>

              {/* Error details for development */}
              {process.env.NODE_ENV === 'development' && error && (
                <details className="mt-4 text-left">
                  <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                    技術的な詳細 (開発用)
                  </summary>
                  <pre className="mt-2 text-xs text-gray-400 bg-gray-100 p-2 rounded overflow-auto">
                    {error.stack}
                  </pre>
                </details>
              )}
            </div>

            <div className="space-y-3">
              {/* Retry button */}
              {authError?.recoverable && this.state.retryCount < AuthErrorBoundary.MAX_RETRIES && (
                <button
                  onClick={this.handleRetry}
                  className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  再試行 ({AuthErrorBoundary.MAX_RETRIES - this.state.retryCount}回まで)
                </button>
              )}

              {/* Recovery actions */}
              {authError && AuthErrorHandler.getRecoveryActions(authError).map((action, index) => (
                <button
                  key={index}
                  onClick={action.action}
                  className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  {action.label}
                </button>
              ))}

              {/* Reset button */}
              <button
                onClick={this.handleReset}
                className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                リセット
              </button>

              {/* Go home button */}
              <button
                onClick={() => window.location.href = '/'}
                className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                ホームに戻る
              </button>
            </div>

            {/* Additional help text */}
            <div className="text-center">
              <p className="text-xs text-gray-500">
                問題が続く場合は、ページを再読み込みするか、
                しばらく時間をおいてから再試行してください。
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AuthErrorBoundary;