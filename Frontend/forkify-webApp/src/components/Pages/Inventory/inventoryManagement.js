import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Package, AlertTriangle, IndianRupee,
  ShoppingCart, Trash2, ArrowDownCircle,
  RefreshCw, Calendar, ArrowRightCircle,
} from 'lucide-react';
import inventoryService from '../../../services/inventoryService';
import useBranch from '../../../hooks/useBranch';

const CHILD_PATHS = ['raw-materials', 'finished-goods', 'stock-in', 'stock-out', 'wastage', 'transfers'];

const SECTIONS = [
  { id: 'raw-materials',  label: 'Raw Materials',  icon: Package,         desc: 'Ingredients & materials on hand',   color: '#10b981' },
  { id: 'finished-goods', label: 'Finished Goods',  icon: ShoppingCart,    desc: 'Produced items ready for service',  color: '#3b82f6' },
  { id: 'stock-in',       label: 'Stock In',         icon: ArrowDownCircle, desc: 'Record incoming deliveries',        color: '#0061d2' },
  { id: 'stock-out',      label: 'Stock Out',        icon: ArrowRightCircle,desc: 'Items consumed in production',      color: '#0061d2' },
  { id: 'wastage',        label: 'Wastage',          icon: Trash2,          desc: 'Track and approve losses',          color: '#ef4444' },
];

