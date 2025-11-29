# Claude Code Executable Steps

## What Claude Code CAN Do

These are concrete file operations Claude Code can execute immediately:

### Phase 1: Foundation Files

#### Step 1: Create Design Tokens File
```typescript
// File: frontend/src/styles/design-tokens.css
:root {
  --brand-primary: #2c72d5;
  --brand-hover: #1d5bb8;
  --nav-height: 60px;
  --row-height: 56px;
  --border-radius: 4px;
  --shadow-card: 0 4px 16px rgba(0,0,0,0.1);
  --transition-default: all 0.2s ease;
}
```

#### Step 2: Update Tailwind Config
```javascript
// File: frontend/tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        'brand-primary': 'var(--brand-primary)',
        'brand-hover': 'var(--brand-hover)',
      },
      spacing: {
        'nav': 'var(--nav-height)',
        'row': 'var(--row-height)',
      }
    }
  }
}
```

#### Step 3: Create Tab State Service
```typescript
// File: frontend/src/infrastructure/services/tabStateService.ts
export class TabStateService {
  private static STORAGE_KEY = 'gauge_tab_states';
  
  static saveTabState(tabGroup: string, activeTab: string): void {
    const states = this.getStates();
    states[tabGroup] = activeTab;
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(states));
  }
  
  static getTabState(tabGroup: string): string | null {
    const states = this.getStates();
    return states[tabGroup] || null;
  }
  
  private static getStates(): Record<string, string> {
    try {
      return JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '{}');
    } catch {
      return {};
    }
  }
}
```

#### Step 4: Create Tab Navigation Component
```typescript
// File: frontend/src/infrastructure/components/TabNavigation.tsx
import React from 'react';
import { cn } from '../utils/cn';

interface Tab {
  id: string;
  label: string;
  icon?: string;
  count?: number;
}

interface TabNavigationProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

export const TabNavigation: React.FC<TabNavigationProps> = ({
  tabs,
  activeTab,
  onTabChange,
  className
}) => {
  return (
    <div className={cn('flex border-b border-gray-200', className)}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          className={cn(
            'px-4 py-2 border-b-2 font-medium text-sm transition-colors',
            activeTab === tab.id
              ? 'border-brand-primary text-brand-primary'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          )}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.icon && <i className={`fas fa-${tab.icon} mr-2`} />}
          {tab.label}
          {tab.count !== undefined && (
            <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
};
```

#### Step 5: Create useTabState Hook
```typescript
// File: frontend/src/infrastructure/hooks/useTabState.ts
import { useState, useCallback } from 'react';
import { TabStateService } from '../services/tabStateService';

export const useTabState = (tabGroup: string, defaultTab: string) => {
  const [activeTab, setActiveTab] = useState(() => 
    TabStateService.getTabState(tabGroup) || defaultTab
  );
  
  const changeTab = useCallback((tab: string) => {
    setActiveTab(tab);
    TabStateService.saveTabState(tabGroup, tab);
  }, [tabGroup]);
  
  return { activeTab, changeTab };
};
```

### Phase 2: User Dashboard Integration

#### Step 6: Modify GaugeInventoryPage
```typescript
// File: frontend/src/modules/gauge/pages/GaugeInventoryPage.tsx
// Add these imports at the top:
import { UserDashboard } from '../components/UserDashboard';
import { useTabState } from '../../../infrastructure/hooks/useTabState';

// Add these state variables inside the component:
const [showUserDashboard, setShowUserDashboard] = useState(false);
const { activeTab: activeDashboardTab, changeTab: onDashboardTabChange } = 
  useTabState('user-dashboard', 'personal');

// Add toggle button in header (find appropriate location):
<button 
  onClick={() => setShowUserDashboard(!showUserDashboard)}
  className="flex items-center px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-hover"
>
  <i className="fas fa-user mr-2"></i>
  My Dashboard
</button>

// Add conditional UserDashboard rendering:
{showUserDashboard && (
  <UserDashboard
    gauges={gauges}
    activeDashboardTab={activeDashboardTab}
    onTabChange={onDashboardTabChange}
    onNotification={showToast}
    onRefresh={refetch}
    renderGaugeRow={renderGaugeRow}
    currentUser={currentUser}
  />
)}
```

