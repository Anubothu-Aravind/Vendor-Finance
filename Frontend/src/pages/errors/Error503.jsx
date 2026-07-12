import React from 'react'
import ErrorPage from './ErrorPage'

export default function Error503() {
  return (
    <ErrorPage
      code="503"
      headline="Service Unavailable"
      subtext="The server is temporarily unable to handle your request."
    />
  )
}
