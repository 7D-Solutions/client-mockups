# Example Module Configurations

Complete, production-ready module configuration examples based on design mockups.

## Overview

These JSON configuration files demonstrate the full capabilities of the module configuration schema. Each example is based on a corresponding HTML design mockup and represents a complete, working module specification.

## Available Examples

### 1. Cattle Tracking (`cattle-config.json`)
**Based on:** `/erp-core-docs/design-mockups/CATTLE-TRACKING-INDEX.md`

**Module:** Cattle production tracking system
**Entity:** Cow (singular) / Cows (plural)
**Business ID:** `tag_id` (e.g., "C-1234")

**Key Features:**
- Complete cattle profile management (breed, age, weight, status, color/markings)
- Dam/Sire lineage tracking with self-referential relationships
- Calf history with one-to-many relationships
- Work activity timeline (vaccinations, treatments, weighing, etc.)
- Body condition scoring (1-9 scale)
- Financial tracking (purchase price, current value)
- Expandable DataTable rows with inline history tabs

**Field Highlights:**
- 15 core fields including enums for status tracking
- Foreign key relationships for dam_id and current_calf_id
- Calculated fields: total_calves, avg_weaning_weight
- Validation rules for tag_id pattern, age/weight ranges

**Relationships:**
- `calves` (hasMany Calf via mother_id)
- `dam` (belongsTo Cow via dam_id)
- `currentCalf` (hasOne Calf via current_calf_id)
- `workHistory` (hasMany WorkActivity via cow_id)

---

### 2. Equipment Management (`equipment-config.json`)
**Based on:** `/erp-core-docs/design-mockups/EQUIPMENT-TRACKER-INDEX.md`

**Module:** Equipment purchase, maintenance, and sale tracking
**Entity:** Equipment (singular and plural)
**Business ID:** `equipment_id` (e.g., "EQ-001")

**Key Features:**
- Complete equipment lifecycle tracking (purchase → maintenance → sale)
- Financial tracking with purchase/sale transactions
- Maintenance history with service provider and cost tracking
- Year-over-year financial summaries and depreciation
- Cost per operating hour/mile calculations
- Status management (active, idle, maintenance, sold, retired)
- Category-based organization (heavy machinery, trucks, tools, trailers, generators)

**Field Highlights:**
- 20+ fields covering equipment details, financials, and operations
- Enum for category and status with 5 distinct values each
- Serial number uniqueness constraint
- Separate fields for operating_hours and mileage
- Year-to-date maintenance cost tracking

**Relationships:**
- `transactions` (hasMany Transaction via equipment_id) - Purchase/sale records
- `maintenanceRecords` (hasMany MaintenanceRecord via equipment_id) - Service history
- `financialSummaries` (hasMany FinancialSummary via equipment_id) - Yearly P&L

---

### 3. Airbnb Bookings (`airbnb-config.json`)
**Based on:** `/erp-core-docs/design-mockups/AIRBNB-TRACKER-INDEX.md`

**Module:** Airbnb/VRBO rental booking management with multi-property support
**Entity:** Booking (singular) / Bookings (plural)
**Business ID:** `booking_id` (e.g., "BK-2024-032")

**Key Features:**
- Complete booking lifecycle (confirmed → checked in → completed)
- Multi-platform support (Airbnb, VRBO, Booking.com, Direct)
- Financial tracking with platform fees and net payout calculation
- Guest management with profile, contact info, and history
- Expense tracking per booking (cleaning, maintenance, utilities, supplies)
- Review and rating system with detailed category scores
- Calendar view integration for visual booking management
- Occupancy rate and profitability analysis

**Field Highlights:**
- 30+ fields covering guest info, dates, financials, and ratings
- Enum for platform (airbnb, vrbo, booking_com, direct)
- Enum for status (confirmed, checked_in, completed, cancelled, pending)
- Separate tracking for adults, children, infants, pets
- Detailed revenue breakdown (gross, fees, net payout)
- Guest verification and stay history

**Relationships:**
- `property` (belongsTo Property via property_id) - Associated rental property
- `expenses` (hasMany Expense via booking_id) - Operating costs per booking
- `review` (hasOne Review via booking_id) - Guest rating and feedback
- `notes` (hasMany Note via booking_id) - Internal booking notes

---

## Configuration Schema Compliance

All example configurations are fully compliant with the schema at:
```
../module-config.schema.json
```

Each configuration includes:
- ✅ Required fields: `moduleName`, `entityName`, `entityNamePlural`, `entityTable`, `entityBusinessId`, `fields`
- ✅ Complete field definitions with types, validation, and constraints
- ✅ Relationship definitions with proper cardinality (hasMany, belongsTo, hasOne)
- ✅ Feature flags (timeline, financials, search, export, calendar, expandableRows, softDelete, auditLog)
- ✅ RBAC permissions (create, read, update, delete by role)
- ✅ API configuration (prefix, version)
- ✅ UI configuration (routeBase, listView, formLayout)
- ✅ Validation rules (patterns, min/max, custom validators)

---

## Usage

### 1. Review Configuration
```bash
# View configuration
cat cattle-config.json | jq
cat equipment-config.json | jq
cat airbnb-config.json | jq
```

### 2. Validate Against Schema
```bash
# Using ajv-cli or similar JSON schema validator
ajv validate -s ../module-config.schema.json -d cattle-config.json
ajv validate -s ../module-config.schema.json -d equipment-config.json
ajv validate -s ../module-config.schema.json -d airbnb-config.json
```

