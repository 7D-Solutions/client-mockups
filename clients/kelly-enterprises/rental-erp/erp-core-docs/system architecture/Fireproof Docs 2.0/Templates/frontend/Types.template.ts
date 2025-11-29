/**
 * TYPES TEMPLATE
 *
 * This template provides standardized TypeScript type definitions for entity operations.
 *
 * PATTERN OVERVIEW:
 * - Strong typing for all entity operations
 * - Consistent API response structures
 * - Reusable type unions and enums
 * - Helper types for CRUD operations
 *
 * CUSTOMIZATION POINTS:
 * 1. Replace {{ENTITY_NAME}} with singular entity name (e.g., "Gauge", "User", "Order")
 * 2. Replace {{ENTITY_NAME_LOWER}} with lowercase singular (e.g., "gauge", "user", "order")
 * 3. Replace {{FIELDS}} with actual entity fields
 * 4. Define status enums specific to your domain
 * 5. Add domain-specific interfaces and types
 *
 * TYPE CATEGORIES:
 * - Entity interfaces: Core data structures
 * - DTO types: Data transfer objects for create/update
 * - Filter types: Query parameters
 * - Response types: API response wrappers
 * - Status/enum types: String literal unions
 *
 * @see gauge/types/index.ts - Reference implementation
 */

// ===== CORE ENTITY INTERFACE =====

/**
 * Main {{ENTITY_NAME}} entity interface
 * Represents the complete {{ENTITY_NAME_LOWER}} data structure from the backend
 *
 * CUSTOMIZATION POINT: Add all fields that exist in your database table
 */
export interface {{ENTITY_NAME}} {
  // Primary identifier
  id: string;

  // CUSTOMIZATION POINT: Basic fields
  name: string;
  description?: string;
  status: {{ENTITY_NAME}}Status;

  // CUSTOMIZATION POINT: Relationships
  owner_id?: string;
  owner_name?: string;
  assigned_to?: string;
  assigned_to_name?: string;

  // CUSTOMIZATION POINT: Metadata fields
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;

  // CUSTOMIZATION POINT: Domain-specific fields
  // Add your entity-specific fields here
  // Examples:
  // - For User: email, role, department
  // - For Order: order_number, total_amount, customer_id
  // - For Product: sku, price, stock_quantity
}

// ===== STATUS AND ENUM TYPES =====

/**
 * {{ENTITY_NAME}} status enum
 * CUSTOMIZATION POINT: Define statuses relevant to your entity
 */
export type {{ENTITY_NAME}}Status =
  | 'active'
  | 'inactive'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'archived'
  | 'deleted';

/**
 * CUSTOMIZATION POINT: Add other enum types as needed
 *
 * @example
 * export type {{ENTITY_NAME}}Priority = 'low' | 'medium' | 'high' | 'critical';
 * export type {{ENTITY_NAME}}Category = 'type_a' | 'type_b' | 'type_c';
 */

// ===== DATA TRANSFER OBJECTS (DTOs) =====

/**
 * Data structure for creating a new {{ENTITY_NAME_LOWER}}
 * CUSTOMIZATION POINT: Include only fields that can be set during creation
 */
export interface {{ENTITY_NAME}}CreateData {
  name: string;
  description?: string;
  status?: {{ENTITY_NAME}}Status;
  owner_id?: string;

  // CUSTOMIZATION POINT: Add fields that can be set during creation
  // Typically excludes: id, created_at, updated_at
}

/**
 * Data structure for updating an existing {{ENTITY_NAME_LOWER}}
 * All fields are optional (partial update)
 */
export type {{ENTITY_NAME}}UpdateData = Partial<{{ENTITY_NAME}}CreateData>;

/**
 * CUSTOMIZATION POINT: Add operation-specific DTOs
 *
 * @example
 * export interface {{ENTITY_NAME}}AssignData {
 *   user_id: string;
 *   notes?: string;
 *   effective_date?: string;
 * }
 *
 * export interface {{ENTITY_NAME}}ApprovalData {
 *   approved: boolean;
 *   notes: string;
 *   approved_by: string;
 * }
 */

// ===== FILTER AND QUERY TYPES =====

/**
 * Filter parameters for querying {{ENTITY_NAME_LOWER_PLURAL}}
 * CUSTOMIZATION POINT: Add filterable fields
 */
export interface {{ENTITY_NAME}}Filters {
  // Basic filters
  status?: {{ENTITY_NAME}}Status;
  search?: string;

  // CUSTOMIZATION POINT: Add entity-specific filters
  owner_id?: string;
  assigned_to?: string;
  category?: string;

  // Date range filters
  created_after?: string;
  created_before?: string;
  updated_after?: string;
  updated_before?: string;

  // Pagination
  page?: number;
  limit?: number;

