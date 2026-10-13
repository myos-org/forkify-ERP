import React, { useState } from 'react';
import { Bell, AlertTriangle, CheckCircle, LogOut, Settings, Menu, User } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import AICalorieAssistant from '../AI/AICalorieAssistant';

const FoodERPHeader = ({
  pageName = '',
  breadCrumbList = [],
  showSearch = true,
  currentUser = null,
  onLogout = () => {},
  onToggleMobileMenu = () => {},
  searchQuery = '',
  setSearchQuery = () => {},
  notifications = [],
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
   const [showAI,  setShowAI]  = useState(false);

  const getPageTitle = () => {
    if (pageName) return pageName;
    const segs = location.pathname.replace('/fooderp/', '').split('/').filter(Boolean);
    const seg = segs[0] || 'dashboard';
    return seg.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const initials = (currentUser?.fullName || currentUser?.username || 'U').charAt(0).toUpperCase();
  const roleLabel =
    currentUser?.role === 'ROLE_ADMIN'   ? 'Super Admin'    :
    currentUser?.role === 'ROLE_MANAGER' ? 'Branch Manager' :
    currentUser?.role === 'ROLE_STAFF'   ? 'Kitchen Staff'  : 'Inventory Clerk';

  return (
    <header className="fooderp-header">
      <div className="header-top-row">
        {/* Left */}
        <div className="header-left-section">
          <button className="mobile-menu-button" onClick={onToggleMobileMenu}>
            <Menu size={20} />
          </button>
          <div className="page-info">
            <h1 className="page-title">{getPageTitle()}</h1>
            {breadCrumbList.length > 0 && (
              <div className="breadcrumb">
                {breadCrumbList.map((item, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <span className="breadcrumb-separator">/</span>}
                    <span className={`breadcrumb-item${i === breadCrumbList.length - 1 ? ' active' : ''}`}>
                      {item.label}
                    </span>
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right */}
        <div className="header-right-section">
          <div className="header-actions-group">
            {/* Search */}
           <button
  className="notification-button"
  onClick={() => {
    setShowAI(true);
    setShowNotifications(false);
    setShowUserMenu(false);
  }}
>
  Ask Klyro AI
</button>

            {/* Notifications */}
            <div className="notification-wrapper">
              <button
                className="notification-button"
                onClick={() => { setShowNotifications(!showNotifications); setShowUserMenu(false); }}
              >
                <Bell size={18} />
                {notifications.length > 0 && (
                  <span className="notification-indicator">{notifications.length}</span>
                )}
              </button>
              {showNotifications && (
                <div className="notification-dropdown">
                  <div className="notification-header">
                    <h4>Notifications</h4>
                    <span className="notification-count">{notifications.length} new</span>
                  </div>
                  <div className="notification-list">
                    {notifications.length === 0 ? (
                      <div style={{ padding:'20px', textAlign:'center', color:'#9aa3b4', fontSize:'13px' }}>
                        No notifications
                      </div>
                    ) : notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`notification-item ${n.type || 'info'}`}
                        onClick={() => { if (n.link) navigate(n.link); setShowNotifications(false); }}
                      >
                        <div className="notification-icon">
                          {n.type === 'danger'  ? <AlertTriangle size={13}/> :
                           n.type === 'warning' ? <AlertTriangle size={13}/> :
                           n.type === 'success' ? <CheckCircle   size={13}/> :
                           <Bell size={13}/>}
                        </div>
                        <div className="notification-content">
                          <div className="notification-text">{n.text}</div>
                          <div className="notification-time">{n.time}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    className="view-all-notifications"
                    onClick={() => { navigate('/fooderp/inventory/raw-materials'); setShowNotifications(false); }}
                  >
                    View inventory alerts
                  </button>
                </div>
              )}
            </div>

            {/* User */}
            <div className="user-profile-wrapper">
              <button
                className="user-profile-button"
                onClick={() => { setShowUserMenu(!showUserMenu); setShowNotifications(false); }}
              >
                <div className="user-avatar">{initials}</div>
                <div className="user-info">
                  <span className="user-name">{currentUser?.username || 'User'}</span>
                  <span className="user-role">{roleLabel}</span>
                </div>
              </button>
              {showAI && (
                 <AICalorieAssistant
                  contextType="all" 
                  // branchId={branchId}
                    onClose={() => setShowAI(false)}
                  />
                )} 
              {showUserMenu && (
                <div className="user-menu-dropdown">
                  <div className="user-menu-header">
                    <div className="user-avatar-large">{initials}</div>
                    <div className="user-details">
                      <div className="user-name">{currentUser?.username || 'User'}</div>
                      <div className="user-email">{currentUser?.email || ''}</div>
                    </div>
                  </div>
                  <div className="user-menu-items">
                    <button className="menu-item" onClick={() => { navigate('/profile'); setShowUserMenu(false); }}>
                      <User size={14} /><span>My Profile</span>
                    </button>
                    <button className="menu-item" onClick={() => { navigate('/settings'); setShowUserMenu(false); }}>
                      <Settings size={14} /><span>Settings</span>
                    </button>
                    <div className="menu-divider" />
                    <button className="menu-item logout" onClick={() => { onLogout(); setShowUserMenu(false); }}>
                      <LogOut size={14} /><span>Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default FoodERPHeader;
