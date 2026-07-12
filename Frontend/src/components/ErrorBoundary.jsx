import React from 'react'
import ErrorPage from '../pages/errors/ErrorPage'

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, errorId: null }
  }

  static getDerivedStateFromError() {
    return { hasError: true, errorId: `ERR-${Date.now().toString(36).toUpperCase()}` }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Uncaught error:', error)
    console.error('[ErrorBoundary] Component stack:', info?.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorPage
          code="500"
          headline="Server Error"
          subtext="Something went wrong on our end. Please try again later."
        />
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
