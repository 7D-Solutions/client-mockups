# Instance 2 - Backend Gauge Standardization Implementation Plan (Final)

**Document Type**: Implementation Plan  
**Focus Area**: Backend Services and API Implementation for Gauge Standardization v2.0  
**Environment**: Development (No production impact)  
**Created**: Instance 2 Analysis  
**Final Revision**: Aligned with Database_Plan_Final.md and existing codebase

## 🚨 CRITICAL CLAUDE CODE INSTRUCTIONS

### MANDATORY Execution Commands
```bash
# Overall implementation command
/implement --persona-backend --persona-architect --think-hard --validate --safe-mode --loop --uc

# Phase-specific commands embedded in each section below
```

### Implementation Personas & Flags
```yaml
primary_personas:
  - backend     # Service implementation
  - architect   # System design decisions
  - qa         # Testing and validation

critical_flags:
  - --think-hard   # Complex service interactions
  - --validate     # All changes must be tested
  - --safe-mode    # Database operations
  - --loop        # Iterative improvements
  - --uc          # Efficient implementation

approach: |
  1. Database implementation COMPLETE (per Database_Plan_Final.md)
  2. Enhance existing services - don't recreate
  3. Use standardized fields: system_gauge_id (NOT NULL), standardized_name
  4. Implement decimal format (.500-20) enforcement
  5. Follow existing BaseRepository and service patterns
```

## Executive Summary

This final plan focuses on backend service enhancements and new API implementations, building upon the completed database standardization. The implementation will integrate with existing services while adding new functionality for companion pairing, category workflows, and spare management.

## Critical Context from Database Implementation

### ✅ Database Fields (COMPLETE)
- `system_gauge_id` - NOT NULL, primary identifier
- `standardized_name` - Auto-generated descriptive name
- `gauge_suffix` - A/B designation for GO/NO GO
- `companion_gauge_id` - Links paired gauges
- `is_spare` - Spare status flag
- `equipment_type` - ENUM in both gauges and gauge_categories tables

### ✅ Prefix Mapping (COMPLETE)
```
Thread Gauges:
- SP/SR (Standard Plug/Ring)
- MP/MR (Metric Plug/Ring)
- NPT (NPT single gauge)
- AC/AR (ACME Plug/Ring)
- ST/STR (STI Plug/Ring)
- SL/SLR (Spiralock Plug/Ring)

Hand Tools:
- CA (Caliper), MI (Micrometer)
- DG (Depth Gauge), BG (Bore Gauge)

Large Equipment:
- CMM, OC, HG, SPL, HT, FT

Calibration Standards:
- GB, MRS, MPS, RS
```

### ✅ Key Tables (COMPLETE)
- `gauge_id_config` - Prefix and sequence management
- `gauge_categories` - With equipment_type field
- `gauge_system_config` - System configuration
- All specification tables per equipment type

## Implementation Phases

### Phase 1: Enhance Existing Services

```yaml
claude_command: |
  /implement --persona-backend --think-hard --validate "enhance existing gauge services"
```

#### 1.1 Enhanced GaugeIdService

**File**: `/backend/src/modules/gauge/services/GaugeIdService.js` (EXISTING)

**Current State**: Basic ID generation with `generateSystemId` method

