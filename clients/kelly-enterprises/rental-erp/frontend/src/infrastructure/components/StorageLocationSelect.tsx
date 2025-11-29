/**
 * Storage Location Select Component
 *
 * Shared component for selecting storage locations across all modules.
 * Fetches locations from centralized /api/storage-locations endpoint.
 *
 * Usage:
 *   import { StorageLocationSelect } from '../../infrastructure/components';
 *
 *   <StorageLocationSelect
 *     value={storageLocation}
 *     onChange={setStorageLocation}
 *     label="Storage Location"
 *     required
 *   />
 */

import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { SearchableSelect } from './SearchableSelect';

interface StorageLocation {
  id: number;
  location_code: string;
  description: string | null;
  location_type: string;
  is_active: boolean;
  display_order: number;
}

interface StorageLocationSelectProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export const StorageLocationSelect: React.FC<StorageLocationSelectProps> = ({
  value,
  onChange,
  label = 'Storage Location',
  required = false,
  disabled = false,
  placeholder = 'Select storage location...'
}) => {
  const [locations, setLocations] = useState<StorageLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadLocations = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await apiClient.get('/storage-locations');

        if (response.success && Array.isArray(response.data)) {
          // Sort by display_order (already handled by backend, but ensure it)
          const sortedLocations = response.data.sort(
            (a, b) => a.display_order - b.display_order
          );
          setLocations(sortedLocations);
        } else {
          throw new Error('Invalid response format from storage locations API');
        }
      } catch (err: any) {
        console.error('Failed to load storage locations:', err);
        setError('Failed to load storage locations. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadLocations();
  }, []);

  // Transform locations to SearchableSelect options
  // Use short labels (just code) to prevent dropdown from extending beyond modal
  // Note: Don't include placeholder as an option - SearchableSelect handles empty state
  const options = locations.map(loc => ({
    id: loc.id.toString(),
    value: loc.location_code,
    label: loc.location_code // Just the code to keep dropdown compact
  }));

  if (error) {
    return (
      <div className="form-group">
        <label>{label}</label>
        <div style={{
          padding: '12px',
          background: '#fee',
          border: '1px solid #fcc',
          borderRadius: '6px',
          color: '#c33',
          fontSize: '14px'
        }}>
          {error}
        </div>
      </div>
    );
  }

  return (
    <SearchableSelect
      label={label}
      value={value}
      onChange={onChange}
      options={options}
      required={required}
      disabled={disabled || loading}
      placeholder={placeholder}
    />
  );
};
