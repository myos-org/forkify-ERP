import React, { useState, useEffect, useCallback } from 'react';
import {
  Trash2, AlertTriangle, Search, Calendar, Package,
  RefreshCw, X, Save, CheckCircle,
  XCircle, Clock, ArrowLeft, TrendingDown, ChefHat, PackageCheck,
} from 'lucide-react';
import inventoryService from '../../../services/inventoryService';
import recipeService    from '../../../services/recipeService';
import useBranch        from '../../../hooks/useBranch';
import usePermission    from '../../../hooks/usePermission';
import { useNavigate }  from 'react-router-dom';
import api              from '../../../services/api';

const REASONS = ['EXPIRED','DAMAGED','SPOILED','OVERPRODUCTION','QUALITY_ISSUE','OTHER'];
const REASON_LABELS = { EXPIRED:'Expired',DAMAGED:'Damaged',SPOILED:'Spoiled',OVERPRODUCTION:'Overproduction',QUALITY_ISSUE:'Quality Issue',OTHER:'Other' };
const STATUS_CFG = {
  PENDING:  { label:'Pending',  bg:'#fefce8', color:'#a16207', icon: Clock },
  APPROVED: { label:'Approved', bg:'#f0fdf4', color:'#15803d', icon: CheckCircle },
  REJECTED: { label:'Rejected', bg:'#fef2f2', color:'#b91c1c', icon: XCircle },
};
const emptyForm = () => ({ wastageType:'INGREDIENT', ingredientId:'', recipeId:'', quantity:'', reason:'EXPIRED', referenceNo:'', notes:'' });

