import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { adminService } from '../services/adminService';
import { LoadingSpinner, Button, DataTable, Badge, Modal } from '../../../infrastructure/components';
import type { DataTableColumn } from '../../../infrastructure/components';
import { useColumnManager } from '../../../infrastructure/hooks';
import { useLogger } from '../../../infrastructure/utils/logger';
import type { Facility, Building, Zone, CreateFacilityData, UpdateFacilityData, CreateBuildingData, UpdateBuildingData, CreateZoneData, UpdateZoneData } from '../types';
import { AddFacilityModal } from '../components/AddFacilityModal';
import { AddBuildingModal } from '../components/AddBuildingModal';
import { AddZoneModal } from '../components/AddZoneModal';
import styles from './OrganizationManagementPage.module.css';

interface HierarchyRow {
  id: string;
  level: 'facility' | 'building' | 'zone';
  entityId: number;
  code: string;
  name: string;
  parentId?: string;
  isActive: boolean;
  childCount: number;
  locationCount?: number;
  children?: HierarchyRow[];
  expanded?: boolean;
}

export const OrganizationManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const logger = useLogger('OrganizationManagement');
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Modal states
  const [showFacilityModal, setShowFacilityModal] = useState(false);
  const [showBuildingModal, setShowBuildingModal] = useState(false);
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Edit states
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'facility' | 'building' | 'zone';
    id: number;
    name: string;
  } | null>(null);

  const loadHierarchy = useCallback(async () => {
    try {
      setLoading(true);
      const [hierarchyData, buildingsData] = await Promise.all([
        adminService.getOrganizationHierarchy(),
        adminService.getBuildings()
      ]);
      setFacilities(hierarchyData);
      setBuildings(buildingsData);
    } catch (error) {
      logger.errorWithStack('Failed to load organization hierarchy', error instanceof Error ? error : new Error(String(error)));
    } finally {
      setLoading(false);
    }
  }, [logger]);

  useEffect(() => {
    loadHierarchy();
  }, [loadHierarchy]);

  // Facility handlers
  const handleAddFacility = useCallback(() => {
    setModalMode('create');
    setSelectedFacility(null);
    setShowFacilityModal(true);
  }, []);

  const handleEditFacility = useCallback((facility: Facility) => {
    setModalMode('edit');
    setSelectedFacility(facility);
    setShowFacilityModal(true);
  }, []);

  const handleSubmitFacility = async (data: CreateFacilityData | UpdateFacilityData) => {
    try {
      if (modalMode === 'create') {
        await adminService.createFacility(data as CreateFacilityData);
      } else if (selectedFacility) {
        await adminService.updateFacility(selectedFacility.id, data as UpdateFacilityData);
      }
      await loadHierarchy();
      setShowFacilityModal(false);
    } catch (error) {
      logger.errorWithStack(`Failed to ${modalMode} facility`, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  };

  // Building handlers
  const handleAddBuilding = useCallback(() => {
    setModalMode('create');
    setSelectedBuilding(null);
    setShowBuildingModal(true);
  }, []);

  const handleEditBuilding = useCallback((building: Building) => {
    setModalMode('edit');
    setSelectedBuilding(building);
    setShowBuildingModal(true);
  }, []);

  const handleSubmitBuilding = async (data: CreateBuildingData | UpdateBuildingData) => {
    try {
      if (modalMode === 'create') {
        await adminService.createBuilding(data as CreateBuildingData);
      } else if (selectedBuilding) {
        await adminService.updateBuilding(selectedBuilding.id, data as UpdateBuildingData);
      }
      await loadHierarchy();
      setShowBuildingModal(false);
    } catch (error) {
      logger.errorWithStack(`Failed to ${modalMode} building`, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  };

  // Zone handlers
  const handleAddZone = useCallback(() => {
    setModalMode('create');
    setSelectedZone(null);
    setShowZoneModal(true);
  }, []);

  const handleEditZone = useCallback((zone: Zone) => {
    setModalMode('edit');
    setSelectedZone(zone);
    setShowZoneModal(true);
  }, []);

  const handleSubmitZone = async (data: CreateZoneData | UpdateZoneData) => {
    try {
      if (modalMode === 'create') {
        await adminService.createZone(data as CreateZoneData);
      } else if (selectedZone) {
        await adminService.updateZone(selectedZone.id, data as UpdateZoneData);
      }
      await loadHierarchy();
      setShowZoneModal(false);
    } catch (error) {
      logger.errorWithStack(`Failed to ${modalMode} zone`, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  };

  // Delete handlers
  const handleDelete = useCallback((row: HierarchyRow) => {
    setDeleteTarget({
      type: row.level,
      id: row.entityId,
      name: row.name
    });
    setShowDeleteModal(true);
  }, []);

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      switch (deleteTarget.type) {
        case 'facility':
          await adminService.deleteFacility(deleteTarget.id);
          break;
        case 'building':
          await adminService.deleteBuilding(deleteTarget.id);
          break;
        case 'zone':
          await adminService.deleteZone(deleteTarget.id);
          break;
      }
      await loadHierarchy();
      setShowDeleteModal(false);
      setDeleteTarget(null);
    } catch (error) {
      logger.errorWithStack(`Failed to delete ${deleteTarget.type}`, error instanceof Error ? error : new Error(String(error)));
    }
  };

  // Convert hierarchy to flat table rows
  const hierarchyRows = useMemo((): HierarchyRow[] => {
    const rows: HierarchyRow[] = [];

    facilities.forEach(facility => {
      const facilityId = `f-${facility.id}`;
      const facilityExpanded = expandedRows.has(facilityId);

      // Add facility row
      rows.push({
        id: facilityId,
        level: 'facility',
        entityId: facility.id,
        code: facility.code,
        name: facility.name,
        isActive: facility.isActive,
        childCount: facility.buildingCount,
        expanded: facilityExpanded
      });

      // Add building rows if facility is expanded
      if (facilityExpanded && facility.buildings) {
        facility.buildings.forEach(building => {
          const buildingId = `b-${building.id}`;
          const buildingExpanded = expandedRows.has(buildingId);

          rows.push({
            id: buildingId,
            level: 'building',
            entityId: building.id,
            code: building.code,
            name: building.name,
            parentId: facilityId,
            isActive: building.isActive,
            childCount: building.zoneCount,
            expanded: buildingExpanded
          });

          // Add zone rows if building is expanded
          if (buildingExpanded && building.zones) {
            building.zones.forEach(zone => {
              const zoneId = `z-${zone.id}`;

              rows.push({
                id: zoneId,
                level: 'zone',
                entityId: zone.id,
                code: zone.code,
                name: zone.name,
                parentId: buildingId,
                isActive: zone.isActive,
                childCount: 0,
                locationCount: zone.locationCount
              });
            });
          }
        });
      }
    });

    return rows;
  }, [facilities, expandedRows]);

  const toggleRow = useCallback((rowId: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
      }
      return next;
    });
  }, []);

  const handleViewLocations = useCallback((zoneCode: string) => {
    navigate(`/inventory/locations?zone=${zoneCode}`);
  }, [navigate]);

  // Column definitions
  const columns: DataTableColumn[] = useMemo(() => [
    {
      id: 'hierarchy',
      label: 'ORGANIZATION HIERARCHY',
      visible: true,
      locked: true,
      align: 'left',
      render: (_, row: HierarchyRow) => {
        const indent = row.level === 'facility' ? 0 : row.level === 'building' ? 1 : 2;
        const hasChildren = row.level !== 'zone' && row.childCount > 0;
        const isExpanded = row.expanded;

        return (
          <div style={{ display: 'flex', alignItems: 'center', paddingLeft: `${indent * 24}px` }}>
            {hasChildren && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleRow(row.id);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  marginRight: '8px',
                  fontSize: '14px',
                  color: 'var(--color-text-secondary)',
                  padding: '4px'
                }}
                title={isExpanded ? 'Collapse' : 'Expand'}
              >
                {isExpanded ? '▼' : '▶'}
              </button>
            )}
            {!hasChildren && <span style={{ width: '22px', display: 'inline-block' }} />}

            <span style={{ marginRight: '8px' }}>
              {row.level === 'facility' && '🏢'}
              {row.level === 'building' && '🏛️'}
              {row.level === 'zone' && '📐'}
            </span>

            <div>
              <div style={{ fontWeight: 600 }}>{row.name}</div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                {row.code}
              </div>
            </div>
          </div>
        );
      }
    },
    {
      id: 'status',
      label: 'STATUS',
      visible: true,
      align: 'center',
      render: (_, row: HierarchyRow) => (
        <Badge variant={row.isActive ? 'success' : 'default'}>
          {row.isActive ? 'Active' : 'Inactive'}
        </Badge>
      )
    },
    {
      id: 'children',
      label: 'CHILDREN',
      visible: true,
      align: 'center',
      render: (_, row: HierarchyRow) => {
        if (row.level === 'facility') {
          return <span>{row.childCount} {row.childCount === 1 ? 'Building' : 'Buildings'}</span>;
        }
        if (row.level === 'building') {
          return <span>{row.childCount} {row.childCount === 1 ? 'Zone' : 'Zones'}</span>;
        }
        return <span>—</span>;
      }
    },
    {
      id: 'locations',
      label: 'STORAGE LOCATIONS',
      visible: true,
      align: 'center',
      render: (_, row: HierarchyRow) => {
        if (row.level === 'zone') {
          const count = row.locationCount || 0;
          return (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleViewLocations(row.code)}
              title="View locations in Inventory module"
            >
              📦 {count} {count === 1 ? 'Location' : 'Locations'}
            </Button>
          );
        }
        return <span>—</span>;
      }
    },
    {
      id: 'actions',
      label: 'ACTIONS',
      visible: true,
      align: 'right',
      render: (_, row: HierarchyRow) => {
        // Find the actual entity for edit
        let entity: Facility | Building | Zone | undefined;
        if (row.level === 'facility') {
          entity = facilities.find(f => f.id === row.entityId);
        } else if (row.level === 'building') {
          entity = buildings.find(b => b.id === row.entityId);
        } else if (row.level === 'zone') {
          const facility = facilities.find(f =>
            f.buildings?.some(b => b.zones?.some(z => z.id === row.entityId))
          );
          const building = facility?.buildings?.find(b =>
            b.zones?.some(z => z.id === row.entityId)
          );
          entity = building?.zones?.find(z => z.id === row.entityId);
        }

        return (
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (row.level === 'facility' && entity) {
                  handleEditFacility(entity as Facility);
                } else if (row.level === 'building' && entity) {
                  handleEditBuilding(entity as Building);
                } else if (row.level === 'zone' && entity) {
                  handleEditZone(entity as Zone);
                }
              }}
              title="Edit"
            >
              ✏️
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(row)}
              title="Delete"
            >
              🗑️
            </Button>
          </div>
        );
      }
    }
  ], [toggleRow, handleViewLocations, facilities, buildings, handleEditFacility, handleEditBuilding, handleEditZone, handleDelete]);

  // Column manager for table customization
  const columnManager = useColumnManager('organization-hierarchy', columns);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Organization Management</h1>
          <p className={styles.subtitle}>
            Manage your organizational hierarchy: Facilities → Buildings → Zones
          </p>
        </div>
        <div className={styles.headerActions}>
          <Button variant="secondary" onClick={handleAddZone}>
            + Add Zone
          </Button>
          <Button variant="secondary" onClick={handleAddBuilding}>
            + Add Building
          </Button>
          <Button variant="primary" onClick={handleAddFacility}>
            + Add Facility
          </Button>
        </div>
      </div>

      <div className={styles.infoBar}>
        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>Total Facilities:</span>
          <span className={styles.infoValue}>{facilities.length}</span>
        </div>
        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>Total Buildings:</span>
          <span className={styles.infoValue}>
            {facilities.reduce((sum, f) => sum + f.buildingCount, 0)}
          </span>
        </div>
        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>Total Zones:</span>
          <span className={styles.infoValue}>
            {facilities.reduce((sum, f) => sum + (f.buildings?.reduce((bSum, b) => bSum + b.zoneCount, 0) || 0), 0)}
          </span>
        </div>
      </div>

      <DataTable
        tableId="organization-hierarchy"
        data={hierarchyRows}
        columns={columns}
        columnManager={columnManager}
        resetKey={location.pathname}
        emptyMessage="No organizational units found. Add a facility to get started."
      />

      <div className={styles.note}>
        <strong>Note:</strong> Storage Locations are managed separately in the Inventory module.
        Click the location count badges to view and manage locations for each zone.
      </div>

      {/* Modals */}
      <AddFacilityModal
        isOpen={showFacilityModal}
        onClose={() => setShowFacilityModal(false)}
        onSubmit={handleSubmitFacility}
        facility={selectedFacility}
        mode={modalMode}
      />

      <AddBuildingModal
        isOpen={showBuildingModal}
        onClose={() => setShowBuildingModal(false)}
        onSubmit={handleSubmitBuilding}
        building={selectedBuilding}
        facilities={facilities}
        mode={modalMode}
      />

      <AddZoneModal
        isOpen={showZoneModal}
        onClose={() => setShowZoneModal(false)}
        onSubmit={handleSubmitZone}
        zone={selectedZone}
        buildings={buildings}
        mode={modalMode}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeleteTarget(null);
        }}
        title="Confirm Deletion"
        size="sm"
      >
        <div style={{ padding: 'var(--space-4)' }}>
          <p style={{ marginBottom: 'var(--space-4)' }}>
            Are you sure you want to delete the {deleteTarget?.type} "<strong>{deleteTarget?.name}</strong>"?
          </p>
          {deleteTarget?.type === 'facility' && (
            <p style={{ color: 'var(--color-error)', fontSize: 'var(--font-size-sm)' }}>
              ⚠️ This will also delete all buildings and zones within this facility.
            </p>
          )}
          {deleteTarget?.type === 'building' && (
            <p style={{ color: 'var(--color-error)', fontSize: 'var(--font-size-sm)' }}>
              ⚠️ This will also delete all zones within this building.
            </p>
          )}
          {deleteTarget?.type === 'zone' && (
            <p style={{ color: 'var(--color-warning)', fontSize: 'var(--font-size-sm)' }}>
              ⚠️ Storage locations in this zone will be unassigned (zone_id set to NULL).
            </p>
          )}
        </div>
        <div style={{
          padding: 'var(--space-4)',
          borderTop: '1px solid var(--color-border-default)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 'var(--space-3)'
        }}>
          <Button
            variant="ghost"
            onClick={() => {
              setShowDeleteModal(false);
              setDeleteTarget(null);
            }}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={confirmDelete}
          >
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default OrganizationManagementPage;