**Required Enhancements**:
```javascript
class GaugeIdService extends BaseService {
  // EXISTING: generateSystemId(categoryId, suffix)
  
  // ENHANCE: Use gauge_id_config table
  async generateSystemId(categoryId, suffix = null) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Get prefix and current_sequence from gauge_id_config
      const [configs] = await connection.execute(`
        SELECT gic.*, gc.name, gc.equipment_type
        FROM gauge_id_config gic
        JOIN gauge_categories gc ON gic.category_id = gc.id
        WHERE gic.category_id = ? 
        ${suffix ? 'AND gic.gauge_type = ?' : 'AND gic.gauge_type IS NULL'}
        FOR UPDATE
      `, suffix ? [categoryId, suffix === 'A' ? 'plug' : 'ring'] : [categoryId]);
      
      if (!configs.length) {
        throw new Error(`No ID configuration for category ${categoryId}`);
      }
      
      const config = configs[0];
      const nextSequence = config.current_sequence + 1;
      
      // Update sequence atomically
      await connection.execute(`
        UPDATE gauge_id_config 
        SET current_sequence = ?
        WHERE category_id = ? AND ${suffix ? 'gauge_type = ?' : 'gauge_type IS NULL'}
      `, suffix ? [nextSequence, categoryId, config.gauge_type] : [nextSequence, categoryId]);
      
      // Generate ID: PREFIX + 4-digit sequence + optional suffix
      const systemId = `${config.prefix}${nextSequence.toString().padStart(4, '0')}${suffix || ''}`;
      
      await connection.commit();
      return systemId;
      
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
  
  // ENHANCE: Standardized name with decimal format
  generateStandardizedName(gaugeData) {
    const { equipment_type, spec, gauge_suffix, name } = gaugeData;
    
    switch (equipment_type) {
      case 'thread_gauge':
        if (!spec) return name;
        
        // Enforce decimal format for thread size
        let threadSize = spec.thread_size;
        if (threadSize && !threadSize.startsWith('M')) {
          // Convert fractions to decimal (.500-20 format)
          threadSize = this.convertToDecimalFormat(threadSize);
        }
        
        // Build name: .500-20 UN 2A Thread Plug Gauge GO
        let stdName = '';
        if (threadSize) stdName += threadSize + ' ';
        if (spec.thread_form) stdName += spec.thread_form + ' ';
        if (spec.thread_class) stdName += spec.thread_class + ' ';
        stdName += 'Thread ';
        if (spec.gauge_type) stdName += spec.gauge_type.charAt(0).toUpperCase() + spec.gauge_type.slice(1) + ' ';
        stdName += 'Gauge';
        
        // Add GO/NO GO based on gauge_suffix
        if (gauge_suffix === 'A') {
          stdName += ' GO';
        } else if (gauge_suffix === 'B') {
          stdName += ' NO GO';
        }
        
        return stdName.trim();
        
      // Other equipment types remain same...
    }
  }
  
  // NEW: Convert fraction to decimal format
  convertToDecimalFormat(threadSize) {
    // Handle formats like "1/2-20" → ".500-20"
    const fractionMatch = threadSize.match(/^(\d+)\/(\d+)-(.+)$/);
    if (fractionMatch) {
      const decimal = (parseInt(fractionMatch[1]) / parseInt(fractionMatch[2])).toFixed(3);
      return `.${decimal.substring(2)}-${fractionMatch[3]}`;
    }
    
    // Handle numbered sizes like "4-40" → ".112-40"
    const numberMap = {
      '0': '.060', '1': '.073', '2': '.086', '3': '.099',
      '4': '.112', '5': '.125', '6': '.138', '8': '.164',
      '10': '.190', '12': '.216'
    };
    
    const numberMatch = threadSize.match(/^(\d+)-(.+)$/);
    if (numberMatch && numberMap[numberMatch[1]]) {
      return `${numberMap[numberMatch[1]]}-${numberMatch[2]}`;
    }
    
    return threadSize; // Return as-is if already in correct format
  }
  
  // NEW: Generate companion IDs for thread gauge sets
  async generateCompanionIds(categoryId, threadType) {
    // NPT doesn't have companions
    if (threadType === 'npt') {
      return { goId: await this.generateSystemId(categoryId), noGoId: null };
    }
    
    // Generate both IDs atomically
    const goId = await this.generateSystemId(categoryId, 'A');
    const noGoId = await this.generateSystemId(categoryId, 'B');
    
    return { goId, noGoId };
  }
}
```

#### 1.2 Enhanced GaugeService

**File**: `/backend/src/modules/gauge/services/gaugeService.js` (EXISTING)

**Required Enhancements**:
```javascript
// In createGauge method, enhance to use new fields
async createGauge(gaugeData, userId) {
  try {
    const gaugeIdService = serviceRegistry.get('GaugeIdService');
    
    // Validate required fields
    if (!gaugeData.name || !gaugeData.equipment_type || !gaugeData.category_id) {
      throw new Error('Name, equipment type, and category are required');
    }
    
    // Determine gauge suffix based on equipment type and gauge type
    let suffix = null;
    if (gaugeData.equipment_type === 'thread_gauge' && gaugeData.spec?.gauge_type) {
      const isNPT = gaugeData.spec?.thread_type === 'npt';
      if (!isNPT) {
        // Determine A or B suffix based on GO/NO GO
        suffix = gaugeData.is_go_gauge ? 'A' : 'B';
      }
    }
    
    // Generate system ID using gauge_id_config
    if (!gaugeData.system_gauge_id) {
      gaugeData.system_gauge_id = await gaugeIdService.generateSystemId(
        gaugeData.category_id, 
        suffix
      );
      gaugeData.gauge_suffix = suffix;
    }
    
    // Generate standardized name with decimal format
    const standardizedName = gaugeIdService.generateStandardizedName(gaugeData);
    
    // Create gauge with all required fields
    const gauge = await this.repository.createGauge({
      ...gaugeData,
      system_gauge_id: gaugeData.system_gauge_id,
      standardized_name: standardizedName,
      gauge_suffix: suffix,
      created_by: userId
    });
    
    // Audit trail...
    
    return gauge;
  } catch (error) {
    logger.error('Error creating gauge:', error);
    throw error;
  }
}

// Add method for visibility filtering
async getVisibleGauges(userId, userRole, filters = {}) {
  const spareManagementService = serviceRegistry.get('SpareManagementService');
  return spareManagementService.getVisibleGauges(userId, userRole, filters);
}
```

