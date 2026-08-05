import React, { useState, useRef, useEffect } from 'react'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react'

export function CustomDatePicker({ value, onChange, placeholder = "Pick a date", className = "", align = "left" }) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)

  // Parse incoming date string (DD-MM-YYYY, DD/MON/YYYY, etc.) to a JS Date
  const parseValue = (val) => {
    if (!val) return new Date()
    const monthsMap = { JAN:0, FEB:1, MAR:2, APR:3, MAY:4, JUN:5, JUL:6, AUG:7, SEP:8, OCT:9, NOV:10, DEC:11 }
    const parts = String(val).trim().split(/[-/\s]/)
    if (parts.length === 3) {
      const monthUpper = parts[1].toUpperCase()
      const m = monthsMap[monthUpper] !== undefined ? monthsMap[monthUpper] : Number(parts[1]) - 1
      const d = new Date(Number(parts[2]), m, Number(parts[0]))
      if (!isNaN(d.getTime())) return d
    }
    const fallback = new Date(val)
    return !isNaN(fallback.getTime()) ? fallback : new Date()
  }

  const initialDate = parseValue(value)
  const [currentMonth, setCurrentMonth] = useState(initialDate.getMonth())
  const [currentYear, setCurrentYear] = useState(initialDate.getFullYear())
  const [viewMode, setViewMode] = useState('days') // 'days' | 'months' | 'years'
  const [yearStart, setYearStart] = useState(initialDate.getFullYear() - 5)

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Reset internal month/year whenever picker opens or value changes
  useEffect(() => {
    if (isOpen) {
      const d = parseValue(value)
      setCurrentMonth(d.getMonth())
      setCurrentYear(d.getFullYear())
      setYearStart(d.getFullYear() - 5)
      setViewMode('days')
    }
  }, [isOpen, value])

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]

  const monthNamesShort = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]

  const daysOfWeek = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay()

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
  }

  const handleSelectDay = (day) => {
    const dd = String(day).padStart(2, '0')
    const mon = monthNamesShort[currentMonth]
    const yyyy = currentYear
    onChange(`${dd}/${mon}/${yyyy}`)
    setIsOpen(false)
  }

  // Generate blank cells for padding before the 1st of the month
  const dayCells = []
  for (let i = 0; i < firstDayIndex; i++) {
    dayCells.push(<div key={`empty-${i}`} className="h-8 w-8" />)
  }

  const selectedD = parseValue(value)
  const isSelected = (day) => {
    if (!value) return false
    return selectedD.getDate() === day &&
           selectedD.getMonth() === currentMonth &&
           selectedD.getFullYear() === currentYear
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const active = isSelected(day)
    dayCells.push(
      <button
        key={`day-${day}`}
        type="button"
        onClick={() => handleSelectDay(day)}
        className="h-8 w-8 text-xs rounded-lg transition-colors flex items-center justify-center font-medium"
        style={{
          background: active ? 'var(--gradient-primary)' : 'transparent',
          color: active ? '#fff' : 'var(--color-text-primary)'
        }}
        onMouseEnter={e => { if(!active) e.currentTarget.style.background = 'var(--color-bg-elevated)' }}
        onMouseLeave={e => { if(!active) e.currentTarget.style.background = 'transparent' }}
      >
        {day}
      </button>
    )
  }

  // Pad to exactly 42 cells (6 rows) so height is fixed and never shifts
  const totalCellsNeeded = 42
  const remainingCells = totalCellsNeeded - dayCells.length
  for (let i = 0; i < remainingCells; i++) {
    dayCells.push(<div key={`empty-end-${i}`} className="h-8 w-8" />)
  }

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center px-3 py-2 text-sm rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-brand-primary text-left"
        style={{
          background: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border)',
          color: 'var(--color-text-primary)'
        }}
      >
        <CalendarIcon size={16} className="text-gray-400 shrink-0 mr-2" />
        <span className="truncate flex-1">{value || placeholder}</span>
      </button>
      {isOpen && (
        <div 
          className={`absolute z-[100] mt-1 p-3 rounded-lg border shadow-lg w-[280px] ${align === 'right' ? 'right-0' : 'left-0'}`}
          style={{
            background: 'var(--color-bg-surface)',
            borderColor: 'var(--color-border)',
            color: 'var(--color-text-primary)'
          }}
        >
          {/* View Mode: Days */}
          {viewMode === 'days' && (
            <>
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1 rounded-md transition-colors"
                  style={{ color: 'var(--color-text-secondary)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--color-bg-elevated)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <ChevronLeft size={16} />
                </button>
                <div className="flex items-center space-x-1.5 text-xs font-bold" style={{ color: 'var(--color-text-primary)' }}>
                  <button
                    type="button"
                    onClick={() => setViewMode('months')}
                    className="transition-colors px-1 py-0.5 rounded"
                    style={{ fontFamily: 'var(--font-display)' }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-primary)'; e.currentTarget.style.background = 'var(--color-bg-elevated)' }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-primary)'; e.currentTarget.style.background = 'transparent' }}
                  >
                    {monthNames[currentMonth]}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setYearStart(currentYear - 5)
                      setViewMode('years')
                    }}
                    className="transition-colors px-1 py-0.5 rounded"
                    style={{ fontFamily: 'var(--font-display)' }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-primary)'; e.currentTarget.style.background = 'var(--color-bg-elevated)' }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-primary)'; e.currentTarget.style.background = 'transparent' }}
                  >
                    {currentYear}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1 rounded-md transition-colors"
                  style={{ color: 'var(--color-text-secondary)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--color-bg-elevated)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              {/* Days of week */}
              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>
                {daysOfWeek.map(d => (
                  <div key={d} className="h-8 flex items-center justify-center">{d}</div>
                ))}
              </div>

              {/* Days grid */}
              <div className="grid grid-cols-7 gap-1 h-[216px]">
                {dayCells}
              </div>
            </>
          )}

          {/* View Mode: Months */}
          {viewMode === 'months' && (
            <>
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <button
                  type="button"
                  onClick={() => setCurrentYear(prev => prev - 1)}
                  className="p-1 rounded-md transition-colors"
                  style={{ color: 'var(--color-text-secondary)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--color-bg-elevated)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <ChevronLeft size={16} />
                </button>
                <div className="text-xs font-bold" style={{ color: 'var(--color-text-primary)' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setYearStart(currentYear - 5)
                      setViewMode('years')
                    }}
                    className="transition-colors px-2 py-0.5 rounded"
                    style={{ fontFamily: 'var(--font-display)' }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-primary)'; e.currentTarget.style.background = 'var(--color-bg-elevated)' }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-primary)'; e.currentTarget.style.background = 'transparent' }}
                  >
                    {currentYear}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentYear(prev => prev + 1)}
                  className="p-1 rounded-md transition-colors"
                  style={{ color: 'var(--color-text-secondary)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--color-bg-elevated)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              {/* Months Grid */}
              <div className="grid grid-cols-3 gap-2 mt-2 h-[216px] items-center">
                {monthNames.map((m, idx) => {
                  const isCurrent = idx === currentMonth
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        setCurrentMonth(idx)
                        setViewMode('days')
                      }}
                      className="py-2 text-xs rounded-lg transition-colors flex items-center justify-center font-medium"
                      style={{
                        background: isCurrent ? 'var(--gradient-primary)' : 'transparent',
                        color: isCurrent ? '#fff' : 'var(--color-text-primary)'
                      }}
                      onMouseEnter={e => { if(!isCurrent) e.currentTarget.style.background = 'var(--color-bg-elevated)' }}
                      onMouseLeave={e => { if(!isCurrent) e.currentTarget.style.background = 'transparent' }}
                    >
                      {m.slice(0, 3)}
                    </button>
                  )
                })}
              </div>
            </>
          )}

          {/* View Mode: Years */}
          {viewMode === 'years' && (
            <>
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <button
                  type="button"
                  onClick={() => setYearStart(prev => prev - 12)}
                  className="p-1 rounded-md transition-colors"
                  style={{ color: 'var(--color-text-secondary)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--color-bg-elevated)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <ChevronLeft size={16} />
                </button>
                <div className="text-xs font-bold" style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>
                  <span>{yearStart} – {yearStart + 11}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setYearStart(prev => prev + 12)}
                  className="p-1 rounded-md transition-colors"
                  style={{ color: 'var(--color-text-secondary)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--color-bg-elevated)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              {/* Years Grid */}
              <div className="grid grid-cols-4 gap-2 mt-2 h-[216px] items-center">
                {Array.from({ length: 12 }).map((_, idx) => {
                  const year = yearStart + idx
                  const isCurrent = year === currentYear
                  return (
                    <button
                      key={year}
                      type="button"
                      onClick={() => {
                        setCurrentYear(year)
                        setViewMode('days')
                      }}
                      className="py-2 text-xs rounded-lg transition-colors flex items-center justify-center font-medium"
                      style={{
                        background: isCurrent ? 'var(--gradient-primary)' : 'transparent',
                        color: isCurrent ? '#fff' : 'var(--color-text-primary)'
                      }}
                      onMouseEnter={e => { if(!isCurrent) e.currentTarget.style.background = 'var(--color-bg-elevated)' }}
                      onMouseLeave={e => { if(!isCurrent) e.currentTarget.style.background = 'transparent' }}
                    >
                      {year}
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default CustomDatePicker
