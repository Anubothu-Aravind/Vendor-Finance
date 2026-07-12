import React from 'react'
import ErrorPage from './ErrorPage'

export default function Error429() {
  return (
    <ErrorPage
      code="429"
      headline="Too Many Requests"
      subtext="You're sending requests too quickly. Please slow down."
    />
  )
}