const Wastage = () => {
  const navigate        = useNavigate();
  const { branchId }    = useBranch();
  const { canApprove }  = usePermission();
  const [records,      setRecords]     = useState([]);
  const [ingredients,  setIngredients] = useState([]);
  const [fgStock,      setFgStock]     = useState([]);
  const [loading,      setLoading]     = useState(false);
  const [search,       setSearch]      = useState('');
  const [statusFilter, setStatusFilter]= useState('all');
  const [typeFilter,   setTypeFilter]  = useState('all');
  const [modalOpen,    setModalOpen]   = useState(false);
  const [form,         setForm]        = useState(emptyForm());
  const [saving,       setSaving]      = useState(false);
  const [error,        setError]       = useState(null);
  const [success,      setSuccess]     = useState(null);

  const load = useCallback(async () => {
    if (!branchId) return;
    setLoading(true);
    try {
      const [wRes, ingRes, fgRes] = await Promise.all([
        inventoryService.getWastage(branchId, statusFilter==='all'?null:statusFilter),
        recipeService.getAllIngredients(),
        api.get('/production/stock', { params: { branchId } }),
      ]);
      setRecords(wRes.data || []); setIngredients(ingRes.data || []); setFgStock(fgRes.data || []);
    } catch { setError('Failed to load wastage records'); }
    finally  { setLoading(false); }
  }, [branchId, statusFilter]);

  useEffect(() => { load(); }, [load, statusFilter]);
  useEffect(() => { if (!success) return; const t=setTimeout(()=>setSuccess(null),3000); return ()=>clearTimeout(t); }, [success]);

  const totalLoss     = records.filter(r=>r.status==='APPROVED').reduce((s,r)=>s+parseFloat(r.costLoss||0),0);
  const pendingCount  = records.filter(r=>r.status==='PENDING').length;
  const approvedCount = records.filter(r=>r.status==='APPROVED').length;
  const fgCount       = records.filter(r=>r.wastageType==='FINISHED_PRODUCT').length;

  const filtered = records.filter(r => {
    const matchSearch = !search || (r.ingredientName||'').toLowerCase().includes(search.toLowerCase()) || (r.recipeName||'').toLowerCase().includes(search.toLowerCase()) || (r.reason||'').toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter==='all' || r.wastageType===typeFilter;
    return matchSearch && matchType;
  });

  const handleSubmit = async () => {
    if (form.wastageType==='INGREDIENT' && !form.ingredientId) { setError('Select an ingredient'); return; }
    if (form.wastageType==='FINISHED_PRODUCT' && !form.recipeId) { setError('Select a finished product'); return; }
    if (!form.quantity || parseFloat(form.quantity)<=0) { setError('Enter a valid quantity'); return; }
    setSaving(true);
    try {
      await inventoryService.logWastage({
        wastageType:  form.wastageType,
        ingredientId: form.wastageType==='INGREDIENT' ? parseInt(form.ingredientId) : null,
        recipeId:     form.wastageType==='FINISHED_PRODUCT' ? parseInt(form.recipeId) : null,
        quantity:     parseFloat(form.quantity),
        reason:       form.reason,
        referenceNo:  form.referenceNo||null,
        notes:        form.notes||null,
      }, branchId);
      setSuccess('Wastage logged — awaiting manager approval');
      setModalOpen(false); setForm(emptyForm()); load();
    } catch(e) { setError(e.response?.data||'Failed to log wastage'); }
    finally { setSaving(false); }
  };

  const handleApprove = async (id) => { try { await inventoryService.approveWastage(id); setSuccess('Wastage approved'); load(); } catch(e){setError(e.response?.data||'Failed');} };
  const handleReject  = async (id) => { try { await inventoryService.rejectWastage(id);  setSuccess('Wastage rejected'); load(); } catch(e){setError(e.response?.data||'Failed');} };

  const selectedFg = form.recipeId ? fgStock.find(f=>String(f.recipeId)===String(form.recipeId)) : null;

  return (
    <div className="wst-page">
      <div className="wst-header">
        <div className="wst-hl"><button className="wst-back" onClick={()=>navigate('/fooderp/inventory')}><ArrowLeft size={15}/></button><div><h2 className="wst-title"><Trash2 size={20}/> Wastage Management</h2><p className="wst-sub">Log ingredient and finished product losses</p></div></div>
        <div className="wst-hr"><button className="wst-ghost" onClick={load} disabled={loading}><RefreshCw size={14} className={loading?'wst-spin':''}/></button><button className="wst-danger-btn" onClick={()=>{setForm(emptyForm());setModalOpen(true);}}><AlertTriangle size={14}/> Record Wastage</button></div>
      </div>

      {error   && <div className="wst-banner error"><AlertTriangle size={14}/>{error}<button onClick={()=>setError(null)}>✕</button></div>}
      {success && <div className="wst-banner success"><CheckCircle size={14}/>{success}<button onClick={()=>setSuccess(null)}>✕</button></div>}

      <div className="wst-stats">
        {[{label:'Total Loss (approved)',val:`₹${totalLoss.toFixed(0)}`,icon:TrendingDown,color:'#ef4444'},{label:'Pending Approval',val:pendingCount,icon:Clock,color:'#f59e0b',urgent:pendingCount>0},{label:'Approved Records',val:approvedCount,icon:CheckCircle,color:'#10b981'},{label:'Finished Goods',val:fgCount,icon:ChefHat,color:'#0061d2'}].map((s,i)=>(
          <div key={i} className={`wst-stat${s.urgent?' urgent':''}`} style={{'--a':s.color}}>
            <div className="wst-stat-icon" style={{background:s.color+'18',color:s.color}}><s.icon size={18}/></div>
            <div><div className="wst-sv">{s.val}</div><div className="wst-sl">{s.label}</div></div>
            {s.urgent&&<div className="wst-dot"/>}
          </div>
        ))}
      </div>

      <div className="wst-filters">
        <div className="wst-search"><Search size={14}/><input placeholder="Search item or reason..." value={search} onChange={e=>setSearch(e.target.value)}/>{search&&<button onClick={()=>setSearch('')}><X size={12}/></button>}</div>
        <div className="wst-chips">{['all','INGREDIENT','FINISHED_PRODUCT'].map(t=><button key={t} className={`wst-chip${typeFilter===t?' active':''}`} onClick={()=>setTypeFilter(t)}>{t==='all'?'All Types':t==='INGREDIENT'?'🌾 Ingredients':'🍽 Finished'}</button>)}</div>
        <div className="wst-chips">{['all','PENDING','APPROVED','REJECTED'].map(s=><button key={s} className={`wst-chip${statusFilter===s?' active':''}`} onClick={()=>setStatusFilter(s)}>{s==='all'?'All':s.charAt(0)+s.slice(1).toLowerCase()}</button>)}</div>
      </div>

      {loading ? <div className="wst-loading"><RefreshCw size={22} className="wst-spin"/><p>Loading...</p></div>
      : filtered.length===0 ? <div className="wst-empty"><Trash2 size={44}/><h3>No wastage records</h3><p>Use "Record Wastage" to log spoiled ingredients or finished products</p></div>
      : <div className="wst-table-wrap"><table className="wst-table">
          <thead><tr><th>Date</th><th>Type</th><th>Item</th><th>Qty</th><th>Reason</th><th>Cost Loss</th><th>By</th><th>Status</th>{canApprove&&<th>Actions</th>}</tr></thead>
          <tbody>{filtered.map(r=>{
            const sc=STATUS_CFG[r.status]||STATUS_CFG.PENDING;
            const isFg=r.wastageType==='FINISHED_PRODUCT';
            return <tr key={r.id} className="wst-row">
              <td><span className="wst-date"><Calendar size={11}/>{r.wastageDate}</span></td>
              <td><span className={`wst-type-badge ${isFg?'fg':'ing'}`}>{isFg?<><ChefHat size={10}/> Finished</>:<><Package size={10}/> Ingredient</>}</span></td>
              <td><strong>{isFg?r.recipeName:r.ingredientName}</strong></td>
              <td>{r.quantity} {r.unit||''}</td>
              <td><span className="wst-reason">{REASON_LABELS[r.reason]||r.reason}</span></td>
              <td><span className="wst-loss">₹{parseFloat(r.costLoss||0).toFixed(2)}</span></td>
              <td className="wst-muted">{r.loggedBy||'—'}</td>
              <td><span className="wst-status" style={{background:sc.bg,color:sc.color}}><sc.icon size={11}/>{sc.label}</span></td>
              {canApprove&&<td>{r.status==='PENDING'?<div className="wst-acts"><button className="wst-appr" onClick={()=>handleApprove(r.id)}><CheckCircle size={13}/></button><button className="wst-rej" onClick={()=>handleReject(r.id)}><XCircle size={13}/></button></div>:<span className="wst-muted">—</span>}</td>}
            </tr>;
          })}</tbody>
        </table></div>}

      {modalOpen&&<div className="wst-overlay" onClick={()=>setModalOpen(false)}>
        <div className="wst-modal" onClick={e=>e.stopPropagation()}>
          <div className="wst-mh"><div className="wst-mi"><Trash2 size={18}/></div><div><h3>Record Wastage</h3><p>Pending until manager approves</p></div><button onClick={()=>setModalOpen(false)}><X size={16}/></button></div>
          <div className="wst-mb">
            <div className="wst-field"><label>What was wasted?</label>
              <div className="wst-toggle">
                {[{val:'INGREDIENT',icon:Package,label:'Raw Ingredient'},{val:'FINISHED_PRODUCT',icon:ChefHat,label:'Finished Product'}].map(o=>(
                  <button key={o.val} className={`wst-tgl-btn${form.wastageType===o.val?' active':''}`} onClick={()=>setForm({...emptyForm(),wastageType:o.val})}><o.icon size={14}/>{o.label}</button>
                ))}
              </div>
            </div>

            {form.wastageType==='INGREDIENT'
              ? <div className="wst-field"><label>Ingredient *</label><select value={form.ingredientId} onChange={e=>setForm(f=>({...f,ingredientId:e.target.value}))}><option value="">Select ingredient</option>{ingredients.map(i=><option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}</select></div>
              : <div className="wst-field"><label>Finished Product *</label><select value={form.recipeId} onChange={e=>setForm(f=>({...f,recipeId:e.target.value}))}><option value="">Select dish</option>{fgStock.map(f=><option key={f.recipeId} value={f.recipeId}>{f.recipeName} — {f.availableServings} servings available</option>)}</select>{selectedFg&&<div className="wst-fg-hint"><PackageCheck size={11}/>{selectedFg.availableServings} servings · ₹{parseFloat(selectedFg.costPerServing||0).toFixed(2)}/serving</div>}</div>}

            <div className="wst-row2">
              <div className="wst-field"><label>{form.wastageType==='FINISHED_PRODUCT'?'Servings':'Quantity'} *</label><input type="number" min="0.01" step={form.wastageType==='FINISHED_PRODUCT'?'1':'0.01'} value={form.quantity} onChange={e=>setForm(f=>({...f,quantity:e.target.value}))}/>{form.wastageType==='FINISHED_PRODUCT'&&selectedFg&&form.quantity&&<div style={{fontSize:11,color:'#ef4444',marginTop:3}}>Est. loss: ₹{(parseFloat(selectedFg.costPerServing||0)*parseFloat(form.quantity||0)).toFixed(2)}</div>}</div>
              <div className="wst-field"><label>Reason *</label><select value={form.reason} onChange={e=>setForm(f=>({...f,reason:e.target.value}))}>{REASONS.map(r=><option key={r} value={r}>{REASON_LABELS[r]}</option>)}</select></div>
            </div>
            <div className="wst-row2">
              <div className="wst-field"><label>Reference No.</label><input placeholder="e.g. INV-456" value={form.referenceNo} onChange={e=>setForm(f=>({...f,referenceNo:e.target.value}))}/></div>
              <div className="wst-field"><label>Notes</label><input placeholder="Optional" value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/></div>
            </div>
            <div className="wst-notice"><AlertTriangle size={13}/>This will be <strong>Pending</strong> until a manager approves. {form.wastageType==='FINISHED_PRODUCT'?' Deducts from Finished Good Stock.':" Deducts from Raw Material Inventory."}</div>
          </div>
          <div className="wst-mf"><button className="wst-ghost wst-cancel" onClick={()=>setModalOpen(false)}>Cancel</button><button className="wst-danger-btn" onClick={handleSubmit} disabled={saving}>{saving?<><RefreshCw size={13} className="wst-spin"/> Logging...</>:<><Save size={13}/> Log Wastage</>}</button></div>
        </div>
      </div>}

      <style>{`
        .wst-page{max-width:1100px;font-family:'DM Sans',sans-serif;}
        .wst-header,.wst-hl,.wst-hr{display:flex;align-items:center;gap:10px;}
        .wst-header{justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;}
        .wst-back{width:32px;height:32px;background:#f0f2f7;border:1px solid #e2e6ef;border-radius:8px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#374151;}
        .wst-title{display:flex;align-items:center;gap:7px;font-size:18px;font-weight:700;color:#1f2937;margin:0 0 2px;}
        .wst-sub{font-size:12px;color:#9ca3af;margin:0;}
        .wst-danger-btn{display:flex;align-items:center;gap:5px;padding:7px 14px;background:#ef4444;border:1px solid #b3ccf5;color:#0052b3;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;}
        .wst-ghost{width:32px;height:32px;background:#f0f2f7;border:1px solid #e2e6ef;border-radius:8px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#6b7280;}
        .wst-cancel{width:auto;padding:7px 14px;font-size:13px;color:#374151;}
        .wst-banner{display:flex;align-items:center;gap:8px;padding:9px 12px;border-radius:8px;font-size:13px;margin-bottom:12px;}
        .wst-banner button{margin-left:auto;background:none;border:none;cursor:pointer;font-size:15px;}
        .wst-banner.error{background:#fef2f2;border:1px solid #fecaca;color:#dc2626;}
        .wst-banner.success{background:#f0fdf4;border:1px solid #bbf7d0;color:#15803d;}
        .wst-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px;}
        @media(max-width:700px){.wst-stats{grid-template-columns:repeat(2,1fr);}}
        .wst-stat{background:#fff;border-radius:12px;border:1px solid #e5e7eb;padding:14px;display:flex;align-items:center;gap:12px;position:relative;}
        .wst-stat.urgent{border-color:var(--a);}
        .wst-stat-icon{width:38px;height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
        .wst-sv{font-size:18px;font-weight:800;color:#1f2937;line-height:1;}
        .wst-sl{font-size:11px;color:#9ca3af;margin-top:2px;}
        .wst-dot{position:absolute;top:10px;right:10px;width:8px;height:8px;background:#f59e0b;border-radius:50%;animation:wst-pulse 1.5s infinite;}
        @keyframes wst-pulse{0%,100%{opacity:1}50%{opacity:.3}}
        .wst-filters{display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;align-items:center;}
        .wst-search{display:flex;align-items:center;gap:7px;padding:8px 12px;background:#fff;border:1px solid #e5e7eb;border-radius:8px;flex:1;min-width:200px;}
        .wst-search:focus-within{border-color:#0061d2;}
        .wst-search input{border:none;outline:none;font-size:13px;color:#1f2937;flex:1;background:transparent;}
        .wst-search button{background:none;border:none;cursor:pointer;color:#9ca3af;}
        .wst-chips{display:flex;gap:4px;flex-wrap:wrap;}
        .wst-chip{padding:5px 10px;background:#f1f5f9;border:1px solid #e5e7eb;border-radius:20px;font-size:11px;font-weight:500;color:#64748b;cursor:pointer;white-space:nowrap;}
        .wst-chip.active{background:#e8f0fd;border-color:#0061d2;color:#0061d2;font-weight:600;}
        .wst-table-wrap{background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:auto;}
        .wst-table{width:100%;border-collapse:collapse;min-width:700px;}
        .wst-table thead tr{background:#f8fafc;border-bottom:1px solid #e5e7eb;}
        .wst-table th{padding:10px 14px;text-align:left;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;}
        .wst-row{border-bottom:1px solid #f1f5f9;}
        .wst-row:hover{background:#fafafa;}
        .wst-table td{padding:11px 14px;vertical-align:middle;font-size:13px;}
        .wst-date{display:inline-flex;align-items:center;gap:4px;font-size:12px;color:#6b7280;}
        .wst-type-badge{display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:700;padding:3px 7px;border-radius:20px;}
        .wst-type-badge.ing{background:#f0f9ff;color:#0369a1;}
        .wst-type-badge.fg{background:#fdf4ff;color:#7e22ce;}
        .wst-reason{font-size:11px;font-weight:600;padding:2px 7px;background:#e8f0fd;color:#0052b3;border-radius:4px;}
        .wst-loss{font-size:13px;font-weight:700;color:#ef4444;}
        .wst-status{display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:700;padding:3px 8px;border-radius:20px;}
        .wst-muted{font-size:12px;color:#9ca3af;}
        .wst-acts{display:flex;gap:4px;}
        .wst-appr,.wst-rej{width:26px;height:26px;display:flex;align-items:center;justify-content:center;border-radius:6px;cursor:pointer;}
        .wst-appr{background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.2);color:#10b981;}
        .wst-rej{background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.15);color:#ef4444;}
        .wst-loading,.wst-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:48px;color:#9ca3af;text-align:center;background:#fff;border-radius:12px;border:1px solid #e5e7eb;}
        .wst-empty h3{font-size:16px;font-weight:600;color:#374151;margin:0;}
        .wst-empty p{font-size:13px;margin:0;}
        .wst-overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;z-index:1000;padding:16px;}
        .wst-modal{background:#fff;border-radius:16px;width:100%;max-width:520px;box-shadow:0 20px 60px rgba(0,0,0,.2);overflow:hidden;}
        .wst-mh{display:flex;align-items:center;gap:12px;padding:18px 20px;border-bottom:1px solid #f1f5f9;}
        .wst-mi{width:36px;height:36px;background:rgba(239,68,68,.1);border-radius:9px;display:flex;align-items:center;justify-content:center;color:#ef4444;flex-shrink:0;}
        .wst-mh h3{font-size:15px;font-weight:700;color:#1f2937;margin:0 0 2px;}
        .wst-mh p{font-size:12px;color:#9ca3af;margin:0;}
        .wst-mh>button{margin-left:auto;width:28px;height:28px;background:#f0f2f7;border:none;border-radius:7px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#6b7280;}
        .wst-mb{padding:18px 20px;display:flex;flex-direction:column;gap:12px;}
        .wst-row2{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
        .wst-field{display:flex;flex-direction:column;gap:5px;}
        .wst-field label{font-size:12px;font-weight:600;color:#374151;}
        .wst-field input,.wst-field select{padding:8px 11px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;color:#1f2937;background:#fff;outline:none;font-family:inherit;}
        .wst-field input:focus,.wst-field select:focus{border-color:#0061d2;}
        .wst-toggle{display:flex;gap:8px;}
        .wst-tgl-btn{flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:10px;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;border:2px solid #e5e7eb;background:#fff;color:#6b7280;transition:all .15s;}
        .wst-tgl-btn.active{border-color:#0061d2;background:#e8f0fd;color:#0061d2;}
        .wst-fg-hint{display:flex;align-items:center;gap:5px;font-size:11px;color:#10b981;margin-top:3px;}
        .wst-notice{display:flex;align-items:flex-start;gap:8px;padding:10px 12px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;font-size:12px;color:#92400e;line-height:1.5;}
        .wst-mf{display:flex;justify-content:flex-end;gap:8px;padding:14px 20px;border-top:1px solid #e2e6ef;background:#f8fafc;}
        .wst-spin{animation:wst-spin .8s linear infinite;}
        @keyframes wst-spin{to{transform:rotate(360deg);}}
      `}</style>
    </div>
  );
};

export default Wastage;