import React from 'react';

interface LocationDisplayProps {
  location_code?: string;
  building_name?: string;
  facility_name?: string;
  zone_name?: string;
  showHierarchy?: boolean;
  style?: React.CSSProperties;
}

/**
 * LocationDisplay Component
 *
 * Displays location information with optional hierarchy display.
 *
 * @param location_code - The location code (e.g., "A1-B2-C3")
 * @param building_name - Building name (optional)
 * @param facility_name - Facility name (optional)
 * @param zone_name - Zone name (optional)
 * @param showHierarchy - Whether to show full hierarchy or just location code
 * @param style - Additional CSS styles
 */
export function LocationDisplay({
  location_code,
  building_name,
  facility_name,
  zone_name,
  showHierarchy = false,
  style = {}
}: LocationDisplayProps) {
  // If no location code, return placeholder
  if (!location_code) {
    return <span style={style}>-</span>;
  }

  // If not showing hierarchy or no hierarchy data, just show location code
  if (!showHierarchy || (!building_name && !facility_name && !zone_name)) {
    return <span style={style}>{location_code}</span>;
  }

  // Build hierarchy display: Facility → Building → Zone → Location
  const parts: string[] = [];

  if (facility_name) {
    parts.push(facility_name);
  }

  if (building_name) {
    parts.push(building_name);
  }

  if (zone_name) {
    parts.push(zone_name);
  }

  // Always include location code at the end
  parts.push(location_code);

  return (
    <span style={style} title={parts.join(' → ')}>
      {parts.join(' → ')}
    </span>
  );
}
