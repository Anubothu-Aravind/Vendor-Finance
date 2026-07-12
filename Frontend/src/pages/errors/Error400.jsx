import React from 'react'
import ErrorPage from './ErrorPage'

export default function Error400() {
  return (
    <ErrorPage
      code="400"
      headline="Bad Request"
      subtext="The request could not be understood or was invalid."
    />
  )
}
