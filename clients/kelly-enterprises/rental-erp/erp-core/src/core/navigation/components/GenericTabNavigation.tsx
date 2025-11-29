import React from 'react'
import { NavigationItem } from '../types.js'

export interface TabNavigationProps {
  items: NavigationItem[]
  activeTab: string
  onTabChange: (tab: string) => void
  className?: string
  showBadges?: boolean
}

/**
 * Tab Navigation Component
 * Renders a tab-based navigation with support for badges and permissions
 */
export const GenericTabNavigation: React.FC<TabNavigationProps> = ({
  items,
  activeTab,
  onTabChange,
  className = 'main-tabs',
  showBadges = true
}) => {
  return (
    <nav className={className}>
      {items.map((item) => {
        const Icon = item.icon
        const isActive = activeTab === item.path || activeTab === item.label
        
        return (
          <button
            key={item.path}
            className={`tab-button ${isActive ? 'active' : ''}`}
            onClick={() => onTabChange(item.path)}
            aria-current={isActive ? 'page' : undefined}
          >
            {Icon && typeof Icon === 'string' ? (
              <i className={Icon}></i>
            ) : Icon ? (
              <Icon />
            ) : null}
            <span>{item.label}</span>
            {showBadges && item.badge !== undefined && (
              <span className="badge">{item.badge}</span>
            )}
          </button>
        )
      })}
    </nav>
  )
}