### Phase 3: Missing Modals

#### Step 7: Create TransferCancelConfirmModal
```typescript
// File: frontend/src/modules/gauge/components/TransferCancelConfirmModal.tsx
import React, { useState } from 'react';
import { Modal } from '../../../infrastructure/components/Modal';
import { Button } from '../../../infrastructure/components/Button';

interface TransferCancelConfirmModalProps {
  isOpen: boolean;
  transferId: string;
  gaugeId: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

export const TransferCancelConfirmModal: React.FC<TransferCancelConfirmModalProps> = ({
  isOpen,
  transferId,
  gaugeId,
  onConfirm,
  onCancel
}) => {
  const [reason, setReason] = useState('');

  const handleConfirm = () => {
    if (reason.trim()) {
      onConfirm(reason);
      setReason('');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onCancel} title="Cancel Transfer">
      <div className="space-y-4">
        <p>Are you sure you want to cancel the transfer for gauge {gaugeId}?</p>
        
        <div>
          <label className="block text-sm font-medium mb-1">
            Cancellation Reason
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full p-2 border rounded-md"
            rows={3}
            placeholder="Enter reason for cancellation..."
            required
          />
        </div>
        
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onCancel}>
            Keep Transfer Active
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleConfirm}
            disabled={!reason.trim()}
          >
            Cancel Transfer
          </Button>
        </div>
      </div>
    </Modal>
  );
};
```

#### Step 8: Create BulkUpdateModal
```typescript
// File: frontend/src/modules/gauge/components/BulkUpdateModal.tsx
import React, { useState } from 'react';
import { Modal } from '../../../infrastructure/components/Modal';
import { Button } from '../../../infrastructure/components/Button';
import { FormSelect } from '../../../infrastructure/components/FormSelect';
import { FormInput } from '../../../infrastructure/components/FormInput';

interface BulkUpdateData {
  criteria: string;
  criteriaValue: string;
  updateField: string;
  updateValue: string;
}

interface BulkUpdateModalProps {
  isOpen: boolean;
  onUpdate: (data: BulkUpdateData) => void;
  onCancel: () => void;
}

export const BulkUpdateModal: React.FC<BulkUpdateModalProps> = ({
  isOpen,
  onUpdate,
  onCancel
}) => {
  const [formData, setFormData] = useState<BulkUpdateData>({
    criteria: '',
    criteriaValue: '',
    updateField: '',
    updateValue: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(formData);
  };

  const updateField = (field: keyof BulkUpdateData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Modal isOpen={isOpen} onClose={onCancel} title="Bulk Update Gauges">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Filter Criteria</label>
          <FormSelect
            value={formData.criteria}
            onChange={(e) => updateField('criteria', e.target.value)}
            required
          >
            <option value="">Select criteria...</option>
            <option value="type">Gauge Type</option>
            <option value="location">Location</option>
            <option value="status">Status</option>
            <option value="ownership_type">Ownership Type</option>
          </FormSelect>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Criteria Value</label>
          <FormInput
            value={formData.criteriaValue}
            onChange={(e) => updateField('criteriaValue', e.target.value)}
            placeholder="Enter value to match..."
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Field to Update</label>
          <FormSelect
            value={formData.updateField}
            onChange={(e) => updateField('updateField', e.target.value)}
            required
          >
            <option value="">Select field...</option>
            <option value="location">Location</option>
            <option value="status">Status</option>
            <option value="calibration_frequency_days">Calibration Frequency</option>
            <option value="ownership_type">Ownership Type</option>
          </FormSelect>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">New Value</label>
          <FormInput
            value={formData.updateValue}
            onChange={(e) => updateField('updateValue', e.target.value)}
            placeholder="Enter new value..."
            required
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            Apply Bulk Update
          </Button>
        </div>
      </form>
    </Modal>
  );
};
```

### Phase 4: Admin Panel Enhancements

