import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Package, CheckCircle, RefreshCw, Plus,
  AlertTriangle, X, Save, ChevronDown,
} from 'lucide-react';
import procurementService from '../../../services/procurementService';
import useBranch           from '../../../hooks/useBranch';

const STATUS_CFG = {
  PENDING:   { label:'Pending',   bg:'rgba(251,191,36,.12)', color:'#fbbf24' },
  CONFIRMED: { label:'Confirmed', bg:'rgba(16,185,129,.12)', color:'#34d399' },
  REJECTED:  { label:'Rejected',  bg:'rgba(239,68,68,.12)',  color:'#f87171' },
};

const GoodsReceived = () => {
  const [searchParams]   = useSearchParams();
  const { branchId }     = useBranch();
  const poIdFromUrl      = searchParams.get('poId');

  const [grns,      setGrns]      = useState([]);
  const [pos,       setPos]       = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [modal,     setModal]     = useState(!!poIdFromUrl);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState(null);
  const [success,   setSuccess]   = useState(null);

  const [form, setForm] = useState({
    purchaseOrderId: poIdFromUrl || '',
    receivedDate: new Date().toISOString().split('T')[0],
    receivedBy: '', notes: '', items: [],
  });

  const load = useCallback(async () => {
    if (!branchId) return;
    setLoading(true);
    try {
      const [grnRes, poRes] = await Promise.all([
        procurementService.getGRNs(branchId),
        procurementService.getPOs(branchId, 'SENT'),
      ]);
      setGrns(grnRes.data || []);
      setPos(poRes.data || []);
    } catch { setError('Failed to load'); }
    finally  { setLoading(false); }
  }, [branchId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (success) { const t = setTimeout(() => setSuccess(null), 3500); return () => clearTimeout(t); }
  }, [success]);

  // When PO selected, pre-populate items from PO
  const handlePOSelect = async (poId) => {
    setForm(f => ({ ...f, purchaseOrderId: poId, items: [] }));
    if (!poId) return;
    try {
      const { data } = await procurementService.getPOById(Number(poId));
      setForm(f => ({
        ...f,
        purchaseOrderId: poId,
        items: (data.items || []).map(item => ({
          ingredientId:     item.ingredientId,
          ingredientName:   item.ingredientName,
          unit:             item.unit,
          orderedQuantity:  item.quantity,
          receivedQuantity: item.quantity, // default to ordered
          unitPrice:        item.unitPrice,
          expiryDate:       '',
          notes:            '',
        })),
      }));
    } catch { setError('Failed to load PO items'); }
  };

  const updateItem = (i, field, val) => setForm(f => ({
    ...f,
    items: f.items.map((item, idx) => idx === i ? { ...item, [field]: val } : item),
  }));

  const handleCreate = async () => {
    if (!form.purchaseOrderId) { setError('Select a PO'); return; }
    if (form.items.length === 0) { setError('No items to receive'); return; }
    setSaving(true); setError(null);
    try {
      const { data } = await procurementService.createGRN({
        purchaseOrderId: Number(form.purchaseOrderId),
        receivedDate:    form.receivedDate,
        receivedBy:      form.receivedBy,
        notes:           form.notes,
        items: form.items.map(i => ({
          ingredientId:     i.ingredientId,
          orderedQuantity:  Number(i.orderedQuantity),
          receivedQuantity: Number(i.receivedQuantity),
          unitPrice:        i.unitPrice ? Number(i.unitPrice) : null,
          expiryDate:       i.expiryDate || null,
          notes:            i.notes,
        })),
      }, branchId);
      setGrns(prev => [data, ...prev]);
      setModal(false);
      setForm({ purchaseOrderId:'', receivedDate:new Date().toISOString().split('T')[0], receivedBy:'', notes:'', items:[] });
      setSuccess(`GRN ${data.grnNumber} created. Confirm to update inventory.`);
    } catch (e) { setError(e.response?.data || 'Failed to create GRN'); }
    finally     { setSaving(false); }
  };

  const handleConfirm = async (id) => {
    try {
      const { data } = await procurementService.confirmGRN(id);
      setGrns(prev => prev.map(g => g.id === id ? data : g));
      setSuccess('GRN confirmed — inventory updated');
    } catch (e) { setError(e.response?.data || 'Confirmation failed'); }
  };

  return (
    <div className="grn-page">
      <style>{css}</style>

      <div className="grn-header">
        <div className="grn-title-wrap">
          <div className="grn-icon"><Package size={18}/></div>
          <div>
            <h2 className="grn-title">Goods Received</h2>
            <div className="grn-sub">Confirm deliveries to update inventory</div>
          </div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="grn-btn-outline" onClick={load}><RefreshCw size={13} className={loading ? 'spin':''}/></button>
          <button className="grn-btn-primary" onClick={() => setModal(true)}><Plus size={14}/> New GRN</button>
        </div>
      </div>

      {error   && <div className="grn-alert error"><AlertTriangle size={13}/>{error}<button onClick={() => setError(null)}><X size={12}/></button></div>}
      {success && <div className="grn-alert success"><CheckCircle size={13}/>{success}</div>}

      <div className="grn-list">
        {loading ? (
          <div className="grn-loading"><RefreshCw size={18} className="spin"/> Loading...</div>
        ) : grns.length === 0 ? (
          <div className="grn-empty"><Package size={36}/><p>No GRNs yet. Create one when goods arrive.</p></div>
        ) : grns.map(grn => {
          const sc = STATUS_CFG[grn.status] || STATUS_CFG.PENDING;
          return (
            <div key={grn.id} className="grn-card">
              <div className="grn-card-top">
                <div>
                  <div className="grn-num">{grn.grnNumber}</div>
                  <div className="grn-meta">
                    {grn.supplierName} &nbsp;·&nbsp; PO: {grn.poNumber}
                    &nbsp;·&nbsp; {grn.receivedDate} &nbsp;·&nbsp; {grn.receivedBy}
                  </div>
                </div>
                <span className="grn-badge" style={{ background:sc.bg, color:sc.color }}>{sc.label}</span>
              </div>
              <div className="grn-items">
                {(grn.items || []).map(item => (
                  <div key={item.id} className="grn-item">
                    <Package size={11}/>
                    <strong>{item.ingredientName}</strong>
                    <span>ordered {item.orderedQuantity} / received {item.receivedQuantity} {item.unit}</span>
                    {item.expiryDate && <span className="grn-expiry">exp {item.expiryDate}</span>}
                  </div>
                ))}
              </div>
              {grn.notes && <div className="grn-notes">{grn.notes}</div>}
              {grn.status === 'PENDING' && (
                <div className="grn-actions">
                  <button className="grn-confirm-btn" onClick={() => handleConfirm(grn.id)}>
                    <CheckCircle size={13}/> Confirm & Update Inventory
                  </button>
                </div>
              )}
              {grn.status === 'CONFIRMED' && grn.confirmedBy && (
                <div className="grn-confirmed-by">
                  Confirmed by {grn.confirmedBy} on {grn.confirmedAt?.split('T')[0]}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Create GRN Modal */}
      {modal && (
        <div className="grn-overlay" onClick={() => setModal(false)}>
          <div className="grn-modal" onClick={e => e.stopPropagation()}>
            <div className="grn-modal-header">
              <h3>Create GRN</h3>
              <button className="grn-modal-close" onClick={() => setModal(false)}><X size={15}/></button>
            </div>
            <div className="grn-modal-body">
              {error && <div className="grn-alert error" style={{ marginBottom:12 }}><AlertTriangle size={13}/>{error}</div>}
              <div className="grn-form-row">
                <div className="grn-field" style={{ flex:2 }}>
                  <label className="grn-label">Purchase Order (SENT status)</label>
                  <div className="grn-sel-wrap">
                    <select className="grn-select" value={form.purchaseOrderId}
                      onChange={e => handlePOSelect(e.target.value)}>
                      <option value="">— Select PO —</option>
                      {pos.map(po => <option key={po.id} value={po.id}>{po.poNumber} — {po.supplierName}</option>)}
                    </select>
                    <ChevronDown size={12} className="grn-sel-icon"/>
                  </div>
                </div>
                <div className="grn-field">
                  <label className="grn-label">Received Date</label>
                  <input className="grn-input" type="date" value={form.receivedDate}
                    onChange={e => setForm(f => ({ ...f, receivedDate: e.target.value }))}/>
                </div>
              </div>
              <div className="grn-form-row">
                <div className="grn-field" style={{ flex:1 }}>
                  <label className="grn-label">Received By</label>
                  <input className="grn-input" placeholder="Name of receiver" value={form.receivedBy}
                    onChange={e => setForm(f => ({ ...f, receivedBy: e.target.value }))}/>
                </div>
                <div className="grn-field" style={{ flex:1 }}>
                  <label className="grn-label">Notes</label>
                  <input className="grn-input" placeholder="Delivery notes" value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}/>
                </div>
              </div>
              {form.items.length > 0 && (
                <div>
                  <div className="grn-label" style={{ marginBottom:8 }}>Items Received</div>
                  {form.items.map((item, idx) => (
                    <div key={idx} className="grn-item-row">
                      <div className="grn-item-name"><Package size={11}/> {item.ingredientName}</div>
                      <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                        <div style={{ fontSize:11, color:'#9aa3b4' }}>
                          Ordered: {item.orderedQuantity} {item.unit}
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                          <span className="grn-label" style={{ marginBottom:0 }}>Received:</span>
                          <input className="grn-input" type="number" min="0" step="0.001"
                            value={item.receivedQuantity} style={{ width:80 }}
                            onChange={e => updateItem(idx, 'receivedQuantity', e.target.value)}/>
                          <span style={{ fontSize:11, color:'#9aa3b4' }}>{item.unit}</span>
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                          <span className="grn-label" style={{ marginBottom:0 }}>Expiry:</span>
                          <input className="grn-input" type="date" value={item.expiryDate} style={{ width:130 }}
                            onChange={e => updateItem(idx, 'expiryDate', e.target.value)}/>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {form.items.length === 0 && form.purchaseOrderId && (
                <div className="grn-empty" style={{ padding:20 }}>Loading PO items...</div>
              )}
            </div>
            <div className="grn-modal-footer">
              <button className="grn-btn-ghost" onClick={() => setModal(false)}>Cancel</button>
              <button className="grn-btn-primary" onClick={handleCreate} disabled={saving}>
                {saving ? <RefreshCw size={13} className="spin"/> : <Save size={13}/>}
                Create GRN
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const css = `
  .grn-page { font-family:'DM Sans',sans-serif; color:#1f2937; }
  .grn-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; flex-wrap:wrap; gap:10px; }
  .grn-title-wrap { display:flex; align-items:center; gap:12px; }
  .grn-icon  { width:38px; height:38px; background:rgba(59,130,246,.12); border-radius:10px; display:flex; align-items:center; justify-content:center; color:#60a5fa; }
  .grn-title { font-size:20px; font-weight:700; color:#1f2937; margin:0 0 2px; }
  .grn-sub   { font-size:12px; color:#9aa3b4; }
  .grn-btn-primary { display:flex; align-items:center; gap:6px; padding:8px 14px; background:#e8f0fd; border:1px solid #b3ccf5; border-radius:9px; color:#0052b3; font-size:13px; font-weight:600; cursor:pointer; transition:background .15s; }
  .grn-btn-primary:hover:not(:disabled) { background:#d4e4fb; }
  .grn-btn-primary:disabled { opacity:.4; cursor:not-allowed; }
  .grn-btn-ghost   { display:flex; align-items:center; gap:6px; padding:8px 14px; background:#f0f2f7; border:1px solid #e2e6ef; border-radius:9px; color:#374151; font-size:13px; cursor:pointer; }
  .grn-btn-outline { display:flex; align-items:center; gap:6px; padding:8px 10px; background:#f0f2f7; border:1px solid #e2e6ef; border-radius:9px; color:#374151; cursor:pointer; }
  .grn-alert { display:flex; align-items:center; gap:8px; padding:10px 14px; border-radius:10px; font-size:13px; margin-bottom:14px; }
  .grn-alert button { background:none; border:none; cursor:pointer; margin-left:auto; opacity:.6; }
  .grn-alert.error   { background:rgba(239,68,68,.1); border:1px solid rgba(239,68,68,.25); color:#fca5a5; }
  .grn-alert.success { background:rgba(16,185,129,.1); border:1px solid rgba(16,185,129,.25); color:#6ee7b7; }
  .grn-list { display:flex; flex-direction:column; gap:10px; }
  .grn-loading,.grn-empty { text-align:center; padding:40px; color:#9aa3b4; display:flex; align-items:center; justify-content:center; gap:8px; flex-direction:column; }
  .grn-card { background:#ffffff; border:1px solid #e2e6ef; border-radius:12px; padding:14px 16px; }
  .grn-card-top { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:10px; gap:10px; }
  .grn-num  { font-size:14px; font-weight:700; color:#1f2937; }
  .grn-meta { font-size:11.5px; color:#9aa3b4; margin-top:3px; }
  .grn-badge { font-size:11px; font-weight:700; padding:3px 8px; border-radius:5px; white-space:nowrap; }
  .grn-items { display:flex; flex-direction:column; gap:5px; margin-bottom:8px; }
  .grn-item  { display:flex; align-items:center; gap:6px; font-size:12.5px; color:#9aa3b4; flex-wrap:wrap; }
  .grn-item strong { color:#1f2937; }
  .grn-expiry { font-size:11px; color:#fbbf24; }
  .grn-notes { font-size:12px; color:#9aa3b4; margin-bottom:8px; }
  .grn-confirmed-by { font-size:11.5px; color:rgba(16,185,129,.7); margin-top:8px; }
  .grn-actions { margin-top:10px; border-top:1px solid #f0f2f7; padding-top:10px; }
  .grn-confirm-btn { display:flex; align-items:center; gap:6px; padding:8px 16px; background:rgba(16,185,129,.15); border:1px solid rgba(16,185,129,.3); border-radius:9px; color:#34d399; font-size:13px; font-weight:600; cursor:pointer; transition:all .15s; }
  .grn-confirm-btn:hover { background:rgba(16,185,129,.25); }
  .grn-overlay { position:fixed; inset:0; background:rgba(0,0,0,.65); display:flex; align-items:center; justify-content:center; z-index:1000; padding:20px; }
  .grn-modal { background:#ffffff; border:1px solid #e2e6ef; border-radius:16px; width:100%; max-width:680px; max-height:90vh; overflow:hidden; display:flex; flex-direction:column; box-shadow:0 20px 60px rgba(0,0,0,.15); }
  .grn-modal-header { display:flex; align-items:center; justify-content:space-between; padding:16px 20px; border-bottom:1px solid #e2e6ef; background:#f8fafc; }
  .grn-modal-header h3 { margin:0; font-size:15px; font-weight:700; color:#1f2937; }
  .grn-modal-close { background:#e8f0fd; border:1px solid #b3ccf5; border-radius:7px; width:26px; height:26px; display:flex; align-items:center; justify-content:center; cursor:pointer; color:#0052b3; }
  .grn-modal-body   { padding:18px 20px; overflow-y:auto; flex:1; background:#ffffff; }
  .grn-modal-footer { display:flex; gap:10px; justify-content:flex-end; padding:14px 20px; border-top:1px solid #e2e6ef; background:#f8fafc; }
  .grn-form-row { display:flex; gap:12px; margin-bottom:12px; flex-wrap:wrap; }
  .grn-field { display:flex; flex-direction:column; gap:5px; }
  .grn-label { font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:.4px; color:#6b7280; margin-bottom:4px; }
  .grn-input { background:#ffffff; border:1px solid #e2e6ef; border-radius:9px; padding:8px 12px; color:#1f2937; font-size:13px; outline:none; font-family:inherit; box-sizing:border-box; }
  .grn-input:focus { border-color:#0061d2; box-shadow:0 0 0 3px rgba(0,97,210,.1); }
  .grn-sel-wrap { position:relative; }
  .grn-select { appearance:none; background:#ffffff; border:1px solid #e2e6ef; border-radius:9px; padding:8px 28px 8px 12px; color:#1f2937; font-size:13px; outline:none; cursor:pointer; width:100%; }
  .grn-sel-icon { position:absolute; right:8px; top:50%; transform:translateY(-50%); color:#9aa3b4; pointer-events:none; }
  .grn-item-row { background:#f8fafc; border:1px solid #e2e6ef; border-radius:10px; padding:10px 12px; margin-bottom:8px; }
  .grn-item-name { display:flex; align-items:center; gap:6px; font-size:13px; font-weight:600; color:#1f2937; margin-bottom:8px; }
  .spin { animation:spin .8s linear infinite; }
  @keyframes spin { to { transform:rotate(360deg); } }
`;

export default GoodsReceived;
