import React from 'react'
import { Link } from 'react-router-dom'
import { useBreadcrumbs } from '../hooks.js'

export interface BreadcrumbNavigationProps {
  className?: string
  separator?: React.ReactNode
  maxItems?: number
}

/**
 * Breadcrumb Navigation Component
 * Automatically generates breadcrumbs based on current route
 */
export const BreadcrumbNavigation: React.FC<BreadcrumbNavigationProps> = ({
  className = 'breadcrumb-nav',
  separator = '/',
  maxItems
}) => {
  const breadcrumbs = useBreadcrumbs()
  
  // Apply max items limit if specified
  let displayBreadcrumbs = breadcrumbs
  if (maxItems && breadcrumbs.length > maxItems) {
    displayBreadcrumbs = [
      breadcrumbs[0],
      { label: '...', path: '' },
      ...breadcrumbs.slice(-(maxItems - 2))
    ]
  }
  
  return (
    <nav className={className} aria-label="Breadcrumb">
      <ol className="breadcrumb-list">
        {displayBreadcrumbs.map((crumb, index) => {
          const isLast = index === displayBreadcrumbs.length - 1
          const isEllipsis = crumb.label === '...'
          
          return (
            <li key={`${crumb.path}-${index}`} className="breadcrumb-item">
              {isEllipsis ? (
                <span className="breadcrumb-ellipsis">{crumb.label}</span>
              ) : isLast ? (
                <span className="breadcrumb-current" aria-current="page">
                  {crumb.label}
                </span>
              ) : (
                <Link to={crumb.path} className="breadcrumb-link">
                  {crumb.label}
                </Link>
              )}
              {!isLast && (
                <span className="breadcrumb-separator" aria-hidden="true">
                  {separator}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}