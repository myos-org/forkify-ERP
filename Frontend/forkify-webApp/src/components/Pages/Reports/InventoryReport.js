import React, { useState, useEffect, useCallback } from 'react';
import {
  Package, AlertTriangle,
  RefreshCw, Download, Search, Filter, X,
} from 'lucide-react';
import inventoryService from '../../../services/inventoryService';
import useBranch        from '../../../hooks/useBranch';

const InventoryReport = () => {
  const { branchId }       = useBranch();
  const [items,    setItems]    = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);
  const [search,   setSearch]   = useState('');
  const [catFilter,setCatFilter]= useState('all');

  const load = useCallback(async () => {
    if (!branchId) return;
    setLoading(true);
    try {
      const { data } = await inventoryService.getAll(branchId);
      setItems(data || []);
    } catch { setError('Failed to load inventory data'); }
    finally  { setLoading(false); }
  }, [branchId]);

  useEffect(() => { load(); }, [load]);

  const categories = [...new Set(items.map(i => i.category))].sort();

  const filtered = items.filter(i => {
    const ms = !search || i.ingredientName.toLowerCase().includes(search.toLowerCase());
    const mc = catFilter === 'all' || i.category === catFilter;
    return ms && mc;
  });

  const totalValue   = filtered.reduce((s, i) => s + parseFloat(i.totalValue || 0), 0);
  const lowCount     = filtered.filter(i => i.currentQuantity < i.minStockLevel).length;
  const goodCount    = filtered.filter(i => i.currentQuantity >= i.minStockLevel).length;

  const exportCsv = () => {
    const rows = [
      ['Ingredient','Category','Unit','Current Stock','Min Level','Status','Unit Cost','Total Value','Expiry'],
      ...filtered.map(i => [i.ingredientName, i.category, i.unit, i.currentQuantity, i.minStockLevel, i.status, i.unitCost, i.totalValue, i.expiryDate || '']),
    ];
    const csv  = rows.map(r => r.map(v => `"${v ?? ''}"`).join(',')).join('\n');
    const link = document.createElement('a');
    link.href  = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
    link.download = `inventory-report-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const STATUS_CFG = {
    GOOD:         { color:'#15803d', bg:'#dcfce7' },
    WARNING:      { color:'#a16207', bg:'#fef9c3' },
    LOW:          { color:'#0052b3', bg:'#e8f0fd' },
    CRITICAL:     { color:'#b91c1c', bg:'#fee2e2' },
    OUT_OF_STOCK: { color:'#475569', bg:'#f1f5f9' },
  };

  return (
    <div className="ir-page">
      <div className="ir-header">
        <div>
          <h2 className="ir-title"><Package size={20} /> Inventory Report</h2>
          <p className="ir-sub">Current stock levels, values and status</p>
        </div>
        <div className="ir-header-right">
          <button className="ir-btn" onClick={load} disabled={loading}><RefreshCw size={13} className={loading?'ir-spin':''} /></button>
          <button className="ir-btn" onClick={exportCsv}><Download size={13} /> Export</button>
        </div>
      </div>

      {error && <div className="ir-error"><AlertTriangle size={14} />{error}</div>}

      <div className="ir-kpis">
        {[
          { label:'Total Items',    val: filtered.length,             color:'#3b82f6' },
          { label:'Total Value',    val: `₹${totalValue.toLocaleString('en-IN',{maximumFractionDigits:0})}`, color:'#10b981' },
          { label:'Low / Critical', val: lowCount,                    color:'#ef4444', urgent: lowCount > 0 },
          { label:'Well Stocked',   val: goodCount,                   color:'#10b981' },
        ].map((k,i)=>(
          <div key={i} className="ir-kpi" style={{ borderTop:`3px solid ${k.color}` }}>
            <div className="ir-kpi-val" style={{ color:k.color }}>{k.val}</div>
            <div className="ir-kpi-lbl">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="ir-filters">
        <div className="ir-search">
          <Search size={13}/><input placeholder="Search ingredient..." value={search} onChange={e=>setSearch(e.target.value)}/>
          {search && <button onClick={()=>setSearch('')}><X size={11}/></button>}
        </div>
        <div className="ir-cat">
          <Filter size={13}/>
          <select value={catFilter} onChange={e=>setCatFilter(e.target.value)}>
            <option value="all">All Categories</option>
            {categories.map(c=><option key={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="ir-loading"><RefreshCw size={22} className="ir-spin"/><p>Loading...</p></div>
      ) : (
        <div className="ir-table-wrap">
          <table className="ir-table">
            <thead>
              <tr><th>Ingredient</th><th>Category</th><th>Current Stock</th><th>Min Level</th><th>Unit Cost</th><th>Total Value</th><th>Expiry</th><th>Status</th></tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="ir-empty-row">No items found</td></tr>
              ) : filtered.map(item => {
                const sc = STATUS_CFG[item.status] || STATUS_CFG.GOOD;
                const pct = item.minStockLevel > 0 ? Math.min(100,(item.currentQuantity/item.minStockLevel)*100) : 100;
                return (
                  <tr key={item.id} className="ir-row">
                    <td><strong>{item.ingredientName}</strong></td>
                    <td><span className="ir-cat-chip">{item.category}</span></td>
                    <td>
                      <div className="ir-stock-cell">
                        <span>{item.currentQuantity} {item.unit}</span>
                        <div className="ir-bar-track"><div className="ir-bar-fill" style={{width:`${pct}%`,background:item.status==='CRITICAL'?'#ef4444':item.status==='LOW'?'#f59e0b':'#10b981'}}/></div>
                      </div>
                    </td>
                    <td>{item.minStockLevel} {item.unit}</td>
                    <td>₹{parseFloat(item.unitCost||0).toFixed(2)}</td>
                    <td className="ir-value">₹{parseFloat(item.totalValue||0).toLocaleString('en-IN',{maximumFractionDigits:0})}</td>
                    <td className="ir-muted">{item.expiryDate || '—'}</td>
                    <td><span className="ir-status" style={{background:sc.bg,color:sc.color}}>{item.status?.replace('_',' ')}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="ir-footer">{filtered.length} items · Total value: <strong>₹{totalValue.toLocaleString('en-IN',{maximumFractionDigits:0})}</strong></div>
        </div>
      )}

      <style>{`
        .ir-page { max-width:1100px; }
        .ir-header { display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;flex-wrap:wrap;gap:10px; }
        .ir-title { display:flex;align-items:center;gap:7px;font-size:18px;font-weight:700;color:#1f2937;margin:0 0 3px; }
        .ir-sub { font-size:12px;color:#9ca3af;margin:0; }
        .ir-header-right { display:flex;gap:8px; }
        .ir-btn { display:flex;align-items:center;gap:5px;padding:7px 12px;background:#f0f2f7;border:1px solid #e2e6ef;border-radius:8px;font-size:12px;color:#374151;cursor:pointer;white-space:nowrap; }
        .ir-error { display:flex;align-items:center;gap:8px;padding:9px 12px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;color:#dc2626;font-size:13px;margin-bottom:12px; }
        .ir-kpis { display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px; }
        @media(max-width:700px){.ir-kpis{grid-template-columns:repeat(2,1fr);}}
        .ir-kpi { background:#fff;border-radius:12px;border:1px solid #e5e7eb;padding:14px;text-align:center; }
        .ir-kpi-val { font-size:22px;font-weight:800;margin-bottom:4px; }
        .ir-kpi-lbl { font-size:11px;color:#9ca3af; }
        .ir-filters { display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap; }
        .ir-search { display:flex;align-items:center;gap:7px;padding:8px 12px;background:#fff;border:1px solid #e5e7eb;border-radius:8px;flex:1;min-width:180px; }
        .ir-search:focus-within { border-color:#0061d2; }
        .ir-search input { border:none;outline:none;font-size:13px;flex:1;background:transparent;color:#1f2937; }
        .ir-search button { background:none;border:none;cursor:pointer;color:#9ca3af; }
        .ir-cat { display:flex;align-items:center;gap:7px;padding:8px 12px;background:#fff;border:1px solid #e5e7eb;border-radius:8px;color:#6b7280; }
        .ir-cat select { border:none;outline:none;font-size:13px;color:#1f2937;background:transparent;cursor:pointer; }
        .ir-table-wrap { background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden; }
        .ir-table { width:100%;border-collapse:collapse; }
        .ir-table thead tr { background:#f8fafc;border-bottom:1px solid #e5e7eb; }
        .ir-table th { padding:10px 14px;text-align:left;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.5px; }
        .ir-row { border-bottom:1px solid #f1f5f9; }
        .ir-row:last-child { border-bottom:none; }
        .ir-row:hover { background:#fafafa; }
        .ir-table td { padding:11px 14px;font-size:13px;vertical-align:middle; }
        .ir-cat-chip { font-size:11px;font-weight:600;padding:2px 7px;background:#f0f9ff;color:#0369a1;border-radius:20px; }
        .ir-stock-cell { display:flex;flex-direction:column;gap:3px; }
        .ir-bar-track { height:4px;background:#f1f5f9;border-radius:2px;overflow:hidden;width:80px; }
        .ir-bar-fill { height:100%;border-radius:2px;transition:width .3s; }
        .ir-value { font-weight:600;color:#10b981; }
        .ir-muted { font-size:12px;color:#9ca3af; }
        .ir-status { font-size:11px;font-weight:700;padding:3px 8px;border-radius:20px; }
        .ir-footer { padding:10px 14px;font-size:12px;color:#9ca3af;border-top:1px solid #f1f5f9; }
        .ir-footer strong { color:#1f2937; }
        .ir-empty-row { text-align:center;padding:30px;color:#9ca3af;font-size:13px; }
        .ir-loading { display:flex;align-items:center;justify-content:center;gap:10px;padding:48px;color:#9ca3af;background:#fff;border-radius:12px;border:1px solid #e5e7eb; }
        .ir-spin { animation:ir-spin .8s linear infinite; }
        @keyframes ir-spin { to { transform:rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default InventoryReport;