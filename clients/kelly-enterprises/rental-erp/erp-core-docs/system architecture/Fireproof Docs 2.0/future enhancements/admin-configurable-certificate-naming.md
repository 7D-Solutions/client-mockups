# Admin-Configurable Certificate Naming System

**Status**: Proposed Future Enhancement
**Priority**: Medium
**Complexity**: Medium
**Estimated Effort**: 2-3 days
**Created**: October 22, 2025

---

## Overview

Enable administrators to configure custom certificate naming conventions through an admin settings panel, replacing the current hardcoded default format with a flexible template-based system.

## Current Implementation (Phase 1)

As of October 2025, the system uses a fixed naming convention:

**Format**: `{EXTENSION}_Certificate_{YYYY.MM.DD}` with auto-increment suffix
**Examples**:
- `PDF_Certificate_2025.10.23`
- `PDF_Certificate_2025.10.23_2`
- `JPG_Certificate_2025.10.23`

**Location**:
- Backend: `backend/src/modules/gauge/routes/gauge-certificates.js` (lines 87-129)
- Frontend: `frontend/src/modules/gauge/services/certificateService.ts` (lines 76-101)

**Benefits**:
- ✅ ISO 8601 compliant date format
- ✅ No invalid filename characters
- ✅ Auto-increment for duplicates
- ✅ Cross-platform compatible
- ✅ Chronologically sortable

## Proposed Enhancement (Phase 2)

### Admin Settings Panel

Create a new section in the Admin Settings page (`/admin/settings`) for certificate naming configuration.

### Template Variables

Allow administrators to construct naming templates using the following variables:

| Variable | Description | Example Output |
|----------|-------------|----------------|
| `{EXTENSION}` | File type (uppercase) | `PDF`, `JPG`, `PNG` |
| `{extension}` | File type (lowercase) | `pdf`, `jpg`, `png` |
| `{YYYY}` | 4-digit year | `2025` |
| `{YY}` | 2-digit year | `25` |
| `{MM}` | 2-digit month | `10` |
| `{DD}` | 2-digit day | `23` |
| `{YYYYMMDD}` | Full date code (no separators) | `20251023` |
| `{YYYY.MM.DD}` | Dot-separated date | `2025.10.23` |
| `{YYYY-MM-DD}` | ISO date format | `2025-10-23` |
| `{GAUGE_ID}` | Gauge identifier | `G-1234` |
| `{GAUGE_NAME}` | Gauge name (sanitized) | `0.5_Grade` |
| `{COUNTER}` | Auto-increment number | `1`, `2`, `3` |
| `{TIMESTAMP}` | Full timestamp (YYYYMMDDHHmmss) | `20251023142530` |
| `{USER}` | Username who uploaded | `james_dickson` |
| `{CERT_TYPE}` | Certificate type (if categorized) | `Calibration`, `Inspection` |

### Template Examples

**Default (Current)**:
```
{EXTENSION}_Certificate_{YYYY.MM.DD}
```
Output: `PDF_Certificate_2025.10.23`

**Gauge-Centric**:
```
{GAUGE_ID}_Calibration_{YYYY-MM-DD}
```
Output: `G-1234_Calibration_2025-10-23`

**Detailed Tracking**:
```
{GAUGE_NAME}_{EXTENSION}_{YYYY.MM.DD}_{COUNTER}
```
Output: `0.5_Grade_PDF_2025.10.23_1`

**Minimal**:
```
Cert_{YYYY.MM.DD}_{COUNTER}
```
Output: `Cert_2025.10.23_1`

**Department-Based**:
```
QC_{YYYY}_{MM}_{DD}_{GAUGE_ID}
```
Output: `QC_2025_10_23_G-1234`

### Template Validation

The system should validate templates to ensure:
1. **No invalid characters**: Template cannot produce `: / \ | ? * < > "`
2. **Not too long**: Final filename ≤ 100 characters
3. **Uniqueness**: Template must ensure unique names (requires `{COUNTER}` or `{TIMESTAMP}`)
4. **Valid syntax**: All variables properly formatted with `{}`

### Database Schema

**New Table**: `system_settings`
```sql
CREATE TABLE system_settings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT,
  setting_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
  description TEXT,
  updated_by INT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (updated_by) REFERENCES core_users(id)
);
```

