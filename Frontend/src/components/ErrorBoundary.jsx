import React from 'react'
import ErrorPage from '../pages/errors/ErrorPage'

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, errorId: null, error: null }
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      errorId: `ERR-${Date.now().toString(36).toUpperCase()}`,
      error
    }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Uncaught error:', error)
    console.error('[ErrorBoundary] Component stack:', info?.componentStack)
  }

  handleReset = () => {
    this.setState({ hasError: false, errorId: null, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorPage
          code="500"
          headline="Application Error"
          subtext={this.state.error?.message || "Something went wrong. Click below to revalidate and try again."}
          onRetry={this.handleReset}
        />
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
