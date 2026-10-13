import React, { useState, useEffect, useCallback } from 'react';
import {
  ShoppingCart, Plus, Trash2, RefreshCw, AlertTriangle,
  CheckCircle, IndianRupee, ChefHat, Calendar, X,
  ChevronDown, Search, Users, Award, Package,
  QrCode, Hash, ChevronUp, Zap, AlertCircle,
} from 'lucide-react';
import { salesService }   from '../../../services/dashboardService';
import recipeService       from '../../../services/recipeService';
import menuService         from '../../../services/menuService';
import productionService   from '../../../services/productionService';
import { customerService } from '../../../services/newServices';
import useBranch           from '../../../hooks/useBranch';
import { useNavigate }     from 'react-router-dom';

const emptyLine = () => ({
  recipeId: '', menuItemId: '', quantitySold: 1, sellingPrice: '', notes: '', customerId: ''
});

const TIER_COLOR = { GOLD: '#a16207', SILVER: '#475569', BRONZE: '#0052b3' };

// ── Parse [QR-ORDER:...] metadata from a notes string ──────────────────────
function parseQRNote(notes) {
  if (!notes) return null;
  const match = notes.match(/\[QR-ORDER:([^\]]+)\]/);
  if (!match) return null;
  return {
    orderNum: match[1],
    table:    notes.match(/Table:([^\s[]+)/)?.[1] || null,
    guest:    notes.match(/Guest:([^[]+?)(\s+\[|$)/)?.[1]?.trim() || null,
  };
}

// ── QR Orders Panel ────────────────────────────────────────────────────────
// Smart logic:
//   availableServings >= qty  → "Fulfil Now" (direct log sales, no production needed)
//   availableServings > 0
//     but < qty               → split: log sales for available portion,
//                               log production for the remaining gap then log sales
//   availableServings === 0   → "Log Production" first, then sales
function QROrdersPanel({ history, fgStock, loading, onRefresh, navigate, branchId, onSaleLogged }) {
  const [collapsed,    setCollapsed]    = useState(false);
  const [fulfilling,   setFulfilling]   = useState({}); // itemId → true while saving
  const [itemSuccess,  setItemSuccess]  = useState({}); // itemId → message
  const [itemError,    setItemError]    = useState({}); // itemId → message

  // Build set of "orderNum:recipeId" keys that have already been fulfilled.
  // A fulfilled sale entry has notes "[FULFILLED:QR-YYYYMMDD-XXXX:recipeId]"
  // This lets us hide individual items even within a partially-fulfilled order.
  const fulfilledKeys = new Set(
    history
      .filter(e => e.notes && e.notes.includes('[FULFILLED:'))
      .map(e => {
        const m = e.notes.match(/\[FULFILLED:([^\]]+)\]/);
        return m ? m[1] : null;   // "QR-20250321-1234:42"
      })
      .filter(Boolean)
  );

  // Show a QR entry only if its "orderNum:recipeId" has NOT been fulfilled yet
  const qrEntries = history.filter(e => {
    if (!e.notes || !e.notes.includes('[QR-ORDER:')) return false;
    const meta = parseQRNote(e.notes);
    if (!meta) return false;
    const key = `${meta.orderNum}:${e.recipeId}`;
    return !fulfilledKeys.has(key);
  });
  if (qrEntries.length === 0) return null;

  // Build recipeId → availableServings map from fgStock
  const stockMap = {};
  (fgStock || []).forEach(s => { stockMap[s.recipeId] = s.availableServings || 0; });

  // Group entries by order number
  const groups = {};
  qrEntries.forEach(e => {
    const meta = parseQRNote(e.notes);
    if (!meta) return;
    if (!groups[meta.orderNum]) groups[meta.orderNum] = { ...meta, items: [] };
    groups[meta.orderNum].items.push(e);
  });
  const orders = Object.values(groups);

  // Get stock status for a QR entry
  const getStockStatus = (entry) => {
    const available = stockMap[entry.recipeId] ?? 0;
    const needed    = entry.quantitySold;
    if (available >= needed)  return { type: 'full',    available, needed, toLog: needed, toProduce: 0 };
    if (available > 0)        return { type: 'partial', available, needed, toLog: available, toProduce: needed - available };
    return                           { type: 'none',    available: 0, needed, toLog: 0, toProduce: needed };
  };

  // Fulfil a QR order item directly (stock available, no production needed)
  const handleFulfilNow = async (entry) => {
    const status = getStockStatus(entry);
    if (!branchId) return;

    setFulfilling(f => ({ ...f, [entry.id]: true }));
    setItemError(e => ({ ...e, [entry.id]: null }));
    try {
      // Log sales for the qty that's available in stock.
      // Pass customerId so logSales awards loyalty points to the customer.
      await salesService.logSales({
        recipeId:     entry.recipeId,
        menuItemId:   entry.menuItemId || null,
        customerId:   entry.customerId || null,
        quantitySold: status.toLog,
        sellingPrice: entry.sellingPrice ? Number(entry.sellingPrice) : null,
        saleDate:     entry.saleDate,
        notes:        `[FULFILLED:${parseQRNote(entry.notes)?.orderNum}:${entry.recipeId}]`,
      }, branchId);

      const custMsg = entry.customerId ? ' · loyalty points awarded' : '';
      setItemSuccess(s => ({
        ...s,
        [entry.id]: `✓ ${status.toLog} serving${status.toLog > 1 ? 's' : ''} logged as sold${custMsg}`
      }));
      onSaleLogged();
    } catch (e) {
      setItemError(err => ({ ...err, [entry.id]: e.response?.data || 'Failed to log sale' }));
    } finally {
      setFulfilling(f => ({ ...f, [entry.id]: false }));
    }
  };

  return (
    <div style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:14, marginBottom:16, overflow:'hidden' }}>
      {/* Header */}
      <div
        onClick={() => setCollapsed(c => !c)}
        style={{ display:'flex', alignItems:'center', gap:10, padding:'13px 16px', borderBottom: collapsed ? 'none' : '1px solid #e5e7eb', background:'#faf5ff', cursor:'pointer' }}
      >
        <div style={{ width:30, height:30, background:'rgba(139,92,246,.12)', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <QrCode size={15} color="#7c3aed" />
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:13, fontWeight:700, color:'#1f2937' }}>QR Menu Orders</div>
          <div style={{ fontSize:11, color:'#6b7280' }}>
            {orders.length} order{orders.length !== 1 ? 's' : ''} · {qrEntries.length} item{qrEntries.length !== 1 ? 's' : ''} · Review stock &amp; fulfil
          </div>
        </div>
        <span style={{ background:'#7c3aed', color:'#fff', fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:20 }}>
          {orders.length} new
        </span>
        <button
          onClick={e => { e.stopPropagation(); onRefresh(); }}
          style={{ background:'none', border:'1px solid #e5e7eb', borderRadius:6, padding:'4px 7px', cursor:'pointer', color:'#9ca3af' }}
        >
          <RefreshCw size={12} className={loading ? 'ds-spin' : ''} />
        </button>
        {collapsed ? <ChevronDown size={15} color="#9ca3af" /> : <ChevronUp size={15} color="#9ca3af" />}
      </div>

      {!collapsed && (
        <>
          {/* Info bar */}
          <div style={{ padding:'9px 16px', background:'#fefce8', borderBottom:'1px solid #fef08a', fontSize:12, color:'#713f12', display:'flex', gap:8, alignItems:'flex-start' }}>
            <AlertCircle size={13} style={{ flexShrink:0, marginTop:1 }} />
            <span>
              Items with finished stock can be <strong>fulfilled immediately</strong>.
              Items without stock need <strong>Log Production</strong> first (deducts raw materials), then sale is logged automatically.
              Partial stock: available qty is sold directly, remaining goes to production.
            </span>
          </div>

          {/* Order cards */}
          <div style={{ padding:'12px 14px', display:'flex', flexDirection:'column', gap:10 }}>
            {orders.map(order => (
              <div key={order.orderNum} style={{ border:'1px solid #ede9fe', borderRadius:10, overflow:'hidden' }}>
                {/* Order header */}
                <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', background:'#f5f3ff', borderBottom:'1px solid #ede9fe' }}>
                  <Hash size={11} color="#7c3aed" />
                  <span style={{ fontWeight:700, color:'#7c3aed', fontSize:12 }}>{order.orderNum}</span>
                  {order.table && (
                    <span style={{ fontSize:11, color:'#6b7280', background:'#fff', border:'1px solid #e5e7eb', borderRadius:4, padding:'1px 6px' }}>
                      Table {order.table}
                    </span>
                  )}
                  {order.guest && (
                    <span style={{ fontSize:11, color:'#6b7280' }}>👤 {order.guest}</span>
                  )}
                  <span style={{ marginLeft:'auto', fontSize:11, color:'#9ca3af' }}>{order.items[0]?.saleDate}</span>
                </div>

                {/* Items */}
                {order.items.map((item, i) => {
                  const status  = getStockStatus(item);
                  const done    = !!itemSuccess[item.id];
                  const err     = itemError[item.id];
                  const busy    = fulfilling[item.id];

                  return (
                    <div key={item.id} style={{
                      display:'flex', alignItems:'flex-start', gap:10,
                      padding:'11px 12px',
                      borderBottom: i < order.items.length - 1 ? '1px solid #f3f4f6' : 'none',
                      background: done ? '#f0fdf4' : '#fff',
                    }}>
                      {/* Item info */}
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:13, fontWeight:600, color:'#1f2937' }}>
                          {item.recipeName}
                        </div>
                        <div style={{ fontSize:11, color:'#6b7280', marginTop:2, display:'flex', gap:10, flexWrap:'wrap' }}>
                          <span>Ordered: <strong>{item.quantitySold}</strong></span>
                          <span>Price: ₹{Number(item.sellingPrice||0).toFixed(0)}</span>
                          {/* Stock indicator */}
                          {status.type === 'full' && (
                            <span style={{ color:'#10b981', fontWeight:600 }}>
                              ✓ {status.available} in stock — ready
                            </span>
                          )}
                          {status.type === 'partial' && (
                            <span style={{ color:'#f59e0b', fontWeight:600 }}>
                              ⚡ {status.available} in stock, {status.toProduce} need production
                            </span>
                          )}
                          {status.type === 'none' && (
                            <span style={{ color:'#ef4444', fontWeight:600 }}>
                              ✗ 0 in stock — production required
                            </span>
                          )}
                        </div>
                        {err && (
                          <div style={{ fontSize:11, color:'#dc2626', marginTop:4 }}>{err}</div>
                        )}
                        {done && (
                          <div style={{ fontSize:11, color:'#15803d', marginTop:4, fontWeight:600 }}>
                            {itemSuccess[item.id]}
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      {!done && (
                        <div style={{ display:'flex', gap:6, flexShrink:0, flexWrap:'wrap', justifyContent:'flex-end' }}>

                          {/* FULL STOCK: one-click fulfil */}
                          {status.type === 'full' && (
                            <button
                              disabled={busy}
                              onClick={() => handleFulfilNow(item)}
                              style={{ display:'flex', alignItems:'center', gap:5, background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:7, padding:'6px 12px', fontSize:12, fontWeight:600, color:'#15803d', cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? .6 : 1, whiteSpace:'nowrap' }}
                            >
                              {busy
                                ? <RefreshCw size={11} className="ds-spin" />
                                : <Zap size={11} />
                              }
                              Fulfil Now
                            </button>
                          )}

                          {/* PARTIAL STOCK: log sales for available + log production for gap */}
                          {status.type === 'partial' && (
                            <>
                              <button
                                disabled={busy}
                                onClick={() => handleFulfilNow(item)}
                                style={{ display:'flex', alignItems:'center', gap:5, background:'#fefce8', border:'1px solid #fde68a', borderRadius:7, padding:'6px 10px', fontSize:11, fontWeight:600, color:'#92400e', cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? .6 : 1, whiteSpace:'nowrap' }}
                              >
                                {busy ? <RefreshCw size={11} className="ds-spin" /> : <Zap size={11} />}
                                Sell {status.available} (in stock)
                              </button>
                              <button
                                onClick={() => navigate(`/fooderp/recipes/${item.recipeId}/produce`)}
                                style={{ display:'flex', alignItems:'center', gap:5, background:'#fff7ed', border:'1px solid #fed7aa', borderRadius:7, padding:'6px 10px', fontSize:11, fontWeight:600, color:'#9a3412', cursor:'pointer', whiteSpace:'nowrap' }}
                              >
                                <ChefHat size={11} />
                                Produce {status.toProduce} more
                              </button>
                            </>
                          )}

                          {/* NO STOCK: must produce first */}
                          {status.type === 'none' && (
                            <button
                              onClick={() => navigate(`/fooderp/recipes/${item.recipeId}/produce`)}
                              style={{ display:'flex', alignItems:'center', gap:5, background:'#fffbeb', border:'1px solid #fcd34d', borderRadius:7, padding:'6px 11px', fontSize:12, fontWeight:600, color:'#92400e', cursor:'pointer', whiteSpace:'nowrap' }}
                            >
                              <ChefHat size={11} /> Log Production
                            </button>
                          )}
                        </div>
                      )}

                      {done && (
                        <CheckCircle size={16} color="#10b981" style={{ flexShrink:0, marginTop:2 }} />
                      )}
                    </div>
                  );
                })}

                {/* Order total */}
                <div style={{ display:'flex', justifyContent:'flex-end', alignItems:'center', padding:'7px 12px', background:'#fafafa', borderTop:'1px solid #f3f4f6' }}>
                  <span style={{ fontSize:12, color:'#6b7280', marginRight:8 }}>Order Total</span>
                  <span style={{ fontSize:14, fontWeight:700, color:'#10b981' }}>
                    ₹{order.items.reduce((s, e) => s + Number(e.totalRevenue||0), 0).toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function DailySales() {
  const { branchId } = useBranch();
  const navigate     = useNavigate();
  const today        = new Date().toISOString().split('T')[0];

  const [recipes,       setRecipes]      = useState([]);
  const [,              setMenus]        = useState([]);
  const [history,       setHistory]      = useState([]);
  const [customers,     setCustomers]    = useState([]);
  const [,              setFinishedGoods]= useState([]); // production history (for stock hint)
  const [fgStock,       setFgStock]      = useState([]); // actual FG stock levels
  const [loading,       setLoading]      = useState(false);
  const [saving,        setSaving]       = useState(false);
  const [error,         setError]        = useState(null);
  const [success,       setSuccess]      = useState(null);
  const [saleDate,      setSaleDate]     = useState(today);
  const [lines,         setLines]        = useState([emptyLine()]);
  const [activeMenu,    setActiveMenu]   = useState(null);
  const [custSearch,    setCustSearch]   = useState('');
  const [custDropdown,  setCustDropdown] = useState(null);

  const load = useCallback(async () => {
    if (!branchId) return;
    setLoading(true);
    try {
      const [recipeRes, menuRes, histRes, custRes, fgRes, stockRes] = await Promise.all([
        recipeService.getAll({ status: 'ACTIVE' }),
        menuService.getAll(true),
        salesService.getSales(branchId, saleDate),
        customerService.getAll(branchId),
        productionService.getHistory(branchId, null, null),
        // Fetch actual finished good stock levels (availableServings)
        productionService.getStock(branchId),
      ]);
      setRecipes(recipeRes.data || []);
      const activeMenus = menuRes.data || [];
      setMenus(activeMenus);
      setActiveMenu(activeMenus[0] || null);
      setHistory(histRes.data || []);
      setCustomers(custRes.data || []);
      setFinishedGoods(fgRes.data || []);
      setFgStock(stockRes.data || []);
    } catch { setError('Failed to load data'); }
    finally { setLoading(false); }
  }, [branchId, saleDate]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (success) { const t = setTimeout(() => setSuccess(null), 4000); return () => clearTimeout(t); }
  }, [success]);

  const addLine    = () => setLines(l => [...l, emptyLine()]);
  const removeLine = (i) => setLines(l => l.filter((_, idx) => idx !== i));
  const updateLine = (i, field, val) =>
    setLines(l => l.map((line, idx) => idx === i ? { ...line, [field]: val } : line));

  const handleRecipeSelect = (i, recipeId) => {
    updateLine(i, 'recipeId', recipeId);
    if (activeMenu) {
      const menuItem = (activeMenu.items || []).find(mi => String(mi.recipeId) === String(recipeId));
      if (menuItem) {
        updateLine(i, 'menuItemId', String(menuItem.id));
        updateLine(i, 'sellingPrice', String(menuItem.basePrice || ''));
      }
    }
  };

  const getAvailableServings = (recipeId) => {
    if (!recipeId) return null;
    // Use actual FG stock levels (not production history)
    const stock = fgStock.find(s => String(s.recipeId) === String(recipeId));
    return stock ? stock.availableServings : 0;
  };

  const filteredCustomers = custSearch
    ? customers.filter(c =>
        c.name?.toLowerCase().includes(custSearch.toLowerCase()) ||
        c.phone?.includes(custSearch))
    : customers.slice(0, 8);

  const handleSubmit = async () => {
    const validLines = lines.filter(l => l.recipeId && Number(l.quantitySold) > 0);
    if (!validLines.length) { setError('Add at least one item'); return; }
    setSaving(true); setError(null);
    try {
      let saved = 0;
      const pointsEarned = {};
      for (const line of validLines) {
        const res = await salesService.logSales({
          recipeId:     Number(line.recipeId),
          menuItemId:   line.menuItemId ? Number(line.menuItemId) : null,
          customerId:   line.customerId ? Number(line.customerId) : null,
          quantitySold: Number(line.quantitySold),
          sellingPrice: line.sellingPrice ? Number(line.sellingPrice) : null,
          saleDate,
          notes: line.notes || null,
        }, branchId);
        saved++;
        if (res.data?.customerId && res.data?.loyaltyPointsAwarded > 0) {
          pointsEarned[res.data.customerId] =
            (pointsEarned[res.data.customerId] || 0) + res.data.loyaltyPointsAwarded;
        }
      }
      const ptsMsgs = Object.entries(pointsEarned).map(([cid, pts]) => {
        const cust = customers.find(c => String(c.id) === String(cid));
        return cust ? `+${pts} pts for ${cust.name}` : '';
      }).filter(Boolean);
      setSuccess(`${saved} sale${saved > 1 ? 's' : ''} logged${ptsMsgs.length ? ' · ' + ptsMsgs.join(', ') : ''}`);
      setLines([emptyLine()]);
      load();
    } catch (e) { setError(e.response?.data || 'Failed to log sales'); }
    finally { setSaving(false); }
  };

  // QR-ORDER entries are pending orders placed by customers — NOT yet fulfilled sales.
  // Only FULFILLED entries (logged by staff) count as real sales.
  // Exclude QR-ORDER entries from all revenue/count calculations and the history table.
  const salesHistory = history.filter(e => !e.notes || !e.notes.includes('[QR-ORDER:'));

  const todayRevenue = salesHistory.reduce((s, e) => s + Number(e.totalRevenue || 0), 0);
  const todayProfit  = salesHistory.reduce((s, e) => s + Number(e.grossProfit  || 0), 0);
  const todayCovers  = salesHistory.reduce((s, e) => s + Number(e.quantitySold || 0), 0);

  return (
    <div className="ds-page">
      <div className="ds-header">
        <div>
          <h2 className="ds-title"><ShoppingCart size={20}/> Daily Sales</h2>
          <p className="ds-sub">Log sales with customer tracking and auto loyalty points</p>
        </div>
        <div className="ds-header-right">
          <button className="ds-btn-ghost" onClick={load} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'ds-spin' : ''}/>
          </button>
          <div className="ds-date-wrap">
            <Calendar size={13}/>
            <input type="date" value={saleDate} onChange={e => setSaleDate(e.target.value)} className="ds-date-input"/>
          </div>
        </div>
      </div>

      {error   && <div className="ds-banner error"><AlertTriangle size={14}/>{error}<button onClick={()=>setError(null)}>✕</button></div>}
      {success && <div className="ds-banner success"><CheckCircle size={14}/>{success}</div>}

      {salesHistory.length > 0 && (
        <div className="ds-kpis">
          {[
            { label:'Covers Sold',   val: todayCovers,                                                                 color:'#3b82f6', icon: Users },
            { label:'Revenue Today', val: `₹${todayRevenue.toFixed(0)}`,                                               color:'#10b981', icon: IndianRupee },
            { label:'Gross Profit',  val: `₹${todayProfit.toFixed(0)}`,                                                color:'#0061d2', icon: ChefHat },
            { label:'Margin',        val: todayRevenue > 0 ? `${((todayProfit/todayRevenue)*100).toFixed(1)}%` : '0%', color:'#0061d2', icon: Award },
          ].map((k, i) => (
            <div key={i} className="ds-kpi" style={{borderTop:`3px solid ${k.color}`}}>
              <div className="ds-kpi-icon" style={{background:k.color+'18',color:k.color}}><k.icon size={16}/></div>
              <div>
                <div className="ds-kpi-val" style={{color:k.color}}>{k.val}</div>
                <div className="ds-kpi-lbl">{k.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* QR Orders Panel — smart stock-aware fulfilment */}
      <QROrdersPanel
        history={history}
        fgStock={fgStock}
        loading={loading}
        onRefresh={load}
        navigate={navigate}
        branchId={branchId}
        onSaleLogged={load}
      />

      <div className="ds-form-card">
        <div className="ds-form-title">
          <ShoppingCart size={15}/> Add Sales
          <span className="ds-form-hint">Pick a customer to auto-award loyalty points</span>
        </div>
        <div className="ds-line-header">
          <span>Recipe / Dish</span>
          <span>Customer <span className="ds-optional">(optional)</span></span>
          <span>Qty</span>
          <span>Price ₹</span>
          <span>Notes</span>
          <span></span>
        </div>

        {lines.map((line, idx) => {
          const available     = getAvailableServings(line.recipeId);
          const overProducing = available !== null && Number(line.quantitySold) > available;
          const selCust       = line.customerId ? customers.find(c => String(c.id) === String(line.customerId)) : null;
          const estPts        = line.sellingPrice && line.quantitySold
            ? Math.floor((parseFloat(line.sellingPrice) * parseInt(line.quantitySold)) / 10) : 0;
          return (
            <div key={idx} className="ds-line">
              <div className="ds-sel-wrap">
                <select className="ds-select" value={line.recipeId} onChange={e => handleRecipeSelect(idx, e.target.value)}>
                  <option value="">— Select dish —</option>
                  {recipes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
                <ChevronDown size={11} className="ds-sel-icon"/>
                {line.recipeId && available !== null && (
                  <div className={`ds-stock-hint ${overProducing ? 'warn' : ''}`}>
                    <Package size={10}/>
                    {available > 0 ? `${available} in stock` : 'None in stock'}
                    {overProducing && ' — qty exceeds stock'}
                  </div>
                )}
              </div>
              <div className="ds-cust-wrap" style={{position:'relative'}}>
                {selCust ? (
                  <div className="ds-cust-selected">
                    <div className="ds-cust-avatar">{selCust.name.charAt(0)}</div>
                    <div className="ds-cust-info">
                      <span className="ds-cust-name">{selCust.name}</span>
                      <span className="ds-cust-tier" style={{color:TIER_COLOR[selCust.tier]}}>{selCust.tier}</span>
                    </div>
                    {estPts > 0 && <span className="ds-pts-preview">+{estPts}pts</span>}
                    <button className="ds-cust-clear" onClick={()=>updateLine(idx,'customerId','')}><X size={11}/></button>
                  </div>
                ) : (
                  <>
                    <div className="ds-cust-search-wrap">
                      <Search size={12}/>
                      <input className="ds-cust-input" placeholder="Search customer..."
                        value={custDropdown === idx ? custSearch : ''}
                        onFocus={() => { setCustDropdown(idx); setCustSearch(''); }}
                        onChange={e => setCustSearch(e.target.value)}/>
                    </div>
                    {custDropdown === idx && (
                      <div className="ds-cust-dropdown">
                        {filteredCustomers.length === 0
                          ? <div className="ds-cust-empty">No customers found</div>
                          : filteredCustomers.map(c => (
                            <div key={c.id} className="ds-cust-option" onMouseDown={() => { updateLine(idx,'customerId',String(c.id)); setCustDropdown(null); setCustSearch(''); }}>
                              <div className="ds-cust-avatar sm">{c.name.charAt(0)}</div>
                              <div className="ds-cust-opt-info">
                                <span className="ds-cust-name">{c.name}</span>
                                {c.phone && <span className="ds-cust-phone">{c.phone}</span>}
                              </div>
                              <div className="ds-cust-opt-right">
                                <span style={{fontSize:10,fontWeight:700,color:TIER_COLOR[c.tier]}}>{c.tier}</span>
                                <span className="ds-cust-pts">{c.loyaltyPoints}pts</span>
                              </div>
                            </div>
                          ))
                        }
                        <div className="ds-cust-new" onMouseDown={()=>{setCustDropdown(null);}}>Walk-in (no account)</div>
                      </div>
                    )}
                  </>
                )}
              </div>
              <input className={`ds-input ds-qty ${overProducing ? 'ds-input-warn' : ''}`} type="number" min="1" step="1" value={line.quantitySold} onChange={e => updateLine(idx,'quantitySold',e.target.value)}/>
              <input className="ds-input" type="number" min="0" step="0.01" placeholder="0.00" value={line.sellingPrice} onChange={e => updateLine(idx,'sellingPrice',e.target.value)}/>
              <input className="ds-input" placeholder="Note" value={line.notes} onChange={e => updateLine(idx,'notes',e.target.value)}/>
              <button className="ds-del-btn" onClick={() => removeLine(idx)} disabled={lines.length === 1}><Trash2 size={13}/></button>
            </div>
          );
        })}

        {custDropdown !== null && <div className="ds-cust-overlay" onClick={() => setCustDropdown(null)}/>}

        <div className="ds-form-footer">
          <button className="ds-btn-ghost" onClick={addLine}><Plus size={13}/> Add Line</button>
          <button className="ds-btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? <RefreshCw size={13} className="ds-spin"/> : <ShoppingCart size={13}/>}
            {saving ? 'Saving...' : 'Log Sales'}
          </button>
        </div>
      </div>

      {salesHistory.length > 0 && (
        <div className="ds-history-card">
          <div className="ds-history-title">Sales on {saleDate} — {salesHistory.length} entries</div>
          <div className="ds-table-wrap">
            <table className="ds-table">
              <thead>
                <tr><th>Dish</th><th>Customer</th><th>Qty</th><th>Price</th><th>Revenue</th><th>COGS</th><th>Profit</th><th>Pts</th><th>By</th></tr>
              </thead>
              <tbody>
                {salesHistory.map(e => {
                  const isQR = e.notes && e.notes.includes('[QR-ORDER:');
                  return (
                    <tr key={e.id} className="ds-tr" style={isQR ? {background:'#faf5ff'} : {}}>
                      <td>
                        <div style={{display:'flex',alignItems:'center',gap:6}}>
                          <div className="ds-dish-name">{e.recipeName}</div>
                          {isQR && <span style={{fontSize:9,fontWeight:700,padding:'1px 5px',background:'#ede9fe',color:'#7c3aed',borderRadius:4}}>QR</span>}
                        </div>
                        <span className="ds-cat-chip">{e.recipeCategory}</span>
                      </td>
                      <td>
                        {e.customerName
                          ? <div className="ds-cust-cell"><div className="ds-cust-avatar sm">{e.customerName.charAt(0)}</div><div><div className="ds-cust-name">{e.customerName}</div>{e.customerPhone && <div className="ds-cust-phone">{e.customerPhone}</div>}</div></div>
                          : <span className="ds-walkin">Walk-in</span>}
                      </td>
                      <td className="ds-num">{e.quantitySold}</td>
                      <td className="ds-num muted">₹{Number(e.sellingPrice||0).toFixed(0)}</td>
                      <td className="ds-num green">₹{Number(e.totalRevenue||0).toFixed(0)}</td>
                      <td className="ds-num red">₹{Number(e.costOfGoods||0).toFixed(0)}</td>
                      <td className="ds-num orange">₹{Number(e.grossProfit||0).toFixed(0)}</td>
                      <td>{e.loyaltyPointsAwarded > 0 ? <span className="ds-pts-badge">+{e.loyaltyPointsAwarded}</span> : <span className="ds-muted">—</span>}</td>
                      <td className="ds-muted">{e.loggedBy||'—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <style>{`
        .ds-page{max-width:1200px;font-family:'DM Sans',sans-serif;}
        .ds-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;flex-wrap:wrap;gap:10px;}
        .ds-title{display:flex;align-items:center;gap:8px;font-size:20px;font-weight:700;color:#1f2937;margin:0 0 3px;}
        .ds-sub{font-size:12px;color:#9ca3af;margin:0;}
        .ds-header-right{display:flex;gap:8px;align-items:center;}
        .ds-btn-ghost{display:flex;align-items:center;gap:5px;padding:7px 12px;background:#f0f2f7;border:1px solid #e2e6ef;border-radius:8px;font-size:12px;color:#374151;cursor:pointer;}
        .ds-btn-primary{display:flex;align-items:center;gap:6px;padding:8px 16px;background:#e8f0fd;border:1px solid #b3ccf5;color:#0052b3;border-radius:9px;font-size:13px;font-weight:600;cursor:pointer;}
        .ds-btn-primary:disabled{opacity:.45;cursor:not-allowed;}
        .ds-date-wrap{display:flex;align-items:center;gap:6px;padding:7px 12px;background:#fff;border:1px solid #e5e7eb;border-radius:8px;color:#6b7280;}
        .ds-date-input{border:none;outline:none;font-size:13px;color:#1f2937;background:transparent;}
        .ds-banner{display:flex;align-items:center;gap:8px;padding:9px 12px;border-radius:8px;font-size:13px;margin-bottom:12px;}
        .ds-banner button{margin-left:auto;background:none;border:none;cursor:pointer;font-size:15px;}
        .ds-banner.error{background:#fef2f2;border:1px solid #fecaca;color:#dc2626;}
        .ds-banner.success{background:#f0fdf4;border:1px solid #bbf7d0;color:#15803d;}
        .ds-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px;}
        @media(max-width:700px){.ds-kpis{grid-template-columns:repeat(2,1fr);}}
        .ds-kpi{background:#fff;border-radius:12px;border:1px solid #e5e7eb;padding:14px;display:flex;align-items:center;gap:10px;}
        .ds-kpi-icon{width:34px;height:34px;border-radius:9px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
        .ds-kpi-val{font-size:18px;font-weight:800;line-height:1;margin-bottom:2px;}
        .ds-kpi-lbl{font-size:11px;color:#9ca3af;}
        .ds-form-card{background:#fff;border-radius:14px;border:1px solid #e5e7eb;padding:18px;margin-bottom:16px;}
        .ds-form-title{display:flex;align-items:center;gap:7px;font-size:13px;font-weight:700;color:#374151;margin-bottom:14px;}
        .ds-form-hint{font-size:11px;color:#9ca3af;font-weight:400;margin-left:4px;}
        .ds-line-header{display:grid;grid-template-columns:2.5fr 2fr 80px 100px 120px 36px;gap:8px;margin-bottom:6px;}
        .ds-line-header span{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#9ca3af;}
        .ds-optional{font-weight:400;text-transform:none;letter-spacing:0;}
        .ds-line{display:grid;grid-template-columns:2.5fr 2fr 80px 100px 120px 36px;gap:8px;margin-bottom:10px;align-items:start;}
        .ds-sel-wrap{position:relative;}
        .ds-select{appearance:none;width:100%;background:#f9fafb;border:1px solid #e5e7eb;border-radius:9px;padding:9px 28px 9px 12px;font-size:13px;color:#1f2937;outline:none;cursor:pointer;font-family:inherit;}
        .ds-select:focus{border-color:#0061d2;}
        .ds-sel-icon{position:absolute;right:8px;top:12px;color:#9ca3af;pointer-events:none;}
        .ds-stock-hint{display:flex;align-items:center;gap:4px;font-size:10px;color:#10b981;margin-top:3px;padding-left:2px;}
        .ds-stock-hint.warn{color:#f59e0b;}
        .ds-input{width:100%;padding:9px 12px;border:1px solid #e5e7eb;border-radius:9px;font-size:13px;outline:none;font-family:inherit;background:#f9fafb;box-sizing:border-box;color:#1f2937;}
        .ds-input:focus{border-color:#0061d2;}
        .ds-input-warn{border-color:#f59e0b !important;background:#fffbeb !important;}
        .ds-qty{text-align:center;}
        .ds-del-btn{width:34px;height:34px;background:rgba(239,68,68,.07);border:1px solid rgba(239,68,68,.15);border-radius:8px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#ef4444;}
        .ds-del-btn:disabled{opacity:.25;cursor:not-allowed;}
        .ds-form-footer{display:flex;gap:8px;margin-top:12px;}
        .ds-cust-wrap{position:relative;}
        .ds-cust-search-wrap{display:flex;align-items:center;gap:7px;padding:8px 12px;border:1px solid #e5e7eb;border-radius:9px;background:#f9fafb;}
        .ds-cust-search-wrap:focus-within{border-color:#0061d2;}
        .ds-cust-input{border:none;outline:none;font-size:13px;background:transparent;flex:1;color:#1f2937;width:100%;}
        .ds-cust-input::placeholder{color:#9ca3af;}
        .ds-cust-selected{display:flex;align-items:center;gap:8px;padding:7px 10px;border:1px solid #bbf7d0;border-radius:9px;background:#f0fdf4;}
        .ds-cust-avatar{width:26px;height:26px;background:linear-gradient(135deg,#0061d2,#3385e0);border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;flex-shrink:0;}
        .ds-cust-avatar.sm{width:22px;height:22px;font-size:10px;border-radius:5px;}
        .ds-cust-info{flex:1;min-width:0;}
        .ds-cust-name{font-size:12px;font-weight:600;color:#1f2937;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .ds-cust-tier{font-size:10px;font-weight:700;}
        .ds-cust-clear{background:none;border:none;cursor:pointer;color:#9ca3af;padding:0;display:flex;align-items:center;}
        .ds-pts-preview{font-size:10px;font-weight:700;color:#10b981;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:1px 6px;white-space:nowrap;}
        .ds-cust-dropdown{position:absolute;top:100%;left:0;right:0;background:#fff;border:1px solid #e5e7eb;border-radius:10px;z-index:50;box-shadow:0 8px 24px #d8dde8;overflow:hidden;margin-top:3px;max-height:220px;overflow-y:auto;}
        .ds-cust-option{display:flex;align-items:center;gap:8px;padding:9px 12px;cursor:pointer;border-bottom:1px solid #f1f5f9;}
        .ds-cust-option:hover{background:#f8fafc;}
        .ds-cust-opt-info{flex:1;min-width:0;}
        .ds-cust-phone{font-size:10px;color:#9ca3af;display:block;}
        .ds-cust-opt-right{display:flex;flex-direction:column;align-items:flex-end;gap:2px;flex-shrink:0;}
        .ds-cust-pts{font-size:10px;color:#3b82f6;font-weight:600;}
        .ds-cust-new{padding:8px 12px;font-size:12px;color:#9ca3af;cursor:pointer;text-align:center;border-top:1px solid #f1f5f9;}
        .ds-cust-new:hover{background:#f8fafc;}
        .ds-cust-empty{padding:12px;font-size:12px;color:#9ca3af;text-align:center;}
        .ds-cust-overlay{position:fixed;inset:0;z-index:40;}
        .ds-history-card{background:#fff;border-radius:14px;border:1px solid #e5e7eb;overflow:hidden;}
        .ds-history-title{padding:14px 16px;font-size:13px;font-weight:700;color:#374151;border-bottom:1px solid #e5e7eb;}
        .ds-table-wrap{overflow-x:auto;}
        .ds-table{width:100%;border-collapse:collapse;min-width:700px;}
        .ds-table thead tr{background:#f8fafc;border-bottom:1px solid #e5e7eb;}
        .ds-table th{padding:9px 12px;text-align:left;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;}
        .ds-tr{border-bottom:1px solid #f1f5f9;}
        .ds-tr:last-child{border-bottom:none;}
        .ds-tr:hover{background:#fafafa;}
        .ds-table td{padding:10px 12px;font-size:13px;vertical-align:middle;}
        .ds-dish-name{font-weight:600;color:#1f2937;margin-bottom:2px;}
        .ds-cat-chip{font-size:10px;font-weight:600;padding:2px 6px;background:#f0f9ff;color:#0369a1;border-radius:20px;}
        .ds-cust-cell{display:flex;align-items:center;gap:7px;}
        .ds-walkin{font-size:11px;color:#9ca3af;font-style:italic;}
        .ds-num{font-variant-numeric:tabular-nums;font-size:13px;}
        .ds-num.muted{color:#6b7280;}
        .ds-num.green{color:#10b981;font-weight:700;}
        .ds-num.red{color:#ef4444;}
        .ds-num.orange{color:#0061d2;font-weight:700;}
        .ds-pts-badge{font-size:11px;font-weight:700;padding:2px 7px;background:#f0fdf4;color:#15803d;border-radius:20px;}
        .ds-muted{font-size:12px;color:#9ca3af;}
        .ds-spin{animation:ds-spin .8s linear infinite;}
        @keyframes ds-spin{to{transform:rotate(360deg);}}
        @media(max-width:900px){
          .ds-line,.ds-line-header{grid-template-columns:1fr 1fr;gap:8px;}
          .ds-line-header span:nth-child(n+3){display:none;}
        }
      `}</style>
    </div>
  );
}