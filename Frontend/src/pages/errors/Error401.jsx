import React from 'react'
import ErrorPage from './ErrorPage'

export default function Error401() {
  return (
    <ErrorPage
      code="401"
      headline="Unauthorized"
      subtext="Please sign in to access this page."
    />
  )
}
