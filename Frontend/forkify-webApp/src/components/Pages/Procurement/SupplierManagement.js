import React, { useState, useEffect, useCallback } from 'react';
import {
  Truck, Plus, Edit2, Trash2, Search, Star,
  Phone, Mail, CheckCircle, RefreshCw,
  Shield, X, Save, AlertTriangle, ChevronDown,
} from 'lucide-react';
import procurementService from '../../../services/procurementService';
import usePermission       from '../../../hooks/usePermission';
import useBranch           from '../../../hooks/useBranch';

const CATEGORIES = ['Produce', 'Dairy', 'Meat', 'Seafood', 'Grains', 'Spices', 'Oils', 'Beverages', 'Other'];
const PAYMENT_TERMS = ['Net 15', 'Net 30', 'Net 45', 'COD', 'Advance'];

const emptyForm = () => ({
  name: '', contactPerson: '', phone: '', email: '',
  address: '', category: '', paymentTerms: 'Net 30',
  hqApproved: false, notes: '',
});

const SupplierManagement = () => {
  const { isHQ }     = usePermission();
  const { branchId } = useBranch();

  const [suppliers,  setSuppliers]  = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [search,     setSearch]     = useState('');
  const [catFilter,  setCatFilter]  = useState('all');
  const [modal,      setModal]      = useState(false);
  const [editId,     setEditId]     = useState(null);
  const [form,       setForm]       = useState(emptyForm());
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState(null);
  const [success,    setSuccess]    = useState(null);
  const [deleteId,   setDeleteId]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await procurementService.getSuppliers(branchId);
      setSuppliers(data || []);
    } catch { setError('Failed to load suppliers'); }
    finally  { setLoading(false); }
  }, [branchId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (success) { const t = setTimeout(() => setSuccess(null), 3000); return () => clearTimeout(t); }
  }, [success]);

  const openCreate = () => { setEditId(null); setForm(emptyForm()); setModal(true); };
  const openEdit   = (s) => {
    setEditId(s.id);
    setForm({
      name: s.name || '', contactPerson: s.contactPerson || '',
      phone: s.phone || '', email: s.email || '',
      address: s.address || '', category: s.category || '',
      paymentTerms: s.paymentTerms || 'Net 30',
      hqApproved: s.hqApproved || false, notes: s.notes || '',
    });
    setModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Supplier name is required'); return; }
    setSaving(true); setError(null);
    try {
      if (editId) {
        const { data } = await procurementService.updateSupplier(editId, form);
        setSuppliers(prev => prev.map(s => s.id === editId ? data : s));
        setSuccess('Supplier updated');
      } else {
        const { data } = await procurementService.createSupplier(form, branchId);
        setSuppliers(prev => [data, ...prev]);
        setSuccess('Supplier created');
      }
      setModal(false);
    } catch (e) { setError(e.response?.data || 'Save failed'); }
    finally     { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await procurementService.deleteSupplier(deleteId);
      setSuppliers(prev => prev.filter(s => s.id !== deleteId));
      setSuccess('Supplier deactivated');
    } catch (e) { setError(e.response?.data || 'Delete failed'); }
    finally     { setDeleteId(null); }
  };

  const handleApprove = async (id) => {
    try {
      const { data } = await procurementService.approveVendor(id);
      setSuppliers(prev => prev.map(s => s.id === id ? data : s));
      setSuccess('Supplier approved as HQ vendor');
    } catch (e) { setError(e.response?.data || 'Approval failed'); }
  };

  const filtered = suppliers.filter(s => {
    const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase())
      || (s.contactPerson || '').toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === 'all' || s.category === catFilter;
    return matchSearch && matchCat;
  });

  const categories = [...new Set(suppliers.map(s => s.category).filter(Boolean))];

  const statusColor = (s) => {
    if (s.status === 'ACTIVE') return { bg: 'rgba(16,185,129,.12)', color: '#34d399' };
    if (s.status === 'BLACKLISTED') return { bg: 'rgba(239,68,68,.12)', color: '#f87171' };
    return { bg: '#e2e6ef', color: '#9aa3b4' };
  };

  return (
    <div className="sm-page">
      <style>{css}</style>

      {/* Header */}
      <div className="sm-header">
        <div className="sm-title-wrap">
          <div className="sm-icon"><Truck size={18} /></div>
          <div>
            <h2 className="sm-title">Suppliers</h2>
            <div className="sm-sub">{suppliers.length} suppliers registered</div>
          </div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="sm-btn-outline" onClick={load}>
            <RefreshCw size={13} className={loading ? 'spin' : ''} />
          </button>
          <button className="sm-btn-primary" onClick={openCreate}>
            <Plus size={14} /> Add Supplier
          </button>
        </div>
      </div>

      {error   && <div className="sm-alert error"><AlertTriangle size={13}/>{error}<button onClick={() => setError(null)}><X size={12}/></button></div>}
      {success && <div className="sm-alert success"><CheckCircle size={13}/>{success}</div>}

      {/* Toolbar */}
      <div className="sm-toolbar">
        <div className="sm-search">
          <Search size={13} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search suppliers..." />
          {search && <button onClick={() => setSearch('')}><X size={12}/></button>}
        </div>
        <div className="sm-sel-wrap">
          <select className="sm-select" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
            <option value="all">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <ChevronDown size={12} className="sm-sel-icon" />
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="sm-loading"><RefreshCw size={20} className="spin" /> Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="sm-empty"><Truck size={40}/><p>No suppliers found</p></div>
      ) : (
        <div className="sm-grid">
          {filtered.map(s => {
            const sc = statusColor(s);
            return (
              <div key={s.id} className="sm-card">
                <div className="sm-card-header">
                  <div className="sm-card-icon"><Truck size={16}/></div>
                  <div className="sm-card-meta">
                    <div className="sm-card-name">{s.name}</div>
                    <div style={{ display:'flex', gap:6, marginTop:4, flexWrap:'wrap' }}>
                      {s.category && <span className="sm-chip">{s.category}</span>}
                      <span className="sm-chip" style={{ background: sc.bg, color: sc.color }}>
                        {s.status}
                      </span>
                      {s.hqApproved && (
                        <span className="sm-chip hq"><Shield size={9}/> HQ Approved</span>
                      )}
                    </div>
                  </div>
                  <div className="sm-card-actions">
                    <button className="sm-icon-btn" onClick={() => openEdit(s)} title="Edit">
                      <Edit2 size={13}/>
                    </button>
                    {isHQ && !s.hqApproved && (
                      <button className="sm-icon-btn approve" onClick={() => handleApprove(s.id)} title="Approve">
                        <CheckCircle size={13}/>
                      </button>
                    )}
                    <button className="sm-icon-btn danger" onClick={() => setDeleteId(s.id)} title="Delete">
                      <Trash2 size={13}/>
                    </button>
                  </div>
                </div>

                <div className="sm-card-body">
                  {s.contactPerson && (
                    <div className="sm-info-row"><span>{s.contactPerson}</span></div>
                  )}
                  {s.phone && (
                    <div className="sm-info-row"><Phone size={11}/><span>{s.phone}</span></div>
                  )}
                  {s.email && (
                    <div className="sm-info-row"><Mail size={11}/><span>{s.email}</span></div>
                  )}
                </div>

                <div className="sm-card-footer">
                  <div className="sm-stat">
                    <div className="sm-stat-val">{s.totalOrders || 0}</div>
                    <div className="sm-stat-label">Orders</div>
                  </div>
                  <div className="sm-stat">
                    <div className="sm-stat-val" style={{ display:'flex', alignItems:'center', gap:3 }}>
                      <Star size={11} style={{ color:'#fbbf24' }}/>
                      {Number(s.rating || 0).toFixed(1)}
                    </div>
                    <div className="sm-stat-label">Rating</div>
                  </div>
                  {s.paymentTerms && (
                    <div className="sm-stat">
                      <div className="sm-stat-val">{s.paymentTerms}</div>
                      <div className="sm-stat-label">Payment</div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      {modal && (
        <div className="sm-overlay" onClick={() => setModal(false)}>
          <div className="sm-modal" onClick={e => e.stopPropagation()}>
            <div className="sm-modal-header">
              <h3>{editId ? 'Edit Supplier' : 'Add Supplier'}</h3>
              <button className="sm-modal-close" onClick={() => setModal(false)}><X size={15}/></button>
            </div>
            <div className="sm-modal-body">
              {error && <div className="sm-alert error" style={{ marginBottom:12 }}><AlertTriangle size={13}/>{error}</div>}
              <div className="sm-form-grid">
                <div className="sm-field sm-full">
                  <label>Supplier Name *</label>
                  <input className="sm-input" value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Fresh Farms Co." />
                </div>
                <div className="sm-field">
                  <label>Contact Person</label>
                  <input className="sm-input" value={form.contactPerson}
                    onChange={e => setForm(p => ({ ...p, contactPerson: e.target.value }))} />
                </div>
                <div className="sm-field">
                  <label>Phone</label>
                  <input className="sm-input" value={form.phone}
                    onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
                </div>
                <div className="sm-field">
                  <label>Email</label>
                  <input className="sm-input" type="email" value={form.email}
                    onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
                </div>
                <div className="sm-field">
                  <label>Category</label>
                  <div className="sm-sel-wrap">
                    <select className="sm-select sm-input" value={form.category}
                      onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                      <option value="">— Select —</option>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <ChevronDown size={12} className="sm-sel-icon"/>
                  </div>
                </div>
                <div className="sm-field">
                  <label>Payment Terms</label>
                  <div className="sm-sel-wrap">
                    <select className="sm-select sm-input" value={form.paymentTerms}
                      onChange={e => setForm(p => ({ ...p, paymentTerms: e.target.value }))}>
                      {PAYMENT_TERMS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <ChevronDown size={12} className="sm-sel-icon"/>
                  </div>
                </div>
                <div className="sm-field sm-full">
                  <label>Address</label>
                  <input className="sm-input" value={form.address}
                    onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
                </div>
                <div className="sm-field sm-full">
                  <label>Notes</label>
                  <textarea className="sm-input sm-textarea" value={form.notes} rows={2}
                    onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
                </div>
                {isHQ && (
                  <div className="sm-field sm-full">
                    <label className="sm-toggle">
                      <input type="checkbox" checked={form.hqApproved}
                        onChange={e => setForm(p => ({ ...p, hqApproved: e.target.checked }))} />
                      <span>Mark as HQ Approved Vendor</span>
                    </label>
                  </div>
                )}
              </div>
            </div>
            <div className="sm-modal-footer">
              <button className="sm-btn-ghost" onClick={() => setModal(false)}>Cancel</button>
              <button className="sm-btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? <RefreshCw size={13} className="spin"/> : <Save size={13}/>}
                {editId ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="sm-overlay" onClick={() => setDeleteId(null)}>
          <div className="sm-confirm" onClick={e => e.stopPropagation()}>
            <Trash2 size={28} style={{ color:'#f87171', margin:'0 auto 12px', display:'block' }}/>
            <h3>Deactivate Supplier?</h3>
            <p>This supplier will be marked inactive and hidden from new orders.</p>
            <div style={{ display:'flex', gap:10, justifyContent:'center', marginTop:16 }}>
              <button className="sm-btn-ghost" onClick={() => setDeleteId(null)}>Cancel</button>
              <button className="sm-btn-danger" onClick={handleDelete}>Deactivate</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const css = `
  .sm-page { font-family:'DM Sans',sans-serif; color:#1f2937; }
  .sm-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:18px; flex-wrap:wrap; gap:10px; }
  .sm-title-wrap { display:flex; align-items:center; gap:12px; }
  .sm-icon  { width:38px; height:38px; background:rgba(0,97,210,.1); border-radius:10px; display:flex; align-items:center; justify-content:center; color:#3385e0; }
  .sm-title { font-size:20px; font-weight:700; color:#1f2937; margin:0 0 2px; }
  .sm-sub   { font-size:12px; color:#9aa3b4; }
  .sm-btn-primary { display:flex; align-items:center; gap:6px; padding:8px 14px; background:#e8f0fd; border:1px solid #b3ccf5; border-radius:9px; color:#0052b3; font-size:13px; font-weight:600; cursor:pointer; transition:all .15s; }
  .sm-btn-primary:hover:not(:disabled) { background:#d4e4fb; }
  .sm-btn-primary:disabled { opacity:.4; cursor:not-allowed; }
  .sm-btn-ghost  { display:flex; align-items:center; gap:6px; padding:8px 14px; background:#f8f9fc; border:1px solid #e2e6ef; border-radius:9px; color:#374151; font-size:13px; cursor:pointer; transition:background .15s; }
  .sm-btn-ghost:hover { background:#e8ebf2; color:#1f2937; }
  .sm-btn-outline { display:flex; align-items:center; gap:6px; padding:8px 10px; background:#ffffff; border:1px solid #e2e6ef; border-radius:9px; color:#9aa3b4; cursor:pointer; }
  .sm-btn-outline:hover { background:#e2e6ef; color:#0052b3; }
  .sm-btn-danger  { padding:8px 18px; background:#ef4444; border:none; border-radius:9px; color:#0052b3; font-size:13px; font-weight:600; cursor:pointer; }
  .sm-alert { display:flex; align-items:center; gap:8px; padding:10px 14px; border-radius:10px; font-size:13px; margin-bottom:14px; }
  .sm-alert button { background:none; border:none; cursor:pointer; margin-left:auto; opacity:.6; }
  .sm-alert.error   { background:rgba(239,68,68,.1); border:1px solid rgba(239,68,68,.25); color:#fca5a5; }
  .sm-alert.success { background:rgba(16,185,129,.1); border:1px solid rgba(16,185,129,.25); color:#6ee7b7; }
  .sm-toolbar { display:flex; gap:10px; margin-bottom:16px; flex-wrap:wrap; }
  .sm-search { flex:1; min-width:200px; display:flex; align-items:center; gap:8px; background:#f8f9fc; border:1px solid #e2e6ef; border-radius:9px; padding:0 12px; }
  .sm-search input { background:none; border:none; outline:none; color:#1f2937; font-size:13px; width:100%; padding:9px 0; }
  .sm-search input::placeholder { color:#9aa3b4; }
  .sm-search button { background:none; border:none; cursor:pointer; color:#9aa3b4; display:flex; }
  .sm-sel-wrap { position:relative; }
  .sm-select { appearance:none; background:#ffffff; border:1px solid #e2e6ef; border-radius:9px; padding:8px 28px 8px 12px; color:#1f2937; font-size:13px; outline:none; cursor:pointer; }
  .sm-sel-icon { position:absolute; right:8px; top:50%; transform:translateY(-50%); color:#9aa3b4; pointer-events:none; }
  .sm-loading { text-align:center; padding:40px; color:#9aa3b4; display:flex; align-items:center; justify-content:center; gap:8px; }
  .sm-empty   { text-align:center; padding:50px; color:#9aa3b4; }
  .sm-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:14px; }
  .sm-card { background:#ffffff; border:1px solid #e2e6ef; border-radius:14px; overflow:hidden; transition:border-color .15s; }
  .sm-card:hover { border-color:#9aa3b4; }
  .sm-card-header { display:flex; align-items:flex-start; gap:10px; padding:14px 14px 10px; }
  .sm-card-icon { width:34px; height:34px; background:rgba(0,97,210,.1); border-radius:9px; display:flex; align-items:center; justify-content:center; color:#3385e0; flex-shrink:0; }
  .sm-card-meta { flex:1; min-width:0; }
  .sm-card-name { font-size:14px; font-weight:700; color:#1f2937; }
  .sm-card-actions { display:flex; gap:4px; }
  .sm-icon-btn { width:28px; height:28px; background:#f8f9fc; border:1px solid #e2e6ef; border-radius:7px; display:flex; align-items:center; justify-content:center; cursor:pointer; color:#374151; transition:all .15s; }
  .sm-icon-btn:hover { background:#e2e6ef; color:#1f2937; }
  .sm-icon-btn.approve:hover { background:rgba(16,185,129,.15); color:#34d399; border-color:rgba(16,185,129,.3); }
  .sm-icon-btn.danger:hover  { background:rgba(239,68,68,.12); color:#f87171; border-color:rgba(239,68,68,.25); }
  .sm-chip { font-size:10px; font-weight:600; padding:2px 7px; border-radius:4px; background:#e2e6ef; color:#9aa3b4; display:inline-flex; align-items:center; gap:3px; }
  .sm-chip.hq { background:rgba(0,97,210,.15); color:#3385e0; }
  .sm-card-body { padding:0 14px 10px; }
  .sm-info-row { display:flex; align-items:center; gap:6px; font-size:12px; color:#9aa3b4; margin-bottom:4px; }
  .sm-card-footer { display:flex; gap:0; border-top:1px solid #f0f2f7; }
  .sm-stat { flex:1; padding:10px; text-align:center; border-right:1px solid #f0f2f7; }
  .sm-stat:last-child { border-right:none; }
  .sm-stat-val   { font-size:14px; font-weight:700; color:#1f2937; display:flex; align-items:center; justify-content:center; }
  .sm-stat-label { font-size:10px; color:#9aa3b4; margin-top:2px; }
  .sm-overlay { position:fixed; inset:0; background:rgba(0,0,0,.65); display:flex; align-items:center; justify-content:center; z-index:1000; padding:20px; }
  .sm-modal { background:#ffffff; border:1px solid #e2e6ef; border-radius:16px; width:100%; max-width:560px; max-height:90vh; overflow:hidden; display:flex; flex-direction:column; }
  .sm-modal-header { display:flex; align-items:center; justify-content:space-between; padding:16px 20px; border-bottom:1px solid #e2e6ef; background:#f8fafc; }
  .sm-modal-header h3 { margin:0; font-size:15px; font-weight:700; color:#1f2937; }
  .sm-modal-close { background:#e8f0fd; border:1px solid #b3ccf5; border-radius:7px; width:26px; height:26px; display:flex; align-items:center; justify-content:center; cursor:pointer; color:#0052b3; }
  .sm-modal-body { padding:18px 20px; overflow-y:auto; flex:1; }
  .sm-modal-footer { display:flex; gap:10px; justify-content:flex-end; padding:14px 20px; border-top:1px solid #e2e6ef; background:#f8fafc; }
  .sm-form-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
  .sm-field { display:flex; flex-direction:column; gap:5px; }
  .sm-field.sm-full { grid-column:1/-1; }
  .sm-field label { font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:.4px; color:#6b7280; }
  .sm-input { background:#ffffff; border:1px solid #e2e6ef; border-radius:9px; padding:9px 12px; color:#1f2937; font-size:13px; outline:none; font-family:inherit; width:100%; box-sizing:border-box; }
  .sm-input:focus { border-color:#0061d2; }
  .sm-textarea { resize:vertical; min-height:60px; }
  .sm-toggle { display:flex; align-items:center; gap:8px; cursor:pointer; font-size:13px; color:#9aa3b4; }
  .sm-toggle input { accent-color:#0061d2; width:16px; height:16px; }
  .sm-confirm { background:#ffffff; border:1px solid #e2e6ef; border-radius:16px; padding:28px; text-align:center; max-width:360px; width:100%; }
  .sm-confirm h3 { color:#1f2937; margin:0 0 8px; font-size:17px; }
  .sm-confirm p  { color:#9aa3b4; font-size:13px; margin:0; }
  .spin { animation:spin .8s linear infinite; }
  @keyframes spin { to { transform:rotate(360deg); } }
`;

export default SupplierManagement;
