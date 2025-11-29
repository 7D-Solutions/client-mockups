# Module Creation Checklist

**Purpose**: Step-by-step guide for creating new modules using Fire-Proof ERP platform standards
**Audience**: Developers building new features
**Last Updated**: 2025-11-07

---

## Overview

This checklist ensures all new modules follow platform standards from day one. Use this when creating:
- New feature modules (e.g., `/modules/reports/`)
- New pages within existing modules
- New components or services

---

## Frontend Module Creation

### Step 1: Component Setup

#### ✅ DO: Use Infrastructure Components

```typescript
// ✅ CORRECT - Import all UI elements from infrastructure
import {
  Button,
  SaveButton,
  CancelButton,
  FormInput,
  FormSelect,
  FormTextarea,
  FormCheckbox,
  FormSection,
  Modal,
  DataTable,
  LoadingSpinner,
  useToast
} from '../../infrastructure/components';
```

#### ❌ DON'T: Create Raw HTML Elements

```typescript
// ❌ WRONG - Never use raw HTML elements
<button onClick={handleClick}>Save</button>
<input type="text" value={name} onChange={setName} />
<table><tr><td>Data</td></tr></table>
<div style={{ textTransform: 'uppercase', ... }}>Section Header</div>
```

---

### Step 2: API Integration

#### ✅ DO: Use apiClient

```typescript
// ✅ CORRECT - Always use apiClient
import { apiClient } from '../../infrastructure/api/client';

// GET request
const data = await apiClient.get('/reports/summary');

// POST request
const result = await apiClient.post('/reports/generate', {
  startDate,
  endDate
});

// PUT request
const updated = await apiClient.put(`/reports/${id}`, updates);

// DELETE request
await apiClient.delete(`/reports/${id}`);
```

#### ❌ DON'T: Use Direct fetch()

```typescript
// ❌ WRONG - Never use fetch() directly
const response = await fetch('/api/reports/summary');
const data = await response.json();

// ❌ WRONG - Manual auth headers
const response = await fetch('/api/reports/summary', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

**Why?**
- Direct `fetch()` bypasses authentication
- No centralized error handling
- No 401 redirect logic
- Inconsistent API base paths

---

### Step 3: Form Structure

#### ✅ DO: Use FormSection and Form Components

```typescript
// ✅ CORRECT - Structured form with centralized components
import { FormSection, FormInput, FormSelect, SaveButton, CancelButton } from '../../infrastructure/components';

function ReportForm() {
  return (
    <form onSubmit={handleSubmit}>
      <FormSection title="Report Details">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-4)' }}>
          <FormInput
            label="Report Name"
            value={name}
            onChange={setName}
            required
          />
          <FormSelect
            label="Report Type"
            value={type}
            onChange={setType}
            options={reportTypes}
          />
        </div>
      </FormSection>

      <FormSection title="Date Range">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-4)' }}>
          <FormInput
            type="date"
            label="Start Date"
            value={startDate}
            onChange={setStartDate}
          />
          <FormInput
            type="date"
            label="End Date"
            value={endDate}
            onChange={setEndDate}
          />
        </div>
      </FormSection>

      <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
        <CancelButton onClick={onCancel} />
        <SaveButton type="submit" />
      </div>
    </form>
  );
}
```

#### ❌ DON'T: Create Raw Form Elements

```typescript
// ❌ WRONG - Raw HTML with manual styling
<div style={{
  textTransform: 'uppercase',
  borderBottom: '2px solid var(--color-border-light)',
  paddingBottom: 'var(--space-2)',
  fontWeight: '600'
}}>
  Report Details
</div>

<input
  type="text"
  value={name}
  onChange={(e) => setName(e.target.value)}
  style={{ padding: '8px', border: '1px solid #ccc' }}
/>

<button onClick={handleSave} style={{ backgroundColor: '#007bff', color: 'white' }}>
  Save
</button>
```

---

### Step 4: Data Tables

#### ✅ DO: Use DataTable Component

```typescript
// ✅ CORRECT - DataTable with built-in features
import { DataTable } from '../../infrastructure/components';

const columns = [
  { header: 'Report Name', accessor: 'name' },
  { header: 'Created Date', accessor: 'created_at' },
  { header: 'Status', accessor: 'status' },
  {
    header: 'Actions',
    accessor: 'actions',
    cell: (row) => (
      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
        <TableViewButton onClick={() => handleView(row.id)} />
        <DeleteButton onClick={() => handleDelete(row.id)} />
      </div>
    )
  }
];

<DataTable
  columns={columns}
  data={reports}
  isLoading={loading}
  onSort={handleSort}
