// NavigationSection - Main navigation items with star favorites
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon, IconName } from '../Icon';
import { useNavigationState, useNavigationActions } from '../../store';
import { useFavorites } from './useFavorites';
import styles from './Sidebar.module.css';

interface NavItem {
  id: string;
  label: string;
  icon: IconName;
  route: string;
}

const DEFAULT_NAV_ITEMS: NavItem[] = [
  { id: 'gauge-management', label: 'Gauge Management', icon: 'wrench', route: '/gauges/' },
  { id: 'inventory', label: 'Inventory', icon: 'inbox', route: '/inventory' },
  { id: 'admin', label: 'Admin', icon: 'users-cog', route: '/admin' }
];

export const NavigationSection = () => {
  const navigate = useNavigate();
  const { currentPage } = useNavigationState();
  const { setCurrentPage } = useNavigationActions();
  const { favorites, addFavorite, removeFavorite } = useFavorites();

  // Local state for item order with localStorage persistence
  const [navItems, setNavItems] = useState<NavItem[]>(() => {
    const saved = localStorage.getItem('nav-items-order');
    if (saved) {
      try {
        const savedIds = JSON.parse(saved);
        return savedIds.map((id: string) => DEFAULT_NAV_ITEMS.find(item => item.id === id)).filter(Boolean);
      } catch {
        return DEFAULT_NAV_ITEMS;
      }
    }
    return DEFAULT_NAV_ITEMS;
  });

  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [dragOverItem, setDragOverItem] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | null>(null);

  const handleNavClick = (item: NavItem) => {
    setCurrentPage(item.id);
    navigate(item.route);
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

    const newOrder = [...navItems];
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
    setNavItems(newOrder);
    localStorage.setItem('nav-items-order', JSON.stringify(newOrder.map(item => item.id)));

    setDragOverItem(null);
    setDropPosition(null);
  };

  return (
    <div className={styles.section}>
      <div className={styles.sectionTitle}>NAVIGATION</div>
      <div className={styles.navItems}>
        {navItems.map((item) => {
          const showBlueLine = dragOverItem === item.id && draggedItem !== item.id;

          return (
            <div key={item.id}>
              {showBlueLine && dropPosition === 'before' && (
                <div className={styles.dropIndicator} />
              )}
              <div
                className={`${styles.navItem} ${currentPage === item.id ? styles.navItemActive : ''} ${draggedItem === item.id ? styles.dragging : ''}`}
                onClick={() => handleNavClick(item)}
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
                <div className={styles.navItemContent}>
                  <Icon name={item.icon} className={styles.navIcon} />
                  <span className={styles.navLabel}>{item.label}</span>
                </div>
                <span
                  className={styles.dragHandle}
                  draggable
                  onDragStart={(e) => handleDragStart(e, item.id)}
                  onDragEnd={handleDragEnd}
                  onClick={(e) => e.stopPropagation()}
                >⋮⋮</span>
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
