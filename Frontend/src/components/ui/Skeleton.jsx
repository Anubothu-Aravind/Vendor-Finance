import React from 'react'
import { cn } from '@/utils/cn'

export function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn("animate-pulse rounded", className)}
      style={{ background: 'var(--color-bg-elevated)' }}
      {...props}
    />
  )
}

export function SkeletonCard({ className }) {
  return (
    <div
      className={cn("rounded-xl p-5 space-y-3", className)}
      style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}
    >
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-7 w-2/3" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  )
}

export function SkeletonTableRow({ cols = 5, widths = [] }) {
  return (
    <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-5 py-4">
          <Skeleton className={cn("h-4", widths[i] || "w-full")} />
        </td>
      ))}
    </tr>
  )
}

export function SkeletonText({ className, lines = 1 }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cn("h-4", i === lines - 1 && lines > 1 ? "w-4/5" : "w-full")} />
      ))}
    </div>
  )
}

export function SkeletonAvatar({ size = "h-8 w-8" }) {
  return <Skeleton className={cn("rounded-full", size)} />
}

export default Skeleton
