import React from 'react'
import ErrorPage from './ErrorPage'

export default function Error403() {
  return (
    <ErrorPage
      code="403"
      headline="Access Denied"
      subtext="You don't have permission to view this page."
    />
  )
}
