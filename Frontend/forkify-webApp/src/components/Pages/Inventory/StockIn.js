import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowDownCircle, Plus, Search, Calendar, Package,
  Truck, FileText, CheckCircle, AlertTriangle, RefreshCw,
  X, Save, ArrowLeft,
} from 'lucide-react';
import inventoryService from '../../../services/inventoryService';
import recipeService    from '../../../services/recipeService';
import useBranch        from '../../../hooks/useBranch';
import { useNavigate }  from 'react-router-dom';

const emptyForm = () => ({
  ingredientId: '', quantity: '', supplier: '',
  referenceNo: '', unitCost: '', expiryDate: '', notes: '',
});

const StockIn = () => {
  const navigate          = useNavigate();
  const { branchId }      = useBranch();
  const [transactions, setTransactions] = useState([]);
  const [ingredients,  setIngredients]  = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [search,       setSearch]       = useState('');
  const [modalOpen,    setModalOpen]    = useState(false);
  const [form,         setForm]         = useState(emptyForm());
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState(null);
  const [success,      setSuccess]      = useState(null);

  const load = useCallback(async () => {
    if (!branchId) return;
    setLoading(true);
    try {
      const [txRes, ingRes] = await Promise.all([
        inventoryService.getTransactions(branchId, 'STOCK_IN'),
        recipeService.getAllIngredients(),
      ]);
      setTransactions(txRes.data || []);
      setIngredients(ingRes.data || []);
    } catch { setError('Failed to load transactions'); }
    finally  { setLoading(false); }
  }, [branchId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(null), 3000);
    return () => clearTimeout(t);
  }, [success]);

  const stats = {
    total:    transactions.length,
    today:    transactions.filter(t => t.transactionDate === new Date().toISOString().split('T')[0]).length,
    suppliers: [...new Set(transactions.map(t => t.supplier).filter(Boolean))].length,
  };

  const filtered = transactions.filter(t =>
    !search || t.ingredientName.toLowerCase().includes(search.toLowerCase())
      || (t.supplier || '').toLowerCase().includes(search.toLowerCase())
      || (t.referenceNo || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async () => {
    if (!form.ingredientId || !form.quantity) {
      setError('Ingredient and quantity are required'); return;
    }
    setSaving(true);
    try {
      await inventoryService.stockIn({
        ingredientId: parseInt(form.ingredientId),
        quantity:     parseFloat(form.quantity),
        supplier:     form.supplier   || null,
        referenceNo:  form.referenceNo || null,
        unitCost:     form.unitCost    ? parseFloat(form.unitCost) : null,
        expiryDate:   form.expiryDate  || null,
        notes:        form.notes       || null,
      }, branchId);
      setSuccess('Stock recorded successfully — inventory updated');
      setModalOpen(false);
      setForm(emptyForm());
      load();
    } catch (e) {
      setError(e.response?.data || 'Failed to record stock');
    } finally { setSaving(false); }
  };

  return (
    <div className="si-page">
      {/* header */}
      <div className="si-header">
        <div className="si-header-left">
          <button className="si-back-btn" onClick={() => navigate('/fooderp/inventory')}>
            <ArrowLeft size={15} />
          </button>
          <div>
            <h2 className="si-title"><ArrowDownCircle size={20} /> Stock In</h2>
            <p className="si-sub">Record incoming deliveries from suppliers</p>
          </div>
        </div>
        <div className="si-header-right">
          <button className="si-btn-ghost" onClick={load} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'si-spin' : ''} />
          </button>
          <button className="si-btn-primary" onClick={() => setModalOpen(true)}>
            <Plus size={15} /> New Stock Entry
          </button>
        </div>
      </div>

      {error   && <div className="si-banner error"><AlertTriangle size={14} />{error}<button onClick={() => setError(null)}>✕</button></div>}
      {success && <div className="si-banner success"><CheckCircle size={14} />{success}<button onClick={() => setSuccess(null)}>✕</button></div>}

      {/* stats */}
      <div className="si-stats">
        {[
          { label: 'Total Entries',    val: stats.total,    icon: Package,       color: '#3b82f6' },
          { label: "Today's Entries",  val: stats.today,    icon: Calendar,      color: '#0061d2' },
          { label: 'Unique Suppliers', val: stats.suppliers, icon: Truck,        color: '#10b981' },
        ].map((s, i) => (
          <div key={i} className="si-stat">
            <div className="si-stat-icon" style={{ background: s.color + '18', color: s.color }}>
              <s.icon size={18} />
            </div>
            <div>
              <div className="si-stat-val">{s.val}</div>
              <div className="si-stat-lbl">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* search */}
      <div className="si-search-wrap">
        <div className="si-search">
          <Search size={14} />
          <input placeholder="Search by ingredient, supplier or reference..."
            value={search} onChange={e => setSearch(e.target.value)} />
          {search && <button onClick={() => setSearch('')}><X size={12} /></button>}
        </div>
      </div>

      {/* table */}
      {loading ? (
        <div className="si-loading"><RefreshCw size={22} className="si-spin" /><p>Loading...</p></div>
      ) : filtered.length === 0 ? (
        <div className="si-empty">
          <ArrowDownCircle size={44} />
          <h3>No stock entries yet</h3>
          <p>Record your first stock delivery using the button above</p>
        </div>
      ) : (
        <div className="si-table-wrap">
          <table className="si-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Ingredient</th>
                <th>Quantity</th>
                <th>Unit Cost</th>
                <th>Supplier</th>
                <th>Reference</th>
                <th>Balance After</th>
                <th>Recorded By</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(tx => (
                <tr key={tx.id} className="si-row">
                  <td><span className="si-date"><Calendar size={12} />{tx.transactionDate}</span></td>
                  <td><strong className="si-ing">{tx.ingredientName}</strong></td>
                  <td><span className="si-qty">+{tx.quantity} {tx.unit}</span></td>
                  <td>{tx.unitCost ? `₹${parseFloat(tx.unitCost).toFixed(2)}` : '—'}</td>
                  <td>{tx.supplier ? <span className="si-supplier"><Truck size={12} />{tx.supplier}</span> : '—'}</td>
                  <td>{tx.referenceNo ? <span className="si-ref"><FileText size={12} />{tx.referenceNo}</span> : '—'}</td>
                  <td><strong>{tx.balanceAfter} {tx.unit}</strong></td>
                  <td className="si-muted">{tx.createdBy || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* modal */}
      {modalOpen && (
        <div className="si-overlay" onClick={() => setModalOpen(false)}>
          <div className="si-modal" onClick={e => e.stopPropagation()}>
            <div className="si-modal-header">
              <div className="si-modal-title-icon"><ArrowDownCircle size={18} /></div>
              <div>
                <h3>Record Stock In</h3>
                <p>Update inventory with incoming delivery</p>
              </div>
              <button onClick={() => setModalOpen(false)}><X size={16} /></button>
            </div>
            <div className="si-modal-body">
              <div className="si-field">
                <label>Ingredient *</label>
                <select value={form.ingredientId}
                  onChange={e => setForm(f => ({ ...f, ingredientId: e.target.value }))}>
                  <option value="">Select ingredient</option>
                  {ingredients.map(i => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
                </select>
              </div>
              <div className="si-row-2">
                <div className="si-field">
                  <label>Quantity Received *</label>
                  <input type="number" min="0.01" step="0.01" placeholder="0.00"
                    value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
                </div>
                <div className="si-field">
                  <label>Unit Cost (optional)</label>
                  <input type="number" min="0" step="0.01" placeholder="Updates ingredient cost"
                    value={form.unitCost} onChange={e => setForm(f => ({ ...f, unitCost: e.target.value }))} />
                </div>
              </div>
              <div className="si-row-2">
                <div className="si-field">
                  <label>Supplier</label>
                  <input placeholder="Supplier name" value={form.supplier}
                    onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))} />
                </div>
                <div className="si-field">
                  <label>Reference / PO No.</label>
                  <input placeholder="e.g. PO-1023" value={form.referenceNo}
                    onChange={e => setForm(f => ({ ...f, referenceNo: e.target.value }))} />
                </div>
              </div>
              <div className="si-row-2">
                <div className="si-field">
                  <label>Expiry Date</label>
                  <input type="date" value={form.expiryDate}
                    onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))} />
                </div>
                <div className="si-field">
                  <label>Notes</label>
                  <input placeholder="Optional notes" value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="si-modal-footer">
              <button className="si-btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
              <button className="si-btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? <><RefreshCw size={13} className="si-spin" /> Saving...</> : <><Save size={13} /> Record Entry</>}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .si-page { max-width:1100px; }
        .si-header { display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:10px; }
        .si-header-left { display:flex;align-items:center;gap:10px; }
        .si-header-right { display:flex;gap:8px; }
        .si-back-btn { width:32px;height:32px;background:#f0f2f7;border:1px solid #e2e6ef;border-radius:8px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#374151; }
        .si-title { display:flex;align-items:center;gap:7px;font-size:18px;font-weight:700;color:#1f2937;margin:0 0 2px; }
        .si-sub { font-size:12px;color:#9ca3af;margin:0; }
        .si-btn-primary { display:flex;align-items:center;gap:5px;padding:7px 14px;background:#e8f0fd;border:1px solid #b3ccf5;border:1px solid #b3ccf5;color:#0052b3;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer; }
        .si-btn-ghost { width:32px;height:32px;background:#f0f2f7;border:1px solid #e2e6ef;border-radius:8px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#6b7280; }
        .si-banner { display:flex;align-items:center;gap:8px;padding:9px 12px;border-radius:8px;font-size:13px;margin-bottom:12px; }
        .si-banner button { margin-left:auto;background:none;border:none;cursor:pointer;font-size:15px; }
        .si-banner.error   { background:#fef2f2;border:1px solid #fecaca;color:#dc2626; }
        .si-banner.success { background:#f0fdf4;border:1px solid #bbf7d0;color:#15803d; }
        .si-stats { display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px; }
        .si-stat { background:#fff;border-radius:12px;border:1px solid #e5e7eb;padding:14px;display:flex;align-items:center;gap:12px; }
        .si-stat-icon { width:38px;height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0; }
        .si-stat-val { font-size:20px;font-weight:800;color:#1f2937;line-height:1; }
        .si-stat-lbl { font-size:11px;color:#9ca3af;margin-top:2px; }
        .si-search-wrap { margin-bottom:14px; }
        .si-search { display:flex;align-items:center;gap:7px;padding:8px 12px;background:#fff;border:1px solid #e5e7eb;border-radius:8px;max-width:420px; }
        .si-search:focus-within { border-color:#0061d2; }
        .si-search input { border:none;outline:none;font-size:13px;color:#1f2937;flex:1;background:transparent; }
        .si-search button { background:none;border:none;cursor:pointer;color:#9ca3af; }
        .si-table-wrap { background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden; }
        .si-table { width:100%;border-collapse:collapse; }
        .si-table thead tr { background:#f8fafc;border-bottom:1px solid #e5e7eb; }
        .si-table th { padding:10px 14px;text-align:left;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.5px; }
        .si-row { border-bottom:1px solid #f1f5f9; }
        .si-row:last-child { border-bottom:none; }
        .si-row:hover { background:#fafafa; }
        .si-table td { padding:11px 14px;vertical-align:middle;font-size:13px; }
        .si-date { display:inline-flex;align-items:center;gap:4px;font-size:12px;color:#6b7280; }
        .si-ing { font-size:13px;font-weight:600;color:#1f2937; }
        .si-qty { font-size:13px;font-weight:700;color:#10b981; }
        .si-supplier,.si-ref { display:inline-flex;align-items:center;gap:4px;font-size:12px;color:#6b7280; }
        .si-muted { font-size:12px;color:#9ca3af; }
        .si-loading,.si-empty { display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:48px;color:#9ca3af;text-align:center;background:#fff;border-radius:12px;border:1px solid #e5e7eb; }
        .si-empty h3 { font-size:16px;font-weight:600;color:#374151;margin:0; }
        .si-empty p { font-size:13px;margin:0; }
        /* Modal */
        .si-overlay { position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;z-index:1000;padding:16px; }
        .si-modal { background:#fff;border-radius:16px;width:100%;max-width:540px;box-shadow:0 20px 60px rgba(0,0,0,.2);overflow:hidden; }
        .si-modal-header { display:flex;align-items:center;gap:12px;padding:18px 20px;border-bottom:1px solid #f1f5f9; }
        .si-modal-title-icon { width:36px;height:36px;background:rgba(0,97,210,.1);border-radius:9px;display:flex;align-items:center;justify-content:center;color:#0061d2;flex-shrink:0; }
        .si-modal-header h3 { font-size:15px;font-weight:700;color:#1f2937;margin:0 0 2px; }
        .si-modal-header p { font-size:12px;color:#9ca3af;margin:0; }
        .si-modal-header > button { margin-left:auto;width:28px;height:28px;background:#f0f2f7;border:none;border-radius:7px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#6b7280; }
        .si-modal-body { padding:18px 20px;display:flex;flex-direction:column;gap:12px; }
        .si-row-2 { display:grid;grid-template-columns:1fr 1fr;gap:12px; }
        .si-field { display:flex;flex-direction:column;gap:5px; }
        .si-field label { font-size:12px;font-weight:600;color:#374151; }
        .si-field input,.si-field select { padding:8px 11px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;color:#1f2937;background:#fff;outline:none;font-family:inherit; }
        .si-field input:focus,.si-field select:focus { border-color:#0061d2; }
        .si-modal-footer { display:flex;justify-content:flex-end;gap:8px;padding:14px 20px;border-top:1px solid #e2e6ef;background:#f8fafc; }
        .si-spin { animation:si-spin .8s linear infinite; }
        @keyframes si-spin { to { transform:rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default StockIn;