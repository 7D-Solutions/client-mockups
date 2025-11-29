// ContextualSection - Dynamic sections that change based on current page
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Badge } from '../Badge';
import { Icon, IconName } from '../Icon';
import { useFavorites } from './useFavorites';
import { useBadgeCounts } from './useBadgeCounts';
import { usePermissions } from '../../auth/usePermissions';
import { eventBus } from '../../events';
import styles from './Sidebar.module.css';

interface ContextualItem {
  id: string;
  label: string;
  route?: string;
  badgeKey?: string;
  icon?: string;
  requiredPermission?: string; // Optional permission requirement
}

const CONTEXTUAL_ITEMS: Record<string, { title: string; icon: string; items: ContextualItem[] }> = {
  'gauge-management': {
    title: 'GAUGE MANAGEMENT',
    icon: 'wrench',
    items: [
      { id: 'gauge-management-home', label: 'All Gauges', route: '/gauges/', icon: 'home' },
      { id: 'my-gauges', label: 'My Gauges', route: '/gauges/my-gauges', badgeKey: 'alerts', icon: 'user' },
      { id: 'calibration-management', label: 'Calibration', route: '/gauges/calibration-management', badgeKey: 'calibrationDue', icon: 'calendar-alt' },
      { id: 'returned-customer-gauges', label: 'Returned Customer Gauges', route: '/gauges/returned-customer-gauges', icon: 'user-times', requiredPermission: 'gauge.view.access' },
      { id: 'thread-gauges', label: 'Thread Gauges', route: '/gauges/?equipment_type=thread_gauge', icon: 'ruler' },
      { id: 'large-equipment', label: 'Large Equipment', route: '/gauges/?equipment_type=large_equipment', icon: 'cogs' },
      { id: 'hand-tools', label: 'Hand Tools', route: '/gauges/?equipment_type=hand_tool', icon: 'hammer' },
      { id: 'calibration-standards', label: 'Calibration Standards', route: '/gauges/?equipment_type=calibration_standard', icon: 'ruler-combined' }
    ]
  },
  'inventory': {
    title: 'INVENTORY',
    icon: 'inbox',
    items: [
      { id: 'inventory-home', label: 'All Inventory', route: '/inventory', icon: 'home' },
      { id: 'storage-locations', label: 'Storage Locations', route: '/inventory/locations', icon: 'map-marker-alt' },
      { id: 'organization', label: 'Organization', route: '/inventory/organization', icon: 'sitemap' }
    ]
  },
  'admin': {
    title: 'ADMIN',
    icon: 'users-cog',
    items: [
      { id: 'user-management', label: 'User Management', route: '/admin/users', icon: 'users' },
      { id: 'reports', label: 'Reports', route: '/admin/reports', icon: 'chart-bar' },
      { id: 'system-settings', label: 'System Settings', route: '/admin/settings', icon: 'cog' },
      { id: 'site-index', label: 'Site Index', route: '/admin/site-index', icon: 'sitemap' }
    ]
  }
};

interface ContextualSectionProps {
  currentPage: string;
}

