import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  LayoutDashboard, Package, BookOpen, Calendar, Truck, BarChart3,
  Users, ChevronRight, ChevronDown, Store, Globe,
  Utensils, ClipboardList, ShoppingCart, LogOut,
  TrendingUp, Shield, ClipboardCheck,
  Menu as MenuIcon, X, Heart, UserCheck,
} from 'lucide-react';
import usePermission from '../../hooks/usePermission';
import branchService from '../../services/branchService';
import { setActiveBranch } from '../../store/actions/authActions';

const NAV_STRUCTURE = [
  {
    section: 'OVERVIEW',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
      { id: 'analytics', label: 'Analytics', icon: TrendingUp, path: '/analytics', hqOnly: true },
    ],
  },
  {
    section: 'OPERATIONS',
    items: [
      {
        id: 'inventory', label: 'Inventory', icon: Package, path: '/inventory',
        children: [
          { id: 'raw-materials',  label: 'Raw Materials',    path: '/inventory/raw-materials' },
          { id: 'finished-goods', label: 'Finished Goods',   path: '/inventory/finished-goods' },
          { id: 'stock-in',       label: 'Stock In',         path: '/inventory/stock-in' },
          { id: 'stock-out',      label: 'Stock Out',        path: '/inventory/stock-out' },
          { id: 'wastage',        label: 'Wastage',          path: '/inventory/wastage' },
          { id: 'transfers',      label: 'Branch Transfers', path: '/inventory/transfers', hqOnly: true },
        ],
      },
      {
        id: 'recipes', label: 'Recipe Book', icon: BookOpen, path: '/recipes',
        children: [
          { id: 'recipe-list',      label: 'All Recipes',     path: '/recipes/list' },
          { id: 'recipe-nutrition', label: 'Nutrition & Cost', path: '/recipes/nutrition' },
          { id: 'ingredients',      label: 'Ingredients',     path: '/recipes/ingredients', hqOnly: true },
          { id: 'allergens',        label: 'Allergen Matrix', path: '/recipes/allergens' },
        ],
      },
      {
        id: 'menu', label: 'Menu', icon: Utensils, path: '/menu',
        children: [
          { id: 'menu-active',   label: 'Active Menu',    path: '/menu/active' },
          { id: 'menu-seasonal', label: 'Seasonal Menus', path: '/menu/seasonal', hqOnly: true },
          { id: 'menu-pricing',  label: 'Branch Pricing', path: '/menu/pricing' },
        ],
      },
      {
        id: 'meal-planning', label: 'Meal Planning', icon: Calendar, path: '/meal-planning',
        children: [
          { id: 'weekly-plan',         label: 'Weekly Plan',         path: '/meal-planning/weekly' },
          { id: 'push-plan',           label: 'Push to Branches',    path: '/meal-planning/push', hqOnly: true },
          { id: 'ingredient-forecast', label: 'Ingredient Forecast', path: '/meal-planning/forecast' },
        ],
      },
    ],
  },
  {
    section: 'PROCUREMENT',
    items: [
      { id: 'indent', label: 'Material Indent', icon: ClipboardList, path: '/procurement/indent' },
      {
        id: 'procurement', label: 'Purchase Orders', icon: Truck, path: '/procurement',
        children: [
          { id: 'purchase-orders', label: 'All Orders',       path: '/procurement/orders' },
          { id: 'suppliers',       label: 'Suppliers',        path: '/procurement/suppliers' },
          { id: 'vendors',         label: 'Approved Vendors', path: '/procurement/vendors', hqOnly: true },
          { id: 'grn',             label: 'Goods Received',   path: '/procurement/grn' },
        ],
      },
    ],
  },
  {
    section: 'CUSTOMERS & STAFF',
    items: [
      { id: 'customers', label: 'Customer CRM',   icon: Heart,      path: '/customers' },
      { id: 'shifts',    label: 'Shift Schedule', icon: UserCheck,  path: '/staff/shifts' },
      { id: 'sales',     label: 'Daily Sales',    icon: ShoppingCart, path: '/sales' },
    ],
  },
  {
    section: 'PEOPLE & BRANCHES',
    items: [
      { id: 'users',      label: 'User Management', icon: Users,          path: '/users',      hqOnly: true },
      { id: 'branches',   label: 'Branches',        icon: Store,          path: '/branches',   hqOnly: true },
      { id: 'compliance', label: 'Compliance',      icon: ClipboardCheck, path: '/compliance', hqOnly: true },
    ],
  },
  {
    section: 'REPORTS',
    items: [
      {
        id: 'reports', label: 'Reports', icon: BarChart3, path: '/reports',
        children: [
          { id: 'inventory-report', label: 'Inventory',         path: '/reports/inventory' },
          { id: 'cost-report',      label: 'Cost & Margin',     path: '/reports/cost' },
          { id: 'wastage-report',   label: 'Wastage',           path: '/reports/wastage' },
          { id: 'sales-report',     label: 'Sales',             path: '/reports/sales' },
          { id: 'branch-report',    label: 'Branch Comparison', path: '/reports/branches', hqOnly: true },
          { id: 'supplier-report',  label: 'Supplier',          path: '/reports/suppliers' },
        ],
      },
      { id: 'audit', label: 'Audit Logs', icon: Shield, path: '/audit', hqOnly: true },
    ],
  },
];

