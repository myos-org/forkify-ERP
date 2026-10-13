import React, { useState, useEffect, useCallback } from 'react';
import {
  Trash2, AlertTriangle, RefreshCw, Download,
  Calendar, X, Search,
  CheckCircle, Clock, XCircle, IndianRupee,
} from 'lucide-react';
import inventoryService from '../../../services/inventoryService';
import useBranch        from '../../../hooks/useBranch';

const REASON_LABELS = {
  EXPIRED:'Expired', DAMAGED:'Damaged', SPOILED:'Spoiled',
  OVERPRODUCTION:'Overproduction', QUALITY_ISSUE:'Quality Issue', OTHER:'Other',
};
const STATUS_CFG = {
  PENDING:  { label:'Pending',  bg:'#fef9c3', color:'#a16207', icon: Clock },
  APPROVED: { label:'Approved', bg:'#dcfce7', color:'#15803d', icon: CheckCircle },
  REJECTED: { label:'Rejected', bg:'#fee2e2', color:'#b91c1c', icon: XCircle },
};

const WastageReport = () => {
  const { branchId }      = useBranch();
  const [records,  setRecords]  = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);
  const [status,   setStatus]   = useState('all');
  const [search,   setSearch]   = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo,   setDateTo]   = useState('');

  const load = useCallback(async () => {
    if (!branchId) return;
    setLoading(true);
    try {
      const { data } = await inventoryService.getWastage(
        branchId,
        status !== 'all' ? status : null
      );
      setRecords(data || []);
    } catch { setError('Failed to load wastage data'); }
    finally  { setLoading(false); }
  }, [branchId, status]);

  useEffect(() => { load(); }, [load]);

  const filtered = records.filter(r => {
    const matchSearch = !search || r.ingredientName.toLowerCase().includes(search.toLowerCase());
    const matchFrom   = !dateFrom || (r.wastageDate && r.wastageDate >= dateFrom);
    const matchTo     = !dateTo   || (r.wastageDate && r.wastageDate <= dateTo);
    return matchSearch && matchFrom && matchTo;
  });

  // Aggregations
  const totalLoss     = filtered.filter(r => r.status === 'APPROVED').reduce((s, r) => s + parseFloat(r.costLoss || 0), 0);
  const pendingCount  = filtered.filter(r => r.status === 'PENDING').length;
  const approvedCount = filtered.filter(r => r.status === 'APPROVED').length;
  const byReason      = filtered.reduce((acc, r) => {
    acc[r.reason] = (acc[r.reason] || 0) + 1;
    return acc;
  }, {});
  const topReason = Object.entries(byReason).sort((a, b) => b[1] - a[1])[0];

  const exportCsv = () => {
    const rows = [
      ['Date', 'Ingredient', 'Unit', 'Quantity', 'Reason', 'Cost Loss', 'Status', 'Logged By', 'Approved By'],
      ...filtered.map(r => [r.wastageDate, r.ingredientName, r.unit, r.quantity, REASON_LABELS[r.reason] || r.reason, r.costLoss, r.status, r.loggedBy || '', r.approvedBy || '']),
    ];
    const csv  = rows.map(r => r.map(v => `"${v ?? ''}"`).join(',')).join('\n');
    const link = document.createElement('a');
    link.href  = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
    link.download = `wastage-report-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="wr-page">

      <div className="wr-header">
        <div>
          <h2 className="wr-title"><Trash2 size={20} /> Wastage Report</h2>
          <p className="wr-sub">Inventory losses by reason, status and cost impact</p>
        </div>
        <div className="wr-header-right">
          <button className="wr-btn-ghost" onClick={load} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'wr-spin' : ''} />
          </button>
          <button className="wr-btn-ghost" onClick={exportCsv}>
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {error && <div className="wr-error"><AlertTriangle size={14} />{error}<button onClick={() => setError(null)}>✕</button></div>}

      {/* KPI strip */}
      <div className="wr-kpis">
        {[
          { label: 'Total Approved Loss', val: `₹${totalLoss.toFixed(2)}`, icon: IndianRupee, color: '#ef4444' },
          { label: 'Approved Records',    val: approvedCount,               icon: CheckCircle, color: '#10b981' },
          { label: 'Pending Approval',    val: pendingCount,                icon: Clock,       color: '#f59e0b', urgent: pendingCount > 0 },
          { label: 'Top Reason',          val: topReason ? REASON_LABELS[topReason[0]] || topReason[0] : '—', icon: Trash2, color: '#6b7280' },
        ].map((k, i) => (
          <div key={i} className={`wr-kpi ${k.urgent ? 'urgent' : ''}`} style={{ '--c': k.color }}>
            <div className="wr-kpi-icon" style={{ background: k.color + '18', color: k.color }}><k.icon size={18} /></div>
            <div>
              <div className="wr-kpi-val">{k.val}</div>
              <div className="wr-kpi-lbl">{k.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Reason breakdown */}
      {Object.keys(byReason).length > 0 && (
        <div className="wr-breakdown">
          <h4 className="wr-breakdown-title">By Reason</h4>
          <div className="wr-reason-bars">
            {Object.entries(byReason).sort((a, b) => b[1] - a[1]).map(([reason, count]) => {
              const max = Math.max(...Object.values(byReason));
              return (
                <div key={reason} className="wr-reason-row">
                  <span className="wr-reason-lbl">{REASON_LABELS[reason] || reason}</span>
                  <div className="wr-reason-track">
                    <div className="wr-reason-fill" style={{ width: `${(count / max) * 100}%` }} />
                  </div>
                  <span className="wr-reason-count">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="wr-filters">
        <div className="wr-search">
          <Search size={14} />
          <input placeholder="Search ingredient..." value={search} onChange={e => setSearch(e.target.value)} />
          {search && <button onClick={() => setSearch('')}><X size={12} /></button>}
        </div>
        <div className="wr-status-tabs">
          {['all', 'PENDING', 'APPROVED', 'REJECTED'].map(s => (
            <button key={s} className={`wr-tab ${status === s ? 'active' : ''}`} onClick={() => setStatus(s)}>
              {s === 'all' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        <div className="wr-date-range">
          <Calendar size={13} />
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          <span>—</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          {(dateFrom || dateTo) && <button onClick={() => { setDateFrom(''); setDateTo(''); }}><X size={12} /></button>}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="wr-loading"><RefreshCw size={22} className="wr-spin" /><p>Loading...</p></div>
      ) : filtered.length === 0 ? (
        <div className="wr-empty"><Trash2 size={40} /><h3>No wastage records</h3><p>No records match your filters</p></div>
      ) : (
        <div className="wr-table-wrap">
          <table className="wr-table">
            <thead>
              <tr>
                <th>Date</th><th>Ingredient</th><th>Qty</th><th>Reason</th>
                <th>Cost Loss</th><th>Logged By</th><th>Approved By</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => {
                const sc = STATUS_CFG[r.status] || STATUS_CFG.PENDING;
                return (
                  <tr key={r.id} className="wr-row">
                    <td className="wr-date"><Calendar size={11} />{r.wastageDate}</td>
                    <td><strong>{r.ingredientName}</strong></td>
                    <td>{r.quantity} {r.unit}</td>
                    <td><span className="wr-reason-chip">{REASON_LABELS[r.reason] || r.reason}</span></td>
                    <td><span className="wr-loss">₹{parseFloat(r.costLoss || 0).toFixed(2)}</span></td>
                    <td className="wr-muted">{r.loggedBy || '—'}</td>
                    <td className="wr-muted">{r.approvedBy || '—'}</td>
                    <td>
                      <span className="wr-status" style={{ background: sc.bg, color: sc.color }}>
                        <sc.icon size={11} />{sc.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="wr-footer">
            {filtered.length} record{filtered.length !== 1 ? 's' : ''} · Total approved loss: <strong>₹{totalLoss.toFixed(2)}</strong>
          </div>
        </div>
      )}

      <style>{`
        .wr-page { max-width:1100px; }
        .wr-header { display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px;flex-wrap:wrap;gap:10px; }
        .wr-title { display:flex;align-items:center;gap:8px;font-size:18px;font-weight:700;color:#1f2937;margin:0 0 3px; }
        .wr-sub { font-size:12px;color:#9ca3af;margin:0; }
        .wr-header-right { display:flex;gap:8px; }
        .wr-btn-ghost { display:flex;align-items:center;gap:5px;padding:7px 12px;background:#f0f2f7;border:1px solid #e2e6ef;border-radius:8px;font-size:12px;color:#374151;cursor:pointer;white-space:nowrap; }
        .wr-error { display:flex;align-items:center;gap:8px;padding:9px 12px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;color:#dc2626;font-size:13px;margin-bottom:14px; }
        .wr-error button { margin-left:auto;background:none;border:none;cursor:pointer;font-size:15px; }
        .wr-kpis { display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:18px; }
        @media(max-width:700px){.wr-kpis{grid-template-columns:repeat(2,1fr);}}
        .wr-kpi { background:#fff;border-radius:12px;border:1px solid #e5e7eb;padding:14px;display:flex;align-items:center;gap:12px;position:relative; }
        .wr-kpi.urgent { border-color:var(--c); }
        .wr-kpi-icon { width:38px;height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0; }
        .wr-kpi-val { font-size:20px;font-weight:800;color:#1f2937;line-height:1; }
        .wr-kpi-lbl { font-size:11px;color:#9ca3af;margin-top:2px; }
        .wr-breakdown { background:#fff;border-radius:12px;border:1px solid #e5e7eb;padding:16px;margin-bottom:16px; }
        .wr-breakdown-title { font-size:13px;font-weight:700;color:#374151;margin:0 0 12px; }
        .wr-reason-bars { display:flex;flex-direction:column;gap:8px; }
        .wr-reason-row { display:grid;grid-template-columns:120px 1fr 30px;gap:8px;align-items:center; }
        .wr-reason-lbl { font-size:12px;color:#6b7280; }
        .wr-reason-track { height:6px;background:#f1f5f9;border-radius:3px;overflow:hidden; }
        .wr-reason-fill { height:100%;background:#ef4444;border-radius:3px;transition:width .4s; }
        .wr-reason-count { font-size:12px;font-weight:700;color:#374151;text-align:right; }
        .wr-filters { display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap;align-items:center; }
        .wr-search { display:flex;align-items:center;gap:7px;padding:8px 12px;background:#fff;border:1px solid #e5e7eb;border-radius:8px;flex:1;min-width:180px; }
        .wr-search:focus-within { border-color:#0061d2; }
        .wr-search input { border:none;outline:none;font-size:13px;flex:1;background:transparent;color:#1f2937; }
        .wr-search button { background:none;border:none;cursor:pointer;color:#9ca3af; }
        .wr-status-tabs { display:flex;gap:4px; }
        .wr-tab { padding:6px 12px;background:#f1f5f9;border:1px solid #e5e7eb;border-radius:20px;font-size:12px;font-weight:500;color:#64748b;cursor:pointer;transition:all .15s; }
        .wr-tab.active { background:#e8f0fd;border-color:#0061d2;color:#0061d2;font-weight:600; }
        .wr-date-range { display:flex;align-items:center;gap:6px;font-size:12px;color:#6b7280; }
        .wr-date-range input { padding:6px 8px;border:1px solid #e5e7eb;border-radius:7px;font-size:12px;color:#1f2937;outline:none; }
        .wr-date-range button { background:none;border:none;cursor:pointer;color:#9ca3af; }
        .wr-table-wrap { background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden; }
        .wr-table { width:100%;border-collapse:collapse; }
        .wr-table thead tr { background:#f8fafc;border-bottom:1px solid #e5e7eb; }
        .wr-table th { padding:10px 14px;text-align:left;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.5px; }
        .wr-row { border-bottom:1px solid #f1f5f9; }
        .wr-row:last-child { border-bottom:none; }
        .wr-row:hover { background:#fafafa; }
        .wr-table td { padding:11px 14px;font-size:13px;vertical-align:middle; }
        .wr-date { display:inline-flex;align-items:center;gap:4px;font-size:12px;color:#6b7280; }
        .wr-reason-chip { font-size:11px;font-weight:600;padding:2px 7px;background:#e8f0fd;color:#0052b3;border-radius:4px; }
        .wr-loss { font-size:13px;font-weight:700;color:#ef4444; }
        .wr-muted { font-size:12px;color:#9ca3af; }
        .wr-status { display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:700;padding:3px 8px;border-radius:20px; }
        .wr-footer { padding:10px 14px;font-size:12px;color:#9ca3af;border-top:1px solid #f1f5f9; }
        .wr-footer strong { color:#1f2937; }
        .wr-loading,.wr-empty { display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:50px;color:#9ca3af;text-align:center;background:#fff;border-radius:12px;border:1px solid #e5e7eb; }
        .wr-empty h3 { font-size:16px;font-weight:600;color:#374151;margin:0; }
        .wr-empty p { font-size:13px;margin:0; }
        .wr-spin { animation:wr-spin .8s linear infinite; }
        @keyframes wr-spin { to { transform:rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default WastageReport;