# EditGaugeModal.tsx Refactoring Plan

**Status**: High Priority - 734 lines
**Priority**: #5
**Location**: `frontend/src/modules/admin/components/EditGaugeModal.tsx`

---

## Problem Analysis

**Massive Modal Component**:
- 734 lines handling multiple concerns
- Gauge editing + certificate management in one component
- Too many state variables (15+ useState hooks)
- Hard to understand and maintain

**Responsibilities Identified**:
1. Gauge field editing
2. Certificate upload/manage/delete
3. Form validation
4. State management
5. API calls
6. Modal UI coordination

---

## Refactoring Strategy

### Component Hierarchy

```
EditGaugeModal.tsx (734 lines)
├── EditGaugeModal.tsx (main modal - ~150 lines)
├── components/
│   ├── GaugeEditForm.tsx (gauge fields - ~220 lines)
│   ├── CertificateManager.tsx (certificate CRUD - ~220 lines)
│   └── GaugeSpecificationFields.tsx (spec fields - ~150 lines)
└── hooks/
    └── useGaugeEdit.ts (form state & API - ~120 lines)
```

---

## File 1: useGaugeEdit.ts (Custom Hook)

**Purpose**: Centralize form state and API calls

```typescript
// frontend/src/modules/admin/hooks/useGaugeEdit.ts

import { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { gaugeService } from '../../gauge/services/gaugeService';
import { useToast } from '../../../infrastructure';
import type { Gauge } from '../../gauge/types';

export function useGaugeEdit(gauge: Gauge) {
  const toast = useToast();
  const queryClient = useQueryClient();

  // Initialize form data from gauge
  const initialFormData = useMemo(() => ({
    gauge_id: gauge.gauge_id || gauge.system_gauge_id || '',
    system_gauge_id: gauge.system_gauge_id || '',
    description: gauge.description || '',
    equipment_type: gauge.equipment_type || '',
    manufacturer: gauge.manufacturer || '',
    category_id: gauge.category_id || '',
    status: gauge.status || 'available',
    ownership_type: gauge.ownership_type || 'company',
    employee_owner_id: gauge.employee_owner_id || null,
    storage_location: gauge.storage_location || '',
    notes: gauge.notes || '',
    // Specifications
    thread_size: gauge.thread_size || '',
    thread_class: gauge.thread_class || '',
    thread_type: gauge.thread_type || '',
    calibration_frequency_days: gauge.calibration_frequency_days || 365
  }), [gauge]);

  const [formData, setFormData] = useState(initialFormData);

  // Track changes
  const hasChanges = useMemo(() => {
    return JSON.stringify(formData) !== JSON.stringify(initialFormData);
  }, [formData, initialFormData]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<typeof formData>) => {
      const gaugeId = gauge.gauge_id || gauge.system_gauge_id || '';
      return gaugeService.updateGauge(gaugeId, updates);
    },
    onSuccess: () => {
      toast.success('Gauge updated successfully');
      queryClient.invalidateQueries(['gauges']);
    },
    onError: (error: any) => {
      toast.error('Failed to update gauge', error.message);
    }
  });

  // Field update handler
  const updateField = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Save handler
  const handleSave = async () => {
    if (!hasChanges) {
      toast.info('No changes to save');
      return;
    }

    await updateMutation.mutateAsync(formData);
  };

  // Reset handler
  const handleReset = () => {
    setFormData(initialFormData);
  };

  return {
    formData,
    hasChanges,
    updateField,
    handleSave,
    handleReset,
    isSaving: updateMutation.isLoading
  };
}
```

**Lines**: ~120

---

## File 2: GaugeEditForm.tsx (Component)

**Purpose**: Render gauge edit fields

