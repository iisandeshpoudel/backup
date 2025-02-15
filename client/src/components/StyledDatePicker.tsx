import React, { forwardRef } from 'react';
import DatePicker from 'react-datepicker';
import { CalendarIcon } from '@heroicons/react/24/outline';
import "react-datepicker/dist/react-datepicker.css";

interface DatePickerProps {
  selected: Date | null;
  onChange: (date: Date | null) => void;
  minDate?: Date;
  maxDate?: Date;
  placeholderText?: string;
  disabled?: boolean;
  excludeDates?: Date[];
}

// Custom Input component for the date picker
const CustomInput = forwardRef<HTMLButtonElement, { value?: string; onClick?: () => void; disabled?: boolean }>(
  ({ value, onClick, disabled }, ref) => (
    <button
      onClick={onClick}
      ref={ref}
      disabled={disabled}
      className="flex items-center w-full px-4 py-2 text-sm bg-gray-800/80 backdrop-blur-sm border border-gray-700/50 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent hover:bg-gray-700/50 hover:border-gray-600/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-gray-300"
    >
      <CalendarIcon className="w-5 h-5 mr-2 text-gray-400" />
      {value || 'Select date'}
    </button>
  )
);

CustomInput.displayName = 'CustomInput';

export default function StyledDatePicker({
  selected,
  onChange,
  minDate,
  maxDate,
  placeholderText,
  disabled,
  excludeDates
}: DatePickerProps) {
  return (
    <div className="styled-datepicker">
      <DatePicker
        selected={selected}
        onChange={onChange}
        minDate={minDate}
        maxDate={maxDate}
        placeholderText={placeholderText}
        customInput={<CustomInput disabled={disabled} />}
        dateFormat="MMM d, yyyy"
        showPopperArrow={false}
        disabled={disabled}
        excludeDates={excludeDates}
        showDisabledMonthNavigation
        calendarClassName="styled-calendar"
        popperClassName="styled-popper"
        popperPlacement="bottom-start"
      />
    </div>
  );
} 