/>
```

#### ❌ DON'T: Create Raw Tables

```typescript
// ❌ WRONG - Manual table with no features
<table style={{ width: '100%', borderCollapse: 'collapse' }}>
  <thead>
    <tr>
      <th>Report Name</th>
      <th>Created Date</th>
      <th>Status</th>
    </tr>
  </thead>
  <tbody>
    {reports.map(report => (
      <tr key={report.id}>
        <td>{report.name}</td>
        <td>{report.created_at}</td>
        <td>{report.status}</td>
      </tr>
    ))}
  </tbody>
</table>
```

---

### Step 5: Modal Dialogs

#### ✅ DO: Use Modal Component

```typescript
// ✅ CORRECT - Centralized Modal
import { Modal, ConfirmButton, CancelButton } from '../../infrastructure/components';

function DeleteConfirmModal({ isOpen, onClose, onConfirm, reportName }) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Confirm Deletion"
    >
      <p>Are you sure you want to delete report "{reportName}"?</p>
      <p>This action cannot be undone.</p>

      <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', marginTop: 'var(--space-4)' }}>
        <CancelButton onClick={onClose} />
        <ConfirmButton onClick={onConfirm} variant="danger">
          Delete
        </ConfirmButton>
      </div>
    </Modal>
  );
}
```

#### ❌ DON'T: Use window.confirm

```typescript
// ❌ WRONG - Browser native dialogs
if (window.confirm(`Are you sure you want to delete "${reportName}"?`)) {
  handleDelete();
}

// ❌ WRONG - window.alert
window.alert('Report deleted successfully');
```

**Why?**
- `window.confirm/alert` cannot be styled
- Poor UX (blocks entire browser)
- No async/await support
- Missing accessibility features

---

### Step 6: Notifications

#### ✅ DO: Use Toast Notifications

```typescript
// ✅ CORRECT - Use useToast hook
import { useToast } from '../../infrastructure/components';

function ReportPage() {
  const { showToast } = useToast();

  const handleSave = async () => {
    try {
      await apiClient.post('/reports', reportData);
      showToast('success', 'Report created successfully');
    } catch (error) {
      showToast('error', 'Failed to create report');
    }
  };
}
```

#### ❌ DON'T: Use window.alert

```typescript
// ❌ WRONG - Browser alerts
alert('Report created successfully');
alert('Error: Failed to create report');
```

---

## Backend Module Creation

### Step 1: Repository Pattern

#### ✅ DO: Extend BaseRepository

```javascript
// ✅ CORRECT - Extend BaseRepository
// /backend/src/modules/reports/repositories/ReportRepository.js

const BaseRepository = require('../../../infrastructure/repositories/BaseRepository');

class ReportRepository extends BaseRepository {
  constructor() {
    super('reports'); // Table name
  }

  // Use inherited methods
  async getReportById(id) {
    return this.findById(id);
  }

  async getAllReports() {
    return this.findAll();
  }

  async createReport(data) {
    return this.create(data);
  }

  async updateReport(id, data) {
    return this.update(id, data);
  }

  async deleteReport(id) {
    return this.softDelete(id); // Soft delete by default
  }

  // Custom queries using validated executeQuery
  async getReportsByDateRange(startDate, endDate) {
    const query = `
      SELECT * FROM reports
      WHERE created_at BETWEEN ? AND ?
      AND is_deleted = 0
      ORDER BY created_at DESC
    `;
    return this.executeQuery(query, [startDate, endDate]);
  }
}

module.exports = ReportRepository;
```

#### ❌ DON'T: Write Raw SQL in Routes

```javascript
// ❌ WRONG - Direct database access in routes
router.get('/reports', async (req, res) => {
  const [rows] = await connection.execute(
    `SELECT * FROM reports WHERE id = ${req.params.id}` // SQL INJECTION RISK!
  );
  res.json(rows);
});

// ❌ WRONG - Manual connection management
const connection = await mysql.createConnection({ /* config */ });
const [rows] = await connection.execute('SELECT * FROM reports');
await connection.end();
```

**Why?**
- BaseRepository prevents SQL injection
- Automatic connection pooling
- Built-in validation and error handling
- Consistent soft delete support

---

### Step 2: Logging

#### ✅ DO: Use Logger

```javascript
// ✅ CORRECT - Use infrastructure logger
const logger = require('../../../infrastructure/utils/logger');