```typescript
// frontend/src/modules/admin/components/EditGaugeModal/GaugeEditForm.tsx

import {
  FormInput,
  FormSelect,
  FormTextarea,
  SectionHeader
} from '../../../../infrastructure';
import { StatusRules } from '../../../../infrastructure/business/statusRules';
import { EquipmentRules } from '../../../../infrastructure/business/equipmentRules';

interface GaugeEditFormProps {
  formData: any;
  onChange: (field: string, value: any) => void;
  categories: any[];
  employees: any[];
}

export function GaugeEditForm({
  formData,
  onChange,
  categories,
  employees
}: GaugeEditFormProps) {
  const allowedStatuses = StatusRules.getAllowedStatuses();
  const equipmentTypes = EquipmentRules.getEquipmentTypes();

  return (
    <div className="gauge-edit-form">
      <SectionHeader>Basic Information</SectionHeader>

      <FormInput
        label="Gauge ID"
        value={formData.gauge_id}
        onChange={(value) => onChange('gauge_id', value)}
        required
      />

      <FormInput
        label="System Gauge ID"
        value={formData.system_gauge_id}
        onChange={(value) => onChange('system_gauge_id', value)}
        required
      />

      <FormTextarea
        label="Description"
        value={formData.description}
        onChange={(value) => onChange('description', value)}
        rows={3}
      />

      <FormSelect
        label="Equipment Type"
        value={formData.equipment_type}
        onChange={(value) => onChange('equipment_type', value)}
        options={equipmentTypes}
        required
      />

      <FormInput
        label="Manufacturer"
        value={formData.manufacturer}
        onChange={(value) => onChange('manufacturer', value)}
      />

      <SectionHeader>Status & Ownership</SectionHeader>

      <FormSelect
        label="Status"
        value={formData.status}
        onChange={(value) => onChange('status', value)}
        options={allowedStatuses.map(s => ({ value: s, label: s }))}
        required
      />

      <FormSelect
        label="Category"
        value={formData.category_id}
        onChange={(value) => onChange('category_id', value)}
        options={categories.map(c => ({ value: c.id, label: c.name }))}
        required
      />

      <FormSelect
        label="Ownership Type"
        value={formData.ownership_type}
        onChange={(value) => onChange('ownership_type', value)}
        options={[
          { value: 'company', label: 'Company' },
          { value: 'employee', label: 'Employee' }
        ]}
        required
      />

      {formData.ownership_type === 'employee' && (
        <FormSelect
          label="Employee Owner"
          value={formData.employee_owner_id}
          onChange={(value) => onChange('employee_owner_id', value)}
          options={employees.map(e => ({ value: e.id, label: e.name }))}
          required
        />
      )}

      <SectionHeader>Location & Notes</SectionHeader>

      <FormInput
        label="Storage Location"
        value={formData.storage_location}
        onChange={(value) => onChange('storage_location', value)}
      />

      <FormTextarea
        label="Notes"
        value={formData.notes}
        onChange={(value) => onChange('notes', value)}
        rows={4}
      />
    </div>
  );
}
```

**Lines**: ~220

---

## File 3: GaugeSpecificationFields.tsx (Component)

**Purpose**: Equipment-specific specification fields

```typescript
// frontend/src/modules/admin/components/EditGaugeModal/GaugeSpecificationFields.tsx

import { FormInput, FormSelect, SectionHeader } from '../../../../infrastructure';

interface GaugeSpecificationFieldsProps {
  equipmentType: string;
  formData: any;
  onChange: (field: string, value: any) => void;
}

export function GaugeSpecificationFields({
  equipmentType,
  formData,
  onChange
}: GaugeSpecificationFieldsProps) {
  if (equipmentType !== 'thread_gauge') {
    return null;
  }

  const threadTypes = ['UNC', 'UNF', 'NPT', 'METRIC'];
  const threadClasses = ['1A', '2A', '3A', '1B', '2B', '3B'];

  return (
    <div className="specification-fields">
      <SectionHeader>Thread Gauge Specifications</SectionHeader>

      <FormInput
        label="Thread Size"
        value={formData.thread_size}
        onChange={(value) => onChange('thread_size', value)}
        placeholder="e.g., .312-18"
        required
      />

      <FormSelect
        label="Thread Class"
        value={formData.thread_class}
        onChange={(value) => onChange('thread_class', value)}
        options={threadClasses.map(c => ({ value: c, label: c }))}
        required
      />

      <FormSelect
        label="Thread Type"
        value={formData.thread_type}
        onChange={(value) => onChange('thread_type', value)}
        options={threadTypes.map(t => ({ value: t, label: t }))}
        required
      />

      <FormInput
        label="Calibration Frequency (days)"
        type="number"
        value={formData.calibration_frequency_days}
        onChange={(value) => onChange('calibration_frequency_days', parseInt(value))}
        min={1}
        max={3650}
      />
    </div>
  );
}
```