---

### Phase 2: New Service Implementation

```yaml
claude_command: |
  /implement --persona-backend --validate "new gauge standardization services"
```

#### 2.1 CompanionGaugeService (NEW)

**File**: `/backend/src/modules/gauge/services/CompanionGaugeService.js`

```javascript
const BaseService = require('../../../infrastructure/services/BaseService');
const { pool } = require('../../../infrastructure/database/connection');
const logger = require('../../../infrastructure/utils/logger');

class CompanionGaugeService extends BaseService {
  constructor(gaugeRepository, auditService) {
    super('CompanionGaugeService');
    this.gaugeRepository = gaugeRepository;
    this.auditService = auditService;
  }
  
  async createCompanionPair(gaugeData, userId) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Validate this is a thread gauge (not NPT)
      if (gaugeData.equipment_type !== 'thread_gauge') {
        throw new Error('Companion pairs only for thread gauges');
      }
      
      if (gaugeData.spec?.thread_type === 'npt') {
        throw new Error('NPT gauges do not have companions');
      }
      
      const gaugeIdService = serviceRegistry.get('GaugeIdService');
      
      // Generate companion IDs
      const { goId, noGoId } = await gaugeIdService.generateCompanionIds(
        gaugeData.category_id, 
        gaugeData.spec?.thread_type
      );
      
      // Create GO gauge
      const goGaugeData = {
        ...gaugeData,
        system_gauge_id: goId,
        gauge_suffix: 'A',
        is_go_gauge: true,
        companion_gauge_id: null // Will update after creating NO GO
      };
      
      const goGauge = await this.gaugeRepository.createGauge(goGaugeData, connection);
      
      // Create NO GO gauge
      const noGoGaugeData = {
        ...gaugeData,
        system_gauge_id: noGoId,
        gauge_suffix: 'B',
        is_go_gauge: false,
        companion_gauge_id: goGauge.id
      };
      
      const noGoGauge = await this.gaugeRepository.createGauge(noGoGaugeData, connection);
      
      // Update GO gauge with companion link
      await connection.execute(
        'UPDATE gauges SET companion_gauge_id = ? WHERE id = ?',
        [noGoGauge.id, goGauge.id]
      );
      
      await connection.commit();
      
      // Audit the pair creation
      await this.auditService.logAction({
        module: 'gauge',
        action: 'companion_pair_created',
        entity_type: 'gauge_set',
        entity_id: goGauge.system_gauge_id,
        user_id: userId,
        details: {
          go_gauge_id: goGauge.system_gauge_id,
          nogo_gauge_id: noGoGauge.system_gauge_id
        }
      });
      
      return { goGauge, noGoGauge };
      
    } catch (error) {
      await connection.rollback();
      logger.error('Failed to create companion pair:', error);
      throw error;
    } finally {
      connection.release();
    }
  }
  
  async linkCompanions(goGaugeId, noGoGaugeId, userId) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Get both gauges
      const [goGauges] = await connection.execute(
        'SELECT * FROM gauges WHERE id = ? AND is_deleted = 0',
        [goGaugeId]
      );
      const [noGoGauges] = await connection.execute(
        'SELECT * FROM gauges WHERE id = ? AND is_deleted = 0',
        [noGoGaugeId]
      );
      
      if (!goGauges.length || !noGoGauges.length) {
        throw new Error('One or both gauges not found');
      }
      
      const goGauge = goGauges[0];
      const noGoGauge = noGoGauges[0];
      
      // Validate they can be paired
      if (!await this.validateCompanionPairing(goGauge, noGoGauge)) {
        throw new Error('Gauges cannot be paired - specifications do not match');
      }
      
      // Update companion links bidirectionally
      await connection.execute(
        'UPDATE gauges SET companion_gauge_id = ?, is_spare = 0 WHERE id = ?',
        [noGoGaugeId, goGaugeId]
      );
      await connection.execute(
        'UPDATE gauges SET companion_gauge_id = ?, is_spare = 0 WHERE id = ?',
        [goGaugeId, noGoGaugeId]
      );
      
      await connection.commit();
      
      // Audit trail
      await this.auditService.logAction({
        module: 'gauge',
        action: 'companions_linked',
        entity_type: 'gauge_set',
        user_id: userId,
        details: {
          go_gauge_id: goGauge.system_gauge_id,
          nogo_gauge_id: noGoGauge.system_gauge_id
        }
      });
      
      return { success: true };
      
    } catch (error) {
      await connection.rollback();
      logger.error('Failed to link companions:', error);
      throw error;
    } finally {
      connection.release();
    }
  }
  
  async validateCompanionPairing(gauge1, gauge2) {
    // Both must be thread gauges
    if (gauge1.equipment_type !== 'thread_gauge' || gauge2.equipment_type !== 'thread_gauge') {
      return false;
    }
    
    // Neither can be NPT
    if (gauge1.spec?.thread_type === 'npt' || gauge2.spec?.thread_type === 'npt') {
      return false;
    }
    
    // One must be GO (A), one must be NO GO (B)
    const hasGo = gauge1.gauge_suffix === 'A' || gauge2.gauge_suffix === 'A';
    const hasNoGo = gauge1.gauge_suffix === 'B' || gauge2.gauge_suffix === 'B';
    if (!hasGo || !hasNoGo) {
      return false;
    }
    
    // Must have matching specifications
    // TODO: Compare thread specifications
    
    return true;
  }
}

module.exports = CompanionGaugeService;
```

