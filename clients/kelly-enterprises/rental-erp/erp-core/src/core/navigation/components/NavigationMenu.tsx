import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { NavigationItem } from '../types.js'

export interface NavigationMenuProps {
  items: NavigationItem[]
  className?: string
  orientation?: 'horizontal' | 'vertical'
  collapsible?: boolean
  defaultExpanded?: boolean
}

/**
 * Navigation Menu Component
 * Renders a hierarchical navigation menu with support for nested items
 */
export const NavigationMenu: React.FC<NavigationMenuProps> = ({
  items,
  className = 'nav-menu',
  orientation = 'vertical',
  collapsible = true,
  defaultExpanded = true
}) => {
  const location = useLocation()
  const [expandedItems, setExpandedItems] = useState<Set<string>>(
    defaultExpanded ? new Set(items.map(item => item.path)) : new Set()
  )
  
  const toggleExpanded = (path: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(path)) {
        newSet.delete(path)
      } else {
        newSet.add(path)
      }
      return newSet
    })
  }
  
  const isActive = (path: string): boolean => {
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }
  
  const renderNavigationItem = (item: NavigationItem, level: number = 0): React.ReactNode => {
    const hasChildren = item.children && item.children.length > 0
    const isExpanded = expandedItems.has(item.path)
    const Icon = item.icon
    const active = isActive(item.path)
    
    return (
      <li key={item.path} className={`nav-item level-${level} ${active ? 'active' : ''}`}>
        <div className="nav-item-content">
          <Link
            to={item.path}
            className={`nav-link ${active ? 'active' : ''}`}
            aria-current={active ? 'page' : undefined}
          >
            {Icon && typeof Icon === 'string' ? (
              <i className={`nav-icon ${Icon}`}></i>
            ) : Icon ? (
              <span className="nav-icon"><Icon /></span>
            ) : null}
            <span className="nav-label">{item.label}</span>
            {item.badge !== undefined && (
              <span className="nav-badge">{item.badge}</span>
            )}
          </Link>
          {hasChildren && collapsible && (
            <button
              className="nav-toggle"
              onClick={() => toggleExpanded(item.path)}
              aria-expanded={isExpanded}
              aria-label={`Toggle ${item.label}`}
            >
              <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'}`}></i>
            </button>
          )}
        </div>
        {hasChildren && (!collapsible || isExpanded) && (
          <ul className="nav-submenu">
            {item.children!.map(child => renderNavigationItem(child, level + 1))}
          </ul>
        )}
      </li>
    )
  }
  
  return (
    <nav className={`${className} ${orientation}`}>
      <ul className="nav-list">
        {items.map(item => renderNavigationItem(item))}
      </ul>
    </nav>
  )
}