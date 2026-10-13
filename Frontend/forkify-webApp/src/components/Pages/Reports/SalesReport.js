import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, RefreshCw, AlertTriangle, Download,
  IndianRupee, ShoppingCart, ChefHat, Calendar,
  Search, X, Filter, BarChart3, TrendingDown,
} from 'lucide-react';
import { salesService } from '../../../services/dashboardService';
import useBranch from '../../../hooks/useBranch';

const SalesReport = () => {
  const { branchId } = useBranch();

  const today     = new Date().toISOString().split('T')[0];
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString().split('T')[0];

  const [entries,   setEntries]   = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);
  const [dateFrom,  setDateFrom]  = useState(monthStart);
  const [dateTo,    setDateTo]    = useState(today);
  const [search,    setSearch]    = useState('');
  const [catFilter, setCatFilter] = useState('all');

  const load = useCallback(async () => {
    if (!branchId) return;
    setLoading(true);
    setError(null);
    try {
      // Load entries for each day in range — API supports single date filter
      // For a range we load all (no date param) and filter client-side
      const { data } = await salesService.getSales(branchId, null);
      setEntries(data || []);
    } catch {
      setError('Failed to load sales data');
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => { load(); }, [load]);

  // Client-side filter by date range, search, category
  const filtered = entries.filter(e => {
    const matchDate = (!dateFrom || e.saleDate >= dateFrom)
                   && (!dateTo   || e.saleDate <= dateTo);
    const matchSearch = !search
      || e.recipeName?.toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === 'all'
      || e.recipeCategory === catFilter;
    return matchDate && matchSearch && matchCat;
  });

  // Aggregations
  const totalRevenue = filtered.reduce((s, e) => s + Number(e.totalRevenue || 0), 0);
  const totalCOGS    = filtered.reduce((s, e) => s + Number(e.costOfGoods  || 0), 0);
  const totalProfit  = filtered.reduce((s, e) => s + Number(e.grossProfit  || 0), 0);
  const totalCovers  = filtered.reduce((s, e) => s + Number(e.quantitySold || 0), 0);
  const marginPct    = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : '0.0';

  // Group by recipe for top performers
  const byRecipe = filtered.reduce((acc, e) => {
    const key = e.recipeName;
    if (!acc[key]) acc[key] = { name: key, category: e.recipeCategory, revenue: 0, covers: 0, profit: 0 };
    acc[key].revenue += Number(e.totalRevenue || 0);
    acc[key].covers  += Number(e.quantitySold || 0);
    acc[key].profit  += Number(e.grossProfit  || 0);
    return acc;
  }, {});
  const topRecipes = Object.values(byRecipe).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

  // Group by date for trend
  const byDate = filtered.reduce((acc, e) => {
    const d = e.saleDate;
    if (!acc[d]) acc[d] = { date: d, revenue: 0, covers: 0 };
    acc[d].revenue += Number(e.totalRevenue || 0);
    acc[d].covers  += Number(e.quantitySold || 0);
    return acc;
  }, {});
  const trendData = Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
  const maxRev = Math.max(...trendData.map(d => d.revenue), 1);

  const categories = [...new Set(entries.map(e => e.recipeCategory).filter(Boolean))].sort();

  const exportCsv = () => {
    const rows = [
      ['Date', 'Recipe', 'Category', 'Qty Sold', 'Price', 'Revenue', 'COGS', 'Gross Profit', 'Logged By'],
      ...filtered.map(e => [
        e.saleDate, e.recipeName, e.recipeCategory,
        e.quantitySold,
        Number(e.sellingPrice  || 0).toFixed(2),
        Number(e.totalRevenue  || 0).toFixed(2),
        Number(e.costOfGoods   || 0).toFixed(2),
        Number(e.grossProfit   || 0).toFixed(2),
        e.loggedBy || '',
      ]),
    ];
    const csv  = rows.map(r => r.map(v => `"${v ?? ''}"`).join(',')).join('\n');
    const link = document.createElement('a');
    link.href  = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
    link.download = `sales-report-${dateFrom}-to-${dateTo}.csv`;
    link.click();
  };

  return (
    <div className="sr2-page">

      {/* Header */}
      <div className="sr2-header">
        <div>
          <h2 className="sr2-title"><TrendingUp size={20} /> Sales Report</h2>
          <p className="sr2-sub">Revenue, covers sold and gross profit analysis</p>
        </div>
        <div className="sr2-header-right">
          <button className="sr2-btn" onClick={load} disabled={loading}>
            <RefreshCw size={13} className={loading ? 'sr2-spin' : ''} />
          </button>
          <button className="sr2-btn" onClick={exportCsv}>
            <Download size={13} /> Export CSV
          </button>
        </div>
      </div>

      {error && (
        <div className="sr2-error">
          <AlertTriangle size={14} />{error}
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* Filters */}
      <div className="sr2-filters">
        <div className="sr2-date-range">
          <Calendar size={13} />
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          <span>—</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        </div>
        <div className="sr2-search">
          <Search size={13} />
          <input placeholder="Search recipe..." value={search} onChange={e => setSearch(e.target.value)} />
          {search && <button onClick={() => setSearch('')}><X size={11} /></button>}
        </div>
        <div className="sr2-cat">
          <Filter size={13} />
          <select value={catFilter} onChange={e => setCatFilter(e.target.value)}>
            <option value="all">All Categories</option>
            {categories.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* KPI cards */}
      <div className="sr2-kpis">
        {[
          { label: 'Total Revenue',  val: `₹${totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, icon: IndianRupee,   color: '#10b981', trend: 'up' },
          { label: 'Gross Profit',   val: `₹${totalProfit.toLocaleString('en-IN',  { maximumFractionDigits: 0 })}`, icon: TrendingUp,   color: '#3b82f6', trend: 'up' },
          { label: 'Total COGS',     val: `₹${totalCOGS.toLocaleString('en-IN',   { maximumFractionDigits: 0 })}`, icon: TrendingDown, color: '#0061d2' },
          { label: 'Profit Margin',  val: `${marginPct}%`,                                                          icon: BarChart3,    color: marginPct >= 30 ? '#10b981' : '#f59e0b' },
          { label: 'Covers Sold',    val: totalCovers,                                                               icon: ShoppingCart, color: '#0061d2' },
          { label: 'Sale Entries',   val: filtered.length,                                                           icon: ChefHat,      color: '#6b7280' },
        ].map((k, i) => (
          <div key={i} className="sr2-kpi" style={{ borderTop: `3px solid ${k.color}` }}>
            <div className="sr2-kpi-icon" style={{ background: k.color + '18', color: k.color }}>
              <k.icon size={18} />
            </div>
            <div>
              <div className="sr2-kpi-val" style={{ color: k.color }}>{k.val}</div>
              <div className="sr2-kpi-lbl">{k.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Revenue trend chart */}
      {trendData.length > 1 && (
        <div className="sr2-trend-card">
          <h4 className="sr2-section-title">Daily Revenue Trend</h4>
          <div className="sr2-chart">
            {trendData.map((d, i) => {
              const pct = (d.revenue / maxRev) * 100;
              return (
                <div key={i} className="sr2-bar-col" title={`${d.date}: ₹${d.revenue.toFixed(0)}`}>
                  <div className="sr2-bar-fill" style={{ height: `${Math.max(2, pct)}%` }} />
                  {trendData.length <= 14 && (
                    <div className="sr2-bar-label">{d.date.slice(5)}</div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="sr2-chart-legend">
            <span>Revenue range: ₹{Math.min(...trendData.map(d => d.revenue)).toFixed(0)} — ₹{maxRev.toFixed(0)}</span>
          </div>
        </div>
      )}

      {/* Two column: Top recipes + full table */}
      <div className="sr2-grid">

        {/* Top recipes */}
        <div className="sr2-card">
          <h4 className="sr2-section-title"><ChefHat size={15} /> Top Recipes</h4>
          {topRecipes.length === 0 ? (
            <div className="sr2-empty-msg">No sales data in selected range</div>
          ) : (
            <div className="sr2-recipe-list">
              {topRecipes.map((r, i) => {
                const pct = maxRev > 0 ? (r.revenue / topRecipes[0].revenue) * 100 : 0;
                return (
                  <div key={r.name} className="sr2-recipe-row">
                    <div className="sr2-recipe-rank">#{i + 1}</div>
                    <div className="sr2-recipe-info">
                      <div className="sr2-recipe-name">{r.name}</div>
                      <div className="sr2-recipe-meta">
                        <span className="sr2-cat-chip">{r.category}</span>
                        <span>{r.covers} covers</span>
                      </div>
                      <div className="sr2-recipe-bar-track">
                        <div className="sr2-recipe-bar-fill" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <div className="sr2-recipe-revenue">
                      <div className="sr2-rev-val">₹{r.revenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                      <div className="sr2-prof-val" style={{ color: r.profit >= 0 ? '#10b981' : '#ef4444' }}>
                        ₹{r.profit.toFixed(0)} profit
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Profit summary */}
        <div className="sr2-card">
          <h4 className="sr2-section-title"><BarChart3 size={15} /> Profit Summary</h4>
          <div className="sr2-profit-rows">
            {[
              { label: 'Total Revenue', val: totalRevenue, color: '#10b981' },
              { label: 'Cost of Goods', val: -totalCOGS,   color: '#ef4444' },
              { label: 'Gross Profit',  val: totalProfit,  color: '#3b82f6', bold: true },
            ].map((r, i) => (
              <div key={i} className={`sr2-profit-row ${r.bold ? 'total' : ''}`}>
                <span>{r.label}</span>
                <span style={{ color: r.color, fontWeight: r.bold ? 800 : 600 }}>
                  {r.val < 0 ? '-' : ''}₹{Math.abs(r.val).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </span>
              </div>
            ))}
            <div className="sr2-margin-bar-wrap">
              <div className="sr2-margin-label">Gross Margin</div>
              <div className="sr2-margin-track">
                <div
                  className="sr2-margin-fill"
                  style={{
                    width: `${Math.min(100, Math.max(0, marginPct))}%`,
                    background: marginPct >= 40 ? '#10b981' : marginPct >= 25 ? '#f59e0b' : '#ef4444',
                  }}
                />
              </div>
              <div className="sr2-margin-pct">{marginPct}%</div>
            </div>
          </div>

          {/* Category breakdown */}
          {Object.values(byRecipe).length > 0 && (
            <div style={{ marginTop: 20 }}>
              <div className="sr2-section-title" style={{ marginBottom: 10 }}>By Category</div>
              {Object.entries(
                filtered.reduce((acc, e) => {
                  const cat = e.recipeCategory || 'Unknown';
                  if (!acc[cat]) acc[cat] = 0;
                  acc[cat] += Number(e.totalRevenue || 0);
                  return acc;
                }, {})
              ).sort((a, b) => b[1] - a[1]).map(([cat, rev]) => (
                <div key={cat} className="sr2-cat-row">
                  <span className="sr2-cat-chip">{cat}</span>
                  <div className="sr2-cat-bar-track">
                    <div className="sr2-cat-bar-fill"
                      style={{ width: `${(rev / totalRevenue) * 100}%` }} />
                  </div>
                  <span className="sr2-cat-rev">₹{rev.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Full sales table */}
      {loading ? (
        <div className="sr2-loading"><RefreshCw size={22} className="sr2-spin" /><p>Loading...</p></div>
      ) : filtered.length === 0 ? (
        <div className="sr2-empty">
          <TrendingUp size={44} />
          <h3>No sales data</h3>
          <p>Log daily sales from the Sales menu to see reports here</p>
        </div>
      ) : (
        <div className="sr2-table-wrap">
          <h4 className="sr2-section-title" style={{ padding: '14px 16px 0', margin: 0 }}>
            All Entries ({filtered.length})
          </h4>
          <table className="sr2-table">
            <thead>
              <tr>
                <th>Date</th><th>Recipe</th><th>Category</th><th>Qty</th>
                <th>Price</th><th>Revenue</th><th>COGS</th><th>Profit</th><th>By</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(e => {
                const profit = Number(e.grossProfit || 0);
                return (
                  <tr key={e.id} className="sr2-row">
                    <td className="sr2-muted">{e.saleDate}</td>
                    <td><strong className="sr2-recipe-name-cell">{e.recipeName}</strong></td>
                    <td><span className="sr2-cat-chip">{e.recipeCategory}</span></td>
                    <td>{e.quantitySold}</td>
                    <td className="sr2-muted">₹{Number(e.sellingPrice || 0).toFixed(2)}</td>
                    <td className="sr2-green">₹{Number(e.totalRevenue || 0).toFixed(2)}</td>
                    <td className="sr2-red">₹{Number(e.costOfGoods  || 0).toFixed(2)}</td>
                    <td style={{ fontWeight: 700, color: profit >= 0 ? '#10b981' : '#ef4444' }}>
                      ₹{profit.toFixed(2)}
                    </td>
                    <td className="sr2-muted">{e.loggedBy || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="sr2-footer">
            {filtered.length} entries · Revenue ₹{totalRevenue.toFixed(0)} ·
            Profit ₹{totalProfit.toFixed(0)} · Margin {marginPct}%
          </div>
        </div>
      )}

      <style>{`
        .sr2-page { max-width:1200px; }
        .sr2-header { display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px;flex-wrap:wrap;gap:10px; }
        .sr2-title { display:flex;align-items:center;gap:8px;font-size:18px;font-weight:700;color:#1f2937;margin:0 0 3px; }
        .sr2-sub { font-size:12px;color:#9ca3af;margin:0; }
        .sr2-header-right { display:flex;gap:8px; }
        .sr2-btn { display:flex;align-items:center;gap:5px;padding:7px 12px;background:#f0f2f7;border:1px solid #e2e6ef;border-radius:8px;font-size:12px;color:#374151;cursor:pointer;white-space:nowrap;transition:all .15s; }
        .sr2-btn:hover { background:#e2e6ef; }
        .sr2-error { display:flex;align-items:center;gap:8px;padding:9px 12px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;color:#dc2626;font-size:13px;margin-bottom:12px; }
        .sr2-error button { margin-left:auto;background:none;border:none;cursor:pointer;font-size:15px; }

        .sr2-filters { display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap;align-items:center; }
        .sr2-date-range { display:flex;align-items:center;gap:6px;padding:8px 12px;background:#fff;border:1px solid #e5e7eb;border-radius:8px;color:#6b7280;font-size:12px; }
        .sr2-date-range input { border:none;outline:none;font-size:12px;color:#1f2937;background:transparent; }
        .sr2-search { display:flex;align-items:center;gap:7px;padding:8px 12px;background:#fff;border:1px solid #e5e7eb;border-radius:8px;flex:1;min-width:180px; }
        .sr2-search:focus-within { border-color:#0061d2; }
        .sr2-search input { border:none;outline:none;font-size:13px;flex:1;background:transparent;color:#1f2937; }
        .sr2-search button { background:none;border:none;cursor:pointer;color:#9ca3af; }
        .sr2-cat { display:flex;align-items:center;gap:7px;padding:8px 12px;background:#fff;border:1px solid #e5e7eb;border-radius:8px;color:#6b7280; }
        .sr2-cat select { border:none;outline:none;font-size:13px;color:#1f2937;background:transparent;cursor:pointer; }

        .sr2-kpis { display:grid;grid-template-columns:repeat(6,1fr);gap:10px;margin-bottom:16px; }
        @media(max-width:1000px){.sr2-kpis{grid-template-columns:repeat(3,1fr);}}
        @media(max-width:600px){.sr2-kpis{grid-template-columns:repeat(2,1fr);}}
        .sr2-kpi { background:#fff;border-radius:12px;border:1px solid #e5e7eb;padding:12px;display:flex;align-items:center;gap:10px; }
        .sr2-kpi-icon { width:34px;height:34px;border-radius:9px;display:flex;align-items:center;justify-content:center;flex-shrink:0; }
        .sr2-kpi-val { font-size:16px;font-weight:800;line-height:1;margin-bottom:2px; }
        .sr2-kpi-lbl { font-size:10px;color:#9ca3af; }

        .sr2-trend-card { background:#fff;border-radius:12px;border:1px solid #e5e7eb;padding:16px;margin-bottom:16px; }
        .sr2-section-title { display:flex;align-items:center;gap:6px;font-size:13px;font-weight:700;color:#374151;margin:0 0 14px; }
        .sr2-chart { display:flex;align-items:flex-end;gap:3px;height:100px;border-bottom:1px solid #f1f5f9; }
        .sr2-bar-col { flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:3px; }
        .sr2-bar-fill { width:100%;background:linear-gradient(to top,#0061d2,#3385e0);border-radius:3px 3px 0 0;transition:height .4s; }
        .sr2-bar-label { font-size:9px;color:#9ca3af;white-space:nowrap; }
        .sr2-chart-legend { font-size:11px;color:#9ca3af;margin-top:6px;text-align:right; }

        .sr2-grid { display:grid;grid-template-columns:1fr 380px;gap:16px;margin-bottom:16px; }
        @media(max-width:900px){.sr2-grid{grid-template-columns:1fr;}}
        .sr2-card { background:#fff;border-radius:12px;border:1px solid #e5e7eb;padding:18px; }
        .sr2-empty-msg { font-size:13px;color:#9ca3af;text-align:center;padding:20px 0;font-style:italic; }

        .sr2-recipe-list { display:flex;flex-direction:column;gap:10px; }
        .sr2-recipe-row { display:flex;align-items:center;gap:10px; }
        .sr2-recipe-rank { width:24px;height:24px;background:#f1f5f9;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#6b7280;flex-shrink:0; }
        .sr2-recipe-info { flex:1;min-width:0; }
        .sr2-recipe-name { font-size:13px;font-weight:600;color:#1f2937;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
        .sr2-recipe-meta { display:flex;align-items:center;gap:8px;margin:2px 0 4px;font-size:11px;color:#9ca3af; }
        .sr2-recipe-bar-track { height:4px;background:#f1f5f9;border-radius:2px;overflow:hidden; }
        .sr2-recipe-bar-fill { height:100%;background:#0061d2;border-radius:2px;transition:width .4s; }
        .sr2-recipe-revenue { text-align:right;flex-shrink:0; }
        .sr2-rev-val { font-size:13px;font-weight:700;color:#1f2937; }
        .sr2-prof-val { font-size:11px; }
        .sr2-cat-chip { font-size:10px;font-weight:600;padding:2px 6px;background:#f0fdf4;color:#15803d;border-radius:20px;white-space:nowrap; }

        .sr2-profit-rows { display:flex;flex-direction:column;gap:0; }
        .sr2-profit-row { display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#6b7280; }
        .sr2-profit-row.total { border-bottom:none;font-size:14px;font-weight:700;color:#1f2937;border-top:2px solid #f1f5f9;margin-top:4px;padding-top:12px; }
        .sr2-margin-bar-wrap { margin-top:16px; }
        .sr2-margin-label { font-size:11px;color:#9ca3af;margin-bottom:6px; }
        .sr2-margin-track { height:8px;background:#f1f5f9;border-radius:4px;overflow:hidden;margin-bottom:4px; }
        .sr2-margin-fill { height:100%;border-radius:4px;transition:width .5s; }
        .sr2-margin-pct { font-size:13px;font-weight:800;color:#1f2937;text-align:right; }

        .sr2-cat-row { display:flex;align-items:center;gap:8px;margin-bottom:8px; }
        .sr2-cat-bar-track { flex:1;height:5px;background:#f1f5f9;border-radius:3px;overflow:hidden; }
        .sr2-cat-bar-fill { height:100%;background:#0061d2;border-radius:3px;transition:width .4s; }
        .sr2-cat-rev { font-size:12px;font-weight:600;color:#1f2937;white-space:nowrap; }

        .sr2-table-wrap { background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden; }
        .sr2-table { width:100%;border-collapse:collapse; }
        .sr2-table thead tr { background:#f8fafc;border-bottom:1px solid #e5e7eb; }
        .sr2-table th { padding:10px 14px;text-align:left;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.5px; }
        .sr2-row { border-bottom:1px solid #f1f5f9; }
        .sr2-row:last-child { border-bottom:none; }
        .sr2-row:hover { background:#fafafa; }
        .sr2-table td { padding:10px 14px;font-size:13px;vertical-align:middle; }
        .sr2-recipe-name-cell { font-size:13px;font-weight:600;color:#1f2937; }
        .sr2-muted { font-size:12px;color:#9ca3af; }
        .sr2-green { font-weight:700;color:#10b981; }
        .sr2-red   { color:#ef4444; }
        .sr2-footer { padding:10px 16px;font-size:12px;color:#9ca3af;border-top:1px solid #f1f5f9; }

        .sr2-loading,.sr2-empty { display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:50px;color:#9ca3af;text-align:center;background:#fff;border-radius:12px;border:1px solid #e5e7eb; }
        .sr2-empty h3 { font-size:16px;font-weight:600;color:#374151;margin:0; }
        .sr2-empty p { font-size:13px;margin:0; }
        .sr2-spin { animation:sr2-spin .8s linear infinite; }
        @keyframes sr2-spin { to { transform:rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default SalesReport;