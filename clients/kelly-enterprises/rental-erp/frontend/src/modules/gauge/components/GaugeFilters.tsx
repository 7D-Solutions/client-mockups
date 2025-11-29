// Gauge filtering component
import React from 'react';
import { useGaugeFilters } from '../hooks/useGaugeFilters';
import { useGauges } from '../hooks/useGauges';
import { Button, FormSelect } from '../../../infrastructure';
import { EquipmentRules } from '../../../infrastructure/business/equipmentRules';
import { TextFormatRules } from '../../../infrastructure/business/textFormatRules';

interface GaugeFiltersProps {
  activeCategory?: string;
}

export const GaugeFilters = React.memo(({ activeCategory }: GaugeFiltersProps) => {
  const {
    filters,
    setFilter,
    clearFilters
  } = useGaugeFilters();

  // Search input moved to separate component

  const { data } = useGauges();

  // Get filter options from current data
  const gauges = data?.data || [];
  
  // Filter gauges based on active category
  const getFilteredGauges = () => {
    if (!activeCategory || activeCategory === 'all') return gauges;
    
    const categoryMap = {
      'thread': gauges.filter(g => EquipmentRules.isThreadGauge(g)),
      'large': gauges.filter(g => EquipmentRules.isLargeEquipment(g)),
      'company': gauges.filter(g => EquipmentRules.isHandTool(g) && !EquipmentRules.isEmployeeOwned(g)),
      'employee': gauges.filter(g => EquipmentRules.isHandTool(g) && EquipmentRules.isEmployeeOwned(g))
    };
    
    return categoryMap[activeCategory as keyof typeof categoryMap] || gauges;
  };
  
  const filteredGauges = getFilteredGauges();
  
  const filterOptions = {
    statuses: [...new Set(filteredGauges.map(g => g.status).filter(Boolean))].sort(),
    locations: [...new Set(filteredGauges.map(g => g.storage_location).filter(Boolean))].sort(),
    ownershipTypes: [...new Set(filteredGauges.map(g => g.ownership_type).filter(Boolean))].sort(),
    manufacturers: [...new Set(filteredGauges.map(g => g.manufacturer).filter(Boolean))].sort(),
    calibrationStatuses: ['Current', 'Due Soon', 'Expired'],
    equipmentTypes: [...new Set(filteredGauges.map(g => g.equipment_type).filter(Boolean))].sort(),
  };

  // Search handler moved to SearchInput component

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilter('status', e.target.value || undefined);
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilter('category', e.target.value || undefined);
  };

  const handleLocationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilter('storage_location', e.target.value || undefined);
  };

  const handleOwnershipTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilter('ownershipType', e.target.value || undefined);
  };

  const handleManufacturerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilter('manufacturer', e.target.value || undefined);
  };

  const handleCalibrationStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilter('calibrationStatus', e.target.value || undefined);
  };

  const handleCalibrationStartDate = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilter('calibrationStartDate', e.target.value || undefined);
  };

  const handleCalibrationEndDate = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilter('calibrationEndDate', e.target.value || undefined);
  };

  const handleSealedChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setFilter('sealedStatus', value === '' ? undefined : value);
  };

  const handleEquipmentTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilter('equipment_type', e.target.value || undefined);
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== undefined && value !== '');

  return (
    <div style={{ height: '40px', display: 'flex', alignItems: 'center' }}>
      {/* Main filters row - Fixed layout to prevent shifting */}
      <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', width: '100%' }}>
        <FormSelect
          value={filters.storage_location || ''}
          onChange={handleLocationChange}
          style={{ width: '160px', flex: '0 0 160px', height: '40px' }}
        >
          <option value="">All Locations</option>
          {filterOptions.locations.map(location => (
            <option key={location} value={location}>
              {location}
            </option>
          ))}
        </FormSelect>
        <FormSelect
          value={filters.status || ''}
          onChange={handleStatusChange}
          style={{ width: '160px', flex: '0 0 160px', height: '40px' }}
        >
          <option value="">All Status</option>
          {filterOptions.statuses.map(status => (
            <option key={status} value={status}>
              {TextFormatRules.formatStatusText(status)}
            </option>
          ))}
        </FormSelect>
        {/* Equipment Types filter - Always reserve space to prevent horizontal shift */}
        <div style={{ width: '280px', flex: '0 0 280px', height: '40px', display: 'flex', alignItems: 'center', visibility: (!activeCategory || activeCategory === 'all') ? 'visible' : 'hidden' }}>
          <FormSelect
            value={filters.equipment_type || ''}
            onChange={handleEquipmentTypeChange}
            style={{ width: '100%', height: '40px', paddingRight: 'var(--space-7)' }}
          >
            <option value="">All Equipment Types</option>
            {filterOptions.equipmentTypes.map(type => (
              <option key={type} value={type}>
                {EquipmentRules.getDisplayName({ equipment_type: type })}
              </option>
            ))}
          </FormSelect>
        </div>
      </div>

      {/* Advanced filters section removed */}
    </div>
  );
});
