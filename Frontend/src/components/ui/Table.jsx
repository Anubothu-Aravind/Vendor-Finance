import React from 'react'
import { cn } from '@/utils/cn'

// ─── Sub-components ─────────────────────────────────────────────────────────

const TableRoot = React.forwardRef(({ className, ...props }, ref) => (
  <div className="relative w-full overflow-auto">
    <table
      ref={ref}
      className={cn('w-full caption-bottom text-sm border-collapse', className)}
      {...props}
    />
  </div>
))
TableRoot.displayName = 'Table'

const TableHeader = React.forwardRef(({ className, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn(className)}
    style={{ background: 'var(--color-table-header)', borderBottom: '1px solid var(--color-border)' }}
    {...props}
  />
))
TableHeader.displayName = 'TableHeader'

const TableBody = React.forwardRef(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn('[&_tr:last-child]:border-0', className)}
    {...props}
  />
))
TableBody.displayName = 'TableBody'

const TableFooter = React.forwardRef(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn('font-medium [&>tr]:last:border-b-0', className)}
    style={{ background: 'var(--color-table-header)', borderTop: '1px solid var(--color-border)' }}
    {...props}
  />
))
TableFooter.displayName = 'TableFooter'

const TableRow = React.forwardRef(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn('transition-colors', className)}
    style={{ borderBottom: '1px solid var(--color-border)' }}
    onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-table-row-hover)' }}
    onMouseLeave={e => { e.currentTarget.style.background = '' }}
    {...props}
  />
))
TableRow.displayName = 'TableRow'

// Used as <Table.HeaderCell> — maps to <th>
const TableHead = React.forwardRef(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      'h-10 px-4 text-left align-middle font-semibold text-[10px] uppercase tracking-wider',
      className
    )}
    style={{ color: 'var(--color-text-muted)' }}
    {...props}
  />
))
TableHead.displayName = 'TableHead'

// Used as <Table.Cell> — maps to <td>
const TableCell = React.forwardRef(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn('px-4 py-3 align-middle tabular-nums text-sm', className)}
    style={{ color: 'var(--color-text-primary)' }}
    {...props}
  />
))
TableCell.displayName = 'TableCell'

const TableCaption = React.forwardRef(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn('mt-4 text-xs', className)}
    style={{ color: 'var(--color-text-muted)' }}
    {...props}
  />
))
TableCaption.displayName = 'TableCaption'

// ─── Namespace object (default export) ──────────────────────────────────────

const Table = TableRoot
Table.Header     = TableHeader
Table.Body       = TableBody
Table.Footer     = TableFooter
Table.Row        = TableRow
Table.HeaderCell = TableHead   // alias used across pages
Table.Head       = TableHead   // alias used occasionally
Table.Cell       = TableCell
Table.Caption    = TableCaption

export {
  TableRoot,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
}

export default Table