**Initial Settings**:
```sql
INSERT INTO system_settings (setting_key, setting_value, setting_type, description) VALUES
('certificate_naming_template', '{EXTENSION}_Certificate_{YYYY.MM.DD}', 'string', 'Template for default certificate naming'),
('certificate_auto_increment', 'true', 'boolean', 'Enable auto-increment suffix for duplicate names');
```

### User Interface

**Location**: `/admin/settings` → "Certificate Settings" section

**UI Components**:
1. **Template Input Field**
   - Text input with variable helper buttons
   - Live preview showing example output
   - Character count indicator

2. **Variable Reference Panel**
   - Clickable buttons to insert variables
   - Descriptions and examples for each variable

3. **Preview Section**
   - Shows 3-5 example outputs based on current template
   - Validates template in real-time
   - Shows warnings for potential issues

4. **Validation Feedback**
   - ✅ Green checkmark: Template valid
   - ⚠️ Warning: Potential issues (e.g., no counter/timestamp)
   - ❌ Error: Invalid characters or syntax

**Example UI Layout**:
```
┌────────────────────────────────────────────────────┐
│ Certificate Naming Settings                        │
├────────────────────────────────────────────────────┤
│                                                    │
│ Naming Template:                                   │
│ ┌──────────────────────────────────────────────┐  │
│ │ {EXTENSION}_Certificate_{YYYY.MM.DD}         │  │
│ └──────────────────────────────────────────────┘  │
│                                                    │
│ Insert Variable:                                   │
│ [{EXTENSION}] [{YYYY}] [{MM}] [{DD}] [{GAUGE_ID}] │
│ [{GAUGE_NAME}] [{COUNTER}] [{TIMESTAMP}]          │
│                                                    │
│ Preview Examples:                                  │
│ • PDF_Certificate_2025.10.23                      │
│ • PDF_Certificate_2025.10.23_2 (duplicate)        │
│ • JPG_Certificate_2025.10.23                      │
│                                                    │
│ ✅ Template is valid                              │
│                                                    │
│ [Save Changes] [Reset to Default]                 │
└────────────────────────────────────────────────────┘
```

### Implementation Plan

#### Backend Changes

1. **Create Settings Service** (`backend/src/infrastructure/services/SettingsService.js`)
   - `getSetting(key)` - Retrieve setting value
   - `setSetting(key, value, userId)` - Update setting
   - `getDefaultSetting(key)` - Get default value
   - Cache settings in memory for performance

2. **Update Certificate Upload Route** (`backend/src/modules/gauge/routes/gauge-certificates.js`)
   - Read template from settings service
   - Parse template and replace variables
   - Apply validation rules
   - Handle auto-increment logic

3. **Add Settings API Routes** (`backend/src/modules/admin/routes/settings.js`)
   - `GET /api/admin/settings` - Get all settings
   - `GET /api/admin/settings/:key` - Get specific setting
   - `PUT /api/admin/settings/:key` - Update setting
   - `POST /api/admin/settings/validate` - Validate template

4. **Create Migration** (`backend/src/infrastructure/database/migrations/`)
   - Create `system_settings` table
   - Insert default certificate naming settings

#### Frontend Changes

1. **Create Settings Page** (`frontend/src/modules/admin/pages/Settings.tsx`)
   - Certificate naming section
   - Template input with variable buttons
   - Live preview component
   - Validation feedback

2. **Create Settings Service** (`frontend/src/modules/admin/services/settingsService.ts`)
   - `getSettings()` - Fetch all settings
   - `updateSetting(key, value)` - Update setting
   - `validateTemplate(template)` - Validate template

3. **Update Certificate Service** (`frontend/src/modules/gauge/services/certificateService.ts`)
   - Remove hardcoded format from `formatCertificateName()`
   - Use `custom_name` field exclusively (backend handles generation)

4. **Add Admin Navigation** (`frontend/src/modules/admin/`)
   - Add "Settings" link to admin menu
   - Protect route with admin role check

### Template Parser

