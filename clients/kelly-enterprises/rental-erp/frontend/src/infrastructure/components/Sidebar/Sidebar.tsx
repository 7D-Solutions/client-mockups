// Sidebar - Main navigation component with favorites and contextual sections
import { useNavigationState } from '../../store';
import { FavoritesSection } from './FavoritesSection';
import { NavigationSection } from './NavigationSection';
import { ContextualSection } from './ContextualSection';
import styles from './Sidebar.module.css';

export const Sidebar = () => {
  const { currentPage } = useNavigationState();

  return (
    <aside className={styles.sidebar}>
      {/* My Favorites Section - Always visible */}
      <FavoritesSection />

      {/* Main Navigation Section - Always visible */}
      <NavigationSection />

      {/* Contextual Section - Changes based on current page */}
      <ContextualSection currentPage={currentPage} />
    </aside>
  );
};
