import React from 'react'
import ErrorPage from './ErrorPage'

export default function Error500() {
  return (
    <ErrorPage
      code="500"
      headline="Server Error"
      subtext="Something went wrong on our end. Please try again later."
    />
  )
}
