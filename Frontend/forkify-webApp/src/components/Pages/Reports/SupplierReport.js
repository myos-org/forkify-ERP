import React, { useState, useEffect, useCallback } from 'react';
import {
  Truck, RefreshCw, AlertTriangle, Download,
  CheckCircle, Clock,
  Search, X, IndianRupee, BarChart3,
} from 'lucide-react';
import procurementService from '../../../services/procurementService';
import useBranch          from '../../../hooks/useBranch';

const STATUS_COLORS = {
  DRAFT:     { bg:'#f1f5f9', color:'#475569' },
  SENT:      { bg:'#eff6ff', color:'#1d4ed8' },
  PARTIAL:   { bg:'#fefce8', color:'#a16207' },
  RECEIVED:  { bg:'#f0fdf4', color:'#15803d' },
  CANCELLED: { bg:'#fee2e2', color:'#b91c1c' },
};

const SupplierReport = () => {
  const { branchId }        = useBranch();
  const [suppliers, setSuppliers] = useState([]);
  const [pos,       setPos]       = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);
  const [search,    setSearch]    = useState('');
  const [view,      setView]      = useState('overview'); // overview | orders

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [supRes, poRes] = await Promise.all([
        procurementService.getSuppliers(branchId),
        procurementService.getPOs(branchId, null),
      ]);
      setSuppliers(supRes.data || []);
      setPos(poRes.data || []);
    } catch { setError('Failed to load supplier data'); }
    finally  { setLoading(false); }
  }, [branchId]);

  useEffect(() => { load(); }, [load]);

  // Enrich suppliers with PO data
  const enriched = suppliers.map(s => {
    const supplierPOs = pos.filter(p => p.supplierId === s.id || p.supplierName === s.name);
    const totalOrders = supplierPOs.length;
    const totalSpend  = supplierPOs.reduce((sum, p) => sum + parseFloat(p.totalAmount || 0), 0);
    const received    = supplierPOs.filter(p => p.status === 'RECEIVED').length;
    const onTimeRate  = totalOrders > 0 ? Math.round((received / totalOrders) * 100) : null;
    return { ...s, totalOrders, totalSpend, received, onTimeRate };
  }).filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase()));

  const totalSpend   = enriched.reduce((s, v) => s + v.totalSpend, 0);
  const activeCount  = suppliers.filter(s => s.approved).length;
  const totalPOs     = pos.length;
  const receivedPOs  = pos.filter(p => p.status === 'RECEIVED').length;

  const exportCsv = () => {
    const rows = [
      ['Supplier', 'Category', 'City', 'Approved', 'Total Orders', 'Total Spend', 'On-Time Rate'],
      ...enriched.map(s => [s.name, s.category || '', s.city || '', s.approved ? 'Yes' : 'No', s.totalOrders, s.totalSpend.toFixed(2), s.onTimeRate != null ? `${s.onTimeRate}%` : '—']),
    ];
    const csv  = rows.map(r => r.map(v => `"${v ?? ''}"`).join(',')).join('\n');
    const link = document.createElement('a');
    link.href  = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
    link.download = `supplier-report-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="sr-page">

      <div className="sr-header">
        <div>
          <h2 className="sr-title"><Truck size={20} /> Supplier Report</h2>
          <p className="sr-sub">Vendor performance, spend analysis and order history</p>
        </div>
        <div className="sr-header-right">
          <button className="sr-btn-ghost" onClick={load} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'sr-spin' : ''} />
          </button>
          <button className="sr-btn-ghost" onClick={exportCsv}><Download size={14} /> Export</button>
        </div>
      </div>

      {error && <div className="sr-error"><AlertTriangle size={14} />{error}</div>}

      {/* KPIs */}
      <div className="sr-kpis">
        {[
          { label: 'Total Suppliers', val: suppliers.length,          icon: Truck,       color: '#3b82f6' },
          { label: 'Approved Vendors',val: activeCount,               icon: CheckCircle, color: '#10b981' },
          { label: 'Total Spend',     val: `₹${totalSpend.toLocaleString('en-IN', {maximumFractionDigits:0})}`, icon: IndianRupee, color: '#0061d2' },
          { label: 'PO Completion',   val: totalPOs > 0 ? `${Math.round((receivedPOs/totalPOs)*100)}%` : '—', icon: BarChart3, color: '#0061d2' },
        ].map((k, i) => (
          <div key={i} className="sr-kpi">
            <div className="sr-kpi-icon" style={{ background: k.color + '18', color: k.color }}><k.icon size={18} /></div>
            <div>
              <div className="sr-kpi-val">{k.val}</div>
              <div className="sr-kpi-lbl">{k.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* View toggle + search */}
      <div className="sr-toolbar">
        <div className="sr-search">
          <Search size={14} />
          <input placeholder="Search supplier..." value={search} onChange={e => setSearch(e.target.value)} />
          {search && <button onClick={() => setSearch('')}><X size={12} /></button>}
        </div>
        <div className="sr-view-tabs">
          {['overview', 'orders'].map(v => (
            <button key={v} className={`sr-tab ${view === v ? 'active' : ''}`} onClick={() => setView(v)}>
              {v === 'overview' ? 'Supplier Overview' : 'Purchase Orders'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="sr-loading"><RefreshCw size={22} className="sr-spin" /><p>Loading...</p></div>
      ) : view === 'overview' ? (

        /* Supplier overview table */
        <div className="sr-table-wrap">
          <table className="sr-table">
            <thead>
              <tr>
                <th>Supplier</th><th>Category</th><th>Contact</th>
                <th>Approved</th><th>Total Orders</th><th>Total Spend</th>
                <th>On-Time Rate</th>
              </tr>
            </thead>
            <tbody>
              {enriched.length === 0 ? (
                <tr><td colSpan={7} className="sr-empty-row">No suppliers found</td></tr>
              ) : enriched.map(s => (
                <tr key={s.id} className="sr-row">
                  <td>
                    <div className="sr-supplier-cell">
                      <div className="sr-supplier-avatar">{s.name?.charAt(0)?.toUpperCase()}</div>
                      <div>
                        <div className="sr-supplier-name">{s.name}</div>
                        {s.city && <div className="sr-supplier-city">{s.city}</div>}
                      </div>
                    </div>
                  </td>
                  <td>{s.category || '—'}</td>
                  <td>
                    <div className="sr-contact">
                      {s.email && <div className="sr-contact-item">{s.email}</div>}
                      {s.phone && <div className="sr-contact-item">{s.phone}</div>}
                      {!s.email && !s.phone && <span className="sr-muted">—</span>}
                    </div>
                  </td>
                  <td>
                    {s.approved
                      ? <span className="sr-approved"><CheckCircle size={12} /> Approved</span>
                      : <span className="sr-pending"><Clock size={12} /> Pending</span>}
                  </td>
                  <td>{s.totalOrders}</td>
                  <td><span className="sr-spend">₹{s.totalSpend.toLocaleString('en-IN', {maximumFractionDigits:0})}</span></td>
                  <td>
                    {s.onTimeRate != null ? (
                      <div className="sr-rate-cell">
                        <div className="sr-rate-track">
                          <div className="sr-rate-fill" style={{ width: `${s.onTimeRate}%`, background: s.onTimeRate >= 80 ? '#10b981' : s.onTimeRate >= 60 ? '#f59e0b' : '#ef4444' }} />
                        </div>
                        <span style={{ color: s.onTimeRate >= 80 ? '#10b981' : s.onTimeRate >= 60 ? '#f59e0b' : '#ef4444', fontWeight:700, fontSize:12 }}>
                          {s.onTimeRate}%
                        </span>
                      </div>
                    ) : <span className="sr-muted">No orders</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      ) : (

        /* PO history table */
        <div className="sr-table-wrap">
          <table className="sr-table">
            <thead>
              <tr>
                <th>PO Number</th><th>Supplier</th><th>Date</th>
                <th>Items</th><th>Amount</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {pos.filter(p => !search || (p.supplierName||'').toLowerCase().includes(search.toLowerCase())).length === 0 ? (
                <tr><td colSpan={6} className="sr-empty-row">No purchase orders found</td></tr>
              ) : pos.filter(p => !search || (p.supplierName||'').toLowerCase().includes(search.toLowerCase())).map(p => {
                const sc = STATUS_COLORS[p.status] || STATUS_COLORS.DRAFT;
                return (
                  <tr key={p.id} className="sr-row">
                    <td><strong className="sr-po-num">{p.poNumber}</strong></td>
                    <td>{p.supplierName}</td>
                    <td className="sr-muted">{p.orderDate}</td>
                    <td>{p.itemCount} items</td>
                    <td><span className="sr-spend">₹{Number(p.totalAmount||0).toLocaleString('en-IN',{maximumFractionDigits:0})}</span></td>
                    <td><span className="sr-status" style={{ background: sc.bg, color: sc.color }}>{p.status}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <style>{`
        .sr-page { max-width:1100px; }
        .sr-header { display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px;flex-wrap:wrap;gap:10px; }
        .sr-title { display:flex;align-items:center;gap:8px;font-size:18px;font-weight:700;color:#1f2937;margin:0 0 3px; }
        .sr-sub { font-size:12px;color:#9ca3af;margin:0; }
        .sr-header-right { display:flex;gap:8px; }
        .sr-btn-ghost { display:flex;align-items:center;gap:5px;padding:7px 12px;background:#f0f2f7;border:1px solid #e2e6ef;border-radius:8px;font-size:12px;color:#374151;cursor:pointer;white-space:nowrap; }
        .sr-error { display:flex;align-items:center;gap:8px;padding:9px 12px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;color:#dc2626;font-size:13px;margin-bottom:14px; }
        .sr-kpis { display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:18px; }
        @media(max-width:700px){.sr-kpis{grid-template-columns:repeat(2,1fr);}}
        .sr-kpi { background:#fff;border-radius:12px;border:1px solid #e5e7eb;padding:14px;display:flex;align-items:center;gap:12px; }
        .sr-kpi-icon { width:38px;height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0; }
        .sr-kpi-val { font-size:20px;font-weight:800;color:#1f2937;line-height:1; }
        .sr-kpi-lbl { font-size:11px;color:#9ca3af;margin-top:2px; }
        .sr-toolbar { display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap;align-items:center; }
        .sr-search { display:flex;align-items:center;gap:7px;padding:8px 12px;background:#fff;border:1px solid #e5e7eb;border-radius:8px;flex:1;min-width:180px; }
        .sr-search:focus-within { border-color:#0061d2; }
        .sr-search input { border:none;outline:none;font-size:13px;flex:1;background:transparent;color:#1f2937; }
        .sr-search button { background:none;border:none;cursor:pointer;color:#9ca3af; }
        .sr-view-tabs { display:flex;gap:4px; }
        .sr-tab { padding:7px 14px;background:#f1f5f9;border:1px solid #e5e7eb;border-radius:20px;font-size:12px;font-weight:500;color:#64748b;cursor:pointer;transition:all .15s; }
        .sr-tab.active { background:#e8f0fd;border-color:#0061d2;color:#0061d2;font-weight:600; }
        .sr-table-wrap { background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;overflow-x:auto; }
        .sr-table { width:100%;border-collapse:collapse;min-width:600px; }
        .sr-table thead tr { background:#f8fafc;border-bottom:1px solid #e5e7eb; }
        .sr-table th { padding:10px 14px;text-align:left;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.5px; }
        .sr-row { border-bottom:1px solid #f1f5f9; }
        .sr-row:last-child { border-bottom:none; }
        .sr-row:hover { background:#fafafa; }
        .sr-table td { padding:12px 14px;font-size:13px;vertical-align:middle; }
        .sr-supplier-cell { display:flex;align-items:center;gap:10px; }
        .sr-supplier-avatar { width:32px;height:32px;background:rgba(0,97,210,.1);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:#0061d2;flex-shrink:0; }
        .sr-supplier-name { font-size:13px;font-weight:600;color:#1f2937; }
        .sr-supplier-city { font-size:11px;color:#9ca3af; }
        .sr-contact { display:flex;flex-direction:column;gap:2px; }
        .sr-contact-item { font-size:11px;color:#6b7280; }
        .sr-approved { display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:700;padding:3px 8px;background:#f0fdf4;color:#15803d;border-radius:20px; }
        .sr-pending  { display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:700;padding:3px 8px;background:#fefce8;color:#a16207;border-radius:20px; }
        .sr-spend { font-size:13px;font-weight:700;color:#0061d2; }
        .sr-rate-cell { display:flex;align-items:center;gap:8px; }
        .sr-rate-track { flex:1;height:5px;background:#f1f5f9;border-radius:3px;overflow:hidden;min-width:60px; }
        .sr-rate-fill { height:100%;border-radius:3px;transition:width .4s; }
        .sr-status { font-size:11px;font-weight:700;padding:3px 8px;border-radius:20px; }
        .sr-po-num { font-size:12px;font-family:monospace;color:#1f2937; }
        .sr-muted { font-size:12px;color:#9ca3af; }
        .sr-empty-row { text-align:center;padding:30px;color:#9ca3af;font-size:13px; }
        .sr-loading { display:flex;align-items:center;justify-content:center;gap:10px;padding:50px;color:#9ca3af;text-align:center;background:#fff;border-radius:12px;border:1px solid #e5e7eb; }
        .sr-spin { animation:sr-spin .8s linear infinite; }
        @keyframes sr-spin { to { transform:rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default SupplierReport;