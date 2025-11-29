import React, { Component, ReactNode, ErrorInfo } from 'react';
import { Button } from './Button';
import { logger } from '../utils/logger';
import styles from './ErrorBoundary.module.css';

interface ErrorBoundaryProps {
  children: ReactNode;
  name: string;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(_error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to console for development debugging
    logger.error(`[ErrorBoundary: ${this.props.name}] Error caught:`, error, errorInfo);

    // Update state with error details
    this.setState({
      error,
      errorInfo
    });

    // In production, you would send this to an error reporting service
    // For development, we'll keep it in console
    if (import.meta.env.PROD) {
      // Future: Send to error reporting service (Sentry, DataDog, etc.)
      // logErrorToService(error, errorInfo, this.props.name);
    }
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Development-friendly error display
      if (import.meta.env.DEV) {
        return (
          <div className={styles.errorBoundary}>
            <div className={styles.errorContainer}>
              <h1 className={styles.errorTitle}>
                <span className={styles.errorIcon}>⚠️</span>
                Something went wrong
              </h1>
              
              <div className={styles.errorDetails}>
                <p className={styles.errorName}>
                  Error Boundary: <strong>{this.props.name}</strong>
                </p>
                
                {this.state.error && (
                  <div className={styles.errorMessage}>
                    <h3>Error:</h3>
                    <pre>{this.state.error.toString()}</pre>
                  </div>
                )}
                
                {this.state.errorInfo && (
                  <div className={styles.stackTrace}>
                    <h3>Component Stack:</h3>
                    <pre>{this.state.errorInfo.componentStack}</pre>
                  </div>
                )}
                
                {this.state.error?.stack && (
                  <div className={styles.stackTrace}>
                    <h3>Error Stack:</h3>
                    <pre>{this.state.error.stack}</pre>
                  </div>
                )}
              </div>
              
              <Button 
                className={styles.resetButton}
                onClick={this.handleReset}
                variant="primary"
              >
                Try Again
              </Button>
            </div>
          </div>
        );
      }

      // Production error display
      return (
        <div className={styles.errorBoundary}>
          <div className={styles.errorContainer}>
            <h1 className={styles.errorTitle}>
              <span className={styles.errorIcon}>⚠️</span>
              Something went wrong
            </h1>
            <p className={styles.errorDescription}>
              We're sorry, but something unexpected happened. Please try refreshing the page.
            </p>
            <Button 
              className={styles.resetButton}
              onClick={this.handleReset}
              variant="primary"
            >
              Try Again
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}