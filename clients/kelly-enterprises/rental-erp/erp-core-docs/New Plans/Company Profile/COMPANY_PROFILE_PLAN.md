# Company Profile System - Implementation Plan

## Overview
Create a centralized company profile system to store organizational information, branding assets, and configuration that can be used throughout the ERP system.

## Purpose
- Provide branding for auto-generated documents (certificates, reports, etc.)
- Store company contact information
- Configure system-wide defaults
- Support multi-company scenarios (future)

## Core Features

### 1. Basic Company Information
- Company Name
- Legal Business Name
- Address (Street, City, State, ZIP, Country)
- Phone Number
- Email
- Website
- Tax ID / EIN

### 2. Branding Assets
- **Company Logo**
  - Upload functionality
  - Multiple formats supported (PNG, JPG, SVG)
  - Size recommendations: 200x200px minimum
  - Storage: File system or cloud storage
- **Color Scheme** (optional)
  - Primary color
  - Secondary color
  - Accent color

### 3. Calibration Settings
- Default calibration frequency (days)
- Default tolerance specifications by tool type
- Certificate template preferences
- Certification authority information

### 4. Document Settings
- Certificate header/footer text
- Standard terms and conditions
- Signature fields configuration

## Database Schema

### New Table: `company_profile`
```sql
CREATE TABLE company_profile (
  id INT PRIMARY KEY AUTO_INCREMENT,
  company_name VARCHAR(255) NOT NULL,
  legal_name VARCHAR(255),
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(100),
  zip_code VARCHAR(20),
  country VARCHAR(100) DEFAULT 'USA',
  phone VARCHAR(20),
  email VARCHAR(255),
  website VARCHAR(255),
  tax_id VARCHAR(50),
  logo_path VARCHAR(500),
  logo_filename VARCHAR(255),
  primary_color VARCHAR(7),
  secondary_color VARCHAR(7),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by INT NOT NULL,
  FOREIGN KEY (created_by) REFERENCES core_users(id)
);
```

### New Table: `company_calibration_settings`
```sql
CREATE TABLE company_calibration_settings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  company_profile_id INT NOT NULL,
  tool_type VARCHAR(50),
  default_tolerance DECIMAL(10,6),
  default_frequency_days INT,
  certification_authority VARCHAR(255),
  certificate_template_version VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (company_profile_id) REFERENCES company_profile(id) ON DELETE CASCADE,
  UNIQUE KEY unique_tool_type (company_profile_id, tool_type)
);
```

## Implementation Phases

### Phase 1: Basic Setup (MVP)
- Database schema creation
- Admin UI for company info entry
- Logo upload functionality
- Basic read API for other modules

### Phase 2: Integration
- Certificate PDF generation integration
- Report header/footer integration
- Email signature integration

### Phase 3: Advanced Features
- Multiple company profiles (for multi-tenant)
- Version history tracking
- Audit logging for changes

## UI/UX Requirements

### Admin Settings Page
**Location**: `/admin/company-profile`

**Sections**:
1. Company Information (form)
2. Branding (logo upload, color picker)
3. Calibration Defaults (per tool type)
4. Document Settings (certificate templates)

**Permissions**: Admin only

## API Endpoints

### Backend Routes
```
GET    /api/admin/company-profile          - Get company profile
POST   /api/admin/company-profile          - Create/Update profile
POST   /api/admin/company-profile/logo     - Upload logo
DELETE /api/admin/company-profile/logo     - Remove logo
GET    /api/company/branding               - Public endpoint for logo/colors
```

## Integration Points

### Affected Modules
1. **Gauge Module**: Certificate generation, calibration defaults
2. **Admin Module**: Company profile management UI
3. **Reports Module**: Header/footer branding
4. **Email Module**: Signature and branding

### Code Changes Required
- Certificate generation service (add logo/branding)
- PDF generation utilities (header/footer templates)
- Admin navigation (add Company Profile link)

## Dependencies

### Backend
- File upload middleware (multer or similar)
- Image processing library (sharp for resizing)
- Cloud storage integration (optional - Dropbox, S3, etc.)

### Frontend
- File upload component
- Image preview component
- Color picker component
- Form validation

## Security Considerations
- Logo file size limits (max 5MB)
- File type validation (PNG, JPG, SVG only)
- Access control (Admin only)
- Audit logging for all changes

## Future Enhancements
- Multiple logo variants (light/dark theme)
- Custom certificate templates builder
- Multi-language support for company info
- Branch/location management
- Custom fields configuration

## Notes
- Initially single company profile only
- Multi-company support can be added later
- Logo should be optimized for both web display and PDF generation
- Consider CDN for logo delivery in production

## Related Documents
- Certificate generation implementation
- PDF template standards
- Branding guidelines

---
**Status**: Planning
**Priority**: Medium
**Dependencies**: None
**Target Version**: v1.1.0
