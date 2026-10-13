import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, Plus, Search, RefreshCw, Star, Phone, Mail,
  Gift, TrendingUp, Calendar, X, Save, AlertTriangle,
  CheckCircle, Award, ShoppingCart, ArrowLeft, Clock,
  MapPin, Package, ChevronRight, CreditCard,
} from 'lucide-react';
import { customerService } from '../../../services/newServices';
import useBranch from '../../../hooks/useBranch';

const TIER_CFG = {
  GOLD:   { bg:'#fef9c3', color:'#92400e', icon:'🥇', label:'Gold' },
  SILVER: { bg:'#f1f5f9', color:'#475569', icon:'🥈', label:'Silver' },
  BRONZE: { bg:'#fef3c7', color:'#78350f', icon:'🥉', label:'Bronze' },
};

const emptyForm = () => ({ name:'', phone:'', email:'', dateOfBirth:'', anniversaryDate:'', notes:'' });

export default function CustomerCRM() {
  const { branchId } = useBranch();
  const [customers,   setCustomers]   = useState([]);
  const [stats,       setStats]       = useState({});
  const [birthdays,   setBirthdays]   = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [success,     setSuccess]     = useState(null);
  const [search,      setSearch]      = useState('');
  const [modal,       setModal]       = useState(false);
  const [editId,      setEditId]      = useState(null);
  const [form,        setForm]        = useState(emptyForm());
  const [saving,      setSaving]      = useState(false);
  const [pointsModal, setPointsModal] = useState(null);
  const [points,      setPoints]      = useState('');
  const [visitModal,  setVisitModal]  = useState(null);
  const [visitSpend,  setVisitSpend]  = useState('');
  const [visitItems,  setVisitItems]  = useState('');
  const [detailCustomer, setDetailCustomer] = useState(null);
  const [detailLoading,  setDetailLoading]  = useState(false);
  const [detailData,     setDetailData]     = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cRes, sRes] = await Promise.all([
        customerService.getAll(branchId, search || null),
        customerService.getStats(branchId),
      ]);
      setCustomers(cRes.data || []);
      setStats(sRes.data || {});
      // birthdays fetched separately so a failure doesn't block the main load
      customerService.getBirthdays(new Date().getMonth() + 1)
        .then(r => setBirthdays(r.data || []))
        .catch(() => setBirthdays([]));
    } catch { setError('Failed to load customers'); }
    finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  // search triggers a separate debounced reload — avoids double-call from useCallback rebuild
  useEffect(() => {
    const t = setTimeout(() => load(), 300);
    return () => clearTimeout(t);
  }, [load, search]);

  useEffect(() => {
    if (success) { const t = setTimeout(() => setSuccess(null), 3000); return () => clearTimeout(t); }
  }, [success]);

  const openDetail = async (customer) => {
    setDetailCustomer(customer);
    setDetailLoading(true);
    setDetailData(null);
    try {
      const { data } = await customerService.getById(customer.id);
      setDetailData(data);
    } catch {
      setDetailData(customer);
    } finally {
      setDetailLoading(false);
    }
  };

  const openAdd  = () => { setForm(emptyForm()); setEditId(null); setModal(true); };
  const openEdit = (c) => {
    setForm({ name:c.name||'', phone:c.phone||'', email:c.email||'', dateOfBirth:c.dateOfBirth||'', anniversaryDate:c.anniversaryDate||'', notes:c.notes||'' });
    setEditId(c.id); setModal(true);
  };

  const handleSave = async () => {
    if (!form.name) { setError('Name is required'); return; }
    setSaving(true);
    try {
      if (editId) await customerService.update(editId, form);
      else await customerService.create(form);
      setSuccess(editId ? 'Customer updated' : 'Customer added');
      setModal(false); load();
    } catch (e) { setError(e.response?.data || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const handlePoints = async () => {
    const pts = parseInt(points);
    if (!pts || pts <= 0) { setError('Enter valid points'); return; }
    setSaving(true);
    try {
      if (pointsModal.mode === 'add') await customerService.addPoints(pointsModal.customer.id, pts);
      else await customerService.redeemPoints(pointsModal.customer.id, pts);
      setSuccess(`${pts} points ${pointsModal.mode === 'add' ? 'added' : 'redeemed'}`);
      setPointsModal(null); setPoints(''); load();
      if (detailCustomer?.id === pointsModal.customer.id) openDetail(detailCustomer);
    } catch (e) { setError(e.response?.data || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleVisit = async () => {
    setSaving(true);
    try {
      await customerService.recordVisit(visitModal.id, parseFloat(visitSpend) || 0);
      setSuccess('Visit recorded. Points awarded.');
      setVisitModal(null); setVisitSpend(''); setVisitItems(''); load();
      if (detailCustomer?.id === visitModal.id) openDetail({ ...visitModal });
    } catch (e) { setError(e.response?.data || 'Failed'); }
    finally { setSaving(false); }
  };

  const displayedCustomer = detailData || detailCustomer;
  const tierCfg = displayedCustomer ? (TIER_CFG[displayedCustomer.tier] || TIER_CFG.BRONZE) : null;

  const visitHistory = displayedCustomer?.visitHistory || (
    displayedCustomer?.visitCount > 0
      ? Array.from({ length: Math.min(displayedCustomer.visitCount, 6) }, (_, i) => ({
          date: i === 0 ? (displayedCustomer.lastVisit || 'Recent') : `Visit ${displayedCustomer.visitCount - i}`,
          spend: (Number(displayedCustomer.totalSpend || 0) / Math.max(displayedCustomer.visitCount, 1)).toFixed(0),
          points: Math.floor((Number(displayedCustomer.totalSpend || 0) / Math.max(displayedCustomer.visitCount, 1)) / 10),
          items: 'Visit recorded',
        }))
      : []
  );

  return (
    <div className="crm-page">
      <div className="crm-header">
        <div className="crm-header-left">
          {detailCustomer && (
            <button className="erp-btn-ghost" onClick={() => { setDetailCustomer(null); setDetailData(null); }}>
              <ArrowLeft size={14}/> Back
            </button>
          )}
          <div>
            <h2 className="crm-title">
              <Users size={20}/>
              {detailCustomer ? displayedCustomer?.name : 'Customer CRM'}
            </h2>
            <p className="crm-sub">
              {detailCustomer ? 'Customer profile, visit history & loyalty' : 'Loyalty points, visit history and birthday tracking'}
            </p>
          </div>
        </div>
        <div className="crm-header-right">
          {!detailCustomer ? (
            <>
              <button className="erp-btn-ghost" onClick={load} disabled={loading}>
                <RefreshCw size={14} className={loading ? 'crm-spin' : ''}/>
              </button>
              <button className="erp-btn-primary" onClick={openAdd}><Plus size={14}/> Add Customer</button>
            </>
          ) : (
            <>
              <button className="erp-btn-ghost" onClick={() => { setVisitModal(displayedCustomer); setVisitSpend(''); setVisitItems(''); }}>
                <ShoppingCart size={14}/> Record Visit
              </button>
              <button className="erp-btn-primary" onClick={() => openEdit(displayedCustomer)}>✏ Edit</button>
            </>
          )}
        </div>
      </div>

      {error   && <div className="crm-banner error"><AlertTriangle size={14}/>{error}<button onClick={() => setError(null)}>✕</button></div>}
      {success && <div className="crm-banner success"><CheckCircle size={14}/>{success}</div>}

      {detailCustomer ? (
        /* ── DETAIL VIEW ── */
        <div className="crm-detail">
          {detailLoading ? (
            <div className="crm-loading"><RefreshCw size={22} className="crm-spin"/><p>Loading profile...</p></div>
          ) : (
            <>
              <div className="crm-detail-hero">
                <div className="crm-detail-avatar">{displayedCustomer?.name?.charAt(0)?.toUpperCase()}</div>
                <div className="crm-detail-info">
                  <div className="crm-detail-name">{displayedCustomer?.name}</div>
                  <div className="crm-detail-meta">
                    {displayedCustomer?.phone && <span><Phone size={12}/> {displayedCustomer.phone}</span>}
                    {displayedCustomer?.email && <span><Mail size={12}/> {displayedCustomer.email}</span>}
                    {displayedCustomer?.dateOfBirth && <span><Gift size={12}/> DOB: {displayedCustomer.dateOfBirth}</span>}
                    {displayedCustomer?.anniversaryDate && <span><Calendar size={12}/> Anniversary: {displayedCustomer.anniversaryDate}</span>}
                  </div>
                  <span className="crm-detail-tier-badge" style={{ background: tierCfg?.bg, color: tierCfg?.color }}>
                    {tierCfg?.icon} {displayedCustomer?.tier} Member
                  </span>
                </div>
                <div className="crm-detail-points-box">
                  <div className="crm-detail-pts-val">{displayedCustomer?.loyaltyPoints || 0}</div>
                  <div className="crm-detail-pts-lbl">Loyalty Points</div>
                  <div className="crm-detail-pts-actions">
                    <button className="erp-btn-sm-green" onClick={() => { setPointsModal({ customer: displayedCustomer, mode: 'add' }); setPoints(''); }}>+ Add</button>
                    <button className="erp-btn-sm-ghost" onClick={() => { setPointsModal({ customer: displayedCustomer, mode: 'redeem' }); setPoints(''); }}>Redeem</button>
                  </div>
                </div>
              </div>

              <div className="crm-detail-kpis">
                {[
                  { label:'Total Visits',  val: displayedCustomer?.visitCount || 0,  icon: Calendar, color:'#0061d2' },
                  { label:'Total Spend',   val: `₹${Number(displayedCustomer?.totalSpend||0).toLocaleString('en-IN',{maximumFractionDigits:0})}`, icon: CreditCard, color:'#10b981' },
                  { label:'Avg per Visit', val: displayedCustomer?.visitCount > 0 ? `₹${(Number(displayedCustomer.totalSpend||0)/displayedCustomer.visitCount).toFixed(0)}` : '₹0', icon: TrendingUp, color:'#f59e0b' },
                  { label:'Last Visit',    val: displayedCustomer?.lastVisit || 'Never', icon: Clock, color:'#8b5cf6' },
                ].map((k,i) => (
                  <div key={i} className="crm-detail-kpi">
                    <div className="crm-detail-kpi-icon" style={{ background: k.color+'18', color: k.color }}><k.icon size={16}/></div>
                    <div>
                      <div className="crm-detail-kpi-val" style={{ color: k.color }}>{k.val}</div>
                      <div className="crm-detail-kpi-lbl">{k.label}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="crm-detail-section">
                <div className="crm-detail-section-header">
                  <Clock size={15}/> Visit History
                  <button className="erp-btn-sm-primary" onClick={() => { setVisitModal(displayedCustomer); setVisitSpend(''); setVisitItems(''); }}>
                    <Plus size={12}/> Record Visit
                  </button>
                </div>
                {visitHistory.length === 0 ? (
                  <div className="crm-detail-empty"><Calendar size={32}/><p>No visits recorded yet. Click "Record Visit" to log the first one.</p></div>
                ) : (
                  <div className="crm-visit-list">
                    {visitHistory.map((v, i) => (
                      <div key={i} className="crm-visit-row">
                        <div className="crm-visit-date"><Calendar size={13}/><span>{v.date}</span></div>
                        <div className="crm-visit-items"><Package size={12}/> {v.items || 'Visit recorded'}</div>
                        <div className="crm-visit-spend">₹{Number(v.spend||0).toLocaleString('en-IN')}</div>
                        <div className="crm-visit-pts">+{v.points||Math.floor(Number(v.spend||0)/10)} pts</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {displayedCustomer?.notes && (
                <div className="crm-detail-section">
                  <div className="crm-detail-section-header"><MapPin size={15}/> Notes</div>
                  <div className="crm-detail-notes">{displayedCustomer.notes}</div>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        /* ── LIST VIEW ── */
        <>
          <div className="crm-kpis">
            {[
              { label:'Total Customers',     val: stats.totalCustomers||0,                                    icon: Users,  color:'#0061d2' },
              { label:'Birthdays This Month',val: stats.birthdaysThisMonth||0,                               icon: Gift,   color:'#ec4899' },
              { label:'Top Spender',         val: customers[0]?.name||'—', sub: customers[0] ? `₹${Number(customers[0].totalSpend||0).toLocaleString('en-IN',{maximumFractionDigits:0})}` : '', icon: Star, color:'#f59e0b' },
              { label:'Gold Members',        val: customers.filter(c=>c.tier==='GOLD').length,               icon: Award,  color:'#92400e' },
            ].map((k,i) => (
              <div key={i} className="crm-kpi" style={{ borderTop:`3px solid ${k.color}` }}>
                <div className="crm-kpi-icon" style={{ background: k.color+'18', color: k.color }}><k.icon size={18}/></div>
                <div>
                  <div className="crm-kpi-val" style={{ color: k.color }}>{k.val}</div>
                  {k.sub && <div className="crm-kpi-sub">{k.sub}</div>}
                  <div className="crm-kpi-lbl">{k.label}</div>
                </div>
              </div>
            ))}
          </div>

          {birthdays.length > 0 && (
            <div className="crm-birthday-bar">
              <Gift size={15}/> <strong>Birthdays this month:</strong>
              {birthdays.slice(0,5).map(c => <span key={c.id} className="crm-bday-chip">🎂 {c.name}</span>)}
              {birthdays.length > 5 && <span className="crm-bday-more">+{birthdays.length-5} more</span>}
            </div>
          )}

          <div className="crm-toolbar">
            <div className="crm-search">
              <Search size={14}/>
              <input placeholder="Search by name or phone..." value={search} onChange={e => setSearch(e.target.value)}/>
              {search && <button onClick={() => setSearch('')}><X size={11}/></button>}
            </div>
          </div>

          {loading ? (
            <div className="crm-loading"><RefreshCw size={22} className="crm-spin"/><p>Loading customers...</p></div>
          ) : customers.length === 0 ? (
            <div className="crm-empty"><Users size={44}/><h3>No customers yet</h3><p>Add your first customer to start tracking loyalty</p></div>
          ) : (
            <div className="crm-table-wrap">
              <table className="crm-table">
                <thead><tr><th>Customer</th><th>Contact</th><th>Visits</th><th>Total Spend</th><th>Points</th><th>Tier</th><th>Last Visit</th><th>Actions</th></tr></thead>
                <tbody>
                  {customers.map(c => {
                    const tier = TIER_CFG[c.tier] || TIER_CFG.BRONZE;
                    return (
                      <tr key={c.id} className="crm-tr" onClick={() => openDetail(c)} style={{ cursor:'pointer' }}>
                        <td>
                          <div className="crm-customer-cell">
                            <div className="crm-avatar">{c.name?.charAt(0)?.toUpperCase()}</div>
                            <div>
                              <div className="crm-customer-name">{c.name}</div>
                              {c.dateOfBirth && <div className="crm-bday-hint">🎂 {c.dateOfBirth}</div>}
                            </div>
                            <ChevronRight size={14} className="crm-row-arrow"/>
                          </div>
                        </td>
                        <td>
                          <div className="crm-contact">
                            {c.phone && <span><Phone size={11}/> {c.phone}</span>}
                            {c.email && <span><Mail size={11}/> {c.email}</span>}
                          </div>
                        </td>
                        <td><span className="crm-visits">{c.visitCount||0}</span></td>
                        <td><span className="crm-spend">₹{Number(c.totalSpend||0).toLocaleString('en-IN',{maximumFractionDigits:0})}</span></td>
                        <td><span className="crm-points">{c.loyaltyPoints||0} pts</span></td>
                        <td><span className="crm-tier-badge" style={{ background:tier.bg, color:tier.color }}>{tier.icon} {c.tier}</span></td>
                        <td className="crm-muted">{c.lastVisit||'—'}</td>
                        <td onClick={e => e.stopPropagation()}>
                          <div className="crm-actions">
                            <button className="erp-act-btn" title="Record Visit" onClick={() => { setVisitModal(c); setVisitSpend(''); setVisitItems(''); }}>
                              <ShoppingCart size={13}/>
                            </button>
                            <button className="erp-act-btn green" title="Add Points" onClick={() => { setPointsModal({ customer:c, mode:'add' }); setPoints(''); }}>
                              <Plus size={13}/>
                            </button>
                            <button className="erp-act-btn" title="Edit" onClick={() => openEdit(c)}>✏</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Add/Edit Modal */}
      {modal && (
        <div className="erp-overlay" onClick={() => setModal(false)}>
          <div className="erp-modal" onClick={e => e.stopPropagation()}>
            <div className="erp-modal-hdr"><h3>{editId ? 'Edit Customer' : 'Add Customer'}</h3><button className="erp-modal-close" onClick={() => setModal(false)}><X size={15}/></button></div>
            <div className="erp-modal-body">
              <div className="crm-form-grid">
                {[['Name *','name','text'],['Phone','phone','tel'],['Email','email','email'],['Date of Birth','dateOfBirth','date'],['Anniversary','anniversaryDate','date']].map(([label,field,type]) => (
                  <div key={field}>
                    <label className="erp-label">{label}</label>
                    <input className="erp-input" type={type} value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}/>
                  </div>
                ))}
                <div>
                  <label className="erp-label">Notes</label>
                  <textarea className="erp-input erp-textarea" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}/>
                </div>
              </div>
            </div>
            <div className="erp-modal-ftr">
              <button className="erp-btn-ghost" onClick={() => setModal(false)}>Cancel</button>
              <button className="erp-btn-primary" onClick={handleSave} disabled={saving}>{saving ? <RefreshCw size={13} className="crm-spin"/> : <Save size={13}/>} Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Points Modal */}
      {pointsModal && (
        <div className="erp-overlay" onClick={() => setPointsModal(null)}>
          <div className="erp-modal erp-modal-sm" onClick={e => e.stopPropagation()}>
            <div className="erp-modal-hdr">
              <h3>{pointsModal.mode === 'add' ? 'Add Points' : 'Redeem Points'} — {pointsModal.customer.name}</h3>
              <button className="erp-modal-close" onClick={() => setPointsModal(null)}><X size={15}/></button>
            </div>
            <div className="erp-modal-body">
              <p className="erp-modal-hint">Current balance: <strong>{pointsModal.customer.loyaltyPoints} pts</strong></p>
              <label className="erp-label">Points</label>
              <input className="erp-input" type="number" min="1" value={points} onChange={e => setPoints(e.target.value)} placeholder="Enter points"/>
            </div>
            <div className="erp-modal-ftr">
              <button className="erp-btn-ghost" onClick={() => setPointsModal(null)}>Cancel</button>
              <button className="erp-btn-primary" onClick={handlePoints} disabled={saving}>{pointsModal.mode === 'add' ? 'Add Points' : 'Redeem'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Visit Modal */}
      {visitModal && (
        <div className="erp-overlay" onClick={() => setVisitModal(null)}>
          <div className="erp-modal erp-modal-sm" onClick={e => e.stopPropagation()}>
            <div className="erp-modal-hdr">
              <h3>Record Visit — {visitModal.name}</h3>
              <button className="erp-modal-close" onClick={() => setVisitModal(null)}><X size={15}/></button>
            </div>
            <div className="erp-modal-body">
              <p className="erp-modal-hint">Points are awarded at 1 pt per ₹10 spent.</p>
              <div className="erp-field">
                <label className="erp-label">Spend Amount (₹)</label>
                <input className="erp-input" type="number" min="0" step="0.01" value={visitSpend} onChange={e => setVisitSpend(e.target.value)} placeholder="e.g. 500"/>
                {visitSpend && <span className="erp-field-hint">+{Math.floor(parseFloat(visitSpend||0)/10)} points will be awarded</span>}
              </div>
              <div className="erp-field">
                <label className="erp-label">Items Purchased (optional)</label>
                <input className="erp-input" type="text" value={visitItems} onChange={e => setVisitItems(e.target.value)} placeholder="e.g. Paneer Butter Masala, Naan x2"/>
              </div>
            </div>
            <div className="erp-modal-ftr">
              <button className="erp-btn-ghost" onClick={() => setVisitModal(null)}>Cancel</button>
              <button className="erp-btn-primary" onClick={handleVisit} disabled={saving}><ShoppingCart size={13}/> Record Visit</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .crm-page { max-width:1100px; font-family:'DM Sans',sans-serif; }
        .crm-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:16px; flex-wrap:wrap; gap:10px; }
        .crm-header-left { display:flex; align-items:flex-start; gap:10px; }
        .crm-title { display:flex; align-items:center; gap:8px; font-size:20px; font-weight:700; color:#1f2937; margin:0 0 3px; }
        .crm-sub { font-size:12px; color:#9ca3af; margin:0; }
        .crm-header-right { display:flex; gap:8px; }

        /* ERP Button System */
        .erp-btn-primary { display:flex; align-items:center; gap:6px; padding:8px 14px; background:#e8f0fd; border:1px solid #b3ccf5; border-radius:9px; color:#0052b3; font-size:13px; font-weight:600; cursor:pointer; white-space:nowrap; transition:background .15s; }
        .erp-btn-primary:hover:not(:disabled) { background:#d4e4fb; }
        .erp-btn-primary:disabled { opacity:.45; cursor:not-allowed; }
        .erp-btn-ghost { display:flex; align-items:center; gap:5px; padding:7px 12px; background:#f0f2f7; border:1px solid #e2e6ef; border-radius:8px; font-size:13px; color:#374151; cursor:pointer; white-space:nowrap; transition:background .15s; }
        .erp-btn-ghost:hover { background:#e8ebf2; }
        .erp-btn-sm-primary { display:flex; align-items:center; gap:4px; padding:5px 10px; background:#e8f0fd; border:1px solid #b3ccf5; border-radius:7px; color:#0052b3; font-size:12px; font-weight:600; cursor:pointer; }
        .erp-btn-sm-green { display:flex; align-items:center; gap:4px; padding:5px 10px; background:rgba(16,185,129,.1); border:1px solid rgba(16,185,129,.25); border-radius:7px; color:#065f46; font-size:12px; font-weight:600; cursor:pointer; }
        .erp-btn-sm-ghost { display:flex; align-items:center; gap:4px; padding:5px 10px; background:#f0f2f7; border:1px solid #e2e6ef; border-radius:7px; color:#374151; font-size:12px; cursor:pointer; }
        .erp-act-btn { width:28px; height:28px; display:flex; align-items:center; justify-content:center; background:#e8f0fd; border:1px solid #b3ccf5; border-radius:7px; cursor:pointer; color:#0052b3; transition:background .15s; font-size:12px; }
        .erp-act-btn:hover { background:#d4e4fb; }
        .erp-act-btn.green { background:rgba(16,185,129,.1); border-color:rgba(16,185,129,.25); color:#065f46; }

        /* Modals */
        .erp-overlay { position:fixed; inset:0; background:rgba(0,0,0,.45); display:flex; align-items:center; justify-content:center; z-index:1000; padding:20px; }
        .erp-modal { background:#ffffff; border:1px solid #e5e7eb; border-radius:16px; width:100%; max-width:520px; overflow:hidden; box-shadow:0 20px 60px rgba(0,0,0,.15); }
        .erp-modal-sm { max-width:400px; }
        .erp-modal-hdr { display:flex; align-items:center; justify-content:space-between; padding:16px 20px; border-bottom:1px solid #e5e7eb; background:#f8fafc; }
        .erp-modal-hdr h3 { margin:0; font-size:15px; font-weight:700; color:#1f2937; }
        .erp-modal-close { background:#e8f0fd; border:1px solid #b3ccf5; border-radius:7px; width:28px; height:28px; display:flex; align-items:center; justify-content:center; cursor:pointer; color:#0052b3; }
        .erp-modal-body { padding:18px 20px; }
        .erp-modal-ftr { display:flex; gap:10px; justify-content:flex-end; padding:14px 20px; border-top:1px solid #e5e7eb; background:#f8fafc; }
        .erp-modal-hint { font-size:13px; color:#6b7280; margin:0 0 12px; }
        .erp-label { display:block; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.5px; color:#6b7280; margin-bottom:5px; }
        .erp-input { width:100%; padding:9px 12px; border:1px solid #e5e7eb; border-radius:8px; font-size:13px; color:#1f2937; outline:none; font-family:inherit; box-sizing:border-box; background:#ffffff; }
        .erp-input:focus { border-color:#0061d2; box-shadow:0 0 0 3px rgba(0,97,210,.1); }
        .erp-textarea { resize:vertical; min-height:60px; }
        .erp-field { margin-bottom:12px; }
        .erp-field-hint { display:block; font-size:11px; color:#10b981; margin-top:4px; }

        /* Banners */
        .crm-banner { display:flex; align-items:center; gap:8px; padding:9px 12px; border-radius:8px; font-size:13px; margin-bottom:12px; }
        .crm-banner button { margin-left:auto; background:none; border:none; cursor:pointer; font-size:15px; }
        .crm-banner.error { background:#fef2f2; border:1px solid #fecaca; color:#dc2626; }
        .crm-banner.success { background:#f0fdf4; border:1px solid #bbf7d0; color:#15803d; }

        /* KPIs */
        .crm-kpis { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:14px; }
        @media(max-width:700px) { .crm-kpis { grid-template-columns:repeat(2,1fr); } }
        .crm-kpi { background:#fff; border-radius:12px; border:1px solid #e5e7eb; padding:14px; display:flex; align-items:center; gap:12px; }
        .crm-kpi-icon { width:38px; height:38px; border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .crm-kpi-val { font-size:20px; font-weight:800; line-height:1; margin-bottom:2px; }
        .crm-kpi-sub { font-size:11px; color:#6b7280; margin-bottom:1px; }
        .crm-kpi-lbl { font-size:11px; color:#9ca3af; }

        /* Birthday bar */
        .crm-birthday-bar { display:flex; align-items:center; gap:8px; padding:10px 14px; background:#fdf2f8; border:1px solid #fbcfe8; border-radius:10px; font-size:13px; color:#9d174d; margin-bottom:14px; flex-wrap:wrap; }
        .crm-bday-chip { background:#fff; border:1px solid #fbcfe8; border-radius:20px; padding:2px 10px; font-size:12px; }
        .crm-bday-more { font-size:12px; color:#c084fc; }

        /* Search */
        .crm-toolbar { margin-bottom:14px; }
        .crm-search { display:flex; align-items:center; gap:7px; padding:8px 12px; background:#fff; border:1px solid #e5e7eb; border-radius:8px; max-width:380px; }
        .crm-search:focus-within { border-color:#0061d2; }
        .crm-search input { border:none; outline:none; font-size:13px; flex:1; background:transparent; color:#1f2937; }
        .crm-search button { background:none; border:none; cursor:pointer; color:#9ca3af; }

        /* Table */
        .crm-table-wrap { background:#fff; border-radius:12px; border:1px solid #e5e7eb; overflow:hidden; }
        .crm-table { width:100%; border-collapse:collapse; }
        .crm-table thead tr { background:#f8fafc; border-bottom:1px solid #e5e7eb; }
        .crm-table th { padding:10px 12px; text-align:left; font-size:11px; font-weight:700; color:#6b7280; text-transform:uppercase; letter-spacing:.5px; }
        .crm-tr { border-bottom:1px solid #f1f5f9; transition:background .1s; }
        .crm-tr:last-child { border-bottom:none; }
        .crm-tr:hover { background:#f0f7ff; }
        .crm-table td { padding:11px 12px; font-size:13px; vertical-align:middle; }
        .crm-customer-cell { display:flex; align-items:center; gap:10px; }
        .crm-row-arrow { color:#9ca3af; margin-left:auto; opacity:0; transition:opacity .15s; }
        .crm-tr:hover .crm-row-arrow { opacity:1; }
        .crm-avatar { width:32px; height:32px; background:linear-gradient(135deg,#0061d2,#3385e0); border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:700; color:#fff; flex-shrink:0; }
        .crm-customer-name { font-size:13px; font-weight:600; color:#1f2937; }
        .crm-bday-hint { font-size:10px; color:#ec4899; }
        .crm-contact { display:flex; flex-direction:column; gap:2px; font-size:11px; color:#6b7280; }
        .crm-contact span { display:flex; align-items:center; gap:4px; }
        .crm-visits { font-weight:600; color:#374151; }
        .crm-spend { font-weight:700; color:#10b981; }
        .crm-points { font-weight:700; color:#0061d2; }
        .crm-tier-badge { font-size:11px; font-weight:700; padding:3px 8px; border-radius:20px; white-space:nowrap; }
        .crm-muted { font-size:12px; color:#9ca3af; }
        .crm-actions { display:flex; gap:4px; }

        /* Detail view */
        .crm-detail { display:flex; flex-direction:column; gap:16px; }
        .crm-detail-hero { background:#fff; border:1px solid #e5e7eb; border-radius:16px; padding:20px; display:flex; align-items:flex-start; gap:20px; flex-wrap:wrap; }
        .crm-detail-avatar { width:64px; height:64px; background:linear-gradient(135deg,#0061d2,#3385e0); border-radius:16px; display:flex; align-items:center; justify-content:center; font-size:26px; font-weight:700; color:#fff; flex-shrink:0; }
        .crm-detail-info { flex:1; }
        .crm-detail-name { font-size:22px; font-weight:800; color:#1f2937; margin-bottom:6px; }
        .crm-detail-meta { display:flex; flex-wrap:wrap; gap:12px; font-size:13px; color:#6b7280; margin-bottom:10px; }
        .crm-detail-meta span { display:flex; align-items:center; gap:5px; }
        .crm-detail-tier-badge { display:inline-flex; align-items:center; gap:4px; font-size:12px; font-weight:700; padding:4px 10px; border-radius:20px; }
        .crm-detail-points-box { background:#e8f0fd; border:1px solid #b3ccf5; border-radius:12px; padding:16px 20px; text-align:center; min-width:140px; }
        .crm-detail-pts-val { font-size:32px; font-weight:800; color:#0061d2; }
        .crm-detail-pts-lbl { font-size:12px; color:#0052b3; margin-bottom:10px; }
        .crm-detail-pts-actions { display:flex; gap:6px; justify-content:center; }
        .crm-detail-kpis { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; }
        @media(max-width:700px) { .crm-detail-kpis { grid-template-columns:repeat(2,1fr); } }
        .crm-detail-kpi { background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:14px; display:flex; align-items:center; gap:10px; }
        .crm-detail-kpi-icon { width:36px; height:36px; border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .crm-detail-kpi-val { font-size:16px; font-weight:800; line-height:1.2; }
        .crm-detail-kpi-lbl { font-size:11px; color:#9ca3af; }
        .crm-detail-section { background:#fff; border:1px solid #e5e7eb; border-radius:16px; overflow:hidden; }
        .crm-detail-section-header { display:flex; align-items:center; gap:8px; padding:14px 18px; border-bottom:1px solid #f1f5f9; font-size:14px; font-weight:700; color:#374151; background:#f8fafc; }
        .crm-detail-section-header button { margin-left:auto; }
        .crm-detail-empty { display:flex; flex-direction:column; align-items:center; gap:8px; padding:32px; color:#9ca3af; text-align:center; }
        .crm-detail-notes { padding:14px 18px; font-size:13px; color:#4b5563; line-height:1.6; }
        .crm-visit-list { display:flex; flex-direction:column; }
        .crm-visit-row { display:flex; align-items:center; gap:14px; padding:12px 18px; border-bottom:1px solid #f9fafb; font-size:13px; }
        .crm-visit-row:last-child { border-bottom:none; }
        .crm-visit-date { display:flex; align-items:center; gap:5px; color:#6b7280; min-width:120px; font-size:12px; }
        .crm-visit-items { flex:1; color:#374151; display:flex; align-items:center; gap:5px; font-size:12px; }
        .crm-visit-spend { font-weight:700; color:#10b981; min-width:80px; text-align:right; }
        .crm-visit-pts { font-size:11px; font-weight:600; color:#0061d2; background:#e8f0fd; border:1px solid #b3ccf5; border-radius:12px; padding:2px 8px; white-space:nowrap; }

        /* Loading/empty */
        .crm-loading,.crm-empty { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; padding:48px; color:#9ca3af; text-align:center; background:#fff; border-radius:12px; border:1px solid #e5e7eb; }
        .crm-empty h3 { font-size:16px; color:#374151; font-weight:600; margin:0; }
        .crm-empty p { font-size:13px; margin:0; }

        .crm-form-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
        .crm-form-grid>div:last-child { grid-column:1/-1; }

        .crm-spin { animation:crm-spin .8s linear infinite; }
        @keyframes crm-spin { to { transform:rotate(360deg); } }
      `}</style>
    </div>
  );
}