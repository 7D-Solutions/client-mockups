import { useState, useEffect, useRef } from 'react';
import styles from './SearchableSelect.module.css';

export interface ComboboxOption {
  id: string;
  label: string;
  value: string;
  searchText?: string;
}

interface SearchableComboboxProps {
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  fieldSize?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
  error?: string;
  allowCustom?: boolean; // Allow adding custom values not in the list
  customOptionLabel?: string; // Label format for "Add new..." option
}

export const SearchableCombobox = ({
  options,
  value,
  onChange,
  placeholder = 'Type to search or add new...',
  disabled = false,
  required = false,
  fieldSize = 'md',
  className = '',
  label,
  error,
  allowCustom = true,
  customOptionLabel = 'Add "{value}" as new'
}: SearchableComboboxProps) => {
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
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width
      });
    }
  }, [isOpen]);

  // Set search term to selected option label OR custom value
  useEffect(() => {
    const selectedOption = options.find(opt => opt.value === value);
    if (selectedOption) {
      setSearchTerm(selectedOption.label);
    } else if (value) {
      // If value doesn't match any option, it's a custom value
      setSearchTerm(value);
    } else {
      setSearchTerm('');
    }
  }, [value, options]);

  // Close dropdown when clicking outside
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

  // Check if searchTerm matches any existing option exactly
  const exactMatch = options.some(opt =>
    opt.value.toLowerCase() === searchTerm.toLowerCase() ||
    opt.label.toLowerCase() === searchTerm.toLowerCase()
  );

  // Show "Add new" option if custom values allowed, search term is not empty, and no exact match
  const showAddNewOption = allowCustom && searchTerm.trim() && !exactMatch;

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  const handleAddNew = () => {
    onChange(searchTerm.trim());
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setIsOpen(true);

    // For custom values, update the value as user types
    if (allowCustom) {
      // Only update if it doesn't match an existing option
      const matchingOption = options.find(opt =>
        opt.label.toLowerCase() === e.target.value.toLowerCase()
      );
      if (!matchingOption) {
        onChange(e.target.value);
      }
    } else {
      // Clear selection if user modifies text and custom not allowed
      const selectedOption = options.find(opt => opt.value === value);
      if (selectedOption && e.target.value !== selectedOption.label) {
        onChange('');
      }
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
              <>
                {filteredOptions.map(option => (
                  <div
                    key={option.id}
                    className={`${styles.option} ${value === option.value ? styles.optionSelected : ''}`}
                    onClick={() => handleSelect(option.value)}
                  >
                    {option.label}
                  </div>
                ))}
                {showAddNewOption && (
                  <div
                    className={`${styles.option} ${styles.addNewOption}`}
                    onClick={handleAddNew}
                    style={{
                      borderTop: '1px solid var(--color-border)',
                      fontWeight: 600,
                      color: 'var(--color-primary)'
                    }}
                  >
                    ➕ {customOptionLabel.replace('{value}', searchTerm.trim())}
                  </div>
                )}
              </>
            ) : showAddNewOption ? (
              <div
                className={`${styles.option} ${styles.addNewOption}`}
                onClick={handleAddNew}
                style={{
                  fontWeight: 600,
                  color: 'var(--color-primary)'
                }}
              >
                ➕ {customOptionLabel.replace('{value}', searchTerm.trim())}
              </div>
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