### 3. Generate Module
```bash
# Using module generation script (future implementation)
node generate-module.js --config cattle-config.json
node generate-module.js --config equipment-config.json
node generate-module.js --config airbnb-config.json
```

---

## Field Type Reference

All configurations use the following field types from the schema:

| Type | Description | Examples |
|------|-------------|----------|
| `string` | Text fields with optional maxLength | name, email, tag_id |
| `integer` | Whole numbers | age, guests, nights |
| `decimal` | Floating point numbers | weight, price, rating |
| `boolean` | True/false flags | verified_id, active |
| `date` | Date values (YYYY-MM-DD) | check_in, birth_date |
| `datetime` | Date and time values | created_at, updated_at |
| `text` | Long text fields | notes, description |
| `enum` | Predefined value lists | status, platform, category |
| `json` | JSON objects | guest_count, ratings |

---

## Validation Rules

Common validation patterns used across examples:

```javascript
// ID Pattern Validation
"tag_id": { "pattern": "^[A-Z0-9-]{3,20}$" }        // Cattle
"equipment_id": { "pattern": "^EQ-[0-9]{3,6}$" }    // Equipment
"booking_id": { "pattern": "^BK-[0-9]{4}-[0-9]{3}$" } // Airbnb

// Numeric Range Validation
"age": { "min": 0, "max": 30 }                      // Cattle age
"weight": { "min": 0, "max": 3000 }                 // Cattle weight
"rating": { "min": 1, "max": 5 }                    // Booking rating
"nights": { "min": 1, "max": 365 }                  // Booking length

// Financial Validation
"purchase_price": { "min": 0 }
"revenue": { "min": 0 }
"current_value": { "min": 0 }
```

---

## Relationship Patterns

### One-to-Many (hasMany)
```json
"calves": {
  "type": "hasMany",
  "entity": "Calf",
  "foreignKey": "mother_id"
}
```

### Many-to-One (belongsTo)
```json
"property": {
  "type": "belongsTo",
  "entity": "Property",
  "foreignKey": "property_id"
}
```

### One-to-One (hasOne)
```json
"review": {
  "type": "hasOne",
  "entity": "Review",
  "foreignKey": "booking_id"
}
```

### Self-Referential
```json
"dam": {
  "type": "belongsTo",
  "entity": "Cow",
  "foreignKey": "dam_id"
}
```

---

## Feature Flags

All examples enable the following features:

```json
"features": {
  "timeline": true,          // Activity timeline/history
  "financials": true,        // Revenue/expense tracking
  "search": true,            // Advanced search/filtering
  "export": true,            // CSV/PDF export
  "calendar": true/false,    // Calendar view (Airbnb only)
  "expandableRows": true,    // DataTable expandable rows
  "softDelete": true,        // Archived flag instead of delete
  "auditLog": true          // Track all changes
}
```

---

## Customization Guide

### Adding Fields
1. Add to `fields` object with type and constraints
2. Add validation rules if needed
3. Update relationships if field references another entity

### Adding Relationships
1. Define in `relationships` object
2. Specify type (hasMany, belongsTo, hasOne, manyToMany)
3. Set entity name and foreign key
4. For manyToMany, specify junction table

### Enabling Features
1. Toggle feature flags in `features` object
2. Ensure backend services support enabled features
3. Update UI components to display feature-specific data

### Customizing Permissions
1. Define CRUD permissions by role
2. Roles: admin, operator, viewer (customize as needed)
3. More granular permissions can be added in backend logic

---

## Design Mockup References

Each configuration corresponds to a complete HTML mockup:

| Config | Mockup File | Documentation |
|--------|-------------|---------------|
| **cattle-config.json** | `cattle-datatable-expandable.html` | `CATTLE-TRACKING-INDEX.md` |
| **equipment-config.json** | `equipment-tracker-datatable.html` | `EQUIPMENT-TRACKER-INDEX.md` |
| **airbnb-config.json** | `airbnb-rental-tracker-enhanced.html` | `AIRBNB-TRACKER-INDEX.md` |

**Mockup Location:** `/erp-core-docs/design-mockups/`

---

## Implementation Notes

### Database Schema Generation
From these configurations, you can generate:
- MySQL table definitions with proper data types
- Foreign key constraints for relationships
- Indexes on business ID and foreign keys
- Enum constraints for status fields

### API Endpoint Generation
Configurations specify:
- Base API path (e.g., `/api/cattle`, `/api/equipment`, `/api/airbnb`)
- Version (v2)
- CRUD operations based on permissions

### Frontend Component Generation
UI configuration defines:
- Route paths (e.g., `/cattle`, `/equipment`, `/airbnb`)
- List view type (table, cards, calendar)
- Form layout (single-column, two-column, grid)
- Expandable row behavior

---

## Next Steps

1. **Review Examples:** Open and review each JSON configuration
2. **Validate Against Schema:** Ensure all examples are schema-compliant
3. **Create Custom Config:** Use these as templates for new modules
4. **Generate Module:** Use configuration to scaffold complete module
5. **Test Generated Module:** Verify all features work as expected
6. **Deploy to Production:** Roll out new module to live environment

---

## Support

For questions or modifications:
- Refer to schema documentation at `../module-config.schema.json`
- Review design mockups at `/erp-core-docs/design-mockups/`
- Consult architectural documentation at `/erp-core-docs/system architecture/`

---

**Created:** 2025-11-08
**Schema Version:** 1.0
**Examples:** 3 complete module configurations
