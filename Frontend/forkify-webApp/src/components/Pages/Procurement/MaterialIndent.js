import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList, Plus, Trash2, RefreshCw,
  CheckCircle, XCircle, Clock, Send,
  Package, AlertTriangle, X, ChevronDown,
} from 'lucide-react';
import procurementService from '../../../services/procurementService';
import recipeService       from '../../../services/recipeService';
import useBranch           from '../../../hooks/useBranch';
import usePermission       from '../../../hooks/usePermission';

const STATUS_CFG = {
  PENDING:        { label:'Pending',        bg:'rgba(251,191,36,.12)', color:'#fbbf24', Icon:Clock },
  APPROVED:       { label:'Approved',       bg:'rgba(16,185,129,.12)', color:'#34d399', Icon:CheckCircle },
  REJECTED:       { label:'Rejected',       bg:'rgba(239,68,68,.12)',  color:'#f87171', Icon:XCircle },
  CONVERTED_TO_PO:{ label:'Converted→PO',  bg:'rgba(0,97,210,.12)', color:'#3385e0', Icon:CheckCircle },
  CANCELLED:      { label:'Cancelled',      bg:'#f0f2f7',color:'#9aa3b4', Icon:XCircle },
};

const MaterialIndent = () => {
  const { branchId }      = useBranch();
  const { canApprove }    = usePermission();

  const [indents,     setIndents]     = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [modal,       setModal]       = useState(false);    // create form
  const [convModal,   setConvModal]   = useState(null);     // {indentId} convert-to-PO
  const [suppliers,   setSuppliers]   = useState([]);
  const [supplierId,  setSupplierId]  = useState('');
  const [statusFilter,setStatusFilter]= useState('all');
  const [lines,       setLines]       = useState([{ ingredientId:'', quantity:'', notes:'' }]);
  const [indentNotes, setIndentNotes] = useState('');
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState(null);
  const [success,     setSuccess]     = useState(null);

  const load = useCallback(async () => {
    if (!branchId) return;
    setLoading(true);
    try {
      const [indRes, ingRes] = await Promise.all([
        procurementService.getIndents(branchId, statusFilter === 'all' ? null : statusFilter),
        recipeService.getAllIngredients(),
      ]);
      setIndents(indRes.data || []);
      setIngredients(ingRes.data || []);
    } catch { setError('Failed to load'); }
    finally  { setLoading(false); }
  }, [branchId]);

  useEffect(() => { load(); }, [load, statusFilter]);
  useEffect(() => {
    if (success) { const t = setTimeout(() => setSuccess(null), 3000); return () => clearTimeout(t); }
  }, [success]);

  // Load suppliers when convert modal opens
  useEffect(() => {
    if (convModal) {
      procurementService.getSuppliers(branchId)
        .then(({ data }) => setSuppliers(data || [])).catch(() => {});
    }
  }, [convModal, branchId]);

  const addLine    = () => setLines(l => [...l, { ingredientId:'', quantity:'', notes:'' }]);
  const removeLine = (i) => setLines(l => l.filter((_, idx) => idx !== i));
  const updateLine = (i, field, val) => setLines(l => l.map((line, idx) => idx === i ? { ...line, [field]: val } : line));

  const handleSubmit = async () => {
    const validLines = lines.filter(l => l.ingredientId && l.quantity > 0);
    if (validLines.length === 0) { setError('Add at least one ingredient'); return; }
    setSaving(true); setError(null);
    try {
      const { data } = await procurementService.createIndent({
        notes: indentNotes,
        items: validLines.map(l => ({
          ingredientId: Number(l.ingredientId),
          quantity:     Number(l.quantity),
          notes:        l.notes,
        })),
      }, branchId);
      setIndents(prev => [data, ...prev]);
      setModal(false);
      setLines([{ ingredientId:'', quantity:'', notes:'' }]);
      setIndentNotes('');
      setSuccess('Indent raised successfully');
    } catch (e) { setError(e.response?.data || 'Failed to create indent'); }
    finally     { setSaving(false); }
  };

  const handleApprove = async (id) => {
    try {
      const { data } = await procurementService.approveIndent(id);
      setIndents(prev => prev.map(i => i.id === id ? data : i));
      setSuccess('Indent approved');
    } catch (e) { setError(e.response?.data || 'Approval failed'); }
  };

  const handleReject = async (id) => {
    try {
      const { data } = await procurementService.rejectIndent(id, 'Rejected by manager');
      setIndents(prev => prev.map(i => i.id === id ? data : i));
      setSuccess('Indent rejected');
    } catch (e) { setError(e.response?.data || 'Rejection failed'); }
  };

  const handleConvert = async () => {
    if (!supplierId) { setError('Select a supplier'); return; }
    setSaving(true);
    try {
      const { data } = await procurementService.convertToPO(convModal, Number(supplierId));
      setSuccess(`PO ${data.poNumber} created`);
      setConvModal(null); setSupplierId('');
      load();
    } catch (e) { setError(e.response?.data || 'Conversion failed'); }
    finally     { setSaving(false); }
  };

  const ingUnit = (id) => ingredients.find(i => i.id === Number(id))?.unit || '';

  return (
    <div className="mi-page">
      <style>{css}</style>

      <div className="mi-header">
        <div className="mi-title-wrap">
          <div className="mi-icon"><ClipboardList size={18}/></div>
          <div>
            <h2 className="mi-title">Material Indents</h2>
            <div className="mi-sub">Raise requests for ingredients</div>
          </div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="mi-btn-outline" onClick={load}>
            <RefreshCw size={13} className={loading ? 'spin' : ''}/>
          </button>
          <button className="mi-btn-primary" onClick={() => setModal(true)}>
            <Plus size={14}/> Raise Indent
          </button>
        </div>
      </div>

      {error   && <div className="mi-alert error"><AlertTriangle size={13}/>{error}<button onClick={() => setError(null)}><X size={12}/></button></div>}
      {success && <div className="mi-alert success"><CheckCircle size={13}/>{success}</div>}

      {/* Status filters */}
      <div className="mi-filters">
        {['all','PENDING','APPROVED','REJECTED','CONVERTED_TO_PO'].map(s => (
          <button key={s}
            className={`mi-filter-btn ${statusFilter === s ? 'active' : ''}`}
            onClick={() => setStatusFilter(s)}>
            {s === 'all' ? 'All' : STATUS_CFG[s]?.label || s}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="mi-table-wrap">
        {loading ? (
          <div className="mi-loading"><RefreshCw size={18} className="spin"/> Loading...</div>
        ) : indents.length === 0 ? (
          <div className="mi-empty"><ClipboardList size={36}/><p>No indents found</p></div>
        ) : indents.map(indent => {
          const sc = STATUS_CFG[indent.status] || STATUS_CFG.PENDING;
          return (
            <div key={indent.id} className="mi-card">
              <div className="mi-card-top">
                <div>
                  <div className="mi-indent-no">{indent.indentNumber}</div>
                  <div className="mi-indent-meta">
                    {indent.items?.length} item(s) &nbsp;·&nbsp; by {indent.raisedBy}
                    &nbsp;·&nbsp; {indent.createdAt?.split('T')[0]}
                  </div>
                </div>
                <span className="mi-badge" style={{ background:sc.bg, color:sc.color }}>
                  <sc.Icon size={11}/> {sc.label}
                </span>
              </div>

              <div className="mi-items-list">
                {(indent.items || []).map(item => (
                  <div key={item.id} className="mi-item">
                    <Package size={11}/> {item.ingredientName} —
                    <strong> {item.quantity} {item.unit}</strong>
                    {item.notes && <span className="mi-item-note"> ({item.notes})</span>}
                  </div>
                ))}
              </div>

              {indent.notes && <div className="mi-notes">{indent.notes}</div>}
              {indent.rejectionReason && (
                <div className="mi-rejection">Rejected: {indent.rejectionReason}</div>
              )}
              {indent.poNumber && (
                <div className="mi-po-ref">PO: {indent.poNumber}</div>
              )}

              {/* Actions */}
              {canApprove && indent.status === 'PENDING' && (
                <div className="mi-card-actions">
                  <button className="mi-action-btn approve" onClick={() => handleApprove(indent.id)}>
                    <CheckCircle size={13}/> Approve
                  </button>
                  <button className="mi-action-btn reject" onClick={() => handleReject(indent.id)}>
                    <XCircle size={13}/> Reject
                  </button>
                </div>
              )}
              {canApprove && indent.status === 'APPROVED' && (
                <div className="mi-card-actions">
                  <button className="mi-action-btn convert" onClick={() => setConvModal(indent.id)}>
                    <Send size={13}/> Convert to PO
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Create Indent Modal */}
      {modal && (
        <div className="mi-overlay" onClick={() => setModal(false)}>
          <div className="mi-modal" onClick={e => e.stopPropagation()}>
            <div className="mi-modal-header">
              <h3>Raise Material Indent</h3>
              <button className="mi-modal-close" onClick={() => setModal(false)}><X size={15}/></button>
            </div>
            <div className="mi-modal-body">
              {error && <div className="mi-alert error" style={{ marginBottom:12 }}><AlertTriangle size={13}/>{error}</div>}
              <div className="mi-lines">
                {lines.map((line, idx) => (
                  <div key={idx} className="mi-line">
                    <div className="mi-sel-wrap" style={{ flex:2 }}>
                      <select className="mi-select" value={line.ingredientId}
                        onChange={e => updateLine(idx, 'ingredientId', e.target.value)}>
                        <option value="">— Ingredient —</option>
                        {ingredients.map(i => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
                      </select>
                      <ChevronDown size={12} className="mi-sel-icon"/>
                    </div>
                    <input className="mi-input" type="number" min="0.001" step="0.001"
                      placeholder="Qty" value={line.quantity} style={{ width:90 }}
                      onChange={e => updateLine(idx, 'quantity', e.target.value)} />
                    {line.ingredientId && (
                      <span style={{ fontSize:11, color:'#9aa3b4', whiteSpace:'nowrap' }}>
                        {ingUnit(line.ingredientId)}
                      </span>
                    )}
                    <input className="mi-input" placeholder="Note (optional)" value={line.notes} style={{ flex:1 }}
                      onChange={e => updateLine(idx, 'notes', e.target.value)} />
                    <button className="mi-remove-btn" onClick={() => removeLine(idx)}
                      disabled={lines.length === 1}><Trash2 size={13}/></button>
                  </div>
                ))}
                <button className="mi-add-line" onClick={addLine}>
                  <Plus size={12}/> Add Ingredient
                </button>
              </div>
              <div style={{ marginTop:12 }}>
                <label className="mi-label">Notes (optional)</label>
                <textarea className="mi-input mi-textarea" value={indentNotes} rows={2}
                  onChange={e => setIndentNotes(e.target.value)}
                  placeholder="Urgency, batch info..." />
              </div>
            </div>
            <div className="mi-modal-footer">
              <button className="mi-btn-ghost" onClick={() => setModal(false)}>Cancel</button>
              <button className="mi-btn-primary" onClick={handleSubmit} disabled={saving}>
                {saving ? <RefreshCw size={13} className="spin"/> : <Send size={13}/>}
                Submit Indent
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Convert to PO Modal */}
      {convModal && (
        <div className="mi-overlay" onClick={() => setConvModal(null)}>
          <div className="mi-modal" style={{ maxWidth:400 }} onClick={e => e.stopPropagation()}>
            <div className="mi-modal-header">
              <h3>Convert to Purchase Order</h3>
              <button className="mi-modal-close" onClick={() => setConvModal(null)}><X size={15}/></button>
            </div>
            <div className="mi-modal-body">
              {error && <div className="mi-alert error" style={{ marginBottom:12 }}><AlertTriangle size={13}/>{error}</div>}
              <label className="mi-label">Select Supplier *</label>
              <div className="mi-sel-wrap">
                <select className="mi-select mi-input" value={supplierId}
                  onChange={e => setSupplierId(e.target.value)}>
                  <option value="">— Choose supplier —</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <ChevronDown size={12} className="mi-sel-icon"/>
              </div>
            </div>
            <div className="mi-modal-footer">
              <button className="mi-btn-ghost" onClick={() => setConvModal(null)}>Cancel</button>
              <button className="mi-btn-primary" onClick={handleConvert} disabled={saving || !supplierId}>
                {saving ? <RefreshCw size={13} className="spin"/> : <Send size={13}/>}
                Create PO
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const css = `
  .mi-page { font-family:'DM Sans',sans-serif; color:#1f2937; }
  .mi-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; flex-wrap:wrap; gap:10px; }
  .mi-title-wrap { display:flex; align-items:center; gap:12px; }
  .mi-icon  { width:38px; height:38px; background:rgba(0,97,210,.12); border-radius:10px; display:flex; align-items:center; justify-content:center; color:#3385e0; }
  .mi-title { font-size:20px; font-weight:700; color:#1f2937; margin:0 0 2px; }
  .mi-sub   { font-size:12px; color:#9aa3b4; }
  .mi-btn-primary { display:flex; align-items:center; gap:6px; padding:8px 14px; background:#e8f0fd; border:none; border-radius:9px; color:#0052b3; font-size:13px; font-weight:600; cursor:pointer; }
  .mi-btn-primary:hover:not(:disabled) { background:#d4e4fb; }
  .mi-btn-primary:disabled { opacity:.4; cursor:not-allowed; }
  .mi-btn-ghost  { display:flex; align-items:center; gap:6px; padding:8px 14px; background:#f0f2f7; border:1px solid #e2e6ef; border-radius:9px; color:#374151; font-size:13px; cursor:pointer; transition:background .15s; }
  .mi-btn-outline { display:flex; align-items:center; gap:6px; padding:8px 10px; background:#ffffff; border:1px solid #e2e6ef; border-radius:9px; color:#9aa3b4; cursor:pointer; }
  .mi-alert { display:flex; align-items:center; gap:8px; padding:10px 14px; border-radius:10px; font-size:13px; margin-bottom:14px; }
  .mi-alert button { background:none; border:none; cursor:pointer; margin-left:auto; opacity:.6; }
  .mi-alert.error   { background:rgba(239,68,68,.1); border:1px solid rgba(239,68,68,.25); color:#fca5a5; }
  .mi-alert.success { background:rgba(16,185,129,.1); border:1px solid rgba(16,185,129,.25); color:#6ee7b7; }
  .mi-filters { display:flex; gap:6px; margin-bottom:14px; flex-wrap:wrap; }
  .mi-filter-btn { padding:6px 12px; background:#ffffff; border:1px solid #e2e6ef; border-radius:8px; color:#9aa3b4; font-size:12px; cursor:pointer; transition:all .15s; }
  .mi-filter-btn:hover, .mi-filter-btn.active { background:rgba(0,97,210,.12); border-color:rgba(0,97,210,.2); color:#3385e0; }
  .mi-table-wrap { display:flex; flex-direction:column; gap:10px; }
  .mi-loading, .mi-empty { text-align:center; padding:40px; color:#9aa3b4; display:flex; align-items:center; justify-content:center; gap:8px; flex-direction:column; }
  .mi-card { background:#ffffff; border:1px solid #e2e6ef; border-radius:12px; padding:14px 16px; }
  .mi-card-top { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:10px; gap:10px; }
  .mi-indent-no { font-size:14px; font-weight:700; color:#1f2937; }
  .mi-indent-meta { font-size:11.5px; color:#9aa3b4; margin-top:2px; }
  .mi-badge { display:inline-flex; align-items:center; gap:4px; font-size:11px; font-weight:700; padding:3px 8px; border-radius:5px; white-space:nowrap; }
  .mi-items-list { display:flex; flex-direction:column; gap:4px; margin-bottom:8px; }
  .mi-item { display:flex; align-items:center; gap:5px; font-size:12.5px; color:#9aa3b4; }
  .mi-item-note { color:#9aa3b4; }
  .mi-notes { font-size:12px; color:#9aa3b4; font-style:italic; margin-bottom:8px; }
  .mi-rejection { font-size:12px; color:#f87171; margin-bottom:8px; }
  .mi-po-ref    { font-size:12px; color:#3385e0; margin-bottom:8px; }
  .mi-card-actions { display:flex; gap:8px; margin-top:10px; border-top:1px solid #f0f2f7; padding-top:10px; }
  .mi-action-btn { display:flex; align-items:center; gap:5px; padding:6px 12px; border:none; border-radius:8px; font-size:12px; font-weight:600; cursor:pointer; transition:all .15s; }
  .mi-action-btn.approve { background:rgba(16,185,129,.15); color:#34d399; }
  .mi-action-btn.approve:hover { background:rgba(16,185,129,.25); }
  .mi-action-btn.reject  { background:rgba(239,68,68,.12); color:#f87171; }
  .mi-action-btn.reject:hover  { background:rgba(239,68,68,.22); }
  .mi-action-btn.convert { background:rgba(0,97,210,.15); color:#3385e0; }
  .mi-action-btn.convert:hover { background:rgba(0,97,210,.25); }
  .mi-overlay { position:fixed; inset:0; background:rgba(0,0,0,.65); display:flex; align-items:center; justify-content:center; z-index:1000; padding:20px; }
  .mi-modal { background:#ffffff; border:1px solid #e2e6ef; border-radius:16px; width:100%; max-width:600px; max-height:90vh; overflow:hidden; display:flex; flex-direction:column; }
  .mi-modal-header { display:flex; align-items:center; justify-content:space-between; padding:16px 20px; border-bottom:1px solid #e2e6ef; background:#f8fafc; }
  .mi-modal-header h3 { margin:0; font-size:15px; font-weight:700; color:#1f2937; }
  .mi-modal-close { background:#e8f0fd; border:1px solid #b3ccf5; border-radius:7px; width:26px; height:26px; display:flex; align-items:center; justify-content:center; cursor:pointer; color:#0052b3; }
  .mi-modal-body   { padding:18px 20px; overflow-y:auto; flex:1; }
  .mi-modal-footer { display:flex; gap:10px; justify-content:flex-end; padding:14px 20px; border-top:1px solid #e2e6ef; background:#f8fafc; }
  .mi-lines { display:flex; flex-direction:column; gap:8px; }
  .mi-line  { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
  .mi-input { background:#ffffff; border:1px solid #e2e6ef; border-radius:9px; padding:8px 12px; color:#1f2937; font-size:13px; outline:none; font-family:inherit; box-sizing:border-box; }
  .mi-input:focus { border-color:#0061d2; }
  .mi-textarea { width:100%; resize:vertical; min-height:55px; }
  .mi-sel-wrap { position:relative; }
  .mi-select { appearance:none; background:#ffffff; border:1px solid #e2e6ef; border-radius:9px; padding:8px 28px 8px 12px; color:#1f2937; font-size:13px; outline:none; cursor:pointer; width:100%; }
  .mi-sel-icon { position:absolute; right:8px; top:50%; transform:translateY(-50%); color:#9aa3b4; pointer-events:none; }
  .mi-remove-btn { background:rgba(239,68,68,.1); border:1px solid rgba(239,68,68,.2); border-radius:7px; padding:7px; display:flex; align-items:center; justify-content:center; cursor:pointer; color:#f87171; }
  .mi-remove-btn:disabled { opacity:.3; cursor:not-allowed; }
  .mi-add-line { display:flex; align-items:center; gap:6px; padding:7px 12px; background:#ffffff; border:1px dashed #e2e6ef; border-radius:8px; color:#9aa3b4; font-size:12px; cursor:pointer; margin-top:4px; }
  .mi-add-line:hover { border-color:rgba(0,97,210,.2); color:#3385e0; }
  .mi-label { display:block; font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:.4px; color:#6b7280; margin-bottom:6px; }
  .spin { animation:spin .8s linear infinite; }
  @keyframes spin { to { transform:rotate(360deg); } }
`;

export default MaterialIndent;
