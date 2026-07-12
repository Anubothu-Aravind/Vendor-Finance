import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { Link } from 'react-router-dom'

export function DropdownSelect({ value, onChange, options = [], placeholder = "Select...", className = "" }) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const normalizedOptions = (options || []).map(opt => {
    if (typeof opt === 'object' && opt !== null) {
      return opt
    }
    return { value: opt, label: opt }
  })

  const hasOptions = normalizedOptions.length > 0
  const phLower = placeholder.toLowerCase()
  
  let emptyMessage = "No options available"
  let addPath = null
  if (phLower.includes('party') || phLower.includes('vendor')) {
    emptyMessage = "No vendors added yet"
    addPath = "/vendors"
  } else if (phLower.includes('financier')) {
    emptyMessage = "No financiers added yet"
    addPath = "/financiers"
  } else if (phLower.includes('loan')) {
    emptyMessage = "No loans found"
  } else if (phLower.includes('bank')) {
    emptyMessage = "No banks configured"
    addPath = "/settings"
  } else if (phLower.includes('mode')) {
    emptyMessage = "No payment modes set up"
  }

  const btnPlaceholder = hasOptions ? placeholder : emptyMessage
  const selectedOption = normalizedOptions.find(o => String(o.value) === String(value))

  return (
    <div className="flex items-center space-x-2 w-full">
      <div className={`relative flex-1 ${className}`} ref={containerRef}>
        <button
          type="button"
          disabled={!hasOptions}
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-all focus:outline-none animate-all"
          style={{
            background: 'var(--color-bg-elevated)',
            border: `1px solid var(--color-border)`,
            color: selectedOption ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
            opacity: hasOptions ? 1 : 0.5,
            cursor: hasOptions ? 'pointer' : 'not-allowed',
          }}
          onFocus={e => { if (hasOptions) e.currentTarget.style.borderColor = 'var(--color-primary)' }}
          onBlur={e => { if (hasOptions) e.currentTarget.style.borderColor = 'var(--color-border)' }}
        >
          <span className="truncate font-medium">
            {selectedOption ? selectedOption.label : btnPlaceholder}
          </span>
          <ChevronDown size={16} className="shrink-0 ml-2" style={{ color: 'var(--color-text-muted)' }} />
        </button>
        {isOpen && hasOptions && (
          <div
            className="absolute z-[100] mt-1 w-full rounded-lg py-1 max-h-60 overflow-y-auto focus:outline-none"
            style={{
              background: 'var(--color-bg-elevated)',
              border: `1px solid var(--color-border-strong)`,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
            }}
          >
            {normalizedOptions.map((opt) => {
              const isSelected = String(opt.value) === String(value)
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value)
                    setIsOpen(false)
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 text-left text-sm transition-colors"
                  style={{
                    color: isSelected ? 'var(--color-primary)' : 'var(--color-text-primary)',
                    background: isSelected ? 'var(--color-primary-muted)' : 'transparent',
                  }}
                  onMouseEnter={e => {
                    if (!isSelected) e.currentTarget.style.background = 'var(--color-bg-hover)'
                  }}
                  onMouseLeave={e => {
                    if (!isSelected) e.currentTarget.style.background = 'transparent'
                  }}
                >
                  <span className={isSelected ? 'font-semibold' : ''}>{opt.label}</span>
                  {isSelected && <Check size={14} style={{ color: 'var(--color-primary)' }} className="shrink-0 ml-2" />}
                </button>
              )
            })}
          </div>
        )}
      </div>
      {addPath && !hasOptions && (
        <Link 
          to={addPath}
          className="text-xs font-semibold hover:underline shrink-0 px-1 transition-all"
          style={{ color: 'var(--color-primary)' }}
        >
          + Add one
        </Link>
      )}
    </div>
  )
}

export default DropdownSelect