#### 2.2 CategoryWorkflowService (NEW)

**File**: `/backend/src/modules/gauge/services/CategoryWorkflowService.js`

```javascript
const BaseService = require('../../../infrastructure/services/BaseService');
const { pool } = require('../../../infrastructure/database/connection');

class CategoryWorkflowService extends BaseService {
  constructor() {
    super('CategoryWorkflowService');
  }
  
  async getCategoriesByEquipmentType(equipmentType) {
    const connection = await pool.getConnection();
    
    try {
      const [categories] = await connection.execute(`
        SELECT gc.*, 
               GROUP_CONCAT(
                 CONCAT(COALESCE(gic.gauge_type, 'single'), ':', gic.prefix) 
                 SEPARATOR ','
               ) as prefixes
        FROM gauge_categories gc
        LEFT JOIN gauge_id_config gic ON gc.id = gic.category_id
        WHERE gc.equipment_type = ? AND gc.is_active = 1
        GROUP BY gc.id
        ORDER BY gc.display_order
      `, [equipmentType]);
      
      // Parse prefixes
      return categories.map(cat => ({
        ...cat,
        prefixes: cat.prefixes ? cat.prefixes.split(',').reduce((acc, p) => {
          const [type, prefix] = p.split(':');
          acc[type] = prefix;
          return acc;
        }, {}) : {}
      }));
      
    } finally {
      connection.release();
    }
  }
  
  async getFormSchema(categoryId) {
    const connection = await pool.getConnection();
    
    try {
      const [categories] = await connection.execute(
        'SELECT * FROM gauge_categories WHERE id = ?',
        [categoryId]
      );
      
      if (!categories.length) {
        throw new Error('Category not found');
      }
      
      const category = categories[0];
      const schema = this.buildFormSchema(category.equipment_type, category.name);
      
      return schema;
      
    } finally {
      connection.release();
    }
  }
  
  buildFormSchema(equipmentType, categoryName) {
    const baseSchema = {
      type: 'object',
      properties: {
        name: { type: 'string', required: true },
        serial_number: { type: 'string' },
        manufacturer: { type: 'string' }
      }
    };
    
    switch (equipmentType) {
      case 'thread_gauge':
        baseSchema.properties.spec = {
          type: 'object',
          properties: {
            thread_size: { 
              type: 'string', 
              pattern: '^(\\.[0-9]{3}-[0-9]+|M[0-9]+x[0-9.]+)$',
              description: 'Decimal format (.500-20) or Metric (M10x1.5)'
            },
            thread_form: { 
              type: 'string', 
              enum: ['UN', 'UNF', 'UNEF', 'UNS', 'UNR', 'UNJ', 'UNJR']
            },
            thread_class: { 
              type: 'string',
              pattern: '^[1-3][AB]$|^[4-6][gGhH]$'
            },
            gauge_type: { 
              type: 'string', 
              enum: ['plug', 'ring'],
              required: true
            },
            is_go_gauge: { type: 'boolean' }
          }
        };
        break;
        
      case 'hand_tool':
        baseSchema.properties.spec = {
          type: 'object',
          properties: {
            range_min: { type: 'number' },
            range_max: { type: 'number' },
            range_unit: { type: 'string', enum: ['inches', 'mm'] },
            format: { type: 'string', enum: ['digital', 'analog', 'dial'] }
          }
        };
        break;
        
      // Add other equipment types...
    }
    
    return baseSchema;
  }
  
  async validateCategoryData(categoryId, formData) {
    const schema = await this.getFormSchema(categoryId);
    // Use JSON schema validator
    // Return validation results
  }
}

module.exports = CategoryWorkflowService;
```

