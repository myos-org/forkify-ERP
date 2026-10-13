import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowRightLeft, Plus, RefreshCw, AlertTriangle, CheckCircle,
  Clock, Truck, X, ChevronDown, Package, Store,
  XCircle, Send,
} from 'lucide-react';
import { transferService } from '../../../services/newServices';
import recipeService from '../../../services/recipeService';
import branchService from '../../../services/branchService';
import useBranch     from '../../../hooks/useBranch';
import usePermission from '../../../hooks/usePermission';

const STATUS_CFG = {
  PENDING:    { label:'Pending',    bg:'#fefce8', color:'#a16207', icon: Clock },
  APPROVED:   { label:'Approved',   bg:'#eff6ff', color:'#1d4ed8', icon: CheckCircle },
  DISPATCHED: { label:'Dispatched', bg:'#e8f0fd', color:'#0052b3', icon: Truck },
  RECEIVED:   { label:'Received',   bg:'#f0fdf4', color:'#15803d', icon: CheckCircle },
  CANCELLED:  { label:'Cancelled',  bg:'#f1f5f9', color:'#475569', icon: XCircle },
};

const emptyForm = () => ({ fromBranchId:'', toBranchId:'', notes:'', items:[{ingredientId:'',quantity:''}] });

export default function StockTransfers() {
  const { branchId }  = useBranch();
  const { canApprove } = usePermission();
  const [transfers,    setTransfers]    = useState([]);
  const [branches,     setBranches]     = useState([]);
  const [ingredients,  setIngredients]  = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [modal,        setModal]        = useState(false);
  const [detailId,     setDetailId]     = useState(null);
  const [form,         setForm]         = useState(emptyForm());
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState(null);
  const [success,      setSuccess]      = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tRes, bRes, iRes] = await Promise.all([
        transferService.getAll(branchId, statusFilter !== 'all' ? statusFilter : null),
        branchService.getAll(),
        recipeService.getAllIngredients(),
      ]);
      setTransfers(tRes.data || []);
      setBranches(bRes.data || []);
      setIngredients(iRes.data || []);
    } catch { setError('Failed to load transfers'); }
    finally { setLoading(false); }
  }, [branchId]);

  useEffect(() => { load(); }, [load, statusFilter]);
  useEffect(() => { if (success) { const t=setTimeout(()=>setSuccess(null),3000); return ()=>clearTimeout(t); } }, [success]);

  const addLine    = () => setForm(f => ({ ...f, items:[...f.items,{ingredientId:'',quantity:''}] }));
  const removeLine = (i) => setForm(f => ({ ...f, items:f.items.filter((_,idx)=>idx!==i) }));
  const updateLine = (i,field,val) => setForm(f => ({ ...f, items:f.items.map((it,idx)=>idx===i?{...it,[field]:val}:it) }));

  const handleCreate = async () => {
    if (!form.fromBranchId || !form.toBranchId) { setError('Select both branches'); return; }
    if (form.fromBranchId === form.toBranchId)   { setError('From and To branch must be different'); return; }
    const validItems = form.items.filter(it=>it.ingredientId && parseFloat(it.quantity)>0);
    if (!validItems.length) { setError('Add at least one item'); return; }
    setSaving(true);
    try {
      await transferService.create({
        fromBranchId: Number(form.fromBranchId),
        toBranchId:   Number(form.toBranchId),
        notes: form.notes,
        items: validItems.map(it=>({ ingredientId:Number(it.ingredientId), quantity:parseFloat(it.quantity), notes:it.notes||'' })),
      });
      setSuccess('Transfer request created');
      setModal(false); setForm(emptyForm()); load();
    } catch (e) { setError(e.response?.data||'Failed to create transfer'); }
    finally { setSaving(false); }
  };

  const handleAction = async (id, action) => {
    setSaving(true);
    try {
      if (action==='approve')  await transferService.approve(id);
      if (action==='dispatch') await transferService.dispatch(id);
      if (action==='receive')  await transferService.receive(id);
      if (action==='cancel')   await transferService.cancel(id);
      setSuccess(`Transfer ${action}d`);
      load();
    } catch (e) { setError(e.response?.data||`Failed to ${action}`); }
    finally { setSaving(false); }
  };

  const detail = detailId ? transfers.find(t=>t.id===detailId) : null;
  const ingUnit = (id) => ingredients.find(i=>i.id===Number(id))?.unit||'';

  return (
    <div className="st-page">
      <div className="st-header">
        <div>
          <h2 className="st-title"><ArrowRightLeft size={20}/> Branch Stock Transfers</h2>
          <p className="st-sub">Request, approve and track inter-branch stock movements</p>
        </div>
        <div className="st-header-right">
          <button className="st-btn-ghost" onClick={load} disabled={loading}><RefreshCw size={14} className={loading?'st-spin':''}/></button>
          <button className="st-btn-primary" onClick={()=>{setForm(emptyForm());setModal(true);}}><Plus size={14}/> New Transfer</button>
        </div>
      </div>

      {error   && <div className="st-banner error"><AlertTriangle size={14}/>{error}<button onClick={()=>setError(null)}>✕</button></div>}
      {success && <div className="st-banner success"><CheckCircle size={14}/>{success}</div>}

      {/* Status tabs */}
      <div className="st-status-tabs">
        {['all','PENDING','APPROVED','DISPATCHED','RECEIVED','CANCELLED'].map(s=>(
          <button key={s} className={`st-tab ${statusFilter===s?'active':''}`} onClick={()=>setStatusFilter(s)}>
            {s==='all'?'All':STATUS_CFG[s]?.label||s}
            {s!=='all' && <span className="st-tab-count">{transfers.filter(t=>t.status===s).length}</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="st-loading"><RefreshCw size={22} className="st-spin"/><p>Loading transfers...</p></div>
      ) : transfers.length===0 ? (
        <div className="st-empty"><ArrowRightLeft size={44}/><h3>No transfers found</h3><p>Create a transfer request to move stock between branches</p></div>
      ) : (
        <div className="st-list">
          {transfers.map(t => {
            const sc = STATUS_CFG[t.status] || STATUS_CFG.PENDING;
            return (
              <div key={t.id} className="st-card" onClick={()=>setDetailId(t.id)}>
                <div className="st-card-left">
                  <div className="st-transfer-num">{t.transferNumber}</div>
                  <div className="st-route">
                    <Store size={12}/> <strong>{t.fromBranchName}</strong>
                    <ArrowRightLeft size={12} style={{color:'#9ca3af'}}/>
                    <Store size={12}/> <strong>{t.toBranchName}</strong>
                  </div>
                  <div className="st-meta">
                    {t.items?.length||0} items · ₹{Number(t.totalValue||0).toFixed(0)}
                    · Requested by {t.requestedBy||'—'}
                    · {t.createdAt?.split('T')[0]}
                  </div>
                </div>
                <div className="st-card-right">
                  <span className="st-status-badge" style={{background:sc.bg,color:sc.color}}>
                    <sc.icon size={11}/>{sc.label}
                  </span>
                  {canApprove && (
                    <div className="st-card-actions" onClick={e=>e.stopPropagation()}>
                      {t.status==='PENDING'    && <button className="st-act approve" onClick={()=>handleAction(t.id,'approve')}>Approve</button>}
                      {t.status==='APPROVED'   && <button className="st-act dispatch" onClick={()=>handleAction(t.id,'dispatch')}><Send size={12}/> Dispatch</button>}
                      {t.status==='DISPATCHED' && <button className="st-act receive" onClick={()=>handleAction(t.id,'receive')}><CheckCircle size={12}/> Receive</button>}
                      {!['RECEIVED','CANCELLED'].includes(t.status) && <button className="st-act cancel" onClick={()=>handleAction(t.id,'cancel')}><X size={12}/></button>}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail drawer */}
      {detail && (
        <div className="st-overlay" onClick={()=>setDetailId(null)}>
          <div className="st-drawer" onClick={e=>e.stopPropagation()}>
            <div className="st-drawer-hdr">
              <h3>{detail.transferNumber}</h3>
              <button className="st-modal-close" onClick={()=>setDetailId(null)}><X size={15}/></button>
            </div>
            <div className="st-drawer-body">
              <div className="st-detail-grid">
                <div><span className="st-dl">From</span><span className="st-dv">{detail.fromBranchName}</span></div>
                <div><span className="st-dl">To</span><span className="st-dv">{detail.toBranchName}</span></div>
                <div><span className="st-dl">Status</span>
                  <span className="st-status-badge" style={{background:STATUS_CFG[detail.status]?.bg,color:STATUS_CFG[detail.status]?.color}}>
                    {STATUS_CFG[detail.status]?.label}
                  </span>
                </div>
                <div><span className="st-dl">Total Value</span><span className="st-dv" style={{color:'#0061d2'}}>₹{Number(detail.totalValue||0).toFixed(2)}</span></div>
                <div><span className="st-dl">Requested By</span><span className="st-dv">{detail.requestedBy||'—'}</span></div>
                <div><span className="st-dl">Approved By</span><span className="st-dv">{detail.approvedBy||'—'}</span></div>
              </div>
              {detail.notes && <div className="st-detail-notes">{detail.notes}</div>}
              <div className="st-items-title"><Package size={13}/> Items ({detail.items?.length||0})</div>
              <div className="st-items-list">
                {(detail.items||[]).map((item,j) => (
                  <div key={j} className="st-item-row">
                    <span className="st-item-name">{item.ingredientName}</span>
                    <span className="st-item-qty">Req: {item.requestedQuantity} {item.unit}</span>
                    {item.dispatchedQuantity!=null && <span className="st-item-disp">Sent: {item.dispatchedQuantity}</span>}
                    {item.receivedQuantity!=null   && <span className="st-item-recv">Rcvd: {item.receivedQuantity}</span>}
                    <span className="st-item-cost">₹{Number(item.unitCost||0).toFixed(2)}/{item.unit}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {modal && (
        <div className="st-overlay" onClick={()=>setModal(false)}>
          <div className="st-modal" onClick={e=>e.stopPropagation()}>
            <div className="st-drawer-hdr"><h3>New Stock Transfer</h3><button className="st-modal-close" onClick={()=>setModal(false)}><X size={15}/></button></div>
            <div className="st-drawer-body">
              <div className="st-form-row">
                <div>
                  <label className="st-label">From Branch *</label>
                  <div className="st-sel-wrap">
                    <select className="st-select" value={form.fromBranchId} onChange={e=>setForm(f=>({...f,fromBranchId:e.target.value}))}>
                      <option value="">— Select —</option>
                      {branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                    <ChevronDown size={12} className="st-sel-icon"/>
                  </div>
                </div>
                <div>
                  <label className="st-label">To Branch *</label>
                  <div className="st-sel-wrap">
                    <select className="st-select" value={form.toBranchId} onChange={e=>setForm(f=>({...f,toBranchId:e.target.value}))}>
                      <option value="">— Select —</option>
                      {branches.filter(b=>b.id!==Number(form.fromBranchId)).map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                    <ChevronDown size={12} className="st-sel-icon"/>
                  </div>
                </div>
              </div>
              <label className="st-label">Items</label>
              {form.items.map((item,i)=>(
                <div key={i} className="st-item-form-row">
                  <div className="st-sel-wrap" style={{flex:2}}>
                    <select className="st-select" value={item.ingredientId} onChange={e=>updateLine(i,'ingredientId',e.target.value)}>
                      <option value="">— Ingredient —</option>
                      {ingredients.map(ing=><option key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</option>)}
                    </select>
                    <ChevronDown size={12} className="st-sel-icon"/>
                  </div>
                  <input className="st-input" type="number" min="0.001" step="0.001" placeholder="Qty"
                    value={item.quantity} onChange={e=>updateLine(i,'quantity',e.target.value)} style={{width:80}}/>
                  {item.ingredientId && <span style={{fontSize:11,color:'#9ca3af'}}>{ingUnit(item.ingredientId)}</span>}
                  <button className="st-remove-btn" onClick={()=>removeLine(i)} disabled={form.items.length===1}><X size={12}/></button>
                </div>
              ))}
              <button className="st-add-line" onClick={addLine}><Plus size={11}/> Add Item</button>
              <label className="st-label" style={{marginTop:12}}>Notes</label>
              <textarea className="st-input st-textarea" value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} rows={2} placeholder="Reason for transfer..."/>
            </div>
            <div className="st-modal-ftr">
              <button className="st-btn-ghost" onClick={()=>setModal(false)}>Cancel</button>
              <button className="st-btn-primary" onClick={handleCreate} disabled={saving}>
                {saving?<RefreshCw size={13} className="st-spin"/>:<Send size={13}/>} Create Request
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .st-page{max-width:1100px;font-family:'DM Sans',sans-serif;}
        .st-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;flex-wrap:wrap;gap:10px;}
        .st-title{display:flex;align-items:center;gap:8px;font-size:20px;font-weight:700;color:#1f2937;margin:0 0 3px;}
        .st-sub{font-size:12px;color:#9ca3af;margin:0;}
        .st-header-right{display:flex;gap:8px;}
        .st-btn-primary{display:flex;align-items:center;gap:6px;padding:8px 14px;background:#e8f0fd;border:1px solid #b3ccf5;border:1px solid #b3ccf5;color:#0052b3;border-radius:9px;font-size:13px;font-weight:600;cursor:pointer;}
        .st-btn-ghost{display:flex;align-items:center;gap:5px;padding:7px 12px;background:#f0f2f7;border:1px solid #e2e6ef;border-radius:8px;font-size:12px;color:#374151;cursor:pointer;}
        .st-banner{display:flex;align-items:center;gap:8px;padding:9px 12px;border-radius:8px;font-size:13px;margin-bottom:12px;}
        .st-banner button{margin-left:auto;background:none;border:none;cursor:pointer;font-size:15px;}
        .st-banner.error{background:#fef2f2;border:1px solid #fecaca;color:#dc2626;}
        .st-banner.success{background:#f0fdf4;border:1px solid #bbf7d0;color:#15803d;}
        .st-status-tabs{display:flex;gap:4px;margin-bottom:16px;flex-wrap:wrap;}
        .st-tab{display:flex;align-items:center;gap:5px;padding:6px 12px;background:#f1f5f9;border:1px solid #e5e7eb;border-radius:20px;font-size:12px;font-weight:500;color:#64748b;cursor:pointer;}
        .st-tab.active{background:#e8f0fd;border-color:#0061d2;color:#0061d2;font-weight:600;}
        .st-tab-count{font-size:10px;font-weight:700;background:#e5e7eb;border-radius:10px;padding:0 5px;}
        .st-loading,.st-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:48px;color:#9ca3af;text-align:center;background:#fff;border-radius:12px;border:1px solid #e5e7eb;}
        .st-empty h3{font-size:16px;color:#374151;font-weight:600;margin:0;}
        .st-empty p{font-size:13px;margin:0;}
        .st-list{display:flex;flex-direction:column;gap:10px;}
        .st-card{background:#fff;border-radius:12px;border:1px solid #e5e7eb;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;cursor:pointer;gap:12px;transition:box-shadow .15s;}
        .st-card:hover{box-shadow:0 2px 12px #e2e6ef;}
        .st-transfer-num{font-size:12px;font-weight:700;color:#374151;font-family:monospace;margin-bottom:4px;}
        .st-route{display:flex;align-items:center;gap:6px;font-size:13px;color:#374151;margin-bottom:4px;}
        .st-meta{font-size:11px;color:#9ca3af;}
        .st-card-right{display:flex;flex-direction:column;align-items:flex-end;gap:8px;flex-shrink:0;}
        .st-status-badge{display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:700;padding:3px 8px;border-radius:20px;}
        .st-card-actions{display:flex;gap:4px;}
        .st-act{display:flex;align-items:center;gap:4px;padding:4px 10px;border-radius:7px;font-size:11px;font-weight:600;cursor:pointer;border:1px solid;transition:all .15s;}
        .st-act.approve{background:#eff6ff;border-color:#bfdbfe;color:#1d4ed8;}
        .st-act.dispatch{background:#e8f0fd;border-color:#b3ccf5;color:#0052b3;}
        .st-act.receive{background:#f0fdf4;border-color:#bbf7d0;color:#15803d;}
        .st-act.cancel{background:#fef2f2;border-color:#fecaca;color:#dc2626;}
        .st-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:1000;padding:20px;}
        .st-drawer,.st-modal{background:#fff;border-radius:14px;width:100%;max-width:560px;max-height:88vh;overflow:hidden;display:flex;flex-direction:column;}
        .st-drawer-hdr{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid #e5e7eb;}
        .st-drawer-hdr h3{margin:0;font-size:15px;font-weight:700;color:#1f2937;}
        .st-modal-close{background:#e8f0fd;border:1px solid #b3ccf5;border-radius:7px;width:26px;height:26px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#0052b3;}
        .st-drawer-body{padding:18px 20px;overflow-y:auto;flex:1;}
        .st-modal-ftr{display:flex;gap:10px;justify-content:flex-end;padding:14px 20px;border-top:1px solid #e5e7eb;}
        .st-detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;}
        .st-dl{display:block;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#9ca3af;margin-bottom:3px;}
        .st-dv{font-size:13px;font-weight:600;color:#1f2937;}
        .st-detail-notes{font-size:13px;color:#6b7280;background:#f8fafc;border-radius:8px;padding:10px;margin-bottom:14px;}
        .st-items-title{display:flex;align-items:center;gap:6px;font-size:12px;font-weight:700;color:#374151;margin-bottom:8px;}
        .st-items-list{display:flex;flex-direction:column;gap:6px;}
        .st-item-row{display:flex;align-items:center;gap:10px;padding:8px 12px;background:#f8fafc;border-radius:8px;font-size:12px;}
        .st-item-name{flex:1;font-weight:600;color:#1f2937;}
        .st-item-qty,.st-item-disp,.st-item-recv{color:#6b7280;}
        .st-item-recv{color:#15803d;font-weight:600;}
        .st-item-cost{color:#0061d2;font-weight:600;margin-left:auto;}
        .st-form-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;}
        .st-label{display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#6b7280;margin-bottom:5px;}
        .st-sel-wrap{position:relative;}
        .st-select{appearance:none;width:100%;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:8px 28px 8px 12px;font-size:13px;color:#1f2937;outline:none;cursor:pointer;}
        .st-select:focus{border-color:#0061d2;}
        .st-sel-icon{position:absolute;right:8px;top:50%;transform:translateY(-50%);color:#9ca3af;pointer-events:none;}
        .st-item-form-row{display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap;}
        .st-input{padding:8px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;outline:none;font-family:inherit;box-sizing:border-box;}
        .st-input:focus{border-color:#0061d2;}
        .st-textarea{width:100%;resize:vertical;min-height:60px;}
        .st-remove-btn{background:#fef2f2;border:1px solid #fecaca;border-radius:7px;padding:6px;display:flex;cursor:pointer;color:#dc2626;}
        .st-add-line{display:flex;align-items:center;gap:5px;padding:6px 12px;background:rgba(0,0,0,.03);border:1px dashed #e5e7eb;border-radius:8px;font-size:12px;cursor:pointer;color:#6b7280;margin-bottom:12px;}
        .st-spin{animation:st-spin .8s linear infinite;}
        @keyframes st-spin{to{transform:rotate(360deg);}}
      `}</style>
    </div>
  );
}