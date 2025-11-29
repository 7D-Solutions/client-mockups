# Implementation Checklist

**Master Document**: GAUGE_STANDARDIZATION_COMPLETE.md

## IMPORTANT: Pre-Implementation Review

### Before Making ANY Database Changes:
1. **READ the actual database schema first**
   ```sql
   SHOW CREATE TABLE gauges;
   ```
   
2. **COMPARE with proposed changes** in GAUGE_STANDARDIZATION_COMPLETE.md
   
3. **REPORT to user before proceeding**:
   - What exists in the database now
   - What changes are actually needed
   - Any potential conflicts
   
4. **STOP and ASK if anything is unclear**

## Database Implementation (Follow this order!)

### 1. Pre-Implementation
- [x] Read complete GAUGE_STANDARDIZATION_COMPLETE.md document
- [x] Analyze current gauges table structure
- [x] Compare with proposed changes
- [x] Report findings to user before proceeding
- [ ] Backup existing database - NOT DONE
- [x] Verify users table exists (required for foreign keys)

### 2. Create Supporting Tables (in order)
- [x] Create gauge_categories table and INSERT initial data (Heading 2: Create Categories Table)
- [x] Create gauge_system_config table and INSERT defaults (Heading 5: Create System Configuration Table)
- [x] Create gauge_id_config table (Heading 3: Create ID Configuration Table)
  - Note: Depends on gauge_categories

### 3. Modify Main Table
- [x] Run ALTER TABLE gauges (Heading 1: Modify Existing Gauges Table)
  - Note: Depends on gauge_categories

### 4. Create Dependent Tables
- [x] Create gauge_companion_history table (Heading 4: Create Companion History Table)
  - Note: Depends on gauges and users tables
- [x] Create gauge_thread_specifications table with all constraints (Heading 6)
  - Note: Depends on gauges table
  - [x] Added: chk_thread_form, chk_thread_class, chk_acme_starts constraints
- [x] Create gauge_hand_tool_specifications table (Heading 7)
  - Note: Depends on gauges and users tables
  - [x] Added: chk_ownership constraint
- [x] Create gauge_large_equipment_specifications table (Heading 8)
  - Note: Depends on gauges table
- [x] Create gauge_calibration_standard_specifications table (Heading 9)
  - Note: Depends on gauges table

### 5. Verify Database
- [x] Test all foreign key constraints - CASCADE DELETE and SET NULL working
- [x] Verify all CHECK constraints work - All constraints enforced except BINARY regex
- [x] Run sample queries from Technical Implementation Details - ALL TESTED AND WORKING
- [x] Test unique constraints - custom_id, categories, prefixes all enforced
- [x] Test business rules - gauge_suffix A/B validation, thread gauge requirements
- [x] Verify companion linking - bidirectional relationships working
- [x] Test spare gauge logic - is_spare flag working correctly

### 6. Database Implementation Status
- [x] All 9 tables created exactly per specification
- [x] All required columns present (standardized_name, companion_gauge_id, gauge_suffix, is_spare)
- [x] All indexes created for performance optimization
- [x] Foreign key constraints working with proper cascades
- [x] Business rule constraints added and tested
- [x] Initial data populated (20 categories, 3 system configs)
- [ ] Note: Prefix uppercase validation requires application-level enforcement

## Backend Implementation

### Core Services
- [ ] ID generation service with thread-safe sequential numbering
  - Use SQL from Technical Implementation Details - ID Generation Logic
- [ ] Name generation service using naming conventions
  - See Business Rules - Naming Conventions
- [ ] Validation service using regex patterns
  - See Technical Implementation Details - Validation Patterns
- [ ] Companion management service
  - Link/unlink GO and NO GO gauges
  - Spare matching algorithm
  - Companion history tracking

### API Endpoints
- [ ] GET /api/gauge-categories/:equipmentType
- [ ] GET /api/gauge-id-config/next-id/:categoryId/:gaugeType
- [ ] POST /api/gauges/create-set (create both GO/NO GO)
- [ ] POST /api/gauges/create-from-spares
- [ ] GET /api/gauges/spares/:specifications
- [ ] PUT /api/gauges/:id/companion
- [ ] GET /api/gauge-companion-history/:gaugeId

### Business Logic
- [ ] Implement seal status rules for calibration dates
- [ ] Implement "Verify Before Use" workflow
- [ ] Implement soft delete (is_deleted = 1)
- [ ] Implement audit trail for companion changes

## Frontend Implementation

### UI Components
- [ ] CategorySelectionModal
  - Multi-step: Equipment Type → Category → Confirmation
- [ ] Dynamic form generation based on:
  - Equipment type (thread_gauge, hand_tool, etc.)
  - Seal status (sealed/unsealed)
  - Thread type (standard, metric, NPT, etc.)
- [ ] Form validation using regex patterns
- [ ] Dual ID display component (system/custom/both)

### Views & Features
- [ ] Gauge list view with set-based display for thread gauges
- [ ] Spare inventory view (QC/Admin only)
- [ ] Visibility rules implementation
  - Regular users: Complete sets only
  - QC/Admin: Everything (sets, spares, incomplete)
- [ ] Search functionality supporting both ID types
- [ ] Companion change modal with reason capture

### Forms
- [ ] Thread gauge form with dynamic fields
- [ ] Hand tool form with ownership logic
- [ ] Large equipment form (no checkout option)
- [ ] Calibration standard form with access restrictions

## Business Rules Implementation
- [ ] Thread gauge rules
  - All except NPT require GO/NO GO pairs
  - Sets checkout together
  - Empty companion = spare
- [ ] Hand tool rules
  - Never sealed
  - Company vs employee ownership
  - "Verify Before Use" option
- [ ] Large equipment rules
  - Cannot be checked out
  - Fixed location
- [ ] Calibration standard rules
  - Restricted access
  - High security

## Admin Setup
- [ ] Configure ID prefixes in gauge_id_config
  - 2-4 character prefixes
  - Lock after first gauge created
- [ ] Set calibration frequency defaults
  - Thread Gauges: 730 days
  - Hand Tools: 365 days
  - Large Equipment: 365 days
  - Calibration Standards: 365 days
- [ ] Configure location options
- [ ] Set up user roles for spare visibility

## Testing
- [ ] Database integrity
  - Test foreign key constraints
  - Test CHECK constraints
  - Test unique constraints
- [ ] ID generation
  - Test thread-safe concurrent ID generation
  - Test sequential numbering
  - Test prefix locking
- [ ] Thread gauge functionality
  - Test GO/NO GO pairing
  - Test spare to set conversion
  - Test companion history tracking
  - Test set checkout (both gauges together)
- [ ] Visibility and permissions
  - Test regular user sees sets only
  - Test QC/Admin sees everything
  - Test calibration standard access restrictions
- [ ] Validation
  - Test all regex patterns
  - Test form validation
  - Test business rule enforcement
- [ ] Special workflows
  - Test "Verify Before Use" checkout blocking
  - Test seal status calibration date logic
  - Test soft delete retirement process