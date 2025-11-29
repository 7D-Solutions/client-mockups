import { useState, useEffect, useRef } from 'react';
import styles from './SearchableSelect.module.css';

export interface SelectOption {
  id: string;
  label: string;
  value: string;
  searchText?: string; // Optional field for custom search text
}

interface SearchableSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  fieldSize?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
  error?: string;
}

export const SearchableSelect = ({
  options,
  value,
  onChange,
  placeholder = 'Type to search...',
  disabled = false,
  required = false,
  fieldSize = 'md',
  className = '',
  label,
  error
}: SearchableSelectProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Calculate dropdown position when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4, // 4px margin
        left: rect.left,
        width: rect.width
      });
    }
  }, [isOpen]);

  // Set search term to selected option label
  useEffect(() => {
    const selectedOption = options.find(opt => opt.value === value);
    if (selectedOption) {
      setSearchTerm(selectedOption.label);
    } else {
      setSearchTerm('');
    }
  }, [value, options]);

  // Close dropdown when clicking outside input or dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const clickedElement = event.target as Node;
      const clickedInsideInput = inputRef.current?.contains(clickedElement);
      const clickedInsideDropdown = dropdownRef.current?.contains(clickedElement);

      if (!clickedInsideInput && !clickedInsideDropdown) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const filteredOptions = options.filter(option => {
    const searchIn = option.searchText || option.label.toLowerCase();
    return searchIn.includes(searchTerm.toLowerCase());
  });

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setIsOpen(true);
    // Clear selection if user modifies text
    const selectedOption = options.find(opt => opt.value === value);
    if (selectedOption && e.target.value !== selectedOption.label) {
      onChange('');
    }
  };

  return (
    <div className={`${styles.container} ${className}`} ref={containerRef}>
      {label && (
        <label className={styles.label}>
          {label}
        </label>
      )}
      <div className={styles.inputWrapper}>
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          required={required && !value}
          className={`${styles.input} ${styles[`input${fieldSize.toUpperCase()}`]} ${error ? styles.inputError : ''}`}
        />
        {isOpen && (
          <div
            ref={dropdownRef}
            className={styles.dropdown}
            style={{
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
              width: `${dropdownPosition.width}px`
            }}
          >
            {filteredOptions.length > 0 ? (
              filteredOptions.map(option => (
                <div
                  key={option.id}
                  className={`${styles.option} ${value === option.value ? styles.optionSelected : ''}`}
                  onClick={() => handleSelect(option.value)}
                >
                  {option.label}
                </div>
              ))
            ) : (
              <div className={styles.noResults}>
                {options.length === 0 ? 'Loading...' : 'No results found'}
              </div>
            )}
          </div>
        )}
      </div>
      {error && (
        <p className={styles.error}>{error}</p>
      )}
    </div>
  );
};