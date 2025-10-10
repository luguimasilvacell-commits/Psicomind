import React, { forwardRef } from 'react'
import DatePicker, { registerLocale } from 'react-datepicker'
import { ptBR } from 'date-fns/locale'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '../lib/utils'
import 'react-datepicker/dist/react-datepicker.css'

// Registrar locale português
registerLocale('pt-BR', ptBR)

interface CalendarPickerProps {
  value?: Date | null
  onChange: (date: Date | null) => void
  placeholder?: string
  disabled?: boolean
  minDate?: Date
  maxDate?: Date
  showTimeSelect?: boolean
  timeFormat?: string
  dateFormat?: string
  className?: string
  error?: string
  label?: string
  required?: boolean
  id?: string
}

// Componente customizado para o input
const CustomInput = forwardRef<HTMLInputElement, any>(
  ({ value, onClick, placeholder, disabled, className, error, label, required, id }, ref) => (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-2">
          <Calendar className="h-4 w-4 inline mr-1" />
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          id={id}
          ref={ref}
          value={value}
          onClick={onClick}
          placeholder={placeholder}
          disabled={disabled}
          readOnly
          className={cn(
            "w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 cursor-pointer",
            disabled && "bg-gray-100 cursor-not-allowed",
            error && "border-red-500 focus:ring-red-500 focus:border-red-500",
            className
          )}
        />
        <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  )
)

CustomInput.displayName = 'CustomInput'

// Componente customizado para o header do calendário
const CustomHeader = ({
  date,
  decreaseMonth,
  increaseMonth,
  prevMonthButtonDisabled,
  nextMonthButtonDisabled,
}: any) => (
  <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg">
    <button
      type="button"
      onClick={decreaseMonth}
      disabled={prevMonthButtonDisabled}
      className="p-1 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <ChevronLeft className="h-5 w-5" />
    </button>
    
    <div className="font-semibold text-lg">
      {date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
    </div>
    
    <button
      type="button"
      onClick={increaseMonth}
      disabled={nextMonthButtonDisabled}
      className="p-1 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <ChevronRight className="h-5 w-5" />
    </button>
  </div>
)

function CalendarPicker({
  value,
  onChange,
  placeholder = "Selecione uma data",
  disabled = false,
  minDate,
  maxDate,
  showTimeSelect = false,
  timeFormat = "HH:mm",
  dateFormat = showTimeSelect ? "dd/MM/yyyy HH:mm" : "dd/MM/yyyy",
  className,
  error,
  label,
  required = false,
  id,
}: CalendarPickerProps) {
  return (
    <div className="calendar-picker">
      <DatePicker
        selected={value}
        onChange={onChange}
        locale="pt-BR"
        dateFormat={dateFormat}
        timeFormat={timeFormat}
        showTimeSelect={showTimeSelect}
        timeIntervals={15}
        minDate={minDate}
        maxDate={maxDate}
        disabled={disabled}
        placeholderText={placeholder}
        customInput={
          <CustomInput
            className={className}
            error={error}
            label={label}
            required={required}
            id={id}
          />
        }
        renderCustomHeader={CustomHeader}
        popperClassName="calendar-picker-popper"
        calendarClassName="calendar-picker-calendar"
        dayClassName={(date) => {
          const today = new Date()
          const isToday = date.toDateString() === today.toDateString()
          const isWeekend = date.getDay() === 0 || date.getDay() === 6
          
          return cn(
            "hover:bg-blue-100 transition-colors",
            isToday && "bg-blue-500 text-white hover:bg-blue-600",
            isWeekend && !isToday && "text-red-500"
          )
        }}
        showPopperArrow={false}
        popperModifiers={[
          {
            name: 'offset',
            options: {
              offset: [0, 8],
            },
          },
          {
            name: 'preventOverflow',
            options: {
              rootBoundary: 'viewport',
              tether: false,
              altAxis: true,
            },
          },
        ]}
      />
      
      <style jsx global>{`
        .calendar-picker-popper {
          z-index: 9999 !important;
        }
        
        .calendar-picker-calendar {
          border: none !important;
          border-radius: 0.5rem !important;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04) !important;
          font-family: inherit !important;
        }
        
        .react-datepicker__month-container {
          border-radius: 0.5rem !important;
        }
        
        .react-datepicker__day-names {
          background-color: #f8fafc !important;
          border-bottom: 1px solid #e2e8f0 !important;
        }
        
        .react-datepicker__day-name {
          color: #64748b !important;
          font-weight: 600 !important;
          font-size: 0.75rem !important;
        }
        
        .react-datepicker__day {
          border-radius: 0.375rem !important;
          margin: 0.125rem !important;
          font-size: 0.875rem !important;
          font-weight: 500 !important;
        }
        
        .react-datepicker__day--selected {
          background-color: #3b82f6 !important;
          color: white !important;
        }
        
        .react-datepicker__day--keyboard-selected {
          background-color: #dbeafe !important;
          color: #1d4ed8 !important;
        }
        
        .react-datepicker__day--today {
          background-color: #3b82f6 !important;
          color: white !important;
          font-weight: 700 !important;
        }
        
        .react-datepicker__day--outside-month {
          color: #cbd5e1 !important;
        }
        
        .react-datepicker__day--disabled {
          color: #cbd5e1 !important;
          cursor: not-allowed !important;
        }
        
        .react-datepicker__time-container {
          border-left: 1px solid #e2e8f0 !important;
        }
        
        .react-datepicker__time-list-item {
          font-size: 0.875rem !important;
          padding: 0.5rem 1rem !important;
        }
        
        .react-datepicker__time-list-item--selected {
          background-color: #3b82f6 !important;
          color: white !important;
        }
        
        .react-datepicker__time-list-item:hover {
          background-color: #dbeafe !important;
        }
      `}</style>
    </div>
  )
}

// Hook para facilitar o uso com formulários
export const useCalendarPicker = (initialValue?: Date | null) => {
  const [value, setValue] = React.useState<Date | null>(initialValue || null)
  
  const handleChange = (date: Date | null) => {
    setValue(date)
  }
  
  const reset = () => {
    setValue(null)
  }
  
  const setDate = (date: Date | null) => {
    setValue(date)
  }
  
  return {
    value,
    onChange: handleChange,
    reset,
    setDate,
    // Utilitários para formatação
    getISOString: () => value?.toISOString() || '',
    getDateString: () => value?.toISOString().split('T')[0] || '',
    getFormattedDate: (format = 'dd/MM/yyyy') => {
      if (!value) return ''
      return value.toLocaleDateString('pt-BR')
    }
  }
}

// Exports
export { CalendarPicker }
export default CalendarPicker