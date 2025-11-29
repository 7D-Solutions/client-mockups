import React from 'react'

interface MainNavProps {
  activeTab: string
  userRole: string
  onTabChange: (tab: string) => void
  onResetScroll: () => void
  onResetFilters: () => void
}

export function MainNav({ activeTab, userRole, onTabChange, onResetScroll, onResetFilters }: MainNavProps) {
  return (
    <nav className="main-nav">
      <button 
        className={`nav-tab first ${activeTab === 'gauge-management' ? 'active' : ''}`}
        onClick={() => {
          onTabChange('gauge-management')
          onResetScroll()
        }}
      >
        <i className="fas fa-tools"></i> Gauge Management
      </button>
      <button 
        className={`nav-tab middle ${activeTab === 'dashboard' ? 'active' : ''}`}
        onClick={() => {
          onTabChange('dashboard')
          onResetScroll()
          onResetFilters()
        }}
      >
        <i className="fas fa-user"></i> My Dashboard
      </button>
      <button 
        className={`nav-tab last ${activeTab === 'admin' ? 'active' : ''}`}
        onClick={() => {
          onTabChange('admin')
          onResetScroll()
          onResetFilters()
        }}
        style={{ display: userRole === 'admin' || userRole === 'super_admin' ? 'flex' : 'none' }}
      >
        <i className="fas fa-cog"></i> Admin Panel
      </button>
    </nav>
  )
}