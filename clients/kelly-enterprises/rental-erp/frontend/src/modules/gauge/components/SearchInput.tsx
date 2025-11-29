import React, { useState, useEffect } from 'react';
import { useGaugeContext } from '../context';
import { useGaugeFilters } from '../hooks/useGaugeFilters';
import { Button, FormInput } from '../../../infrastructure';
import styles from './SearchInput.module.css';

// Completely isolated search component
const SearchInput = () => {
  const { updateFilters } = useGaugeContext();
  const { filters, clearFilters } = useGaugeFilters();
  const [searchValue, setSearchValue] = useState('');

  // Sync local state with context when search is cleared externally (e.g., tab change)
  useEffect(() => {
    if (!filters.search && searchValue) {
      setSearchValue('');
    }
  }, [filters.search, searchValue]);

  // Check if there are any active filters (excluding search)
  const hasActiveFilters = Object.entries(filters).some(([key, value]) =>
    key !== 'search' && value !== undefined && value !== ''
  );

  // Check if there's an active search (either in local state or context)
  const hasActiveSearch = searchValue || filters.search;

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
  };

  const handleSearch = () => {
    updateFilters({ search: searchValue || undefined });
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleClear = () => {
    setSearchValue('');
    updateFilters({ search: undefined });
  };

  return (
    <div className={styles.searchContainer}>
      <FormInput
        type="text"
        placeholder="Search gauges, IDs, models, locations..."
        value={searchValue}
        onChange={handleSearchChange}
        onKeyPress={handleKeyPress}
        fieldSize="md"
        className={styles.inlineInput}
        style={{ width: '300px' }}
      />
      <Button
        onClick={handleSearch}
        variant="primary"
        size="md"
      >
        Search
      </Button>
      <Button
        onClick={handleClear}
        variant="secondary"
        style={{
          padding: '8px 12px',
          fontSize: 'var(--font-size-sm)',
          visibility: hasActiveSearch ? 'visible' : 'hidden',
          pointerEvents: hasActiveSearch ? 'auto' : 'none'
        }}
      >
        Clear
      </Button>
      <Button
        onClick={clearFilters}
        variant="secondary"
        size="md"
        style={{
          padding: '8px 12px',
          fontSize: 'var(--font-size-sm)',
          visibility: hasActiveFilters ? 'visible' : 'hidden',
          pointerEvents: hasActiveFilters ? 'auto' : 'none'
        }}
      >
        Clear Filters
      </Button>
    </div>
  );
};

export { SearchInput };