#### 2.3 SpareManagementService (NEW)

**File**: `/backend/src/modules/gauge/services/SpareManagementService.js`

```javascript
const BaseService = require('../../../infrastructure/services/BaseService');
const { pool } = require('../../../infrastructure/database/connection');

class SpareManagementService extends BaseService {
  constructor() {
    super('SpareManagementService');
  }
  
  async getVisibleGauges(userId, userRole, filters = {}) {
    const connection = await pool.getConnection();
    
    try {
      let query = `
        SELECT g.*,
               c.system_gauge_id as companion_id,
               c.gauge_suffix as companion_suffix
        FROM gauges g
        LEFT JOIN gauges c ON g.companion_gauge_id = c.id
        WHERE g.is_deleted = 0
      `;
      const params = [];
      
      // Apply visibility rules based on role
      if (userRole === 'user' || userRole === 'operator') {
        // Users see only complete sets (no orphans, no spares)
        query += ` AND g.is_spare = 0`;
        
        // For thread gauges (except NPT), must have companion
        query += ` AND (
          g.equipment_type != 'thread_gauge' 
          OR JSON_EXTRACT(g.spec, '$.thread_type') = 'npt'
          OR g.companion_gauge_id IS NOT NULL
        )`;
      }
      // QC+ roles see everything
      
      // Apply other filters
      if (filters.equipment_type) {
        query += ' AND g.equipment_type = ?';
        params.push(filters.equipment_type);
      }
      
      if (filters.status) {
        query += ' AND g.status = ?';
        params.push(filters.status);
      }
      
      const [gauges] = await connection.execute(query, params);
      return gauges;
      
    } finally {
      connection.release();
    }
  }
  
  async getAvailableSpares(specifications = {}, sealStatus = null) {
    const connection = await pool.getConnection();
    
    try {
      let query = `
        SELECT g.*, gc.name as category_name
        FROM gauges g
        JOIN gauge_categories gc ON g.category_id = gc.id
        WHERE g.is_spare = 1 AND g.is_deleted = 0
      `;
      const params = [];
      
      // Filter by specifications
      if (specifications.equipment_type) {
        query += ' AND g.equipment_type = ?';
        params.push(specifications.equipment_type);
      }
      
      if (specifications.thread_size) {
        query += ' AND JSON_EXTRACT(g.spec, "$.thread_size") = ?';
        params.push(specifications.thread_size);
      }
      
      // Prefer matching seal status
      if (sealStatus !== null) {
        query += ' ORDER BY (g.is_sealed = ?) DESC';
        params.push(sealStatus ? 1 : 0);
      }
      
      const [spares] = await connection.execute(query, params);
      
      // Group by GO/NO GO
      const grouped = {
        go: spares.filter(s => s.gauge_suffix === 'A'),
        noGo: spares.filter(s => s.gauge_suffix === 'B'),
        single: spares.filter(s => !s.gauge_suffix)
      };
      
      return grouped;
      
    } finally {
      connection.release();
    }
  }
  
  async markAsSpare(gaugeId, reason, userId) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Clear any companion links
      await connection.execute(`
        UPDATE gauges 
        SET is_spare = 1, 
            companion_gauge_id = NULL,
            status = 'available'
        WHERE id = ?
      `, [gaugeId]);
      
      // If this gauge had a companion, mark it as spare too
      const [companions] = await connection.execute(
        'SELECT id FROM gauges WHERE companion_gauge_id = ?',
        [gaugeId]
      );
      
      if (companions.length) {
        await connection.execute(
          'UPDATE gauges SET companion_gauge_id = NULL WHERE id = ?',
          [companions[0].id]
        );
      }
      
      await connection.commit();
      
      // Audit trail
      const auditService = serviceRegistry.get('AuditService');
      await auditService.logAction({
        module: 'gauge',
        action: 'marked_as_spare',
        entity_type: 'gauge',
        entity_id: gaugeId,
        user_id: userId,
        details: { reason }
      });
      
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}

module.exports = SpareManagementService;
```