async function generateReport(reportId) {
  logger.info('Starting report generation', { reportId });

  try {
    const result = await reportService.generate(reportId);
    logger.info('Report generated successfully', {
      reportId,
      duration: result.duration
    });
    return result;
  } catch (error) {
    logger.error('Report generation failed', {
      reportId,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}
```

#### ❌ DON'T: Use console.log

```javascript
// ❌ WRONG - Console logging
console.log('Starting report generation for ID:', reportId);
console.log('Report data:', JSON.stringify(data));
console.error('Error generating report:', error);
```

**Why?**
- `console.log` not production-ready
- No file output or log rotation
- No structured logging
- No log levels (info, warn, error)

---

### Step 3: Authentication & Authorization

#### ✅ DO: Use Auth Middleware

```javascript
// ✅ CORRECT - Use auth middleware
const { authenticateToken, requireRole } = require('../../../infrastructure/middleware/auth');
const { apiRateLimiter } = require('../../../infrastructure/middleware/rateLimiter');

router.get('/reports',
  authenticateToken,          // Verify JWT token
  requireRole('Viewer'),      // Check user role
  apiRateLimiter,             // Rate limiting
  async (req, res) => {
    const reports = await reportRepo.getAllReports();
    res.json({ success: true, data: reports });
  }
);

router.post('/reports',
  authenticateToken,
  requireRole('Admin'),        // Only admins can create
  apiRateLimiter,
  async (req, res) => {
    const report = await reportRepo.createReport(req.body);
    res.json({ success: true, data: report });
  }
);
```

#### ❌ DON'T: Manual Authentication

```javascript
// ❌ WRONG - Manual JWT verification
router.get('/reports', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  // ... route logic
});
```

---

### Step 4: Error Handling

#### ✅ DO: Use Error Classes and Middleware

```javascript
// ✅ CORRECT - Use ValidationError and errorHandler middleware
const ValidationError = require('../../../infrastructure/errors/ValidationError');
const { asyncErrorHandler } = require('../../../infrastructure/middleware/errorHandler');

router.post('/reports',
  authenticateToken,
  asyncErrorHandler(async (req, res) => {
    const { name, type } = req.body;

    // Validate input
    if (!name || !type) {
      throw new ValidationError('Name and type are required');
    }

    const report = await reportService.create({ name, type });

    res.json({
      success: true,
      data: report
    });
  })
);
```

#### ❌ DON'T: Manual try/catch Everywhere

```javascript
// ❌ WRONG - Repetitive try/catch blocks
router.post('/reports', async (req, res) => {
  try {
    const report = await reportService.create(req.body);
    res.json({ success: true, data: report });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});
```

---

### Step 5: Audit Logging

#### ✅ DO: Use Audit Service

```javascript
// ✅ CORRECT - Audit all state changes
const auditService = require('../../../infrastructure/audit/auditService');

async function createReport(userId, reportData) {
  const report = await reportRepo.create(reportData);

  // Log audit trail
  await auditService.log({
    userId,
    action: 'CREATE_REPORT',
    entityType: 'report',
    entityId: report.id,
    metadata: {
      reportName: report.name,
      reportType: report.type
    }
  });

  return report;
}
```

#### ❌ DON'T: Skip Audit Logging

```javascript
// ❌ WRONG - No audit trail
async function createReport(reportData) {
  return await reportRepo.create(reportData);
  // Missing: Who created this? When? What were the details?
}
```

---

## Complete Module Example

### Frontend: New Report Page

```typescript
// /frontend/src/modules/reports/pages/ReportsPage.tsx

import { useState, useEffect } from 'react';
import {
  Button,
  DataTable,
  Modal,
  FormInput,
  FormSelect,
  FormSection,
  SaveButton,
  CancelButton,
  DeleteButton,
  useToast
} from '../../../infrastructure/components';
import { apiClient } from '../../../infrastructure/api/client';

export default function ReportsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const data = await apiClient.get('/reports');
      setReports(data);
    } catch (error) {
      showToast('error', 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await apiClient.delete(`/reports/${id}`);
      showToast('success', 'Report deleted');
      loadReports();
    } catch (error) {
      showToast('error', 'Failed to delete report');
    }
  };

  const columns = [
    { header: 'Name', accessor: 'name' },
    { header: 'Type', accessor: 'type' },
    { header: 'Created', accessor: 'created_at' },
    {
      header: 'Actions',
      accessor: 'actions',
      cell: (row) => (
        <DeleteButton onClick={() => handleDelete(row.id)} />
      )
    }
  ];

  return (
    <div>
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <Button onClick={() => setShowModal(true)}>
          Create Report
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={reports}
        isLoading={loading}
      />

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Create Report"
      >
        {/* Form content */}
      </Modal>
    </div>
  );
}
```

### Backend: Report Module

```javascript
// /backend/src/modules/reports/routes/reports.js

const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../../../infrastructure/middleware/auth');
const { apiRateLimiter } = require('../../../infrastructure/middleware/rateLimiter');
const { asyncErrorHandler } = require('../../../infrastructure/middleware/errorHandler');
const logger = require('../../../infrastructure/utils/logger');
const ReportRepository = require('../repositories/ReportRepository');
const auditService = require('../../../infrastructure/audit/auditService');

const reportRepo = new ReportRepository();

// GET /api/reports - List all reports
router.get('/',
  authenticateToken,
  requireRole('Viewer'),
  apiRateLimiter,
  asyncErrorHandler(async (req, res) => {
    logger.info('Fetching reports', { userId: req.user.id });
    const reports = await reportRepo.getAllReports();
    res.json({ success: true, data: reports });
  })
);

// POST /api/reports - Create report
router.post('/',
  authenticateToken,
  requireRole('Admin'),
  apiRateLimiter,
  asyncErrorHandler(async (req, res) => {
    const report = await reportRepo.createReport(req.body);

    await auditService.log({
      userId: req.user.id,
      action: 'CREATE_REPORT',
      entityType: 'report',
      entityId: report.id,
      metadata: req.body
    });

    logger.info('Report created', { reportId: report.id, userId: req.user.id });
    res.json({ success: true, data: report });
  })
);

// DELETE /api/reports/:id - Delete report
router.delete('/:id',
  authenticateToken,
  requireRole('Admin'),
  apiRateLimiter,
  asyncErrorHandler(async (req, res) => {
    await reportRepo.deleteReport(req.params.id);

    await auditService.log({
      userId: req.user.id,
      action: 'DELETE_REPORT',
      entityType: 'report',
      entityId: req.params.id
    });

    logger.info('Report deleted', { reportId: req.params.id, userId: req.user.id });
    res.json({ success: true });
  })
);

module.exports = router;
```

---

## Pre-Flight Checklist

Before committing your module, verify:

### Frontend
- [ ] All buttons use infrastructure Button components
- [ ] All forms use FormInput, FormSelect, FormTextarea, FormCheckbox
- [ ] All form sections use FormSection component
- [ ] All API calls use apiClient (no direct fetch)
- [ ] All tables use DataTable component
- [ ] All modals use Modal component (no window.confirm/alert)
- [ ] All notifications use useToast (no window.alert)
- [ ] No raw HTML elements (`<button>`, `<input>`, `<table>`)

### Backend
- [ ] All database access uses BaseRepository
- [ ] All logging uses logger (no console.log)
- [ ] All routes use authenticateToken middleware
- [ ] All routes use requireRole for authorization
- [ ] All routes use apiRateLimiter
- [ ] All routes use asyncErrorHandler
- [ ] All state changes logged with auditService
- [ ] ValidationError used for input validation

### Testing
- [ ] Unit tests added for new components
- [ ] Integration tests added for new API endpoints
- [ ] Manual testing completed
- [ ] No console errors in browser

---

## Violation Examples (What NOT to Do)

### ❌ Direct fetch() - CRITICAL VIOLATION
```typescript
// This bypasses authentication and error handling
const response = await fetch('/api/reports/123');
const data = await response.json();
```

### ❌ Raw HTML Button - HIGH VIOLATION
```typescript
// This has no double-click protection or consistent styling
<button onClick={handleClick}>Save</button>
```

### ❌ window.confirm - HIGH VIOLATION
```typescript
// This cannot be styled and blocks the browser
if (window.confirm('Are you sure?')) {
  handleDelete();
}
```

### ❌ console.log - MEDIUM VIOLATION
```javascript
// This is not production-ready
console.log('Processing report:', reportId);
```

### ❌ Manual Section Header - MEDIUM VIOLATION
```typescript
// Use FormSection component instead
<div style={{
  textTransform: 'uppercase',
  borderBottom: '2px solid var(--color-border-light)',
  paddingBottom: 'var(--space-2)',
  fontWeight: '600'
}}>
  Report Details
</div>
```

---

## Resources

- **Platform Standards Audit**: `Platform-Standardization-Audit.md`
- **Component Documentation**: `/frontend/src/infrastructure/components/`
- **Project Standards**: `/CLAUDE.md`
- **Validation Script**: `sandbox-tools/scripts/validate-platform-standards.js`

---

**Last Updated**: 2025-11-07
**Questions?**: See Platform-Standardization-Audit.md Section 4 for reproducibility
