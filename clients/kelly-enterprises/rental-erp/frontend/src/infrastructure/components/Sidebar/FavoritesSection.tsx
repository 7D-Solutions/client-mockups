// FavoritesSection - Drag-and-drop favorites with smart blue line indicator
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNavigationActions } from '../../store';
import { useFavorites } from './useFavorites';
import { useBadgeCounts } from './useBadgeCounts';
import { Badge } from '../Badge';
import styles from './Sidebar.module.css';

// All navigation items with their metadata
const ALL_NAV_ITEMS: Record<string, { label: string; route?: string; badgeKey?: string }> = {
  // Main Navigation
  'gauge-management': { label: 'Gauge Management', route: '/gauges' },
  'inventory': { label: 'Inventory', route: '/inventory' },
  'my-gauges': { label: 'My Gauges', route: '/gauges/my-gauges' },
  'admin': { label: 'Admin', route: '/admin' },

  // Gauge Operations Context
  'pending-qc': { label: 'Pending QC', route: '/gauges?filter=pending-qc', badgeKey: 'pendingQC' },
  'out-of-service': { label: 'Out of Service', route: '/gauges?filter=out-of-service', badgeKey: 'outOfService' },
  'calibration-due': { label: 'Calibration Due', route: '/gauges?filter=calibration-due', badgeKey: 'calibrationDue' },
  'checked-out': { label: 'Checked Out', route: '/gauges?filter=checked-out', badgeKey: 'checkedOut' },

  // Inventory Context
  'low-stock': { label: 'Low Stock', route: '/inventory?filter=low-stock', badgeKey: 'lowStock' },
  'pending-orders': { label: 'Pending Orders', route: '/inventory?filter=pending-orders', badgeKey: 'pendingOrders' },
  'recent-receipts': { label: 'Recent Receipts', route: '/inventory#receipts' },
  'stock-adjustments': { label: 'Stock Adjustments', route: '/inventory#adjustments' },
  'categories': { label: 'Categories', route: '/inventory#categories' },

  // My Gauges Context (removed - these items no longer exist as contextual items)
  // 'my-checkouts': { label: 'My Checkouts', route: '/gauges/my-gauges#checkouts', badgeKey: 'myCheckouts' },
  // 'alerts': { label: 'Alerts', route: '/gauges/my-gauges#alerts', badgeKey: 'alerts' },
  // 'recent-activity': { label: 'Recent Activity', route: '/gauges/my-gauges#activity' },

  // Admin Context
  'user-management': { label: 'User Management', route: '/admin/users' },
  'gauge-types': { label: 'Gauge Types', route: '/admin/gauge-types' },
  'locations': { label: 'Locations', route: '/admin/locations' },
  'calibration-settings': { label: 'Calibration', route: '/admin/calibration' },
  'reports': { label: 'Reports', route: '/admin/reports' },
  'system-settings': { label: 'System Settings', route: '/admin/settings' }
};

// Badge key mapping (convert item IDs to badge count keys)
const BADGE_KEY_MAP: Record<string, string> = {
  'pending-qc': 'pendingQC',
  'out-of-service': 'outOfService',
  'calibration-due': 'calibrationDue',
  'checked-out': 'checkedOut',
  'low-stock': 'lowStock',
  'pending-orders': 'pendingOrders',
  'my-checkouts': 'myCheckouts',
  'alerts': 'alerts'
};

export const FavoritesSection = () => {
  const navigate = useNavigate();
  const { setCurrentPage } = useNavigationActions();
  const { favorites, reorderFavorites, removeFavorite } = useFavorites();
  const { counts } = useBadgeCounts();

  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [dragOverItem, setDragOverItem] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | null>(null);

  const handleFavoriteClick = (itemId: string) => {
    const item = ALL_NAV_ITEMS[itemId];
    if (item?.route) {
      // Update current page based on route
      const pageMap: Record<string, string> = {
        '/gauges': 'gauge-management',
        '/inventory': 'inventory',
        '/admin': 'admin'
      };

      const basePath = item.route.split('?')[0].split('#')[0];
      const page = pageMap[basePath] || 'gauge-management';
      setCurrentPage(page);

      navigate(item.route);
    }
  };

  const handleRemoveFavorite = (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation(); // Prevent navigation click
    removeFavorite(itemId);
  };

  const handleDragStart = (e: React.DragEvent, itemId: string) => {
    setDraggedItem(itemId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', itemId);

    // Make the dragged element semi-transparent
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
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

    const newOrder = [...favorites];
    const draggedIndex = newOrder.indexOf(draggedItem);
    const targetIndex = newOrder.indexOf(targetItemId);

    if (draggedIndex === -1 || targetIndex === -1) {
      return;
    }

    // Remove dragged item
    newOrder.splice(draggedIndex, 1);

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
    newOrder.splice(insertIndex, 0, draggedItem);

    // Only reorder if position actually changed
    if (JSON.stringify(newOrder) !== JSON.stringify(favorites)) {
      reorderFavorites(newOrder);
    }

    setDragOverItem(null);
    setDropPosition(null);
  };

  if (favorites.length === 0) {
    return (
      <div className={styles.section}>
        <div className={styles.sectionTitle}>⭐ MY FAVORITES</div>
        <div className={styles.emptyState}>
          Click ☆ to add items.
        </div>
      </div>
    );
  }

  return (
    <div className={styles.section}>
      <div className={styles.sectionTitle}>⭐ MY FAVORITES</div>
      <div className={styles.favoritesItems}>
        {favorites.map((itemId) => {
          const item = ALL_NAV_ITEMS[itemId];
          if (!item) return null;

          const badgeKey = BADGE_KEY_MAP[itemId];
          const badgeCount = badgeKey ? counts[badgeKey as keyof typeof counts] : null;
          const showBlueLine = dragOverItem === itemId && draggedItem !== itemId;

          return (
            <div key={itemId}>
              {showBlueLine && dropPosition === 'before' && (
                <div className={styles.dropIndicator} />
              )}
              <div
                className={`${styles.favoriteItem} ${draggedItem === itemId ? styles.dragging : ''}`}
                onDragOver={(e) => handleDragOver(e, itemId)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, itemId)}
                onClick={() => handleFavoriteClick(itemId)}
              >
                <button
                  className={styles.starButton}
                  onClick={(e) => handleRemoveFavorite(e, itemId)}
                  aria-label="Remove from favorites"
                >
                  <span className={styles.starIcon}>★</span>
                </button>
                <span className={styles.favoriteLabel}>{item.label}</span>
                <div className={styles.navItemRight}>
                  {badgeCount !== null && badgeCount > 0 && (
                    <Badge variant="danger" size="xs" count>{badgeCount}</Badge>
                  )}
                  <span
                    className={styles.dragHandle}
                    draggable
                    onDragStart={(e) => handleDragStart(e, itemId)}
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
