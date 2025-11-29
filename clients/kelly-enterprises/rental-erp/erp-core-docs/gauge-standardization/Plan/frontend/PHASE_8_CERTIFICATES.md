# Phase 8: Certificate History

**Date**: 2025-10-26
**Status**: Not Started
**Dependencies**: Phase 0 (certificateService), Phase 1 (Individual Gauge Details page)

---

## Overview

Certificate display and management for individual gauges, including download, view, and supersession display.

**Scope**:
- CertificateHistory component
- CertificateCard component
- Integration with Individual Gauge Details page

---

## 1. CertificateHistory Component

**Location**: `/frontend/src/modules/gauge/components/CertificateHistory.tsx` (CREATE NEW)

**Purpose**: Display all certificates for a gauge with supersession handling

### 1.1 Layout

```
┌──────────────────────────────────────────────────────────────┐
│ Calibration History                                          │
├──────────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────────────┐  │
│ │ [CertificateCard - Current Certificate]                │  │
│ │ Certificate: cert_2024-09-15.pdf                        │  │
│ │ Uploaded: 2024-09-15 by John Smith (QC)               │  │
│ │ Valid Until: 2025-09-15                                 │  │
│ │ [View PDF] [Download]                                   │  │
│ └────────────────────────────────────────────────────────┘  │
│                                                               │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ [CertificateCard - Superseded Certificate]             │  │
│ │ Certificate: cert_2023-08-01.pdf                        │  │
│ │ Uploaded: 2023-08-01 by Sarah Lee (Admin)             │  │
│ │ Valid Until: 2024-08-01                                 │  │
│ │ ⚠️ Superseded by certificate from 2024-09-15            │  │
│ │ [View PDF] [Download]                                   │  │
│ └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### 1.2 Implementation

```typescript
import React, { useEffect, useState } from 'react';
import { certificateService } from '../../../services/certificateService';
import { CertificateCard } from './CertificateCard';

interface CertificateHistoryProps {
  gaugeId: number;
}

export const CertificateHistory: React.FC<CertificateHistoryProps> = ({ gaugeId }) => {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCertificates();
  }, [gaugeId]);

  const fetchCertificates = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const certs = await certificateService.getCertificateHistory(gaugeId);
      setCertificates(certs);
    } catch (err) {
      setError('Failed to load certificate history');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="loading">Loading certificates...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  if (certificates.length === 0) {
    return (
      <div className="certificate-history">
        <h3>Calibration History</h3>
        <div className="empty-state">No calibration certificates on file</div>
      </div>
    );
  }

  // Separate current and superseded certificates
  const currentCertificates = certificates.filter(c => !c.isSuperseded);
  const supersededCertificates = certificates.filter(c => c.isSuperseded);

  return (
    <div className="certificate-history">
      <h3>Calibration History</h3>

      {currentCertificates.map(cert => (
        <CertificateCard
          key={cert.id}
          certificate={cert}
          isCurrent={true}
        />
      ))}

      {supersededCertificates.length > 0 && (
        <div className="superseded-section">
          <h4>Previous Certificates</h4>
          {supersededCertificates.map(cert => (
            <CertificateCard
              key={cert.id}
              certificate={cert}
              isCurrent={false}
            />
          ))}
        </div>
      )}
    </div>
  );
};
```

---

## 2. CertificateCard Component

**Location**: `/frontend/src/modules/gauge/components/CertificateCard.tsx` (CREATE NEW)

**Purpose**: Individual certificate display with actions

### 2.1 Implementation

```typescript
import React, { useState } from 'react';
import { certificateService } from '../../../services/certificateService';
import { Button } from '../../../infrastructure/components';

interface CertificateCardProps {
  certificate: Certificate;
  isCurrent: boolean;
}