**Backend Parsing Logic**:
```javascript
function parseTemplate(template, context) {
  const {
    extension,
    uploadDate,
    gaugeId,
    gaugeName,
    username,
    counter
  } = context;

  const year = uploadDate.getFullYear();
  const month = String(uploadDate.getMonth() + 1).padStart(2, '0');
  const day = String(uploadDate.getDate()).padStart(2, '0');
  const hour = String(uploadDate.getHours()).padStart(2, '0');
  const minute = String(uploadDate.getMinutes()).padStart(2, '0');
  const second = String(uploadDate.getSeconds()).padStart(2, '0');

  const variables = {
    '{EXTENSION}': extension.toUpperCase(),
    '{extension}': extension.toLowerCase(),
    '{YYYY}': String(year),
    '{YY}': String(year).slice(-2),
    '{MM}': month,
    '{DD}': day,
    '{YYYYMMDD}': `${year}${month}${day}`,
    '{YYYY.MM.DD}': `${year}.${month}.${day}`,
    '{YYYY-MM-DD}': `${year}-${month}-${day}`,
    '{GAUGE_ID}': sanitizeFilename(gaugeId),
    '{GAUGE_NAME}': sanitizeFilename(gaugeName),
    '{COUNTER}': String(counter),
    '{TIMESTAMP}': `${year}${month}${day}${hour}${minute}${second}`,
    '{USER}': sanitizeFilename(username)
  };

  let result = template;
  for (const [variable, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(variable.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
  }

  return result;
}

function sanitizeFilename(str) {
  // Remove invalid characters and replace spaces
  return str
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 50); // Limit length
}
```

### Security & Validation

1. **Admin-Only Access**: Only users with `admin` role can modify settings
2. **Audit Logging**: All setting changes logged to audit trail
3. **Template Injection Prevention**: Sanitize all variable replacements
4. **Character Validation**: Block invalid filename characters
5. **Length Limits**: Enforce maximum filename length (100 chars)

### Testing Strategy

1. **Unit Tests**:
   - Template parser with various inputs
   - Variable replacement logic
   - Validation rules

2. **Integration Tests**:
   - Settings CRUD operations
   - Certificate upload with custom templates
   - Duplicate detection with custom formats

3. **E2E Tests**:
   - Admin updates template
   - Upload certificate with new template
   - Verify correct naming

### Migration Path

**For Existing Certificates**:
- Existing certificates keep their current `custom_name`
- Template only affects new uploads
- Optional: Bulk rename utility for admins

**Default Template**:
- System ships with current format: `{EXTENSION}_Certificate_{YYYY.MM.DD}`
- No breaking changes for existing deployments

### Performance Considerations

1. **Settings Cache**: Cache template in memory, refresh on update
2. **Database Index**: Index `system_settings.setting_key` for fast lookups
3. **Template Parsing**: Pre-compile regex patterns for performance

### Future Extensions

Once base system is implemented, could add:
- **Multiple Templates**: Different templates per gauge type
- **Custom Variables**: User-defined variables from gauge metadata
- **Template Library**: Pre-built templates for common scenarios
- **Bulk Rename**: Tool to rename existing certificates with new template
- **Template Versioning**: Track template changes over time

## Dependencies

- ✅ Current certificate naming system (Phase 1) must be in place
- System settings infrastructure
- Admin permissions system
- Audit logging system

## Rollout Plan

1. **Phase 2.1**: Backend infrastructure (settings table, service, API)
2. **Phase 2.2**: Frontend settings page and UI
3. **Phase 2.3**: Template parser and validation
4. **Phase 2.4**: Testing and documentation
5. **Phase 2.5**: Deployment and user training

## Documentation Requirements

- Admin user guide for template configuration
- Developer documentation for template variables
- API documentation for settings endpoints
- Migration guide for updating templates

## Success Criteria

✅ Admins can configure custom naming templates
✅ Templates validated in real-time
✅ New certificates use configured template
✅ Duplicate detection works with custom templates
✅ All filenames comply with OS restrictions
✅ Settings changes logged to audit trail
✅ Performance impact < 5% on upload operations

---

## Notes

- Keep the current default format as the system default
- Ensure backward compatibility with existing certificates
- Consider internationalization for date formats in future
- May want to add certificate categories in future (Calibration, Inspection, etc.)

## Related Documents

- Current Implementation: `backend/src/modules/gauge/routes/gauge-certificates.js`
- Certificate Service: `frontend/src/modules/gauge/services/certificateService.ts`
- Admin Module: `frontend/src/modules/admin/`

## References

- ISO 8601 Date Format Standards
- Filename Best Practices (Research conducted Oct 2025)
- Cross-Platform Filename Compatibility Guidelines