  // Sorting
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

/**
 * Sort options for {{ENTITY_NAME_LOWER}} lists
 */
export interface {{ENTITY_NAME}}SortOptions {
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

// ===== API RESPONSE TYPES =====

/**
 * Standard API response wrapper
 * Used for single entity operations (create, update, delete)
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: string[];
}

/**
 * Paginated list response for {{ENTITY_NAME_LOWER_PLURAL}}
 * Used by getAll/list endpoints
 */
export interface {{ENTITY_NAME}}ListResponse {
  data: {{ENTITY_NAME}}[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  _links?: {
    self: string;
    first: string;
    last: string;
    next: string | null;
    prev: string | null;
  };
}

/**
 * CUSTOMIZATION POINT: Add specialized response types
 *
 * @example
 * export interface {{ENTITY_NAME}}StatsResponse {
 *   total: number;
 *   by_status: Record<{{ENTITY_NAME}}Status, number>;
 *   recent_activity: {{ENTITY_NAME}}[];
 * }
 *
 * export interface {{ENTITY_NAME}}HistoryResponse {
 *   data: {{ENTITY_NAME}}HistoryEntry[];
 *   total: number;
 * }
 */

// ===== HELPER TYPES AND INTERFACES =====

/**
 * CUSTOMIZATION POINT: Add related entity interfaces
 *
 * @example
 * export interface {{ENTITY_NAME}}History {
 *   id: string;
 *   {{ENTITY_NAME_LOWER}}_id: string;
 *   action: string;
 *   changes: Record<string, any>;
 *   performed_by: string;
 *   performed_by_name: string;
 *   performed_at: string;
 * }
 *
 * export interface {{ENTITY_NAME}}Comment {
 *   id: string;
 *   {{ENTITY_NAME_LOWER}}_id: string;
 *   user_id: string;
 *   user_name: string;
 *   comment: string;
 *   created_at: string;
 * }
 *
 * export interface {{ENTITY_NAME}}Attachment {
 *   id: string;
 *   {{ENTITY_NAME_LOWER}}_id: string;
 *   file_name: string;
 *   file_size: number;
 *   file_type: string;
 *   uploaded_by: string;
 *   uploaded_at: string;
 *   url: string;
 * }
 */

// ===== TYPE GUARDS AND UTILITY FUNCTIONS =====

/**
 * Type guard to check if status is active
 *
 * @example
 * if (isActive{{ENTITY_NAME}}({{ENTITY_NAME_LOWER}})) {
 *   // {{ENTITY_NAME_LOWER}} is active
 * }
 */
export function isActive{{ENTITY_NAME}}(entity: {{ENTITY_NAME}}): boolean {
  return entity.status === 'active';
}

/**
 * Type guard to check if status is archived
 */
export function isArchived{{ENTITY_NAME}}(entity: {{ENTITY_NAME}}): boolean {
  return entity.status === 'archived';
}

/**
 * CUSTOMIZATION POINT: Add domain-specific utility functions
 *
 * @example
 * export function canEdit{{ENTITY_NAME}}(entity: {{ENTITY_NAME}}, userId: string): boolean {
 *   return entity.owner_id === userId || entity.status === 'draft';
 * }
 *
 * export function get{{ENTITY_NAME}}DisplayName(entity: {{ENTITY_NAME}}): string {
 *   return `${entity.name} (${entity.id})`;
 * }
 *
 * export function is{{ENTITY_NAME}}Overdue(entity: {{ENTITY_NAME}}): boolean {
 *   if (!entity.due_date) return false;
 *   return new Date(entity.due_date) < new Date();
 * }
 */

// ===== VALIDATION SCHEMAS (OPTIONAL) =====

/**
 * CUSTOMIZATION POINT: Add validation schemas if using libraries like Zod or Yup
 *
 * @example
 * import { z } from 'zod';
 *
 * export const {{ENTITY_NAME}}CreateSchema = z.object({
 *   name: z.string().min(1).max(255),
 *   description: z.string().optional(),
 *   status: z.enum(['active', 'inactive', 'pending']).default('pending'),
 * });
 *
 * export type {{ENTITY_NAME}}CreateData = z.infer<typeof {{ENTITY_NAME}}CreateSchema>;
 */

// ===== CONSTANTS =====

/**
 * CUSTOMIZATION POINT: Add entity-specific constants
 *
 * @example
 * export const {{ENTITY_NAME}}_STATUS_OPTIONS = [
 *   { value: 'active', label: 'Active' },
 *   { value: 'inactive', label: 'Inactive' },
 *   { value: 'pending', label: 'Pending' },
 * ] as const;
 *
 * export const {{ENTITY_NAME}}_DEFAULT_LIMIT = 50;
 * export const {{ENTITY_NAME}}_MAX_NAME_LENGTH = 255;
 */
