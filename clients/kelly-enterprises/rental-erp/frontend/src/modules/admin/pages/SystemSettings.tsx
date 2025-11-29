import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../services/adminService';
import { LoadingSpinner, Button, FormInput, FormSelect, FormTextarea, Badge, Modal, Icon } from '../../../infrastructure/components';
import { SystemSettings as SystemSettingsType } from '../types';
import { useLogger } from '../../../infrastructure/utils/logger';
import { TextFormatRules } from '../../../infrastructure/business/textFormatRules';

export const SystemSettings: React.FC = () => {
  const navigate = useNavigate();
  const logger = useLogger('SystemSettings');
  const [settings, setSettings] = useState<SystemSettingsType[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSettings, setEditingSettings] = useState<Record<string, string>>({});
  
  // Maintenance tools state
  const [maintenanceLoading, setMaintenanceLoading] = useState<Record<string, boolean>>({});
  const [_maintenanceResults, _setMaintenanceResults] = useState<Record<string, any>>({});
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [selectedMaintenanceResult, setSelectedMaintenanceResult] = useState<{title: string; data: any} | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const settingsData = await adminService.getSystemSettings();
      setSettings(settingsData);
      
      // Initialize editing state
      const initialEditState = settingsData.reduce((acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {} as Record<string, string>);
      setEditingSettings(initialEditState);
    } catch (error) {
      console.error('Failed to load system settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (key: string, value: string) => {
    setEditingSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSaveSetting = async (key: string) => {
    try {
      const newValue = editingSettings[key];
      await adminService.updateSystemSetting(key, newValue);
      
      // Update local state
      setSettings(prev => 
        prev.map(setting => 
          setting.key === key 
            ? { ...setting, value: newValue, updatedAt: new Date().toISOString() }
            : setting
        )
      );
    } catch (error) {
      console.error('Failed to save setting:', error);
      // Reset to original value on error
      const originalSetting = settings.find(s => s.key === key);
      if (originalSetting) {
        setEditingSettings(prev => ({
          ...prev,
          [key]: originalSetting.value
        }));
      }
    }
  };

  const renderSettingInput = (setting: SystemSettingsType) => {
    const value = editingSettings[setting.key] || setting.value;

    switch (setting.type) {
      case 'boolean':
        return (
          <FormSelect
            value={value}
            onChange={(e) => handleSettingChange(setting.key, e.target.value)}
          >
            <option value="true">True</option>
            <option value="false">False</option>
          </FormSelect>
        );

      case 'number':
        return (
          <FormInput
            type="number"
            value={value}
            onChange={(e) => handleSettingChange(setting.key, e.target.value)}
          />
        );

      case 'json':
        return (
          <FormTextarea
            value={value}
            onChange={(e) => handleSettingChange(setting.key, e.target.value)}
            style={{
              width: '100%'
            }}
            rows={4}
            placeholder="Enter valid JSON..."
          />
        );

      default:
        return (
          <FormInput
            type="text"
            value={value}
            onChange={(e) => handleSettingChange(setting.key, e.target.value)}
          />
        );
    }
  };

  // Maintenance tool functions
  const handleMaintenanceAction = async (action: string, actionFunction: () => Promise<any>, title: string) => {
    try {
      setMaintenanceLoading(prev => ({ ...prev, [action]: true }));
      const result = await actionFunction();
      setMaintenanceResults(prev => ({ ...prev, [action]: result }));
      setSelectedMaintenanceResult({ title, data: result });
      setShowMaintenanceModal(true);
      logger.info(`Maintenance action ${action} completed successfully`);
    } catch (error) {
      logger.errorWithStack(`Maintenance action ${action} failed`, error instanceof Error ? error : new Error(String(error)));
      setSelectedMaintenanceResult({ 
        title: `${title} - Error`, 
        data: { error: error instanceof Error ? error.message : String(error) } 
      });
      setShowMaintenanceModal(true);
    } finally {
      setMaintenanceLoading(prev => ({ ...prev, [action]: false }));
    }
  };

  const maintenanceActions = [
    {
      key: 'gauge-status-report',
      title: 'Gauge Status Report',
      description: 'Generate comprehensive gauge status report for analysis',
      action: () => adminService.getGaugeStatusReport(),
      variant: 'secondary' as const
    },
    {
      key: 'update-statuses',
      title: 'Update Gauge Statuses',
      description: 'Manually trigger status update for all gauges',
      action: () => adminService.updateGaugeStatuses(),
      variant: 'primary' as const
    },
    {
      key: 'status-inconsistencies',
      title: 'Check Status Inconsistencies',
      description: 'Scan for data inconsistencies in gauge statuses',
      action: () => adminService.getStatusInconsistencies(),
      variant: 'secondary' as const
    },
    {
      key: 'system-users',
      title: 'System Users Report',
      description: 'List all system users (sanitized)',
      action: () => adminService.getSystemUsers(),
      variant: 'secondary' as const
    },
    {
      key: 'seed-test-data',
      title: 'Seed Test Data',
      description: 'Create test data for development (non-production only)',
      action: () => adminService.seedTestData(),
      variant: 'danger' as const
    }
  ];

  // Group settings by module
  const groupedSettings = settings.reduce((acc, setting) => {
    if (!acc[setting.module]) {
      acc[setting.module] = [];
    }
    acc[setting.module].push(setting);
    return acc;
  }, {} as Record<string, SystemSettingsType[]>);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div style={{ padding: 'var(--space-6)', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
          <Button
            onClick={() => navigate(-1)}
            variant="secondary"
            size="sm"
            style={{ padding: 'var(--space-2)' }}
          >
            <Icon name="arrow-left" />
          </Button>
          <h1 style={{ margin: 0, fontSize: 'var(--font-size-2xl)', fontWeight: '700', color: 'white' }}>
            System Settings
          </h1>
        </div>
        <p style={{ margin: 0, color: 'var(--color-text-primary)' }}>
          Configure system-wide settings and preferences
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {Object.entries(groupedSettings).map(([module, moduleSettings]) => (
          <div key={module} style={{
            background: 'white',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: 'var(--space-5)',
              borderBottom: '1px solid var(--color-border)'
            }}>
              <h2 style={{
                margin: 0,
                fontSize: 'var(--font-size-xl)',
                fontWeight: '600'
              }}>{module} Settings</h2>
            </div>

            <div style={{ padding: 'var(--space-5)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                {moduleSettings.map((setting) => {
                  const hasChanges = editingSettings[setting.key] !== setting.value;

                  return (
                    <div
                      key={setting.key}
                      style={{
                        padding: 'var(--space-4)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-border)',
                        backgroundColor: 'var(--color-background)'
                      }}
                    >
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 'var(--space-4)', alignItems: 'start' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                            <h3 style={{ margin: 0, fontSize: 'var(--font-size-lg)', fontWeight: '600' }}>
                              {TextFormatRules.formatSettingKey(setting.key)}
                            </h3>
                            <Badge variant="secondary" size="sm">
                              {setting.type}
                            </Badge>
                          </div>
                          <p style={{ margin: '0 0 var(--space-2) 0', color: 'var(--color-text-primary)' }}>
                            {setting.description}
                          </p>
                          <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)' }}>
                            Last updated: {new Date(setting.updatedAt).toLocaleString()} by {setting.updatedBy}
                          </p>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                          {renderSettingInput(setting)}

                          {hasChanges && (
                            <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
                              <Button
                                onClick={() => handleSettingChange(setting.key, setting.value)}
                                size="sm"
                                variant="secondary"
                              >
                                Reset
                              </Button>
                              <Button
                                onClick={() => handleSaveSetting(setting.key)}
                                size="sm"
                              >
                                Save
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}

        {/* System Maintenance Tools */}
        <div style={{
          background: 'white',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: 'var(--space-5)',
            borderBottom: '1px solid var(--color-border)'
          }}>
            <h2 style={{
              margin: 0,
              fontSize: 'var(--font-size-xl)',
              fontWeight: '600'
            }}>System Maintenance Tools</h2>
          </div>
          <div style={{ padding: 'var(--space-5)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-4)' }}>
              {maintenanceActions.map((tool) => (
                <div
                  key={tool.key}
                  style={{
                    padding: 'var(--space-4)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-background)'
                  }}
                >
                  <h4 style={{ margin: '0 0 var(--space-2) 0', fontSize: 'var(--font-size-lg)', fontWeight: '600' }}>
                    {tool.title}
                  </h4>
                  <p style={{ margin: '0 0 var(--space-3) 0', color: 'var(--color-text-primary)', fontSize: 'var(--font-size-sm)' }}>
                    {tool.description}
                  </p>
                  <Button
                    onClick={() => handleMaintenanceAction(tool.key, tool.action, tool.title)}
                    disabled={maintenanceLoading[tool.key]}
                    variant={tool.variant}
                    size="sm"
                  >
                    {maintenanceLoading[tool.key] ? 'Running...' : 'Execute'}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Maintenance Results Modal */}
      {showMaintenanceModal && selectedMaintenanceResult && (
        <Modal
          isOpen={showMaintenanceModal}
          onClose={() => setShowMaintenanceModal(false)}
          title={selectedMaintenanceResult.title}
          size="lg"
        >
          <div style={{ padding: 'var(--space-4)' }}>
            <pre style={{ 
              backgroundColor: 'var(--color-gray-50)', 
              padding: 'var(--space-3)', 
              borderRadius: 'var(--radius-sm)',
              fontSize: 'var(--font-size-sm)',
              overflow: 'auto',
              maxHeight: '400px'
            }}>
              {JSON.stringify(selectedMaintenanceResult.data, null, 2)}
            </pre>
          </div>
        </Modal>
      )}

      {Object.keys(groupedSettings).length === 0 && (
        <div style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
          <div style={{ color: 'var(--color-text-primary)' }}>No system settings found.</div>
        </div>
      )}
    </div>
  );
};