**Lines**: ~150

---

## File 4: CertificateManager.tsx (Component)

**Purpose**: Handle certificate upload, list, delete

```typescript
// frontend/src/modules/admin/components/EditGaugeModal/CertificateManager.tsx

import { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  FileInput,
  Icon,
  SectionHeader,
  useToast,
  ConfirmModal
} from '../../../../infrastructure';
import { certificateService, type Certificate } from '../../../gauge/services/certificateService';
import type { Gauge } from '../../../gauge/types';

interface CertificateManagerProps {
  gauge: Gauge;
}

export function CertificateManager({ gauge }: CertificateManagerProps) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [editingCertId, setEditingCertId] = useState<string | number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; cert: Certificate | null }>({
    isOpen: false,
    cert: null
  });

  // Fetch certificates
  const { data: certificates = [], isLoading } = useQuery({
    queryKey: ['certificates', gauge.gauge_id],
    queryFn: () => certificateService.getCertificates(gauge.gauge_id || gauge.system_gauge_id)
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      return certificateService.uploadCertificate(
        file,
        gauge.gauge_id || gauge.system_gauge_id
      );
    },
    onSuccess: () => {
      toast.success('Certificate uploaded');
      setUploadedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      queryClient.invalidateQueries(['certificates', gauge.gauge_id]);
    },
    onError: (error: any) => {
      toast.error('Upload failed', error.message);
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (certId: string | number) => {
      return certificateService.deleteCertificate(certId);
    },
    onSuccess: () => {
      toast.success('Certificate deleted');
      queryClient.invalidateQueries(['certificates', gauge.gauge_id]);
    },
    onError: (error: any) => {
      toast.error('Delete failed', error.message);
    }
  });

  // Rename mutation
  const renameMutation = useMutation({
    mutationFn: ({ certId, newName }: { certId: string | number; newName: string }) => {
      return certificateService.renameCertificate(certId, newName);
    },
    onSuccess: () => {
      toast.success('Certificate renamed');
      setEditingCertId(null);
      setEditingName('');
      queryClient.invalidateQueries(['certificates', gauge.gauge_id]);
    },
    onError: (error: any) => {
      toast.error('Rename failed', error.message);
    }
  });

  const handleFileChange = (file: File | null) => {
    setUploadedFile(file);
  };

  const handleUpload = async () => {
    if (!uploadedFile) {
      toast.error('No file selected');
      return;
    }

    await uploadMutation.mutateAsync(uploadedFile);
  };

  const handleDelete = async () => {
    if (!deleteConfirm.cert) return;

    await deleteMutation.mutateAsync(deleteConfirm.cert.id);
    setDeleteConfirm({ isOpen: false, cert: null });
  };

  const handleRename = async (certId: string | number) => {
    if (!editingName.trim()) {
      toast.error('Name cannot be empty');
      return;
    }

    await renameMutation.mutateAsync({ certId, newName: editingName });
  };

  return (
    <div className="certificate-manager">
      <SectionHeader>Certificates</SectionHeader>

      {/* Upload Section */}
      <div className="upload-section">
        <FileInput
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".pdf,.jpg,.jpeg,.png"
        />

        {uploadedFile && (
          <div className="upload-preview">
            <span>{uploadedFile.name}</span>
            <Button
              onClick={handleUpload}
              disabled={uploadMutation.isLoading}
            >
              {uploadMutation.isLoading ? 'Uploading...' : 'Upload'}
            </Button>
          </div>
        )}
      </div>

      {/* Certificate List */}
      <div className="certificate-list">
        {isLoading ? (
          <p>Loading certificates...</p>
        ) : certificates.length === 0 ? (
          <p>No certificates uploaded</p>
        ) : (
          <ul>
            {certificates.map((cert: Certificate) => (
              <li key={cert.id} className="certificate-item">
                {editingCertId === cert.id ? (
                  <div className="rename-mode">
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      autoFocus
                    />
                    <Button onClick={() => handleRename(cert.id)}>Save</Button>
                    <Button onClick={() => { setEditingCertId(null); setEditingName(''); }}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="view-mode">
                    <span className="cert-name">{cert.display_name}</span>
                    <div className="cert-actions">
                      <Button
                        variant="icon"
                        onClick={() => {
                          setEditingCertId(cert.id);
                          setEditingName(cert.display_name);
                        }}
                      >
                        <Icon name="edit" />
                      </Button>
                      <Button
                        variant="icon"
                        onClick={() => certificateService.downloadCertificate(cert.id)}
                      >
                        <Icon name="download" />
                      </Button>
                      <Button
                        variant="icon"
                        onClick={() => setDeleteConfirm({ isOpen: true, cert })}
                      >
                        <Icon name="trash" />
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, cert: null })}
        onConfirm={handleDelete}
        title="Delete Certificate"
        message={`Are you sure you want to delete "${deleteConfirm.cert?.display_name}"?`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
}
```

