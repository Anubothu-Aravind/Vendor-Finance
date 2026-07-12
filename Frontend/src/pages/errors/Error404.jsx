import React from 'react'
import ErrorPage from './ErrorPage'

export default function Error404() {
  return (
    <ErrorPage
      code="404"
      headline="Page Not Found"
      subtext="The page you're looking for doesn't exist or has been moved."
    />
  )
}
