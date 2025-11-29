import React from 'react'

interface TabNavigationProps {
  userRole: string
  activeTab: string
  setActiveTab: (tab: string) => void
  stats: {
    total: number
    pending_qc: number
  }
}

export const TabNavigation: React.FC<TabNavigationProps> = ({
  userRole,
  activeTab,
  setActiveTab,
  stats
}) => {
  return (
    <nav className="main-tabs">
      <button 
        className={`main-tab ${activeTab === 'gauge-management' ? 'active' : ''}`}
        onClick={() => setActiveTab('gauge-management')}
      >
        <i className="fas fa-tools"></i> Gauge Management
      </button>
      
      <button 
        className={`main-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
        onClick={() => setActiveTab('dashboard')}
      >
        <i className="fas fa-user"></i> My Dashboard
      </button>
      
      {(userRole === 'admin' || userRole === 'super_admin') && (
        <>
          <button 
            className={`main-tab ${activeTab === 'admin' ? 'active' : ''}`}
            onClick={() => setActiveTab('admin')}
          >
            <i className="fas fa-user-shield"></i> Admin Panel
          </button>
          
          <button 
            className={`main-tab ${activeTab === 'approvals' ? 'active' : ''}`}
            onClick={() => setActiveTab('approvals')}
          >
            <i className="fas fa-clipboard-check"></i> 
            Approvals {stats.pending_qc > 0 && <span className="badge">{stats.pending_qc}</span>}
          </button>
        </>
      )}
    </nav>
  )
}