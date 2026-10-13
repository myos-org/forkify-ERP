import React, { useEffect } from 'react';
import { ChefHat, Home, BookmarkIcon, LogOut, User, ChevronLeft, ChevronRight, PlusCircle, X } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

function Sidebar({ currentUser, isSidebarOpen, setIsSidebarOpen }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = window.innerWidth < 769;

  // Close sidebar when clicking on a menu item on mobile
  const handleMenuItemClick = (path) => {
    navigate(path);
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  };

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (isMobile && isSidebarOpen && !e.target.closest('.sidebar-nav') && !e.target.closest('.mobile-menu-button')) {
        setIsSidebarOpen(false);
      }
    };

    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, [isMobile, isSidebarOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isMobile && isSidebarOpen) {
        setIsSidebarOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isMobile, isSidebarOpen]);

  return (
    <>
      {/* Overlay for mobile */}
      {isMobile && isSidebarOpen && (
        <div 
          className="sidebar-overlay active"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className={`sidebar-nav ${isSidebarOpen ? 'open' : ''} ${!isSidebarOpen ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          {isSidebarOpen ? (
            <>
              <div className="sidebar-logo">
                <ChefHat className="logo-icon" />
                <h2 className="logo-text">Klyro</h2>
              </div>
              <button 
                className="sidebar-toggle"
                onClick={() => setIsSidebarOpen(false)}
                aria-label="Close sidebar"
              >
                <X className="toggle-icon" />
              </button>
            </>
          ) : (
            <div className="collapsed-logo">
              <ChefHat className="collapsed-icon" />
            </div>
          )}
        </div>

        <div className="user-profile">
          {isSidebarOpen ? (
            <>
              <div className="user-avatar">
                <User className="avatar-icon" />
              </div>
              <div className="user-info">
                <h3 className="user-name">{currentUser?.name || 'User'}</h3>
                <p className="user-email">{currentUser?.email || 'user@example.com'}</p>
              </div>
            </>
          ) : (
            <div className="collapsed-avatar" title={`${currentUser?.name || 'User'}`}>
              <User className="avatar-icon" />
            </div>
          )}
        </div>

        <nav className="sidebar-menu">
          <button 
            className={`menu-item ${location.pathname === '/' ? 'active' : ''}`}
            onClick={() => handleMenuItemClick('/')}
            title="Home"
          >
            <Home className="menu-icon" />
            {isSidebarOpen && <span className="menu-text">Home</span>}
          </button>
          
          <div className={`menu-section ${isSidebarOpen ? '' : 'collapsed'}`}>
            {isSidebarOpen && <h4 className="section-title">Your Recipes</h4>}
            <button 
              className={`menu-item ${location.pathname === '/bookmarks' ? 'active' : ''}`}
              onClick={() => handleMenuItemClick('/bookmarks')}
              title="My Bookmarks"
            >
              <BookmarkIcon className="menu-icon" />
              {isSidebarOpen && <span className="menu-text">My Bookmarks</span>}
            </button>
            
            <button 
              className={`menu-item ${location.pathname === '/add-recipe' ? 'active' : ''}`}
              onClick={() => handleMenuItemClick('/add-recipe')}
              title="Add Recipe"
            >
              <PlusCircle className="menu-icon" />
              {isSidebarOpen && <span className="menu-text">Add Recipe</span>}
            </button>
          </div>



         
        </nav>
      </div>

      {/* Expand/Collapse Toggle Button - Desktop only */}
      {!isMobile && (
        <button 
          className={`sidebar-control ${isSidebarOpen ? 'open' : 'collapsed'}`}
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          aria-label={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          {isSidebarOpen ? (
            <ChevronLeft className="control-icon" />
          ) : (
            <ChevronRight className="control-icon" />
          )}
        </button>
      )}
    </>
  );
}

export default Sidebar;