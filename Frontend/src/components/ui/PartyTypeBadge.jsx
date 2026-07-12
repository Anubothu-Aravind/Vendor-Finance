import React from 'react'
import Badge from './Badge'

export function PartyTypeBadge({ type, className, ...props }) {
  const normalizedType = String(type || '').toLowerCase().trim()
  
  if (normalizedType === 'vendor') {
    return (
      <Badge variant="blue" className={className} {...props}>
        Vendor
      </Badge>
    )
  }
  
  if (normalizedType === 'financier') {
    return (
      <Badge variant="purple" className={className} {...props}>
        Financier
      </Badge>
    )
  }
  
  return (
    <Badge variant="neutral" className={className} {...props}>
      {type}
    </Badge>
  )
}

export default PartyTypeBadge
