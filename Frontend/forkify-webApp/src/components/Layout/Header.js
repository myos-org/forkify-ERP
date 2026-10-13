import React from 'react';
import { Search, Menu, User } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

function Header({ 
  searchQuery, 
  setSearchQuery, 
  handleSearch, 
  currentUser, 
  onLogout,
  onToggleMobileMenu,
  bookmarksCount 
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const isHomePage = location.pathname === '/';
  const isBookmarksPage = location.pathname === '/bookmarks';
  const isAddRecipePage = location.pathname === '/add-recipe';

  const getPageTitle = () => {
    if (isBookmarksPage) return 'My Bookmarks';
    if (isAddRecipePage) return 'Add New Recipe';
    return 'Discover Recipes';
  };

  const handleLoginClick = () => {
    navigate('/login');
  };
  const onClick=() => {
  console.log('Dashboard button clicked');
  navigate('/fooderp/dashboard');
}

  return (
    <>
      <header className="header forkify-header">
        <div className="header-content">
          <div className="header-top">
            <button 
              className="mobile-menu-button"
              onClick={onToggleMobileMenu}
              aria-label="Toggle menu"
            >
              <Menu className="menu-icon" />
            </button>
            
            <div className="page-title-section">
              <h1 className="page-title">{getPageTitle()}</h1>
            </div>
            
            {isHomePage && (
              <div className="search-section">
                <form onSubmit={handleSearch} className="search-form">
                  <div className="search-container">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search over 1,000,000 recipes..."
                      className="search-input"
                      aria-label="Search recipes"
                    />
                    <button 
                      type="submit"
                      className="search-button"
                      aria-label="Search"
                    >
                      <Search className="search-icon" />
                      <span className="search-text">Search</span>
                    </button>
                    
                    {/* Login/User Profile Button */}
                    <div className="user-auth-container">
                      {currentUser ? (
                        <div className="user-profile-dropdown">
                          <button 
                            className="user-profile-button"
                            aria-label="User profile"
                             onClick={onClick}
                          >
                            <User className="user-icon" />
                             
                            <span className="user-name">{currentUser.name}</span>
                          </button>
                          {/* <div className="dropdown-menu">
                            <button 
                              className="dropdown-item"
                              onClick={onClick}
                            >
                              <LogOut className="logout-icon" />
                              <span>Logout</span>
                            </button>
                          </div> */}
                        </div>
                      ) : (
                        <button 
                          className="login-button"
                          onClick={handleLoginClick}
                          aria-label="Login"
                        >
                          <User className="login-icon" />
                          <span className="login-text">Login</span>
                        </button>
                      )}
                    </div>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </header>
      
      {isHomePage && (
        <div className="mobile-search-container">
          <form onSubmit={handleSearch} className="search-form">
            <div className="search-container">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search over 1,000,000 recipes..."
                className="search-input"
                aria-label="Search recipes"
              />
              <button 
                type="submit"
                className="search-button"
                aria-label="Search"
              >
                <Search className="search-icon" />
                <span className="search-text">Search</span>
              </button>
              
              {/* Mobile Login Button */}
              <div className="user-auth-container mobile">
                {currentUser ? (
                  <button 
                    className="mobile-user-button"
                    onClick={onClick}
                    aria-label="User profile"
                  >
                    <User className="user-icon" />
                  </button>
                ) : (
                  <button 
                    className="mobile-login-button"
                    onClick={handleLoginClick}
                    aria-label="Login"
                  >
                    <User className="login-icon" />
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

export default Header;