export const ContextualSection = ({ currentPage }: ContextualSectionProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { favorites, addFavorite, removeFavorite } = useFavorites();
  const { counts } = useBadgeCounts();
  const { hasPermission, permissions } = usePermissions();

  const contextual = CONTEXTUAL_ITEMS[currentPage];

  // Local state for item order with localStorage persistence per section
  const [items, setItems] = useState<ContextualItem[]>([]);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [dragOverItem, setDragOverItem] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | null>(null);

  // Initialize items from localStorage or default
  useEffect(() => {
    if (!contextual) {
      setItems([]);
      return;
    }

    // Helper to check if user has required permission for an item
    const hasRequiredPermission = (item: ContextualItem): boolean => {
      if (!item.requiredPermission) {
        return true; // No permission requirement
      }
      return hasPermission(item.requiredPermission);
    };

    // Filter items based on user permissions
    const filteredItems = contextual.items.filter(hasRequiredPermission);

    const storageKey = `contextual-items-order-${currentPage}`;
    const saved = localStorage.getItem(storageKey);

    if (saved) {
      try {
        const savedIds = JSON.parse(saved);
        const orderedItems = savedIds
          .map((id: string) => filteredItems.find(item => item.id === id))
          .filter(Boolean);

        // If localStorage has fewer items than filtered defaults, reset to filtered defaults
        if (orderedItems.length < filteredItems.length) {
          setItems(filteredItems);
          localStorage.setItem(storageKey, JSON.stringify(filteredItems.map(item => item.id)));
        } else {
          setItems(orderedItems);
        }
      } catch {
        setItems(filteredItems);
      }
    } else {
      setItems(filteredItems);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, contextual, permissions]);

  if (!contextual) {
    return null;
  }

  const handleItemClick = (item: ContextualItem) => {
    // Handle special modal-based items
    if (item.id === 'pending-qc') {
      eventBus.emit('modal:open', { type: 'qc-approvals' });
      return;
    }

    if (item.id === 'out-of-service') {
      eventBus.emit('modal:open', { type: 'out-of-service-review' });
      return;
    }

    // Default: navigate to route
    if (item.route) {
      navigate(item.route);
    }
  };

  const handleStarClick = (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation(); // Prevent navigation

    if (favorites.includes(itemId)) {
      removeFavorite(itemId);
    } else {
      addFavorite(itemId);
    }
  };

  const isFavorited = (itemId: string) => favorites.includes(itemId);

  const isActive = (item: ContextualItem) => {
    if (!item.route) return false;

    const currentPath = location.pathname;
    const currentSearch = location.search;
    const currentHash = location.hash;
    const currentFullPath = `${currentPath}${currentSearch}${currentHash}`;

    // Split route into path, query, and hash
    const [routePath] = item.route.split(/[?#]/);
    const hasRouteQuery = item.route.includes('?');
    const hasRouteHash = item.route.includes('#');

    // If route has query params or hash, require exact match of full URL
    if (hasRouteQuery || hasRouteHash) {
      return currentFullPath === item.route;
    }

    // For plain routes (no query/hash), only match when:
    // 1. Path matches exactly
    // 2. Current URL also has no query or hash
    return currentPath === routePath && !currentSearch && !currentHash;
  };

  const handleDragStart = (e: React.DragEvent, itemId: string) => {
    setDraggedItem(itemId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', itemId);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverItem(null);
    setDropPosition(null);
  };

  const handleDragOver = (e: React.DragEvent, itemId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    if (draggedItem === itemId) {
      setDragOverItem(null);
      setDropPosition(null);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    const position = e.clientY < midpoint ? 'before' : 'after';

    setDragOverItem(itemId);
    setDropPosition(position);
  };

  const handleDragLeave = () => {
    setDragOverItem(null);
    setDropPosition(null);
  };

  const handleDrop = (e: React.DragEvent, targetItemId: string) => {
    e.preventDefault();

    if (!draggedItem || draggedItem === targetItemId) {
      return;
    }

    const newOrder = [...items];
    const draggedIndex = newOrder.findIndex(item => item.id === draggedItem);
    const targetIndex = newOrder.findIndex(item => item.id === targetItemId);

    if (draggedIndex === -1 || targetIndex === -1) {
      return;
    }

    // Remove dragged item
    const [removed] = newOrder.splice(draggedIndex, 1);

    // Calculate new insert position
    let insertIndex = targetIndex;
    if (dropPosition === 'after') {
      insertIndex = targetIndex + 1;
    }

    // Adjust if we removed an item before the target
    if (draggedIndex < targetIndex) {
      insertIndex--;
    }

    // Insert at new position
    newOrder.splice(insertIndex, 0, removed);

    // Update state and localStorage
    setItems(newOrder);
    const storageKey = `contextual-items-order-${currentPage}`;
    localStorage.setItem(storageKey, JSON.stringify(newOrder.map(item => item.id)));

    setDragOverItem(null);
    setDropPosition(null);
  };

  return (
    <div className={styles.section}>
      <div className={styles.sectionTitle}>
        <Icon name={contextual.icon as IconName} /> {contextual.title}
      </div>
      <div className={styles.contextualItems}>
        {items.map((item) => {
          const badgeCount = item.badgeKey ? counts[item.badgeKey as keyof typeof counts] : null;
          const showBlueLine = dragOverItem === item.id && draggedItem !== item.id;

          return (
            <div key={item.id}>
              {showBlueLine && dropPosition === 'before' && (
                <div className={styles.dropIndicator} />
              )}
              <div
                className={`${styles.contextualItem} ${isActive(item) ? styles.navItemActive : ''} ${draggedItem === item.id ? styles.dragging : ''}`}
                onClick={() => handleItemClick(item)}
                onDragOver={(e) => handleDragOver(e, item.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, item.id)}
              >
                <button
                  className={styles.starButton}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStarClick(e, item.id);
                  }}
                  aria-label={isFavorited(item.id) ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <span className={styles.starIcon}>
                    {isFavorited(item.id) ? '★' : '☆'}
                  </span>
                </button>
                <div className={styles.contextualItemContent}>
                  {item.icon && (
                    <Icon name={item.icon as IconName} className={styles.contextualIcon} />
                  )}
                  <span className={styles.contextualLabel}>{item.label}</span>
                </div>
                <div className={styles.navItemRight}>
                  {badgeCount !== null && badgeCount > 0 && (
                    <Badge variant="danger" size="xs" count>{badgeCount}</Badge>
                  )}
                  <span
                    className={styles.dragHandle}
                    draggable
                    onDragStart={(e) => handleDragStart(e, item.id)}
                    onDragEnd={handleDragEnd}
                    onClick={(e) => e.stopPropagation()}
                  >⋮⋮</span>
                </div>
              </div>
              {showBlueLine && dropPosition === 'after' && (
                <div className={styles.dropIndicator} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
