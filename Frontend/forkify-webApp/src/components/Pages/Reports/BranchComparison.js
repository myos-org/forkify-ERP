import React, { useState, useEffect, useCallback } from 'react';
import {
  Store, RefreshCw, AlertTriangle,
  IndianRupee, Package, Trash2, ShoppingCart, BarChart3,
  Download,
} from 'lucide-react';
import api from '../../../services/api';
import branchService from '../../../services/branchService';

const METRICS = [
  { key: 'revenue',      label: 'Revenue',        icon: IndianRupee,   color: '#10b981', format: v => `₹${Number(v||0).toLocaleString('en-IN')}` },
  { key: 'orders',       label: 'Orders',          icon: ShoppingCart, color: '#3b82f6', format: v => v },
  { key: 'inventoryVal', label: 'Inventory Value', icon: Package,      color: '#0061d2', format: v => `₹${Number(v||0).toLocaleString('en-IN')}` },
  { key: 'wastage',      label: 'Wastage Loss',    icon: Trash2,       color: '#ef4444', format: v => `₹${Number(v||0).toFixed(0)}` },
  { key: 'recipes',      label: 'Active Recipes',  icon: BarChart3,    color: '#0061d2', format: v => v },
];

const BranchComparison = () => {
  const [branches,   setBranches]   = useState([]);
  const [dashboards, setDashboards] = useState({}); // branchId -> dashboard data
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState(null);
  const [metric,     setMetric]     = useState('revenue');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: brs } = await branchService.getAll();
      setBranches(brs || []);

      const results = {};
      await Promise.all((brs || []).map(async (b) => {
        try {
          const { data } = await api.get('/dashboard', { params: { branchId: b.id } });
          results[b.id] = data;
        } catch { results[b.id] = null; }
      }));
      setDashboards(results);
    } catch { setError('Failed to load branch data'); }
    finally  { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const currentMetric = METRICS.find(m => m.key === metric) || METRICS[0];

  const getValue = (branchId) => {
    const d = dashboards[branchId];
    if (!d) return 0;
    const map = {
      revenue:      Number(d.totalRevenue  || 0),
      orders:       Number(d.monthlyOrders || 0),
      inventoryVal: Number(d.inventoryValue|| 0),
      wastage:      Number(d.wastageTotal  || 0),
      recipes:      Number(d.activeRecipes || 0),
    };
    return map[metric] || 0;
  };

  const branchValues = branches.map(b => ({ ...b, value: getValue(b.id) }));
  const maxVal = Math.max(...branchValues.map(b => b.value), 1);
  const totalVal = branchValues.reduce((s, b) => s + b.value, 0);

  const exportCsv = () => {
    const rows = [
      ['Branch', 'City', ...METRICS.map(m => m.label)],
      ...branches.map(b => {
        const d = dashboards[b.id];
        return [b.name, b.city || '', ...METRICS.map(m => {
          const map = { revenue: d?.totalRevenue, orders: d?.monthlyOrders, inventoryVal: d?.inventoryValue, wastage: d?.wastageTotal, recipes: d?.activeRecipes };
          return map[m.key] ?? 0;
        })];
      }),
    ];
    const csv  = rows.map(r => r.map(v => `"${v ?? ''}"`).join(',')).join('\n');
    const link = document.createElement('a');
    link.href  = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
    link.download = `branch-comparison-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="bc-page">

      <div className="bc-header">
        <div>
          <h2 className="bc-title"><Store size={20} /> Branch Comparison</h2>
          <p className="bc-sub">Cross-branch performance metrics — HQ view</p>
        </div>
        <div className="bc-header-right">
          <button className="bc-btn-ghost" onClick={load} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'bc-spin' : ''} />
          </button>
          <button className="bc-btn-ghost" onClick={exportCsv}><Download size={14} /> Export</button>
        </div>
      </div>

      {error && <div className="bc-error"><AlertTriangle size={14} />{error}</div>}

      {/* Metric selector */}
      <div className="bc-metric-tabs">
        {METRICS.map(m => (
          <button
            key={m.key}
            className={`bc-metric-tab ${metric === m.key ? 'active' : ''}`}
            style={metric === m.key ? { '--c': m.color, borderColor: m.color, color: m.color, background: m.color + '12' } : {}}
            onClick={() => setMetric(m.key)}
          >
            <m.icon size={14} />{m.label}
          </button>
        ))}
      </div>

      {/* Summary KPIs */}
      <div className="bc-kpis">
        {[
          { label: 'Total Branches',  val: branches.length },
          { label: `Total ${currentMetric.label}`, val: currentMetric.format(totalVal), color: currentMetric.color },
          { label: 'Top Branch', val: branchValues.sort((a,b)=>b.value-a.value)[0]?.name || '—' },
          { label: 'Avg per Branch', val: branches.length ? currentMetric.format(Math.round(totalVal / branches.length)) : '—' },
        ].map((k, i) => (
          <div key={i} className="bc-kpi">
            <div className="bc-kpi-val" style={k.color ? { color: k.color } : {}}>{k.val}</div>
            <div className="bc-kpi-lbl">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Bar chart */}
      {loading ? (
        <div className="bc-loading"><RefreshCw size={22} className="bc-spin" /><p>Loading branch data...</p></div>
      ) : (
        <div className="bc-chart-card">
          <h4 className="bc-chart-title">{currentMetric.label} by Branch</h4>
          <div className="bc-bars">
            {branchValues.sort((a, b) => b.value - a.value).map((b, i) => {
              const pct = maxVal > 0 ? (b.value / maxVal) * 100 : 0;
              return (
                <div key={b.id} className="bc-bar-row">
                  <div className="bc-bar-label">
                    <span className="bc-branch-name">{b.name}</span>
                    <span className="bc-branch-city">{b.city}</span>
                  </div>
                  <div className="bc-bar-track">
                    <div
                      className="bc-bar-fill"
                      style={{ width: `${pct}%`, background: currentMetric.color }}
                    />
                  </div>
                  <div className="bc-bar-val" style={{ color: currentMetric.color }}>
                    {currentMetric.format(b.value)}
                  </div>
                  <div className="bc-bar-pct">{pct.toFixed(0)}%</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Detail table */}
      {!loading && branches.length > 0 && (
        <div className="bc-table-wrap">
          <table className="bc-table">
            <thead>
              <tr>
                <th>Branch</th>
                {METRICS.map(m => <th key={m.key}>{m.label}</th>)}
                <th>Low Stock</th>
              </tr>
            </thead>
            <tbody>
              {branches.map(b => {
                const d = dashboards[b.id];
                return (
                  <tr key={b.id} className="bc-row">
                    <td>
                      <div className="bc-branch-cell">
                        <Store size={14} />
                        <div>
                          <div className="bc-branch-name">{b.name}</div>
                          <div className="bc-branch-city">{b.city || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className="bc-num green">₹{Number(d?.totalRevenue||0).toLocaleString('en-IN')}</span></td>
                    <td>{d?.monthlyOrders ?? '—'}</td>
                    <td>₹{Number(d?.inventoryValue||0).toLocaleString('en-IN')}</td>
                    <td><span className="bc-num red">₹{Number(d?.wastageTotal||0).toFixed(0)}</span></td>
                    <td>{d?.activeRecipes ?? '—'}</td>
                    <td>
                      {d?.lowStockCount > 0
                        ? <span className="bc-alert-chip"><AlertTriangle size={11} />{d.lowStockCount} items</span>
                        : <span className="bc-ok-chip">All stocked</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && branches.length === 0 && (
        <div className="bc-empty"><Store size={40} /><h3>No branches found</h3><p>Add branches in Admin → Branch Management</p></div>
      )}

      <style>{`
        .bc-page { max-width:1100px; }
        .bc-header { display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px;flex-wrap:wrap;gap:10px; }
        .bc-title { display:flex;align-items:center;gap:8px;font-size:18px;font-weight:700;color:#1f2937;margin:0 0 3px; }
        .bc-sub { font-size:12px;color:#9ca3af;margin:0; }
        .bc-header-right { display:flex;gap:8px; }
        .bc-btn-ghost { display:flex;align-items:center;gap:5px;padding:7px 12px;background:#f0f2f7;border:1px solid #e2e6ef;border-radius:8px;font-size:12px;color:#374151;cursor:pointer;white-space:nowrap; }
        .bc-error { display:flex;align-items:center;gap:8px;padding:9px 12px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;color:#dc2626;font-size:13px;margin-bottom:14px; }
        .bc-metric-tabs { display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px; }
        .bc-metric-tab { display:flex;align-items:center;gap:5px;padding:7px 13px;background:#f1f5f9;border:1px solid #e5e7eb;border-radius:20px;font-size:12px;font-weight:500;color:#64748b;cursor:pointer;transition:all .15s; }
        .bc-metric-tab:hover { border-color:#d1d5db;color:#374151; }
        .bc-kpis { display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:18px; }
        @media(max-width:700px){.bc-kpis{grid-template-columns:repeat(2,1fr);}}
        .bc-kpi { background:#fff;border-radius:12px;border:1px solid #e5e7eb;padding:14px;text-align:center; }
        .bc-kpi-val { font-size:20px;font-weight:800;color:#1f2937;margin-bottom:4px; }
        .bc-kpi-lbl { font-size:11px;color:#9ca3af; }
        .bc-chart-card { background:#fff;border-radius:14px;border:1px solid #e5e7eb;padding:20px;margin-bottom:16px; }
        .bc-chart-title { font-size:13px;font-weight:700;color:#374151;margin:0 0 16px; }
        .bc-bars { display:flex;flex-direction:column;gap:12px; }
        .bc-bar-row { display:grid;grid-template-columns:160px 1fr 90px 40px;gap:10px;align-items:center; }
        .bc-bar-label { display:flex;flex-direction:column; }
        .bc-branch-name { font-size:13px;font-weight:600;color:#1f2937; }
        .bc-branch-city { font-size:11px;color:#9ca3af; }
        .bc-bar-track { height:8px;background:#f1f5f9;border-radius:4px;overflow:hidden; }
        .bc-bar-fill { height:100%;border-radius:4px;transition:width .5s; }
        .bc-bar-val { font-size:13px;font-weight:700;text-align:right; }
        .bc-bar-pct { font-size:11px;color:#9ca3af;text-align:right; }
        .bc-table-wrap { background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;overflow-x:auto; }
        .bc-table { width:100%;border-collapse:collapse;min-width:700px; }
        .bc-table thead tr { background:#f8fafc;border-bottom:1px solid #e5e7eb; }
        .bc-table th { padding:10px 14px;text-align:left;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.5px; }
        .bc-row { border-bottom:1px solid #f1f5f9; }
        .bc-row:last-child { border-bottom:none; }
        .bc-row:hover { background:#fafafa; }
        .bc-table td { padding:12px 14px;font-size:13px;vertical-align:middle; }
        .bc-branch-cell { display:flex;align-items:center;gap:8px;color:#6b7280; }
        .bc-num.green { color:#10b981;font-weight:700; }
        .bc-num.red   { color:#ef4444;font-weight:700; }
        .bc-alert-chip { display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:700;padding:3px 7px;background:#e8f0fd;color:#0052b3;border-radius:10px; }
        .bc-ok-chip    { font-size:11px;font-weight:600;padding:3px 7px;background:#f0fdf4;color:#15803d;border-radius:10px; }
        .bc-loading,.bc-empty { display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:50px;color:#9ca3af;text-align:center;background:#fff;border-radius:12px;border:1px solid #e5e7eb; }
        .bc-empty h3 { font-size:16px;font-weight:600;color:#374151;margin:0; }
        .bc-empty p { font-size:13px;margin:0; }
        .bc-spin { animation:bc-spin .8s linear infinite; }
        @keyframes bc-spin { to { transform:rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default BranchComparison;