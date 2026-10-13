import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield, Search, RefreshCw, X,
  ChevronDown, Calendar, AlertTriangle,
} from 'lucide-react';
import adminService from '../../../services/adminService';

const ACTION_COLORS = {
  CREATE: { bg:'rgba(16,185,129,.12)', color:'#34d399' },
  UPDATE: { bg:'rgba(0,97,210,.12)', color:'#3385e0' },
  DELETE: { bg:'rgba(239,68,68,.12)',  color:'#f87171' },
  APPROVE:{ bg:'rgba(16,185,129,.12)', color:'#34d399' },
  REJECT: { bg:'rgba(239,68,68,.12)',  color:'#f87171' },
  LOGIN:  { bg:'rgba(251,191,36,.12)', color:'#fbbf24' },
  LOGOUT: { bg:'#e2e6ef',color:'#9aa3b4' },
};

const AuditLogs = () => {
  const [logs,       setLogs]       = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState(null);
  const [search,     setSearch]     = useState('');
  const [action,     setAction]     = useState('');
  const [entityType, setEntityType] = useState('');
  const [from,       setFrom]       = useState('');
  const [to,         setTo]         = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const { data } = await adminService.getAuditLogs({
        username:   search     || undefined,
        action:     action     || undefined,
        entityType: entityType || undefined,
        from:       from       || undefined,
        to:         to         || undefined,
      });
      setLogs(data || []);
    } catch { setError('Failed to load audit logs'); }
    finally  { setLoading(false); }
  }, [search, action, entityType, from, to]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []); // load once on mount
  // Manual search on button click

  const clearFilters = () => {
    setSearch(''); setAction(''); setEntityType(''); setFrom(''); setTo('');
  };

  const hasFilters = search || action || entityType || from || to;

  const entityTypes = [...new Set(logs.map(l => l.entityType).filter(Boolean))];

  return (
    <div className="al-page">
      <style>{css}</style>

      <div className="al-header">
        <div className="al-title-wrap">
          <div className="al-icon"><Shield size={18}/></div>
          <div>
            <h2 className="al-title">Audit Logs</h2>
            <div className="al-sub">All system write operations — last 100 by default</div>
          </div>
        </div>
        <button className="al-btn-outline" onClick={load}>
          <RefreshCw size={13} className={loading ? 'spin':''}/>
        </button>
      </div>

      {error && <div className="al-error"><AlertTriangle size={13}/>{error}</div>}

      {/* Filters */}
      <div className="al-filters">
        <div className="al-search">
          <Search size={13}/>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Filter by username..." onKeyDown={e => e.key === 'Enter' && load()}/>
        </div>
        <div className="al-sel-wrap">
          <select className="al-select" value={action} onChange={e => setAction(e.target.value)}>
            <option value="">All Actions</option>
            {['CREATE','UPDATE','DELETE','APPROVE','REJECT','LOGIN','LOGOUT'].map(a =>
              <option key={a} value={a}>{a}</option>)}
          </select>
          <ChevronDown size={12} className="al-sel-icon"/>
        </div>
        <div className="al-sel-wrap">
          <select className="al-select" value={entityType} onChange={e => setEntityType(e.target.value)}>
            <option value="">All Entities</option>
            {entityTypes.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
          <ChevronDown size={12} className="al-sel-icon"/>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:5 }}>
          <Calendar size={12} style={{ color:'#9aa3b4' }}/>
          <input className="al-date-input" type="date" value={from} onChange={e => setFrom(e.target.value)} title="From date"/>
          <span style={{ color:'#9aa3b4', fontSize:11 }}>–</span>
          <input className="al-date-input" type="date" value={to} onChange={e => setTo(e.target.value)} title="To date"/>
        </div>
        <button className="al-search-btn" onClick={load}><Search size={13}/> Search</button>
        {hasFilters && (
          <button className="al-clear-btn" onClick={clearFilters}><X size={12}/> Clear</button>
        )}
      </div>

      {/* Table */}
      <div className="al-table-wrap">
        {loading ? (
          <div className="al-loading"><RefreshCw size={18} className="spin"/> Loading logs...</div>
        ) : logs.length === 0 ? (
          <div className="al-empty"><Shield size={36}/><p>No audit logs found</p></div>
        ) : (
          <table className="al-table">
            <thead>
              <tr>
                <th className="al-th">Timestamp</th>
                <th className="al-th">User</th>
                <th className="al-th">Action</th>
                <th className="al-th">Entity</th>
                <th className="al-th">Details</th>
                <th className="al-th">Branch</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => {
                const ac = ACTION_COLORS[log.action] || ACTION_COLORS.UPDATE;
                return (
                  <tr key={log.id} className="al-tr">
                    <td className="al-td al-ts">
                      {log.createdAt?.replace('T', ' ').substring(0, 19)}
                    </td>
                    <td className="al-td">
                      <div className="al-username">{log.username || '—'}</div>
                    </td>
                    <td className="al-td">
                      <span className="al-action-badge" style={{ background:ac.bg, color:ac.color }}>
                        {log.action}
                      </span>
                    </td>
                    <td className="al-td">
                      <div className="al-entity">{log.entityType}</div>
                      {log.entityName && <div className="al-entity-name">{log.entityName}</div>}
                    </td>
                    <td className="al-td al-details">{log.details || '—'}</td>
                    <td className="al-td al-branch">{log.branchName || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

const css = `
  .al-page { font-family:'DM Sans',sans-serif; color:#1f2937; }
  .al-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; flex-wrap:wrap; gap:10px; }
  .al-title-wrap { display:flex; align-items:center; gap:12px; }
  .al-icon  { width:38px; height:38px; background:rgba(0,97,210,.12); border-radius:10px; display:flex; align-items:center; justify-content:center; color:#3385e0; }
  .al-title { font-size:20px; font-weight:700; color:#1f2937; margin:0 0 2px; }
  .al-sub   { font-size:12px; color:#9aa3b4; }
  .al-btn-outline { display:flex; align-items:center; gap:6px; padding:8px 10px; background:#ffffff; border:1px solid #e2e6ef; border-radius:9px; color:#9aa3b4; cursor:pointer; }
  .al-error { display:flex; align-items:center; gap:8px; background:rgba(239,68,68,.1); border:1px solid rgba(239,68,68,.25); border-radius:10px; padding:10px 14px; color:#fca5a5; font-size:13px; margin-bottom:14px; }
  .al-filters { display:flex; gap:8px; margin-bottom:14px; flex-wrap:wrap; align-items:center; }
  .al-search { display:flex; align-items:center; gap:8px; background:#f8f9fc; border:1px solid #e2e6ef; border-radius:9px; padding:0 12px; min-width:180px; }
  .al-search input { background:none; border:none; outline:none; color:#1f2937; font-size:13px; padding:8px 0; width:100%; }
  .al-search input::placeholder { color:#9aa3b4; }
  .al-sel-wrap { position:relative; }
  .al-select { appearance:none; background:#f0f2f7; border:1px solid #e2e6ef; border-radius:9px; padding:8px 28px 8px 12px; color:#1f2937; font-size:13px; outline:none; cursor:pointer; }
  .al-sel-icon { position:absolute; right:8px; top:50%; transform:translateY(-50%); color:#9aa3b4; pointer-events:none; }
  .al-date-input { background:#f0f2f7; border:1px solid #e2e6ef; border-radius:9px; padding:7px 10px; color:#1f2937; font-size:12px; outline:none; width:130px; }
  .al-search-btn { display:flex; align-items:center; gap:5px; padding:8px 13px; background:#e8f0fd; border:1px solid #b3ccf5; border-radius:9px; color:#0052b3; font-size:13px; font-weight:600; cursor:pointer; white-space:nowrap; }
  .al-search-btn:hover { background:#d4e4fb; }
  .al-clear-btn { display:flex; align-items:center; gap:5px; padding:8px 12px; background:#f8f9fc; border:1px solid #e2e6ef; border-radius:9px; color:#374151; font-size:13px; cursor:pointer; }
  .al-table-wrap { background:#ffffff; border:1px solid #e2e6ef; border-radius:14px; overflow:hidden; overflow-x:auto; }
  .al-table { width:100%; border-collapse:collapse; min-width:800px; }
  .al-th { padding:10px 14px; font-size:11px; font-weight:700; letter-spacing:.5px; text-transform:uppercase; color:#9aa3b4; text-align:left; border-bottom:1px solid #e2e6ef; background:#fafbfc; white-space:nowrap; }
  .al-td { padding:11px 14px; font-size:12.5px; color:#9aa3b4; border-bottom:1px solid #f0f2f7; vertical-align:middle; }
  .al-tr:last-child .al-td { border-bottom:none; }
  .al-tr:hover .al-td { background:#fafbfc; }
  .al-ts { font-family:monospace; font-size:11.5px; color:#9aa3b4; white-space:nowrap; }
  .al-username { font-weight:600; color:#1f2937; }
  .al-action-badge { display:inline-block; font-size:10px; font-weight:700; letter-spacing:.4px; padding:2px 7px; border-radius:4px; text-transform:uppercase; }
  .al-entity { font-weight:600; color:#1f2937; font-size:12.5px; }
  .al-entity-name { font-size:11px; color:#9aa3b4; margin-top:2px; }
  .al-details { font-size:12px; color:#9aa3b4; max-width:220px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .al-branch { font-size:12px; color:#9aa3b4; }
  .al-loading,.al-empty { text-align:center; padding:40px; color:#9aa3b4; display:flex; align-items:center; justify-content:center; gap:8px; flex-direction:column; }
  .spin { animation:spin .8s linear infinite; }
  @keyframes spin { to { transform:rotate(360deg); } }
`;

export default AuditLogs;