const FoodERPSidebar = ({ isCollapsed, onToggleCollapse, onLogout }) => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const dispatch  = useDispatch();
  const { user }  = useSelector((state) => state.auth);
  const { isHQ }  = usePermission();

  const [expandedItems,      setExpandedItems]      = useState({});
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);
  const [branches,           setBranches]           = useState([]);
  const [activeBranchId,     setActiveBranchId]     = useState(user?.branchId || null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (isHQ) branchService.getAll().then(({ data }) => setBranches(data)).catch(() => {});
  }, [isHQ]);

  useEffect(() => {
    const path = location.pathname.replace('/fooderp', '');
    NAV_STRUCTURE.forEach((section) => {
      section.items.forEach((item) => {
        if (item.children) {
          const hasActive = item.children.some((c) => path.startsWith(c.path));
          if (hasActive) setExpandedItems((prev) => ({ ...prev, [item.id]: true }));
        }
      });
    });
  }, [location.pathname]);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setBranchDropdownOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggleExpand = (id) =>
    setExpandedItems((prev) => ({ ...prev, [id]: !prev[id] }));

  const handleNav = (path) => navigate(`/fooderp${path}`);

  const isActive = (path) => {
    const current = location.pathname.replace('/fooderp', '');
    return current === path || current.startsWith(path + '/');
  };

  const activeBranch = branches.find((b) => b.id === activeBranchId) || {
    name: user?.branchName || 'Head Office',
    city: '',
    type: isHQ ? 'HQ' : 'BRANCH',
  };

  const initials = (user?.fullName || user?.username || 'U').charAt(0).toUpperCase();
  const roleLabel =
    user?.role === 'ROLE_ADMIN'   ? 'Super Admin'    :
    user?.role === 'ROLE_MANAGER' ? 'Branch Manager' :
    user?.role === 'ROLE_STAFF'   ? 'Kitchen Staff'  : 'Inventory Clerk';

  return (
    <aside className={`fk-sidebar${isCollapsed ? ' collapsed' : ''}`}>

      {/* Brand */}
      <div className="fk-brand">
        <div className="fk-brand-inner" onClick={() => handleNav('/dashboard')} style={{ cursor: 'pointer' }}>
          <img src="/brand/klyro-symbol.svg" alt="Klyro" className="fk-logo-mark-img" style={{ width: 32, height: 32 }} />
          <div className="fk-brand-text">
            <div className="fk-brand-name">Klyro</div>
            <div className="fk-brand-sub">ERP Platform</div>
          </div>
        </div>
        <button className="fk-collapse-btn" onClick={onToggleCollapse} aria-label="Toggle navigation">
          <X size={13} />
        </button>
      </div>

      {/* Branch Switcher */}
      {!isCollapsed && (
        <div className="fk-branch-wrap" ref={dropdownRef}>
          <button
            className="fk-branch-btn"
            onClick={() => isHQ && setBranchDropdownOpen(!branchDropdownOpen)}
            style={{ cursor: isHQ ? 'pointer' : 'default' }}
          >
            <div className="fk-branch-icon">
              {activeBranch.type === 'HQ' ? <Globe size={14} /> : <Store size={14} />}
            </div>
            <div className="fk-branch-info">
              <div className="fk-branch-name">{activeBranch.name}</div>
              <div className="fk-branch-city">{activeBranch.city || (isHQ ? 'Head Office' : 'Branch')}</div>
            </div>
            {isHQ && (
              <ChevronDown
                size={13}
                className={`fk-branch-chevron${branchDropdownOpen ? ' open' : ''}`}
              />
            )}
          </button>

          {branchDropdownOpen && branches.length > 0 && (
            <div className="fk-branch-dropdown">
              {branches.map((branch) => (
                <div
                  key={branch.id}
                  className={`fk-branch-option${activeBranchId === branch.id ? ' active' : ''}`}
                  onClick={() => {
                    setActiveBranchId(branch.id);
                    setBranchDropdownOpen(false);
                    dispatch(setActiveBranch(branch.id, branch.name));
                  }}
                >
                  <div className="fk-branch-option-dot" />
                  <span className="fk-branch-option-name">{branch.name}</span>
                  <span className="fk-branch-option-city">{branch.city}</span>
                  {branch.type === 'HQ' && <span className="fk-branch-hq-label">HQ</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Collapsed: branch icon */}
      {isCollapsed && (
        <div style={{ display:'flex', justifyContent:'center', padding:'0 0 12px' }}>
          <div
            className="fk-branch-icon"
            style={{ width:32, height:32, borderRadius:8, cursor:'pointer' }}
            onClick={onToggleCollapse}
          >
            {activeBranch.type === 'HQ' ? <Globe size={14} /> : <Store size={14} />}
          </div>
        </div>
      )}

      <div className="fk-divider" />

      {/* Navigation */}
      <nav className="fk-nav">
        {NAV_STRUCTURE.map((section) => (
          <div key={section.section}>
            <div className="fk-section-label">{section.section}</div>
            {section.items.map((item) => {
              const locked      = item.hqOnly && !isHQ;
              const hasChildren = item.children?.length > 0;
              const isExpanded  = expandedItems[item.id];
              const parentActive = hasChildren
                ? item.children.some((c) => isActive(c.path))
                : isActive(item.path);

              return (
                <div className="fk-nav-item" key={item.id}>
                  <button
                    className={`fk-nav-btn${parentActive ? ' active' : ''}${locked ? ' locked' : ''}`}
                    title={isCollapsed ? item.label : ''}
                    onClick={() => {
                      if (locked) return;
                      if (hasChildren) toggleExpand(item.id);
                      else handleNav(item.path);
                    }}
                  >
                    <item.icon className="fk-nav-icon" size={16} />
                    <span className="fk-nav-label">{item.label}</span>
                    <div className="fk-nav-end">
                      {item.hqOnly && <span className="fk-hq-badge">HQ</span>}
                      {hasChildren && (
                        <ChevronRight
                          className={`fk-nav-chevron${isExpanded ? ' open' : ''}`}
                          size={13}
                        />
                      )}
                    </div>
                  </button>

                  {hasChildren && !isCollapsed && (
                    <div className={`fk-children${isExpanded ? ' open' : ''}`}>
                      {item.children.map((child) => {
                        const childLocked = child.hqOnly && !isHQ;
                        return (
                          <div
                            key={child.id}
                            className={`fk-child-item${isActive(child.path) ? ' active' : ''}${childLocked ? ' locked' : ''}`}
                            onClick={() => !childLocked && handleNav(child.path)}
                          >
                            {child.label}
                            {child.hqOnly && <span className="fk-child-hq">HQ</span>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="fk-bottom">
        <div className="fk-user-row">
          <div className="fk-avatar">{initials}</div>
          <div className="fk-user-info">
            <div className="fk-user-name">{user?.username || 'User'}</div>
            <div className="fk-user-role">{roleLabel}</div>
          </div>
          <button className="fk-logout-btn" onClick={onLogout} title="Logout">
            <LogOut size={13} />
          </button>
        </div>

        {isCollapsed && (
          <button className="fk-expand-btn" onClick={onToggleCollapse}>
            <MenuIcon size={15} />
          </button>
        )}
        {!isCollapsed && (
          <div className="fk-version">v2.1.0 · Klyro ERP</div>
        )}
      </div>
    </aside>
  );
};

export default FoodERPSidebar;