#### Step 9: Create SystemSettings Component
```typescript
// File: frontend/src/modules/admin/components/SystemSettings.tsx
import React from 'react';

export const SystemSettings: React.FC = () => {
  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-6">System Settings</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calibration Settings */}
        <div className="bg-white p-4 rounded-lg border">
          <h3 className="text-lg font-medium mb-4">Calibration Settings</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Default Calibration Frequency (Days)
              </label>
              <input
                type="number"
                defaultValue="365"
                className="w-full p-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Calibration Due Warning (Days)
              </label>
              <input
                type="number"
                defaultValue="30"
                className="w-full p-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Auto-assign QC Verification
              </label>
              <select className="w-full p-2 border rounded-md">
                <option value="true">Enabled</option>
                <option value="false">Disabled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Checkout Settings */}
        <div className="bg-white p-4 rounded-lg border">
          <h3 className="text-lg font-medium mb-4">Checkout Settings</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Default Checkout Duration (Days)
              </label>
              <input
                type="number"
                defaultValue="7"
                className="w-full p-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Allow Self Checkout
              </label>
              <select className="w-full p-2 border rounded-md">
                <option value="true">Enabled</option>
                <option value="false">Disabled</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Require Manager Approval
              </label>
              <select className="w-full p-2 border rounded-md">
                <option value="true">Required</option>
                <option value="false">Not Required</option>
              </select>
            </div>
          </div>
        </div>

        {/* System Maintenance */}
        <div className="bg-white p-4 rounded-lg border">
          <h3 className="text-lg font-medium mb-4">System Maintenance</h3>
          <div className="space-y-4">
            <button className="w-full p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
              <i className="fas fa-database mr-2"></i>
              Backup Database
            </button>
            <button className="w-full p-2 bg-green-600 text-white rounded-md hover:bg-green-700">
              <i className="fas fa-file-export mr-2"></i>
              Export Audit Logs
            </button>
            <button className="w-full p-2 bg-orange-600 text-white rounded-md hover:bg-orange-700">
              <i className="fas fa-broom mr-2"></i>
              Clear System Cache
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button className="px-6 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-hover">
          <i className="fas fa-save mr-2"></i>
          Save Settings
        </button>
      </div>
    </div>
  );
};
```

#### Step 10: Update AdminDashboard to Include SystemSettings
```typescript
// File: frontend/src/modules/admin/pages/AdminDashboard.tsx
// Add import at top:
import { SystemSettings } from '../components/SystemSettings';
import { useTabState } from '../../../infrastructure/hooks/useTabState';
import { TabNavigation } from '../../../infrastructure/components/TabNavigation';

// Add inside component:
const { activeTab, changeTab } = useTabState('admin-panel', 'overview');

const adminTabs = [
  { id: 'overview', label: 'Overview', icon: 'tachometer-alt' },
  { id: 'users', label: 'Users', icon: 'users' },
  { id: 'settings', label: 'Settings', icon: 'cog' },
  { id: 'reports', label: 'Reports', icon: 'chart-bar' }
];

// Replace existing JSX with:
<div className="admin-dashboard p-6">
  <div className="mb-8">
    <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
    <p className="text-gray-600 mt-2">System administration and management</p>
  </div>

  <TabNavigation 
    tabs={adminTabs}
    activeTab={activeTab}
    onTabChange={changeTab}
    className="mb-6"
  />

  {activeTab === 'overview' && (
    <>
      {/* Existing statistics cards */}
      {/* Existing quick actions */}
    </>
  )}

  {activeTab === 'settings' && <SystemSettings />}

  {/* Add other tab content as needed */}
</div>
```

## What Claude Code CANNOT Do

These require human intervention:

- Backend API development
- Database schema changes
- Server configuration
- External service integration
- Production deployment
- User acceptance testing
- Performance monitoring setup
- Security audits

## Execution Order

1. **Execute Steps 1-5**: Foundation files (can be done in any order)
2. **Execute Step 6**: UserDashboard integration (requires foundation)
3. **Execute Steps 7-8**: Missing modals (independent)
4. **Execute Steps 9-10**: Admin enhancements (independent)

Each step is a concrete file creation or modification that Claude Code can execute immediately.