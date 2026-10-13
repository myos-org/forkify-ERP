import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, Plus, Eye, RefreshCw, Search,
  CheckCircle, Clock, XCircle, Truck, AlertTriangle,
  X, Save, ChevronDown, Package, Calendar,
  Trash2,
} from 'lucide-react';
import procurementService from '../../../services/procurementService';
import recipeService       from '../../../services/recipeService';
import useBranch           from '../../../hooks/useBranch';
import usePermission       from '../../../hooks/usePermission';

const STATUS_CFG = {
  DRAFT:     { label:'Draft',    bg:'#e2e6ef', color:'#6b7385', Icon:Clock },
  SENT:      { label:'Sent',     bg:'rgba(0,97,210,.12)', color:'#3385e0', Icon:Truck },
  PARTIAL:   { label:'Partial',  bg:'rgba(251,191,36,.12)', color:'#fbbf24', Icon:Clock },
  RECEIVED:  { label:'Received', bg:'rgba(16,185,129,.12)', color:'#34d399', Icon:CheckCircle },
  CANCELLED: { label:'Cancelled',bg:'rgba(239,68,68,.12)',  color:'#f87171', Icon:XCircle },
};

const PurchaseOrders = () => {
  const navigate         = useNavigate();
  const { branchId }     = useBranch();
  const { isHQ }         = usePermission();

  const [orders,      setOrders]      = useState([]);
  const [suppliers,   setSuppliers]   = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [search,      setSearch]      = useState('');
  const [statusFilter,setStatusFilter]= useState('all');
  const [modal,       setModal]       = useState(false);
  const [detailPO,    setDetailPO]    = useState(null);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState(null);
  const [success,     setSuccess]     = useState(null);

  const [form, setForm] = useState({
    supplierId: '', expectedDate: '', notes: '',
    items: [{ ingredientId:'', quantity:'', unitPrice:'' }],
  });

  const load = useCallback(async () => {
    if (!branchId && !isHQ) return;
    setLoading(true);
    try {
      const [poRes, supRes, ingRes] = await Promise.all([
        procurementService.getPOs(branchId, statusFilter === 'all' ? null : statusFilter),
        procurementService.getSuppliers(branchId),
        recipeService.getAllIngredients(),
      ]);
      setOrders(poRes.data || []);
      setSuppliers(supRes.data || []);
      setIngredients(ingRes.data || []);
    } catch { setError('Failed to load purchase orders'); }
    finally  { setLoading(false); }
  }, [branchId, statusFilter, isHQ]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (success) { const t = setTimeout(() => setSuccess(null), 3000); return () => clearTimeout(t); }
  }, [success]);

  const addLine    = () => setForm(f => ({ ...f, items:[...f.items, { ingredientId:'', quantity:'', unitPrice:'' }] }));
  const removeLine = (i) => setForm(f => ({ ...f, items: f.items.filter((_,idx) => idx !== i) }));
  const updateLine = (i, field, val) => setForm(f => ({
    ...f, items: f.items.map((item, idx) => idx === i ? { ...item, [field]: val } : item)
  }));

  const handleCreate = async () => {
    if (!form.supplierId) { setError('Select a supplier'); return; }
    const validItems = form.items.filter(i => i.ingredientId && i.quantity > 0);
    if (validItems.length === 0) { setError('Add at least one item'); return; }
    setSaving(true); setError(null);
    try {
      const { data } = await procurementService.createPO({
        supplierId: Number(form.supplierId),
        expectedDate: form.expectedDate || null,
        notes: form.notes,
        items: validItems.map(i => ({
          ingredientId: Number(i.ingredientId),
          quantity:     Number(i.quantity),
          unitPrice:    i.unitPrice ? Number(i.unitPrice) : null,
        })),
      }, branchId);
      setOrders(prev => [data, ...prev]);
      setModal(false);
      setForm({ supplierId:'', expectedDate:'', notes:'', items:[{ ingredientId:'', quantity:'', unitPrice:'' }] });
      setSuccess(`PO ${data.poNumber} created`);
    } catch (e) { setError(e.response?.data || 'Failed to create PO'); }
    finally     { setSaving(false); }
  };

  const handleStatusUpdate = async (id, status) => {
    try {
      const { data } = await procurementService.updatePOStatus(id, status);
      setOrders(prev => prev.map(o => o.id === id ? data : o));
      if (detailPO?.id === id) setDetailPO(data);
      setSuccess(`PO marked as ${status}`);
    } catch (e) { setError(e.response?.data || 'Update failed'); }
  };

  const filtered = orders.filter(o => {
    const matchSearch = !search || o.poNumber?.toLowerCase().includes(search.toLowerCase())
      || o.supplierName?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalValue = filtered.reduce((s, o) => s + Number(o.totalAmount || 0), 0);
  const ingUnit = (id) => ingredients.find(i => i.id === Number(id))?.unit || '';

  return (
    <div className="po-page">
      <style>{css}</style>

      <div className="po-header">
        <div className="po-title-wrap">
          <div className="po-icon"><FileText size={18}/></div>
          <div>
            <h2 className="po-title">Purchase Orders</h2>
            <div className="po-sub">{orders.length} orders &nbsp;·&nbsp; Total ₹{totalValue.toFixed(0)}</div>
          </div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="po-btn-outline" onClick={load}><RefreshCw size={13} className={loading ? 'spin':''}/></button>
          <button className="po-btn-primary" onClick={() => setModal(true)}><Plus size={14}/> Create PO</button>
        </div>
      </div>

      {error   && <div className="po-alert error"><AlertTriangle size={13}/>{error}<button onClick={() => setError(null)}><X size={12}/></button></div>}
      {success && <div className="po-alert success"><CheckCircle size={13}/>{success}</div>}

      {/* Toolbar */}
      <div className="po-toolbar">
        <div className="po-search">
          <Search size={13}/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search PO number or supplier..."/>
          {search && <button onClick={() => setSearch('')}><X size={12}/></button>}
        </div>
        <div className="po-filters">
          {['all','DRAFT','SENT','PARTIAL','RECEIVED','CANCELLED'].map(s => (
            <button key={s}
              className={`po-filter-btn ${statusFilter === s ? 'active' : ''}`}
              onClick={() => setStatusFilter(s)}>
              {s === 'all' ? 'All' : STATUS_CFG[s]?.label || s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="po-table-wrap">
        {loading ? (
          <div className="po-loading"><RefreshCw size={18} className="spin"/> Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="po-empty"><FileText size={36}/><p>No purchase orders found</p></div>
        ) : (
          <table className="po-table">
            <thead>
              <tr>
                <th className="po-th">PO Number</th>
                <th className="po-th">Supplier</th>
                <th className="po-th">Items</th>
                <th className="po-th">Total</th>
                <th className="po-th">Expected</th>
                <th className="po-th">Status</th>
                <th className="po-th">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(po => {
                const sc = STATUS_CFG[po.status] || STATUS_CFG.DRAFT;
                return (
                  <tr key={po.id} className="po-tr">
                    <td className="po-td">
                      <div className="po-num">{po.poNumber}</div>
                      <div className="po-date">{po.createdAt?.split('T')[0]}</div>
                    </td>
                    <td className="po-td">
                      <div className="po-supplier">{po.supplierName}</div>
                      {po.supplierPhone && <div className="po-phone">{po.supplierPhone}</div>}
                    </td>
                    <td className="po-td">{po.items?.length || 0} items</td>
                    <td className="po-td po-amount">₹{Number(po.totalAmount || 0).toFixed(2)}</td>
                    <td className="po-td po-muted">{po.expectedDate || '—'}</td>
                    <td className="po-td">
                      <span className="po-badge" style={{ background:sc.bg, color:sc.color }}>
                        <sc.Icon size={10}/> {sc.label}
                      </span>
                    </td>
                    <td className="po-td">
                      <div style={{ display:'flex', gap:5 }}>
                        <button className="po-act-btn" onClick={() => setDetailPO(po)} title="View">
                          <Eye size={13}/>
                        </button>
                        {po.status === 'DRAFT' && (
                          <button className="po-act-btn sent" onClick={() => handleStatusUpdate(po.id, 'SENT')} title="Mark Sent">
                            <Truck size={13}/>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Create PO Modal */}
      {modal && (
        <div className="po-overlay" onClick={() => setModal(false)}>
          <div className="po-modal" onClick={e => e.stopPropagation()}>
            <div className="po-modal-header">
              <h3>Create Purchase Order</h3>
              <button className="po-modal-close" onClick={() => setModal(false)}><X size={15}/></button>
            </div>
            <div className="po-modal-body">
              {error && <div className="po-alert error" style={{ marginBottom:12 }}><AlertTriangle size={13}/>{error}</div>}
              <div className="po-form-row">
                <div className="po-field" style={{ flex:2 }}>
                  <label className="po-label">Supplier *</label>
                  <div className="po-sel-wrap">
                    <select className="po-select" value={form.supplierId}
                      onChange={e => setForm(f => ({ ...f, supplierId: e.target.value }))}>
                      <option value="">— Select supplier —</option>
                      {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <ChevronDown size={12} className="po-sel-icon"/>
                  </div>
                </div>
                <div className="po-field">
                  <label className="po-label"><Calendar size={11}/> Expected Date</label>
                  <input className="po-input" type="date" value={form.expectedDate}
                    onChange={e => setForm(f => ({ ...f, expectedDate: e.target.value }))} />
                </div>
              </div>

              <div style={{ marginBottom:12 }}>
                <label className="po-label">Items</label>
                {form.items.map((item, idx) => (
                  <div key={idx} className="po-item-row">
                    <div className="po-sel-wrap" style={{ flex:2 }}>
                      <select className="po-select" value={item.ingredientId}
                        onChange={e => updateLine(idx, 'ingredientId', e.target.value)}>
                        <option value="">— Ingredient —</option>
                        {ingredients.map(i => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
                      </select>
                      <ChevronDown size={12} className="po-sel-icon"/>
                    </div>
                    <input className="po-input" type="number" min="0.001" step="0.001"
                      placeholder="Qty" value={item.quantity} style={{ width:80 }}
                      onChange={e => updateLine(idx, 'quantity', e.target.value)} />
                    {item.ingredientId && <span style={{ fontSize:11, color:'#9aa3b4' }}>{ingUnit(item.ingredientId)}</span>}
                    <input className="po-input" type="number" min="0" step="0.01"
                      placeholder="Unit Price" value={item.unitPrice} style={{ width:100 }}
                      onChange={e => updateLine(idx, 'unitPrice', e.target.value)} />
                    <button className="po-remove-btn" onClick={() => removeLine(idx)}
                      disabled={form.items.length === 1}><Trash2 size={12}/></button>
                  </div>
                ))}
                <button className="po-add-line" onClick={addLine}><Plus size={11}/> Add Item</button>
              </div>

              <div>
                <label className="po-label">Notes</label>
                <textarea className="po-input po-textarea" value={form.notes} rows={2}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Delivery instructions, payment terms..." />
              </div>
            </div>
            <div className="po-modal-footer">
              <button className="po-btn-ghost" onClick={() => setModal(false)}>Cancel</button>
              <button className="po-btn-primary" onClick={handleCreate} disabled={saving}>
                {saving ? <RefreshCw size={13} className="spin"/> : <Save size={13}/>}
                Create PO
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detailPO && (
        <div className="po-overlay" onClick={() => setDetailPO(null)}>
          <div className="po-modal" onClick={e => e.stopPropagation()}>
            <div className="po-modal-header">
              <h3>{detailPO.poNumber}</h3>
              <button className="po-modal-close" onClick={() => setDetailPO(null)}><X size={15}/></button>
            </div>
            <div className="po-modal-body">
              <div className="po-detail-grid">
                <div><span className="po-detail-label">Supplier</span><span className="po-detail-val">{detailPO.supplierName}</span></div>
                <div><span className="po-detail-label">Status</span>
                  <span className="po-badge" style={{ background: STATUS_CFG[detailPO.status]?.bg, color: STATUS_CFG[detailPO.status]?.color }}>
                    {STATUS_CFG[detailPO.status]?.label}
                  </span>
                </div>
                <div><span className="po-detail-label">Total</span><span className="po-detail-val po-amount">₹{Number(detailPO.totalAmount || 0).toFixed(2)}</span></div>
                <div><span className="po-detail-label">Expected</span><span className="po-detail-val">{detailPO.expectedDate || '—'}</span></div>
              </div>
              <div style={{ marginTop:14 }}>
                <div className="po-label" style={{ marginBottom:8 }}>Items</div>
                <table className="po-table" style={{ marginTop:0 }}>
                  <thead><tr>
                    <th className="po-th">Ingredient</th>
                    <th className="po-th">Ordered</th>
                    <th className="po-th">Received</th>
                    <th className="po-th">Unit Price</th>
                    <th className="po-th">Total</th>
                  </tr></thead>
                  <tbody>
                    {(detailPO.items || []).map(item => (
                      <tr key={item.id} className="po-tr">
                        <td className="po-td">{item.ingredientName}</td>
                        <td className="po-td">{item.quantity} {item.unit}</td>
                        <td className="po-td">{item.receivedQuantity || 0} {item.unit}</td>
                        <td className="po-td">₹{Number(item.unitPrice || 0).toFixed(2)}</td>
                        <td className="po-td po-amount">₹{Number(item.totalPrice || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {detailPO.status === 'SENT' && (
                <div style={{ marginTop:14, display:'flex', gap:8 }}>
                  <button className="po-btn-primary" style={{ fontSize:12 }}
                    onClick={() => { navigate(`/fooderp/procurement/grn?poId=${detailPO.id}`); setDetailPO(null); }}>
                    <Package size={13}/> Create GRN
                  </button>
                  <button className="po-btn-ghost" style={{ fontSize:12 }}
                    onClick={() => handleStatusUpdate(detailPO.id, 'RECEIVED')}>
                    <CheckCircle size={13}/> Mark Received
                  </button>
                  <button className="po-btn-ghost" style={{ fontSize:12 }}
                    onClick={() => handleStatusUpdate(detailPO.id, 'CANCELLED')}>
                    <XCircle size={13}/> Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const css = `
  .po-page { font-family:'DM Sans',sans-serif; color:#1f2937; }
  .po-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; flex-wrap:wrap; gap:10px; }
  .po-title-wrap { display:flex; align-items:center; gap:12px; }
  .po-icon  { width:38px; height:38px; background:rgba(16,185,129,.12); border-radius:10px; display:flex; align-items:center; justify-content:center; color:#34d399; }
  .po-title { font-size:20px; font-weight:700; color:#1f2937; margin:0 0 2px; }
  .po-sub   { font-size:12px; color:#9aa3b4; }
  .po-btn-primary { display:flex; align-items:center; gap:6px; padding:8px 14px; background:#e8f0fd; border:1px solid #b3ccf5; border-radius:9px; color:#0052b3; font-size:13px; font-weight:600; cursor:pointer; }
  .po-btn-primary:hover:not(:disabled) { background:#d4e4fb; }
  .po-btn-primary:disabled { opacity:.4; cursor:not-allowed; }
  .po-btn-ghost   { display:flex; align-items:center; gap:6px; padding:8px 14px; background:#f8f9fc; border:1px solid #e2e6ef; border-radius:9px; color:#374151; font-size:13px; cursor:pointer; transition:background .15s; }
  .po-btn-outline { display:flex; align-items:center; gap:6px; padding:8px 10px; background:#ffffff; border:1px solid #e2e6ef; border-radius:9px; color:#9aa3b4; cursor:pointer; }
  .po-alert { display:flex; align-items:center; gap:8px; padding:10px 14px; border-radius:10px; font-size:13px; margin-bottom:14px; }
  .po-alert button { background:none; border:none; cursor:pointer; margin-left:auto; opacity:.6; }
  .po-alert.error   { background:rgba(239,68,68,.1); border:1px solid rgba(239,68,68,.25); color:#fca5a5; }
  .po-alert.success { background:rgba(16,185,129,.1); border:1px solid rgba(16,185,129,.25); color:#6ee7b7; }
  .po-toolbar { display:flex; gap:10px; margin-bottom:14px; flex-wrap:wrap; align-items:center; }
  .po-search { flex:1; min-width:200px; display:flex; align-items:center; gap:8px; background:#f8f9fc; border:1px solid #e2e6ef; border-radius:9px; padding:0 12px; }
  .po-search input { background:none; border:none; outline:none; color:#1f2937; font-size:13px; width:100%; padding:9px 0; }
  .po-search input::placeholder { color:#9aa3b4; }
  .po-search button { background:none; border:none; cursor:pointer; color:#9aa3b4; display:flex; }
  .po-filters { display:flex; gap:5px; flex-wrap:wrap; }
  .po-filter-btn { padding:6px 11px; background:#ffffff; border:1px solid #e2e6ef; border-radius:8px; color:#9aa3b4; font-size:12px; cursor:pointer; transition:all .15s; white-space:nowrap; }
  .po-filter-btn:hover,.po-filter-btn.active { background:rgba(0,97,210,.12); border-color:rgba(0,97,210,.2); color:#3385e0; }
  .po-table-wrap { background:#ffffff; border:1px solid #e2e6ef; border-radius:14px; overflow:hidden; overflow-x:auto; }
  .po-table { width:100%; border-collapse:collapse; min-width:700px; }
  .po-th { padding:10px 14px; font-size:11px; font-weight:700; letter-spacing:.5px; text-transform:uppercase; color:#9aa3b4; text-align:left; border-bottom:1px solid #e2e6ef; background:#fafbfc; white-space:nowrap; }
  .po-td { padding:12px 14px; font-size:13px; color:#9aa3b4; border-bottom:1px solid #f0f2f7; vertical-align:middle; }
  .po-tr:last-child .po-td { border-bottom:none; }
  .po-tr:hover .po-td { background:#fafbfc; }
  .po-num      { font-weight:700; color:#1f2937; }
  .po-date     { font-size:11px; color:#9aa3b4; margin-top:2px; }
  .po-supplier { font-weight:600; color:#1f2937; }
  .po-phone    { font-size:11px; color:#9aa3b4; margin-top:2px; }
  .po-amount   { font-weight:700; color:#3385e0; }
  .po-muted    { color:#9aa3b4; font-size:12px; }
  .po-badge { display:inline-flex; align-items:center; gap:4px; font-size:11px; font-weight:700; padding:3px 8px; border-radius:5px; white-space:nowrap; }
  .po-act-btn { width:28px; height:28px; background:#f8f9fc; border:1px solid #e2e6ef; border-radius:7px; display:flex; align-items:center; justify-content:center; cursor:pointer; color:#374151; transition:all .15s; }
  .po-act-btn:hover { background:#e2e6ef; color:#1f2937; }
  .po-act-btn.sent:hover { background:rgba(0,97,210,.15); color:#3385e0; }
  .po-loading,.po-empty { text-align:center; padding:40px; color:#9aa3b4; display:flex; align-items:center; justify-content:center; gap:8px; flex-direction:column; }
  .po-overlay { position:fixed; inset:0; background:rgba(0,0,0,.65); display:flex; align-items:center; justify-content:center; z-index:1000; padding:20px; }
  .po-modal { background:#ffffff; border:1px solid #e2e6ef; border-radius:16px; width:100%; max-width:640px; max-height:90vh; overflow:hidden; display:flex; flex-direction:column; }
  .po-modal-header { display:flex; align-items:center; justify-content:space-between; padding:16px 20px; border-bottom:1px solid #e2e6ef; background:#f8fafc; }
  .po-modal-header h3 { margin:0; font-size:15px; font-weight:700; color:#1f2937; }
  .po-modal-close { background:#e8f0fd; border:1px solid #b3ccf5; border-radius:7px; width:26px; height:26px; display:flex; align-items:center; justify-content:center; cursor:pointer; color:#0052b3; }
  .po-modal-body   { padding:18px 20px; overflow-y:auto; flex:1; }
  .po-modal-footer { display:flex; gap:10px; justify-content:flex-end; padding:14px 20px; border-top:1px solid #e2e6ef; background:#f8fafc; }
  .po-form-row { display:flex; gap:12px; margin-bottom:14px; flex-wrap:wrap; }
  .po-field { display:flex; flex-direction:column; gap:5px; flex:1; min-width:160px; }
  .po-label { display:flex; align-items:center; gap:4px; font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:.4px; color:#6b7280; margin-bottom:4px; }
  .po-input { background:#ffffff; border:1px solid #e2e6ef; border-radius:9px; padding:8px 12px; color:#1f2937; font-size:13px; outline:none; font-family:inherit; box-sizing:border-box; }
  .po-input:focus { border-color:#0061d2; }
  .po-textarea { width:100%; resize:vertical; min-height:55px; }
  .po-sel-wrap { position:relative; }
  .po-select { appearance:none; background:#ffffff; border:1px solid #e2e6ef; border-radius:9px; padding:8px 28px 8px 12px; color:#1f2937; font-size:13px; outline:none; cursor:pointer; width:100%; }
  .po-sel-icon { position:absolute; right:8px; top:50%; transform:translateY(-50%); color:#9aa3b4; pointer-events:none; }
  .po-item-row { display:flex; align-items:center; gap:7px; margin-bottom:7px; flex-wrap:wrap; }
  .po-remove-btn { background:rgba(239,68,68,.1); border:1px solid rgba(239,68,68,.2); border-radius:7px; padding:7px; display:flex; cursor:pointer; color:#f87171; }
  .po-remove-btn:disabled { opacity:.3; cursor:not-allowed; }
  .po-add-line { display:flex; align-items:center; gap:5px; padding:7px 12px; background:#ffffff; border:1px dashed #e2e6ef; border-radius:8px; color:#9aa3b4; font-size:12px; cursor:pointer; }
  .po-add-line:hover { border-color:rgba(0,97,210,.2); color:#3385e0; }
  .po-detail-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
  .po-detail-label { display:block; font-size:10px; text-transform:uppercase; letter-spacing:.5px; color:#6b7280; margin-bottom:3px; }
  .po-detail-val   { font-size:14px; font-weight:600; color:#1f2937; }
  .spin { animation:spin .8s linear infinite; }
  @keyframes spin { to { transform:rotate(360deg); } }
`;

export default PurchaseOrders;