const InventoryManagement = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { branchId } = useBranch();

  const [summary,    setSummary]    = useState(null);
  const [lowStock,   setLowStock]   = useState([]);
  const [expiring,   setExpiring]   = useState([]);
  const [loading,    setLoading]    = useState(false);

  const isChildRoute = CHILD_PATHS.some(p =>
    location.pathname.includes(`/inventory/${p}`)
  );

  const load = useCallback(async () => {
    if (!branchId) return;
    setLoading(true);
    try {
      const [sumRes, lowRes, expRes] = await Promise.all([
        inventoryService.getSummary(branchId),
        inventoryService.getLowStock(branchId),
        inventoryService.getExpiring(branchId, 7),
      ]);
      setSummary(sumRes.data);
      setLowStock(lowRes.data || []);
      setExpiring(expRes.data || []);
    } catch (e) {
      console.error('Failed to load inventory summary', e);
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => { load(); }, [load]);

  const goTo = (sub) => navigate(`/fooderp/inventory/${sub}`);

  return (
    <div className="inv-mgmt">

      {/* Header */}
      <div className="inv-header">
        <div>
          <h1 className="inv-title"><Package size={22} /> Inventory Management</h1>
          <p className="inv-subtitle">Track stock levels, record movements, manage wastage</p>
        </div>
        <button className="inv-refresh-btn" onClick={load} disabled={loading}>
          <RefreshCw size={15} className={loading ? 'inv-spin' : ''} />
          Refresh
        </button>
      </div>

      {isChildRoute ? (
        <Outlet />
      ) : (
        <>
          {/* Stats */}
          {summary && (
            <div className="inv-stats">
              {[
                { label: 'Total Items',       val: summary.totalItems,    icon: Package,      color: '#3b82f6' },
                { label: 'Low Stock',         val: summary.lowStockCount, icon: AlertTriangle,color: '#f59e0b', urgent: summary.lowStockCount > 0 },
                { label: 'Expiring (7 days)', val: summary.expiringCount, icon: Calendar,     color: '#0061d2', urgent: summary.expiringCount > 0 },
                { label: 'Pending Wastage',   val: summary.pendingWastage,icon: Trash2,       color: '#ef4444', urgent: summary.pendingWastage > 0 },
                { label: 'Total Value',       val: `₹${Number(summary.totalValue || 0).toLocaleString('en', {minimumFractionDigits:2})}`, icon: IndianRupee, color: '#10b981' },
              ].map((s, i) => (
                <div key={i} className={`inv-stat-card ${s.urgent ? 'urgent' : ''}`}
                  style={{ '--accent': s.color }}>
                  <div className="inv-stat-icon" style={{ background: s.color + '18' }}>
                    <s.icon size={20} style={{ color: s.color }} />
                  </div>
                  <div>
                    <div className="inv-stat-val">{s.val}</div>
                    <div className="inv-stat-lbl">{s.label}</div>
                  </div>
                  {s.urgent && <div className="inv-stat-dot" />}
                </div>
              ))}
            </div>
          )}

          {/* Section tiles */}
          <h3 className="inv-section-title">Inventory Sections</h3>
          <div className="inv-sections">
            {SECTIONS.map(sec => (
              <button key={sec.id} className="inv-section-tile" onClick={() => goTo(sec.id)}>
                <div className="inv-section-icon" style={{ background: sec.color + '18', color: sec.color }}>
                  <sec.icon size={22} />
                </div>
                <div className="inv-section-body">
                  <div className="inv-section-label">{sec.label}</div>
                  <div className="inv-section-desc">{sec.desc}</div>
                </div>
                <ArrowRightCircle size={16} className="inv-section-arrow" />
              </button>
            ))}
          </div>

          {/* Alerts grid */}
          <div className="inv-alerts-grid">
            {/* Low stock alert */}
            <div className="inv-alert-card">
              <div className="inv-alert-header">
                <AlertTriangle size={18} style={{ color: '#f59e0b' }} />
                <h4>Low Stock Alert</h4>
                <span className="inv-alert-count">{lowStock.length}</span>
                <button className="inv-alert-link" onClick={() => goTo('raw-materials')}>
                  View All
                </button>
              </div>
              {lowStock.length === 0 ? (
                <p className="inv-alert-empty">All stock levels are healthy</p>
              ) : (
                <div className="inv-alert-list">
                  {lowStock.slice(0, 5).map(item => {
                    const pct = Math.min(100, (item.currentQuantity / item.minStockLevel) * 100);
                    const color = item.status === 'CRITICAL' ? '#ef4444'
                                : item.status === 'LOW'      ? '#f59e0b'
                                : '#10b981';
                    return (
                      <div key={item.id} className="inv-alert-row">
                        <div className="inv-alert-row-info">
                          <span className="inv-alert-name">{item.ingredientName}</span>
                          <span className="inv-alert-qty">
                            {item.currentQuantity} / {item.minStockLevel} {item.unit}
                          </span>
                        </div>
                        <div className="inv-progress-track">
                          <div className="inv-progress-fill"
                            style={{ width: `${pct}%`, background: color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Expiring soon */}
            <div className="inv-alert-card">
              <div className="inv-alert-header">
                <Calendar size={18} style={{ color: '#0061d2' }} />
                <h4>Expiring Soon</h4>
                <span className="inv-alert-count">{expiring.length}</span>
                <button className="inv-alert-link" onClick={() => goTo('raw-materials')}>
                  View All
                </button>
              </div>
              {expiring.length === 0 ? (
                <p className="inv-alert-empty">No items expiring in the next 7 days</p>
              ) : (
                <div className="inv-alert-list">
                  {expiring.slice(0, 5).map(item => {
                    const daysLeft = item.expiryDate
                      ? Math.ceil((new Date(item.expiryDate) - new Date()) / 86400000)
                      : null;
                    return (
                      <div key={item.id} className="inv-alert-row">
                        <div className="inv-alert-row-info">
                          <span className="inv-alert-name">{item.ingredientName}</span>
                          <span className="inv-alert-qty">
                            {item.currentQuantity} {item.unit}
                          </span>
                        </div>
                        <span className={`inv-expiry-chip ${daysLeft != null && daysLeft <= 2 ? 'critical' : 'warning'}`}>
                          {daysLeft != null ? `${daysLeft}d left` : item.expiryDate}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <style>{`
        .inv-mgmt { max-width:1200px; }
        .inv-header { display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px; }
        .inv-title { display:flex;align-items:center;gap:8px;font-size:20px;font-weight:700;color:#1f2937;margin:0 0 4px; }
        .inv-subtitle { font-size:13px;color:#6b7280;margin:0; }
        .inv-refresh-btn { display:flex;align-items:center;gap:6px;padding:7px 14px;background:#f0f2f7;border:1px solid #e2e6ef;border-radius:8px;font-size:13px;color:#374151;cursor:pointer;transition:all .15s; }
        .inv-refresh-btn:hover { background:#e2e6ef; }

        .inv-stats { display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-bottom:24px; }
        @media(max-width:900px) { .inv-stats { grid-template-columns:repeat(3,1fr); } }
        @media(max-width:600px) { .inv-stats { grid-template-columns:repeat(2,1fr); } }
        .inv-stat-card { background:#fff;border-radius:12px;border:1px solid #e5e7eb;padding:14px;display:flex;align-items:center;gap:12px;position:relative;transition:all .15s; }
        .inv-stat-card.urgent { border-color:var(--accent);box-shadow:0 0 0 1px var(--accent)20; }
        .inv-stat-icon { width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0; }
        .inv-stat-val { font-size:20px;font-weight:800;color:#1f2937;line-height:1; }
        .inv-stat-lbl { font-size:11px;color:#9ca3af;margin-top:2px; }
        .inv-stat-dot { position:absolute;top:10px;right:10px;width:8px;height:8px;background:#ef4444;border-radius:50%;animation:inv-pulse 1.5s infinite; }
        @keyframes inv-pulse { 0%,100%{opacity:1} 50%{opacity:.3} }

        .inv-section-title { font-size:13px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.6px;margin:0 0 12px; }

        .inv-sections { display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;margin-bottom:24px; }
        .inv-section-tile { display:flex;align-items:center;gap:14px;padding:16px;background:#fff;border:1px solid #e5e7eb;border-radius:12px;cursor:pointer;transition:all .15s;text-align:left;width:100%; }
        .inv-section-tile:hover { border-color:#0061d2;box-shadow:0 4px 12px rgba(0,97,210,.1);transform:translateY(-2px); }
        .inv-section-icon { width:44px;height:44px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0; }
        .inv-section-body { flex:1; }
        .inv-section-label { font-size:13px;font-weight:600;color:#1f2937;margin-bottom:2px; }
        .inv-section-desc { font-size:11px;color:#9ca3af; }
        .inv-section-arrow { color:#d1d5db;flex-shrink:0;transition:color .15s; }
        .inv-section-tile:hover .inv-section-arrow { color:#0061d2; }

        .inv-alerts-grid { display:grid;grid-template-columns:1fr 1fr;gap:16px; }
        @media(max-width:768px) { .inv-alerts-grid { grid-template-columns:1fr; } }
        .inv-alert-card { background:#fff;border-radius:14px;border:1px solid #e5e7eb;padding:18px; }
        .inv-alert-header { display:flex;align-items:center;gap:8px;margin-bottom:14px; }
        .inv-alert-header h4 { font-size:14px;font-weight:700;color:#1f2937;margin:0;flex:1; }
        .inv-alert-count { background:#f1f5f9;color:#64748b;font-size:11px;font-weight:700;padding:2px 7px;border-radius:10px; }
        .inv-alert-link { background:none;border:none;font-size:12px;color:#0061d2;cursor:pointer;font-weight:600;margin-left:4px; }
        .inv-alert-empty { font-size:13px;color:#9ca3af;text-align:center;padding:12px 0;margin:0;font-style:italic; }

        .inv-alert-list { display:flex;flex-direction:column;gap:10px; }
        .inv-alert-row { display:flex;flex-direction:column;gap:4px; }
        .inv-alert-row-info { display:flex;justify-content:space-between;align-items:center; }
        .inv-alert-name { font-size:13px;font-weight:500;color:#374151; }
        .inv-alert-qty { font-size:11px;color:#9ca3af; }
        .inv-progress-track { height:5px;background:#f1f5f9;border-radius:3px;overflow:hidden; }
        .inv-progress-fill { height:100%;border-radius:3px;transition:width .4s; }

        .inv-expiry-chip { font-size:11px;font-weight:700;padding:2px 8px;border-radius:10px;white-space:nowrap; }
        .inv-expiry-chip.warning  { background:#e8f0fd;color:#0052b3; }
        .inv-expiry-chip.critical { background:#fef2f2;color:#b91c1c; }

        .inv-spin { animation:inv-spin .8s linear infinite; }
        @keyframes inv-spin { to { transform:rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default InventoryManagement;