#### 2.4 Service Registration

**File**: `/backend/src/bootstrap/registerServices.js` (UPDATE)

```javascript
// Add new services to registration
function registerGaugeServices(container) {
  // Existing services...
  
  // Register new services
  container.register('CompanionGaugeService', () => {
    const gaugeRepository = container.get('GaugeRepository');
    const auditService = container.get('AuditService');
    return new CompanionGaugeService(gaugeRepository, auditService);
  });
  
  container.register('CategoryWorkflowService', () => {
    return new CategoryWorkflowService();
  });
  
  container.register('SpareManagementService', () => {
    return new SpareManagementService();
  });
}
```

---

### Phase 3: Repository Layer Updates

```yaml
claude_command: |
  /implement --persona-backend --validate "repository enhancements for standardization"
```

#### 3.1 GaugeRepository Enhancements

**File**: `/backend/src/modules/gauge/repositories/GaugeRepository.js` (UPDATE)

Add these methods to existing repository:

```javascript
// Get gauges by companion
async getGaugesByCompanion(companionId, conn) {
  const connection = conn || await this.getConnectionWithTimeout();
  const shouldRelease = !conn;
  
  try {
    const [gauges] = await connection.execute(
      `SELECT g.*, gc.name as category_name
       FROM gauges g
       JOIN gauge_categories gc ON g.category_id = gc.id
       WHERE g.companion_gauge_id = ? AND g.is_deleted = 0`,
      [companionId]
    );
    
    return gauges;
  } finally {
    if (shouldRelease) connection.release();
  }
}

// Get spare gauges with filters
async getSpareGauges(filters = {}, conn) {
  const connection = conn || await this.getConnectionWithTimeout();
  const shouldRelease = !conn;
  
  try {
    let query = `
      SELECT g.*, gc.name as category_name
      FROM gauges g
      JOIN gauge_categories gc ON g.category_id = gc.id
      WHERE g.is_spare = 1 AND g.is_deleted = 0
    `;
    const params = [];
    
    if (filters.equipment_type) {
      query += ' AND g.equipment_type = ?';
      params.push(filters.equipment_type);
    }
    
    if (filters.category_id) {
      query += ' AND g.category_id = ?';
      params.push(filters.category_id);
    }
    
    query += ' ORDER BY g.system_gauge_id';
    
    const [gauges] = await connection.execute(query, params);
    return gauges;
    
  } finally {
    if (shouldRelease) connection.release();
  }
}

// Update companion links atomically
async updateCompanionLinks(gaugeId, companionId, conn) {
  const connection = conn || await this.getConnectionWithTimeout();
  const shouldRelease = !conn;
  const shouldCommit = !conn;
  
  try {
    if (shouldCommit) await connection.beginTransaction();
    
    // Update both gauges in single transaction
    await connection.execute(
      'UPDATE gauges SET companion_gauge_id = ? WHERE id = ?',
      [companionId, gaugeId]
    );
    
    if (companionId) {
      await connection.execute(
        'UPDATE gauges SET companion_gauge_id = ? WHERE id = ?',
        [gaugeId, companionId]
      );
    }
    
    if (shouldCommit) await connection.commit();
    
    return { success: true };
    
  } catch (error) {
    if (shouldCommit) await connection.rollback();
    throw error;
  } finally {
    if (shouldRelease) connection.release();
  }
}

// Modify createGauge to handle new fields
async createGauge(gaugeData, conn) {
  // ... existing code ...
  
  // Ensure required fields for standardization
  const [res] = await connection.execute(
    `INSERT INTO gauges (
      gauge_id, system_gauge_id, standardized_name, gauge_suffix,
      custom_id, name, equipment_type, serial_number, 
      category_id, status, is_spare, is_sealed, is_active, 
      is_deleted, created_by, ownership_type, employee_owner_id, 
      purchase_info, companion_gauge_id, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())`,
    [
      gaugeData.gauge_id || gaugeData.system_gauge_id, // Backward compatibility
      gaugeData.system_gauge_id, // Required NOT NULL
      gaugeData.standardized_name, // Required NOT NULL
      gaugeData.gauge_suffix || null,
      gaugeData.custom_id || null,
      gaugeData.name,
      gaugeData.equipment_type,
      gaugeData.serial_number,
      gaugeData.category_id,
      gaugeData.status || 'available',
      gaugeData.is_spare ? 1 : 0,
      gaugeData.is_sealed ? 1 : 0,
      1, // is_active
      0, // is_deleted
      gaugeData.created_by,
      gaugeData.ownership_type || 'company',
      gaugeData.employee_owner_id || null,
      gaugeData.purchase_info || 'company_issued',
      gaugeData.companion_gauge_id || null
    ]
  );
  
  // ... rest of existing code ...
}
```