**Lines**: ~220

---

## File 5: EditGaugeModal.tsx (Refactored Main Component)

**Purpose**: Orchestrate sub-components

```typescript
// frontend/src/modules/admin/components/EditGaugeModal.tsx

import { Modal, Button, CloseButton, SaveButton, CancelButton } from '../../../infrastructure';
import { useGaugeEdit } from '../hooks/useGaugeEdit';
import { GaugeEditForm, CertificateManager, GaugeSpecificationFields } from './EditGaugeModal';
import type { Gauge } from '../../gauge/types';

interface EditGaugeModalProps {
  isOpen: boolean;
  onClose: () => void;
  gauge: Gauge;
}

export function EditGaugeModal({ isOpen, onClose, gauge }: EditGaugeModalProps) {
  const {
    formData,
    hasChanges,
    updateField,
    handleSave,
    handleReset,
    isSaving
  } = useGaugeEdit(gauge);

  const handleSaveAndClose = async () => {
    await handleSave();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="large" title="Edit Gauge">
      <div className="edit-gauge-modal-content">
        {/* Gauge Edit Form */}
        <GaugeEditForm
          formData={formData}
          onChange={updateField}
          categories={[]} // Fetch from context or props
          employees={[]} // Fetch from context or props
        />

        {/* Specifications (if applicable) */}
        <GaugeSpecificationFields
          equipmentType={formData.equipment_type}
          formData={formData}
          onChange={updateField}
        />

        {/* Certificate Manager */}
        <CertificateManager gauge={gauge} />
      </div>

      {/* Modal Actions */}
      <div className="modal-actions">
        <CloseButton onClick={onClose}>Cancel</CloseButton>

        {hasChanges && (
          <Button variant="secondary" onClick={handleReset}>
            Reset Changes
          </Button>
        )}

        <SaveButton
          onClick={handleSaveAndClose}
          disabled={!hasChanges || isSaving}
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </SaveButton>
      </div>
    </Modal>
  );
}
```

**Lines**: ~150

---

## Implementation Steps

### Step 1: Extract useGaugeEdit Hook
1. Create hook with form state management
2. Test hook independently
3. Implement save/reset logic

### Step 2: Create Sub-Components
1. Create `GaugeEditForm.tsx`
2. Create `GaugeSpecificationFields.tsx`
3. Create `CertificateManager.tsx`
4. Test components in isolation

### Step 3: Refactor Main Modal
1. Update `EditGaugeModal.tsx` to use hook and sub-components
2. Remove inline logic
3. Test integrated modal

---

## Benefits

### Before
- ❌ 734 lines in single file
- ❌ 15+ state variables
- ❌ Mixed concerns (gauge + certificates)
- ❌ Hard to test

### After
- ✅ 150 lines in main component
- ✅ State centralized in custom hook
- ✅ Clear separation of concerns
- ✅ Easy to test individual pieces

---

## Acceptance Criteria

- ✅ Main modal < 200 lines
- ✅ All functionality preserved
- ✅ Custom hook tested
- ✅ Sub-components tested
- ✅ Certificate management works
- ✅ Form validation maintained

---

**Status**: Ready for implementation
**Impact**: High - improves modal maintainability
**Risk**: Medium - requires careful state management
