import React, { useState, useRef, useEffect } from 'react'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react'

export function CustomDatePicker({ value, onChange, placeholder = "Pick a date", className = "" }) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)

  // Parse incoming date string DD-MM-YYYY to a JS Date
  const parseValue = (val) => {
    if (!val) return new Date()
    const parts = val.split('-')
    if (parts.length === 3) {
      const d = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]))
      if (!isNaN(d.getTime())) return d
    }
    return new Date()
  }

  const initialDate = parseValue(value)
  const [currentMonth, setCurrentMonth] = useState(initialDate.getMonth())
  const [currentYear, setCurrentYear] = useState(initialDate.getFullYear())

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
    }
  }, [isOpen, value])

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]

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
    const mm = String(currentMonth + 1).padStart(2, '0')
    const yyyy = currentYear
    onChange(`${dd}-${mm}-${yyyy}`)
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
        className={`h-8 w-8 text-xs rounded-lg transition-colors flex items-center justify-center ${
          active
            ? 'bg-brand-primary text-white font-semibold'
            : 'text-gray-900 hover:bg-gray-100'
        }`}
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
        className="w-full flex items-center px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-brand-primary text-left"
      >
        <CalendarIcon size={16} className="text-gray-400 shrink-0 mr-2" />
        <span className="truncate flex-1">{value || placeholder}</span>
      </button>
      {isOpen && (
        <div className="absolute z-[100] mt-1 p-3 rounded-lg border border-gray-200 bg-white shadow-lg w-[280px]">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 hover:bg-gray-100 rounded-md text-gray-600 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-bold text-gray-900">
              {monthNames[currentMonth]} {currentYear}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 hover:bg-gray-100 rounded-md text-gray-600 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Days of week */}
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-gray-400 mb-1">
            {daysOfWeek.map(d => (
              <div key={d} className="h-8 flex items-center justify-center">{d}</div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1 h-[216px]">
            {dayCells}
          </div>
        </div>
      )}
    </div>
  )
}

export default CustomDatePicker