#### 3.2 CategoryRepository (NEW)

**File**: `/backend/src/modules/gauge/repositories/CategoryRepository.js`

```javascript
const BaseRepository = require('../../../infrastructure/repositories/BaseRepository');

class CategoryRepository extends BaseRepository {
  constructor() {
    super('gauge_categories', 'id');
  }
  
  async getCategoriesByEquipmentType(equipmentType, conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;
    
    try {
      const [categories] = await connection.execute(`
        SELECT gc.*, COUNT(g.id) as gauge_count
        FROM gauge_categories gc
        LEFT JOIN gauges g ON gc.id = g.category_id AND g.is_deleted = 0
        WHERE gc.equipment_type = ? AND gc.is_active = 1
        GROUP BY gc.id
        ORDER BY gc.display_order
      `, [equipmentType]);
      
      return categories;
    } finally {
      if (shouldRelease) connection.release();
    }
  }
  
  async getCategoryWithConfig(categoryId, conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;
    
    try {
      const [categories] = await connection.execute(`
        SELECT gc.*, gic.prefix, gic.gauge_type, gic.current_sequence
        FROM gauge_categories gc
        LEFT JOIN gauge_id_config gic ON gc.id = gic.category_id
        WHERE gc.id = ?
      `, [categoryId]);
      
      return categories;
    } finally {
      if (shouldRelease) connection.release();
    }
  }
}

module.exports = CategoryRepository;
```

---

### Phase 4: API Layer Implementation

```yaml
claude_command: |
  /implement --persona-backend --persona-architect --validate "RESTful API endpoints"
```

#### 4.1 Update Main Gauge Routes

**File**: `/backend/src/modules/gauge/routes/gauges.js` (UPDATE)

Add visibility filtering to existing endpoints:

```javascript
// Modify GET /api/gauges to use visibility
router.get('/', authenticateToken, etagMiddleware(), validatePagination, asyncErrorHandler(async (req, res) => {
  // ... existing validation ...
  
  const gaugeService = serviceRegistry.get('GaugeService');
  
  // Apply visibility filtering based on user role
  const result = await gaugeService.getVisibleGauges(
    req.user.id,
    req.user.role,
    {
      status,
      ownership_type,
      department,
      search,
      equipment_type,
      limit: limitNum,
      offset
    }
  );
  
  // ... existing response with HATEOAS ...
}));
```

#### 4.2 Category Workflow Routes (NEW)

**File**: `/backend/src/modules/gauge/routes/gauge-categories.js`

