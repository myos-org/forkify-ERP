import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowRightCircle, Search, RefreshCw,
  Package, ChefHat, X,
} from 'lucide-react';
import inventoryService from '../../../services/inventoryService';
import useBranch        from '../../../hooks/useBranch';
import { useNavigate }  from 'react-router-dom';

const StockOut = () => {
  const navigate        = useNavigate();
  const { branchId }    = useBranch();

  const [transactions, setTransactions] = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [search,       setSearch]       = useState('');
  const [error,        setError]        = useState(null);

  const load = useCallback(async () => {
    if (!branchId) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await inventoryService.getTransactions(branchId, 'STOCK_OUT');
      setTransactions(data || []);
    } catch {
      setError('Failed to load stock-out records');
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => { load(); }, [load]);

  const filtered = transactions.filter(t =>
    !search || t.ingredientName?.toLowerCase().includes(search.toLowerCase())
      || (t.notes || '').toLowerCase().includes(search.toLowerCase())
      || (t.referenceNo || '').toLowerCase().includes(search.toLowerCase())
  );

  const totalQty  = filtered.reduce((s, t) => s + (t.quantity || 0), 0);
  const totalCost = filtered.reduce((s, t) => {
    const cost = (t.unitCost || 0) * (t.quantity || 0);
    return s + cost;
  }, 0);

  return (
    <div className="so-page">
      <style>{`
        .so-page { font-family:'DM Sans',sans-serif; color:#1f2937; }
        .so-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:20px; flex-wrap:wrap; gap:12px; }
        .so-title  { display:flex; align-items:center; gap:10px; }
        .so-title h2 { font-size:20px; font-weight:700; color:#1f2937; margin:0; }
        .so-title-icon { width:36px; height:36px; background:rgba(0,97,210,.15); border-radius:10px; display:flex; align-items:center; justify-content:center; color:#3385e0; }
        .so-header-right { display:flex; gap:8px; }
        .so-btn-outline { display:flex; align-items:center; gap:6px; padding:8px 14px; background:#f8f9fc; border:1px solid #e2e6ef; border-radius:9px; color:#4b5263; font-size:13px; cursor:pointer; transition:all .15s; }
        .so-btn-outline:hover { background:#e2e6ef; color:#0052b3; }

        .so-stats { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; margin-bottom:20px; }
        .so-stat  { background:#ffffff; border:1px solid #e2e6ef; border-radius:14px; padding:16px 20px; }
        .so-stat-label { font-size:11px; font-weight:600; letter-spacing:.5px; text-transform:uppercase; color:#9aa3b4; margin-bottom:8px; }
        .so-stat-val   { font-size:24px; font-weight:800; color:#1f2937; }
        .so-stat-sub   { font-size:12px; color:#9aa3b4; margin-top:2px; }

        .so-toolbar { display:flex; gap:10px; margin-bottom:16px; flex-wrap:wrap; }
        .so-search  { flex:1; min-width:200px; display:flex; align-items:center; gap:8px; background:#f8f9fc; border:1px solid #e2e6ef; border-radius:9px; padding:0 12px; }
        .so-search input { background:none; border:none; outline:none; color:#1f2937; font-size:13px; width:100%; padding:9px 0; }
        .so-search input::placeholder { color:#9aa3b4; }
        .so-search svg { color:#9aa3b4; flex-shrink:0; }

        .so-table-wrap { background:#ffffff; border:1px solid #e2e6ef; border-radius:14px; overflow:hidden; }
        .so-table { width:100%; border-collapse:collapse; }
        .so-th  { padding:11px 16px; font-size:11px; font-weight:700; letter-spacing:.5px; text-transform:uppercase; color:#9aa3b4; text-align:left; border-bottom:1px solid #e2e6ef; white-space:nowrap; }
        .so-td  { padding:12px 16px; font-size:13px; color:#2e3344; border-bottom:1px solid #f0f2f7; vertical-align:middle; }
        .so-tr:last-child .so-td { border-bottom:none; }
        .so-tr:hover .so-td { background:#fafbfc; }
        .so-ing-name  { font-weight:600; color:#1f2937; display:flex; align-items:center; gap:6px; }
        .so-ref-note  { font-size:11px; color:#9aa3b4; margin-top:2px; }
        .so-qty-cell  { font-weight:700; color:#3385e0; }
        .so-cost-cell { font-weight:600; color:#3385e0; }
        .so-date-cell { font-size:12px; color:#9aa3b4; white-space:nowrap; }
        .so-empty { text-align:center; padding:48px 20px; color:#9aa3b4; }
        .so-empty-icon { font-size:40px; margin-bottom:10px; }
        .so-error { background:rgba(239,68,68,.1); border:1px solid rgba(239,68,68,.25); border-radius:10px; padding:12px 16px; color:#fca5a5; font-size:13px; margin-bottom:16px; }
        .so-loading { text-align:center; padding:40px; color:#9aa3b4; display:flex; align-items:center; justify-content:center; gap:8px; }
        .spin { animation:spin .8s linear infinite; }
        @keyframes spin { to { transform:rotate(360deg); } }
        @media(max-width:600px) { .so-stats { grid-template-columns:1fr 1fr; } }
      `}</style>

      {/* Header */}
      <div className="so-header">
        <div className="so-title">
          <div className="so-title-icon"><ArrowRightCircle size={18} /></div>
          <div>
            <h2>Stock Out</h2>
            <div style={{ fontSize:12, color:'#9aa3b4', marginTop:2 }}>
              Auto-generated from production logs
            </div>
          </div>
        </div>
        <div className="so-header-right">
          <button className="so-btn-outline" onClick={load}>
            <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
          </button>
          <button className="so-btn-outline" onClick={() => navigate('/fooderp/recipes/list')}>
            <ChefHat size={14} /> Log Production
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="so-stats">
        <div className="so-stat">
          <div className="so-stat-label">Total Records</div>
          <div className="so-stat-val">{filtered.length}</div>
          <div className="so-stat-sub">STOCK_OUT transactions</div>
        </div>
        <div className="so-stat">
          <div className="so-stat-label">Total Qty Consumed</div>
          <div className="so-stat-val">{totalQty.toFixed(2)}</div>
          <div className="so-stat-sub">across all ingredients</div>
        </div>
        <div className="so-stat">
          <div className="so-stat-label">Total Cost</div>
          <div className="so-stat-val">₹{totalCost.toFixed(2)}</div>
          <div className="so-stat-sub">production cost</div>
        </div>
      </div>

      {error && <div className="so-error">{error}</div>}

      {/* Toolbar */}
      <div className="so-toolbar">
        <div className="so-search">
          <Search size={14} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search ingredient, recipe, reference..."
          />
          {search && (
            <button style={{ background:'none',border:'none',cursor:'pointer',color:'#9aa3b4' }}
              onClick={() => setSearch('')}>
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="so-table-wrap">
        {loading ? (
          <div className="so-loading">
            <RefreshCw size={20} className="spin" />
            <span>Loading transactions...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="so-empty">
            <div className="so-empty-icon">📦</div>
            <div>No stock-out records yet</div>
            <div style={{ fontSize:12, marginTop:6 }}>
              Stock-out entries are auto-created when you log production
            </div>
          </div>
        ) : (
          <table className="so-table">
            <thead>
              <tr>
                <th className="so-th">Ingredient</th>
                <th className="so-th">Qty Used</th>
                <th className="so-th">Unit Cost</th>
                <th className="so-th">Total Cost</th>
                <th className="so-th">Balance After</th>
                <th className="so-th">Date</th>
                <th className="so-th">Logged By</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(tx => (
                <tr key={tx.id} className="so-tr">
                  <td className="so-td">
                    <div className="so-ing-name">
                      <Package size={13} style={{ color:'#3385e0', flexShrink:0 }} />
                      {tx.ingredientName}
                    </div>
                    {tx.notes && <div className="so-ref-note">{tx.notes}</div>}
                    {tx.referenceNo && (
                      <div className="so-ref-note">Ref: {tx.referenceNo}</div>
                    )}
                  </td>
                  <td className="so-td">
                    <span className="so-qty-cell">
                      {Number(tx.quantity).toFixed(3)} {tx.unit}
                    </span>
                  </td>
                  <td className="so-td">
                    ₹{Number(tx.unitCost || 0).toFixed(2)}
                  </td>
                  <td className="so-td">
                    <span className="so-cost-cell">
                      ₹{(Number(tx.unitCost || 0) * Number(tx.quantity || 0)).toFixed(2)}
                    </span>
                  </td>
                  <td className="so-td">
                    {Number(tx.balanceAfter || 0).toFixed(3)} {tx.unit}
                  </td>
                  <td className="so-td">
                    <span className="so-date-cell">
                      {tx.transactionDate || tx.createdAt?.split('T')[0] || '—'}
                    </span>
                  </td>
                  <td className="so-td" style={{ fontSize:12, color:'#9aa3b4' }}>
                    {tx.createdBy || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default StockOut;
