// Inventory module type definitions

export interface InventoryLocation {
  id: number;
  item_type: 'gauge' | 'tool' | 'part' | 'equipment' | 'material';
  item_identifier: string;
  current_location: string;
  quantity: number;
  last_moved_at: string;
  last_moved_by: number;
  created_at: string;
  updated_at: string;
}

export interface InventoryMovement {
  id: number;
  movement_type: 'transfer' | 'created' | 'deleted' | 'other';
  item_type: 'gauge' | 'tool' | 'part' | 'equipment' | 'material';
  item_identifier: string;
  quantity: number;
  order_number?: string | null;
  job_number?: string | null;
  from_location?: string | null;
  to_location?: string | null;
  moved_by: number;
  moved_at: string;
  reason?: string | null;
  notes?: string | null;
  moved_by_username?: string;
  moved_by_name?: string;
}

export interface MoveItemRequest {
  itemType: 'gauge' | 'tool' | 'part' | 'equipment' | 'material';
  itemIdentifier: string;
  toLocation: string;
  reason?: string;
  notes?: string;
  quantity?: number;
  orderNumber?: string;
  jobNumber?: string;
}

export interface LocationWithItems {
  location_code: string;
  location_name?: string;
  items: {
    gauges: Array<{ item_identifier: string; quantity: number; last_moved_at: string }>;
    tools: Array<{ item_identifier: string; quantity: number; last_moved_at: string }>;
    parts: Array<{ item_identifier: string; quantity: number; last_moved_at: string }>;
  };
  total_items: number;
}

export interface InventoryOverview {
  locations: LocationWithItems[];
  statistics: {
    total_locations: number;
    total_items: number;
    by_type: {
      gauges: number;
      tools: number;
      parts: number;
      equipment: number;
      material: number;
    };
  };
}

export interface InventoryStatistics {
  total_items: number;
  by_type: {
    gauge: number;
    tool: number;
    part: number;
    equipment: number;
    material: number;
  };
  total_locations: number;
  recent_movements: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Location hierarchy interfaces
export interface Facility {
  id: number;
  facility_code: string;
  facility_name: string;
  is_active: boolean;
  display_order: number;
  building_count?: number;
  created_at: string;
  updated_at: string;
}

export interface Building {
  id: number;
  building_code: string;
  building_name: string;
  facility_id: number;
  facility_code: string;
  facility_name: string;
  is_active: boolean;
  display_order: number;
  zone_count?: number;
  created_at: string;
  updated_at: string;
}

export interface Zone {
  id: number;
  zone_code: string;
  zone_name: string;
  building_id: number;
  building_code: string;
  building_name: string;
  facility_id: number;
  facility_code: string;
  facility_name: string;
  is_active: boolean;
  display_order: number;
  location_count?: number;
  created_at: string;
  updated_at: string;
}

export interface StorageLocation {
  id: number;
  location_code: string;
  building_id?: number | null;
  building_name?: string;
  facility_id?: number;
  facility_name?: string;
  zone_id?: number | null;
  zone_name?: string;
  location_type: string;
  is_active: boolean;
  allowed_item_types: string[];
  item_count?: number;
  created_at: string;
  updated_at: string;
}
