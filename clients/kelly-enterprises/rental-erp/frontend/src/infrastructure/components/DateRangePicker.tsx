// DateRangePicker - Calendar-based date range selection for filtering
import { useState, useRef, useEffect } from 'react';
import { Button } from './Button';
import styles from './DateRangePicker.module.css';

export interface DateRange {
  start: Date | null;
  end: Date | null;
}

export interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  placeholder?: string;
  clearable?: boolean;
}

export function DateRangePicker({
  value,
  onChange,
  placeholder = 'Select date range...',
  clearable = true
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempStart, setTempStart] = useState<Date | null>(value.start);
  const [tempEnd, setTempEnd] = useState<Date | null>(value.end);

  // Ensure viewMonth is always a Date object (defensive programming)
  const getInitialViewMonth = () => {
    if (value.start instanceof Date && !isNaN(value.start.getTime())) {
      return value.start;
    }
    return new Date();
  };

  const [viewMonth, setViewMonth] = useState<Date>(getInitialViewMonth());
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLDivElement>(null);

  // Calculate dropdown position
  const updatePosition = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      const dropdownWidth = 280; // min-width from CSS
      const viewportWidth = window.innerWidth;

      // Calculate left position, ensuring it doesn't overflow right edge
      let left = rect.left;
      if (left + dropdownWidth > viewportWidth) {
        // Position from right edge of input, aligned to right
        left = rect.right - dropdownWidth;
      }

      // Ensure it doesn't overflow left edge either
      if (left < 0) {
        left = 10; // 10px padding from left edge
      }

      setDropdownPosition({
        top: rect.bottom + 4,
        left: left
      });
    }
  };

  // Close picker when clicking outside and update position on open
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      updatePosition();
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', updatePosition, true);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        window.removeEventListener('scroll', updatePosition, true);
      };
    }
  }, [isOpen]);

  // Format date for display
  const formatDate = (date: Date | null) => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Get display text
  const getDisplayText = () => {
    if (!value.start && !value.end) return placeholder;
    if (value.start && value.end) {
      return `${formatDate(value.start)} - ${formatDate(value.end)}`;
    }
    if (value.start) return `From ${formatDate(value.start)}`;
    if (value.end) return `Until ${formatDate(value.end)}`;
    return placeholder;
  };

  // Handle date selection
  const handleDateClick = (date: Date) => {
    const dateStr = date.toDateString();

    // Check if clicking on already selected date to deselect it
    if (tempStart && dateStr === tempStart.toDateString()) {
      setTempStart(tempEnd);
      setTempEnd(null);
      return;
    }

    if (tempEnd && dateStr === tempEnd.toDateString()) {
      setTempEnd(null);
      return;
    }

    // Normal selection logic
    if (!tempStart || (tempStart && tempEnd)) {
      // Start new range
      setTempStart(date);
      setTempEnd(null);
    } else {
      // Complete range
      if (date < tempStart) {
        setTempEnd(tempStart);
        setTempStart(date);
      } else {
        setTempEnd(date);
      }
    }
  };

  // Apply selection
  const handleApply = () => {
    onChange({ start: tempStart, end: tempEnd });
    setIsOpen(false);
  };

  // Clear selection
  const handleClear = () => {
    setTempStart(null);
    setTempEnd(null);
    onChange({ start: null, end: null });
    // Don't close the dropdown - let user continue selecting
  };

  // Navigate months
  const handlePrevMonth = () => {
    setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1));
  };

  // Generate calendar days
  const generateCalendarDays = () => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay()); // Start from Sunday

    const days: Date[] = [];
    const currentDate = new Date(startDate);

    // Generate 6 weeks of days
    for (let i = 0; i < 42; i++) {
      days.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return days;
  };

  const calendarDays = generateCalendarDays();
  const currentMonth = viewMonth.getMonth();

  // Check if date is in range
  const isInRange = (date: Date) => {
    if (!tempStart || !tempEnd) return false;
    return date >= tempStart && date <= tempEnd;
  };

  // Check if date is selected
  const isSelected = (date: Date) => {
    if (!tempStart && !tempEnd) return false;
    const dateStr = date.toDateString();
    return dateStr === tempStart?.toDateString() || dateStr === tempEnd?.toDateString();
  };

  return (
    <div className={styles.container} ref={containerRef}>
      <div
        ref={inputRef}
        className={styles.input}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={!value.start && !value.end ? styles.placeholder : ''}>
          {getDisplayText()}
        </span>
        <i className="fas fa-calendar-alt" style={{ color: 'var(--color-gray-400)' }} />
      </div>

      {isOpen && (
        <div
          className={styles.dropdown}
          style={{ top: `${dropdownPosition.top}px`, left: `${dropdownPosition.left}px` }}
        >
          <div className={styles.header}>
            <button
              className={styles.navButton}
              onClick={handlePrevMonth}
              type="button"
            >
              <i className="fas fa-chevron-left" />
            </button>
            <span className={styles.monthLabel}>
              {viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
            <button
              className={styles.navButton}
              onClick={handleNextMonth}
              type="button"
            >
              <i className="fas fa-chevron-right" />
            </button>
          </div>

          <div className={styles.calendar}>
            {/* Day headers */}
            <div className={styles.weekdays}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className={styles.weekday}>
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar days */}
            <div className={styles.days}>
              {calendarDays.map((date, index) => {
                const isCurrentMonth = date.getMonth() === currentMonth;
                const isToday = date.toDateString() === new Date().toDateString();

                return (
                  <button
                    key={index}
                    type="button"
                    className={`
                      ${styles.day}
                      ${!isCurrentMonth ? styles.otherMonth : ''}
                      ${isToday ? styles.today : ''}
                      ${isSelected(date) ? styles.selected : ''}
                      ${isInRange(date) ? styles.inRange : ''}
                    `}
                    onClick={() => handleDateClick(date)}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>
          </div>

          <div className={styles.footer}>
            {clearable && (value.start || value.end) && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleClear}
              >
                Clear
              </Button>
            )}
            <Button
              variant="primary"
              size="sm"
              onClick={handleApply}
              disabled={!tempStart && !tempEnd}
            >
              Apply
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