export const CertificateCard: React.FC<CertificateCardProps> = ({
  certificate,
  isCurrent
}) => {
  const [viewError, setViewError] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleView = async () => {
    setViewError(null);
    try {
      const url = await certificateService.viewCertificate(certificate.id);
      window.open(url, '_blank');
    } catch (error) {
      // ✅ FIX: Show user-facing error message
      setViewError('Failed to view certificate. Please try again.');
      console.error('Failed to view certificate', error);
    }
  };

  const handleDownload = async () => {
    setDownloadError(null);
    setIsDownloading(true);
    try {
      const blob = await certificateService.downloadCertificate(certificate.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = certificate.fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      // ✅ FIX: Show user-facing error message
      setDownloadError('Failed to download certificate. Please try again.');
      console.error('Failed to download certificate', error);
    } finally {
      setIsDownloading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className={`certificate-card ${isCurrent ? 'current' : 'superseded'}`}>
      <div className="certificate-info">
        <div className="cert-header">
          <span className="cert-filename">{certificate.fileName}</span>
          {isCurrent && <span className="current-badge">Current</span>}
        </div>

        <div className="cert-meta">
          <div className="meta-item">
            <span className="label">Uploaded:</span>
            <span className="value">
              {formatDate(certificate.uploadedAt)} by {certificate.uploadedBy.username} ({certificate.uploadedBy.role})
            </span>
          </div>

          <div className="meta-item">
            <span className="label">Valid Until:</span>
            <span className="value">{formatDate(certificate.validUntil)}</span>
          </div>
        </div>

        {!isCurrent && certificate.supersededBy && (
          <div className="superseded-warning">
            ⚠️ Superseded by certificate from {formatDate(certificate.supersededDate!)}
          </div>
        )}

        {/* ✅ FIX: Display error messages */}
        {viewError && (
          <div className="error-message">
            {viewError}
          </div>
        )}

        {downloadError && (
          <div className="error-message">
            {downloadError}
          </div>
        )}
      </div>

      <div className="certificate-actions">
        <Button variant="secondary" onClick={handleView}>
          View PDF
        </Button>
        <Button
          variant="secondary"
          onClick={handleDownload}
          disabled={isDownloading}
        >
          {isDownloading ? 'Downloading...' : 'Download'}
        </Button>
      </div>
    </div>
  );
};
```

---

## 3. Integration with Individual Gauge Details

**Location**: `/frontend/src/modules/gauge/pages/GaugeDetailsPage.tsx` (MODIFY EXISTING)

### 3.1 Add CertificateHistory Section

```typescript
import { CertificateHistory } from '../components/CertificateHistory';

export const GaugeDetailsPage: React.FC = () => {
  // ... existing code

  return (
    <div className="gauge-details-page">
      {/* ... existing sections (header, specifications, status, etc.) */}

      {/* Add Certificate History section */}
      <section className="calibration-section">
        <CertificateHistory gaugeId={gauge.id} />
      </section>

      {/* ... existing sections (checkout history, etc.) */}
    </div>
  );
};
```

---

## 4. Certificate Management Features

### 4.1 View Certificate

**Action**: Opens certificate PDF in new browser tab

**Implementation**:
```typescript
const handleView = async (certificateId: number) => {
  const url = await certificateService.viewCertificate(certificateId);
  window.open(url, '_blank');
};
```

**API Endpoint**: `GET /api/certificates/:id/view`

**Response**: `{ url: string }` (temporary signed URL)

### 4.2 Download Certificate

**Action**: Downloads certificate PDF to user's device

**Implementation**:
```typescript
const handleDownload = async (certificateId: number) => {
  const blob = await certificateService.downloadCertificate(certificateId);
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = certificate.fileName;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};
```

**API Endpoint**: `GET /api/certificates/:id/download`

**Response**: PDF file blob

### 4.3 Supersession Display

**Logic**:
- Show current certificates first (not superseded)
- Show superseded certificates in "Previous Certificates" section
- Display warning on superseded certificates with supersession date
- Link to superseding certificate if needed

---

## 5. Certificate Types

```typescript
interface Certificate {
  id: number;
  gaugeId: number;
  fileName: string;
  uploadedAt: string;
  uploadedBy: {
    id: number;
    username: string;
    role: string;
  };
  isSuperseded: boolean;
  supersededBy: number | null;
  supersededDate?: string;
  validUntil: string;
}
```

---

## Completion Checklist

- [ ] CertificateHistory component created
- [ ] CertificateCard component created
- [ ] View certificate functionality implemented
- [ ] Download certificate functionality implemented
- [ ] Supersession logic implemented
- [ ] Current vs superseded display implemented
- [ ] Integration with Individual Gauge Details complete
- [ ] certificateService API methods implemented
- [ ] Error handling implemented
- [ ] Component tests written

---

**Maintained By**: Claude Code SuperClaude Framework
**Last Updated**: 2025-10-26