```javascript
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../../infrastructure/middleware/auth');
const { asyncErrorHandler } = require('../../../infrastructure/middleware/errorHandler');
const serviceRegistry = require('../../../infrastructure/services/ServiceRegistry');

// GET categories by equipment type
router.get('/by-equipment-type/:equipmentType', 
  authenticateToken,
  asyncErrorHandler(async (req, res) => {
    const { equipmentType } = req.params;
    const categoryService = serviceRegistry.get('CategoryWorkflowService');
    
    const categories = await categoryService.getCategoriesByEquipmentType(equipmentType);
    
    res.json({ 
      success: true, 
      equipment_type: equipmentType,
      categories 
    });
  })
);

// GET form schema for category
router.get('/:categoryId/form-schema',
  authenticateToken,
  asyncErrorHandler(async (req, res) => {
    const { categoryId } = req.params;
    const categoryService = serviceRegistry.get('CategoryWorkflowService');
    
    const schema = await categoryService.getFormSchema(categoryId);
    
    res.json({ 
      success: true, 
      category_id: categoryId,
      schema 
    });
  })
);

// POST validate category data
router.post('/:categoryId/validate',
  authenticateToken,
  asyncErrorHandler(async (req, res) => {
    const { categoryId } = req.params;
    const categoryService = serviceRegistry.get('CategoryWorkflowService');
    
    const validation = await categoryService.validateCategoryData(categoryId, req.body);
    
    res.json({ 
      success: validation.valid, 
      errors: validation.errors || []
    });
  })
);

module.exports = router;
```

#### 4.3 Update Route Registration

**File**: `/backend/src/modules/gauge/routes/index.js` (UPDATE)

```javascript
// Add new routes
const categoryRoutes = require('./gauge-categories');

// Register routes
router.use('/categories', categoryRoutes);
// ... existing routes ...
```

---

### Phase 5: Testing Implementation

```yaml
claude_command: |
  /implement --persona-qa --validate --loop "comprehensive test coverage"
```

#### 5.1 Test Structure

```
backend/tests/
├── unit/
│   └── modules/
│       └── gauge/
│           ├── services/
│           │   ├── GaugeIdService.enhanced.test.js
│           │   ├── CompanionGaugeService.test.js
│           │   ├── CategoryWorkflowService.test.js
│           │   └── SpareManagementService.test.js
│           └── repositories/
│               └── CategoryRepository.test.js
└── integration/
    └── modules/
        └── gauge/
            ├── companion-pairing.test.js
            ├── category-workflow.test.js
            └── spare-visibility.test.js
```

#### 5.2 Key Test Cases

```javascript
// GaugeIdService enhanced tests
describe('GaugeIdService - Standardization', () => {
  test('generates IDs using gauge_id_config table');
  test('converts fractions to decimal format');
  test('handles all prefix mappings correctly');
  test('generates companion IDs atomically');
  test('enforces decimal format in standardized names');
});

// Companion pairing tests
describe('Companion Gauge Pairing', () => {
  test('creates GO/NO GO pairs with correct suffixes');
  test('links companions bidirectionally');
  test('prevents NPT gauge pairing');
  test('validates matching specifications');
  test('handles spare to set conversion');
});

// Visibility tests
describe('Spare Visibility Rules', () => {
  test('users see only complete sets');
  test('QC role sees all gauges including spares');
  test('orphaned gauges hidden from users');
  test('NPT single gauges visible to all');
});
```

---

## Success Metrics & Validation

### Database Integration
- [x] Uses `system_gauge_id` as NOT NULL primary identifier
- [x] Populates `standardized_name` with decimal format
- [x] Uses `gauge_suffix` for A/B designation
- [x] Integrates with `gauge_id_config` for prefix management
- [x] Follows existing connection pool patterns

### Service Implementation
- [ ] Enhanced existing services (don't recreate)
- [ ] New services follow BaseService pattern
- [ ] All services registered in service registry
- [ ] Audit trail for all operations
- [ ] Transaction management for atomic operations

### API Compliance
- [ ] Category workflow endpoints functional
- [ ] Visibility rules enforced
- [ ] Existing endpoints enhanced (not replaced)
- [ ] Authentication middleware applied
- [ ] Error handling consistent

### Business Rules
- [ ] Decimal format enforced (.500-20)
- [ ] GO/NO GO pairing for thread gauges
- [ ] NPT single gauge handling
- [ ] Spare visibility by role
- [ ] Companion validation rules

## Implementation Notes

### Critical Reminders
1. **Database is ready** - All schema changes complete
2. **Enhance, don't replace** - Work with existing services
3. **Use new fields** - system_gauge_id, standardized_name, gauge_suffix
4. **Follow patterns** - BaseRepository, service registry, connection pooling
5. **Test everything** - Every method needs test coverage

### Next Steps
1. Implement service enhancements in order
2. Test each phase before proceeding
3. Update API documentation
4. Coordinate with frontend team
5. Plan production deployment

---

**END OF FINAL IMPLEMENTATION PLAN**

*Ready for Backend Service Implementation*
*Building on Completed Database Foundation*
*Following Existing Codebase Patterns*