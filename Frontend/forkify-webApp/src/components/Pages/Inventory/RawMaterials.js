import React, { useState, useEffect, useCallback } from 'react';
import {
  Package, Search, Plus, Edit2, AlertTriangle,
  IndianRupee, Calendar, RefreshCw, Filter, X, Save,
  CheckCircle, XCircle, ArrowLeft,
} from 'lucide-react';
import inventoryService from '../../../services/inventoryService';
import recipeService    from '../../../services/recipeService';
import useBranch        from '../../../hooks/useBranch';
import usePermission    from '../../../hooks/usePermission';
import { useNavigate }  from 'react-router-dom';

const STATUS_CONFIG = {
  GOOD:         { label: 'Good',         bg: '#f0fdf4', color: '#15803d', icon: CheckCircle },
  WARNING:      { label: 'Warning',      bg: '#fefce8', color: '#a16207', icon: AlertTriangle },
  LOW:          { label: 'Low',          bg: '#e8f0fd', color: '#0052b3', icon: AlertTriangle },
  CRITICAL:     { label: 'Critical',     bg: '#fef2f2', color: '#b91c1c', icon: XCircle },
  OUT_OF_STOCK: { label: 'Out of Stock', bg: '#f1f5f9', color: '#475569', icon: XCircle },
};

const emptyForm = () => ({
  ingredientId: '', currentQuantity: 0, minStockLevel: 0,
  location: '', unitCost: '', expiryDate: '',
});

const RawMaterials = () => {
  const navigate = useNavigate();
  const { branchId }          = useBranch();
  const { canApprove }        = usePermission();
  const [items,       setItems]      = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [loading,     setLoading]    = useState(false);
  const [search,      setSearch]     = useState('');
  const [catFilter,   setCatFilter]  = useState('all');
  const [modalOpen,   setModalOpen]  = useState(false);
  const [editTarget,  setEditTarget] = useState(null);
  const [form,        setForm]       = useState(emptyForm());
  const [saving,      setSaving]     = useState(false);
  const [error,       setError]      = useState(null);
  const [success,     setSuccess]    = useState(null);

  const load = useCallback(async () => {
    if (!branchId) return;
    setLoading(true);
    try {
      const [invRes, ingRes] = await Promise.all([
        inventoryService.getAll(branchId),
        recipeService.getAllIngredients(),
      ]);
      setItems(invRes.data || []);
      setIngredients(ingRes.data || []);
    } catch { setError('Failed to load inventory'); }
    finally  { setLoading(false); }
  }, [branchId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(null), 3000);
    return () => clearTimeout(t);
  }, [success]);

  const categories = [...new Set(items.map(i => i.category))].sort();

  const filtered = items.filter(item => {
    const matchSearch = !search || item.ingredientName.toLowerCase().includes(search.toLowerCase());
    const matchCat    = catFilter === 'all' || item.category === catFilter;
    return matchSearch && matchCat;
  });

  const openAdd = () => {
    setEditTarget(null);
    setForm(emptyForm());
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditTarget(item);
    setForm({
      ingredientId:    item.ingredientId,
      currentQuantity: item.currentQuantity,
      minStockLevel:   item.minStockLevel,
      location:        item.location || '',
      unitCost:        item.unitCost || '',
      expiryDate:      item.expiryDate || '',
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.ingredientId) { setError('Please select an ingredient'); return; }
    setSaving(true);
    try {
      await inventoryService.upsertItem({
        ingredientId:    parseInt(form.ingredientId),
        currentQuantity: parseFloat(form.currentQuantity) || 0,
        minStockLevel:   parseFloat(form.minStockLevel)   || 0,
        location:        form.location   || null,
        unitCost:        form.unitCost   ? parseFloat(form.unitCost) : null,
        expiryDate:      form.expiryDate || null,
      }, branchId);
      setSuccess(editTarget ? 'Item updated' : 'Item added to inventory');
      setModalOpen(false);
      load();
    } catch (e) {
      setError(e.response?.data || 'Save failed');
    } finally { setSaving(false); }
  };

  const getStatusCfg = (status) => STATUS_CONFIG[status] || STATUS_CONFIG.GOOD;

  return (
    <div className="rm-page">
      {/* header */}
      <div className="rm-header">
        <div className="rm-header-left">
          <button className="rm-back-btn" onClick={() => navigate('/fooderp/inventory')}>
            <ArrowLeft size={15} />
          </button>
          <div>
            <h2 className="rm-title"><Package size={20} /> Raw Materials</h2>
            <p className="rm-sub">{filtered.length} items · Branch inventory</p>
          </div>
        </div>
        <div className="rm-header-right">
          <button className="rm-btn-ghost" onClick={load} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'rm-spin' : ''} />
          </button>
          {canApprove && (
            <button className="rm-btn-primary" onClick={openAdd}>
              <Plus size={15} /> Add Item
            </button>
          )}
        </div>
      </div>

      {/* banners */}
      {error   && <div className="rm-banner error"><AlertTriangle size={14} />{error}<button onClick={() => setError(null)}>✕</button></div>}
      {success && <div className="rm-banner success"><CheckCircle size={14} />{success}<button onClick={() => setSuccess(null)}>✕</button></div>}

      {/* filters */}
      <div className="rm-filters">
        <div className="rm-search">
          <Search size={14} />
          <input placeholder="Search items..." value={search}
            onChange={e => setSearch(e.target.value)} />
          {search && <button onClick={() => setSearch('')}><X size={12} /></button>}
        </div>
        <div className="rm-cat-filter">
          <Filter size={14} />
          <select value={catFilter} onChange={e => setCatFilter(e.target.value)}>
            <option value="all">All Categories</option>
            {categories.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* table */}
      {loading && items.length === 0 ? (
        <div className="rm-loading"><RefreshCw size={22} className="rm-spin" /><p>Loading...</p></div>
      ) : filtered.length === 0 ? (
        <div className="rm-empty">
          <Package size={44} />
          <h3>No items found</h3>
          <p>{items.length === 0 ? 'Add your first inventory item using the button above' : 'Try adjusting your search'}</p>
        </div>
      ) : (
        <div className="rm-table-wrap">
          <table className="rm-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Category</th>
                <th>Current Stock</th>
                <th>Min Level</th>
                <th>Unit Cost</th>
                <th>Total Value</th>
                <th>Expiry</th>
                <th>Status</th>
                {canApprove && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => {
                const sc  = getStatusCfg(item.status);
                const pct = item.minStockLevel > 0
                  ? Math.min(100, (item.currentQuantity / item.minStockLevel) * 100)
                  : 100;
                return (
                  <tr key={item.id} className={`rm-row ${item.status === 'CRITICAL' || item.status === 'OUT_OF_STOCK' ? 'critical-row' : ''}`}>
                    <td>
                      <div className="rm-item-name">{item.ingredientName}</div>
                      {item.location && <div className="rm-item-loc">{item.location}</div>}
                    </td>
                    <td><span className="rm-cat">{item.category}</span></td>
                    <td>
                      <div className="rm-stock-cell">
                        <span>{item.currentQuantity} {item.unit}</span>
                        <div className="rm-bar-track">
                          <div className="rm-bar-fill" style={{
                            width: `${pct}%`,
                            background: item.status === 'CRITICAL' ? '#ef4444'
                              : item.status === 'LOW' ? '#f59e0b' : '#10b981',
                          }} />
                        </div>
                      </div>
                    </td>
                    <td>{item.minStockLevel} {item.unit}</td>
                    <td><span className="rm-cost"><IndianRupee size={12} />{parseFloat(item.unitCost||0).toFixed(2)}</span></td>
                    <td><span className="rm-cost">₹{parseFloat(item.totalValue||0).toFixed(2)}</span></td>
                    <td>
                      {item.expiryDate
                        ? <span className="rm-expiry"><Calendar size={12} />{item.expiryDate}</span>
                        : <span className="rm-no-expiry">—</span>}
                    </td>
                    <td>
                      <span className="rm-status" style={{ background: sc.bg, color: sc.color }}>
                        <sc.icon size={11} />{sc.label}
                      </span>
                    </td>
                    {canApprove && (
                      <td>
                        <button className="rm-action-btn" onClick={() => openEdit(item)}>
                          <Edit2 size={13} />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* modal */}
      {modalOpen && (
        <div className="rm-overlay" onClick={() => setModalOpen(false)}>
          <div className="rm-modal" onClick={e => e.stopPropagation()}>
            <div className="rm-modal-header">
              <h3>{editTarget ? 'Edit Inventory Item' : 'Add Inventory Item'}</h3>
              <button onClick={() => setModalOpen(false)}><X size={16} /></button>
            </div>
            <div className="rm-modal-body">
              {!editTarget && (
                <div className="rm-field">
                  <label>Ingredient *</label>
                  <select value={form.ingredientId}
                    onChange={e => setForm(f => ({ ...f, ingredientId: e.target.value }))}>
                    <option value="">Select ingredient</option>
                    {ingredients.map(i => (
                      <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>
                    ))}
                  </select>
                </div>
              )}
              {editTarget && (
                <div className="rm-field">
                  <label>Ingredient</label>
                  <input value={editTarget.ingredientName} disabled />
                </div>
              )}
              <div className="rm-modal-row">
                <div className="rm-field">
                  <label>Current Quantity</label>
                  <input type="number" min="0" step="0.01" value={form.currentQuantity}
                    onChange={e => setForm(f => ({ ...f, currentQuantity: e.target.value }))} />
                </div>
                <div className="rm-field">
                  <label>Min Stock Level</label>
                  <input type="number" min="0" step="0.01" value={form.minStockLevel}
                    onChange={e => setForm(f => ({ ...f, minStockLevel: e.target.value }))} />
                </div>
              </div>
              <div className="rm-modal-row">
                <div className="rm-field">
                  <label>Unit Cost (override)</label>
                  <input type="number" min="0" step="0.01" value={form.unitCost}
                    onChange={e => setForm(f => ({ ...f, unitCost: e.target.value }))}
                    placeholder="Leave blank to use ingredient cost" />
                </div>
                <div className="rm-field">
                  <label>Expiry Date</label>
                  <input type="date" value={form.expiryDate}
                    onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))} />
                </div>
              </div>
              <div className="rm-field">
                <label>Storage Location</label>
                <input value={form.location}
                  onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                  placeholder="e.g. Cool Room A1" />
              </div>
            </div>
            <div className="rm-modal-footer">
              <button className="rm-btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
              <button className="rm-btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? <><RefreshCw size={13} className="rm-spin" /> Saving...</> : <><Save size={13} /> Save</>}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .rm-page { max-width:1200px; }
        .rm-header { display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;flex-wrap:wrap;gap:10px; }
        .rm-header-left { display:flex;align-items:center;gap:10px; }
        .rm-header-right { display:flex;gap:8px;align-items:center; }
        .rm-back-btn { width:32px;height:32px;background:#f0f2f7;border:1px solid #e2e6ef;border-radius:8px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#374151; }
        .rm-title { display:flex;align-items:center;gap:7px;font-size:18px;font-weight:700;color:#1f2937;margin:0 0 2px; }
        .rm-sub { font-size:12px;color:#9ca3af;margin:0; }
        .rm-btn-primary { display:flex;align-items:center;gap:5px;padding:7px 14px;background:#e8f0fd;border:1px solid #b3ccf5;border:1px solid #b3ccf5;color:#0052b3;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer; }
        .rm-btn-ghost { width:32px;height:32px;background:#f0f2f7;border:1px solid #e2e6ef;border-radius:8px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#6b7280; }
        .rm-banner { display:flex;align-items:center;gap:8px;padding:9px 12px;border-radius:8px;font-size:13px;margin-bottom:14px; }
        .rm-banner button { margin-left:auto;background:none;border:none;cursor:pointer;font-size:15px; }
        .rm-banner.error   { background:#fef2f2;border:1px solid #fecaca;color:#dc2626; }
        .rm-banner.success { background:#f0fdf4;border:1px solid #bbf7d0;color:#15803d; }
        .rm-filters { display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap; }
        .rm-search { display:flex;align-items:center;gap:7px;padding:8px 12px;background:#fff;border:1px solid #e5e7eb;border-radius:8px;flex:1;min-width:180px; }
        .rm-search:focus-within { border-color:#0061d2; }
        .rm-search input { border:none;outline:none;font-size:13px;color:#1f2937;flex:1;background:transparent; }
        .rm-search button { background:none;border:none;cursor:pointer;color:#9ca3af; }
        .rm-cat-filter { display:flex;align-items:center;gap:7px;padding:8px 12px;background:#fff;border:1px solid #e5e7eb;border-radius:8px;color:#6b7280; }
        .rm-cat-filter select { border:none;outline:none;font-size:13px;color:#1f2937;background:transparent;cursor:pointer; }
        .rm-table-wrap { background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden; }
        .rm-table { width:100%;border-collapse:collapse; }
        .rm-table thead tr { background:#f8fafc;border-bottom:1px solid #e5e7eb; }
        .rm-table th { padding:10px 14px;text-align:left;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.5px; }
        .rm-row { border-bottom:1px solid #f1f5f9;transition:background .1s; }
        .rm-row:last-child { border-bottom:none; }
        .rm-row:hover { background:#fafafa; }
        .rm-row.critical-row { background:#fff5f5; }
        .rm-table td { padding:11px 14px;vertical-align:middle; }
        .rm-item-name { font-size:13px;font-weight:600;color:#1f2937; }
        .rm-item-loc { font-size:11px;color:#9ca3af;margin-top:1px; }
        .rm-cat { font-size:11px;font-weight:600;padding:2px 7px;background:#f0f9ff;color:#0369a1;border-radius:20px; }
        .rm-stock-cell { display:flex;flex-direction:column;gap:4px; }
        .rm-stock-cell span { font-size:13px;color:#374151; }
        .rm-bar-track { height:4px;background:#f1f5f9;border-radius:2px;overflow:hidden;width:80px; }
        .rm-bar-fill { height:100%;border-radius:2px;transition:width .3s; }
        .rm-cost { display:inline-flex;align-items:center;gap:2px;font-size:13px;font-weight:600;color:#1f2937; }
        .rm-expiry { display:inline-flex;align-items:center;gap:4px;font-size:12px;color:#6b7280; }
        .rm-no-expiry { font-size:12px;color:#d1d5db; }
        .rm-status { display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:700;padding:3px 8px;border-radius:20px; }
        .rm-action-btn { width:28px;height:28px;display:flex;align-items:center;justify-content:center;background:#f0f2f7;border:1px solid #e2e6ef;border-radius:6px;cursor:pointer;color:#6b7280;transition:all .15s; }
        .rm-action-btn:hover { background:rgba(0,97,210,.1);color:#0061d2; }
        .rm-loading,.rm-empty { display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:50px;color:#9ca3af;text-align:center;background:#fff;border-radius:12px;border:1px solid #e5e7eb; }
        .rm-empty h3 { font-size:17px;font-weight:600;color:#374151;margin:0; }
        .rm-empty p { font-size:13px;margin:0; }
        .rm-overlay { position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;z-index:1000;padding:16px; }
        .rm-modal { background:#fff;border-radius:16px;width:100%;max-width:520px;box-shadow:0 20px 60px rgba(0,0,0,.2);overflow:hidden; }
        .rm-modal-header { display:flex;align-items:center;justify-content:space-between;padding:18px 20px;border-bottom:1px solid #f1f5f9; }
        .rm-modal-header h3 { font-size:16px;font-weight:700;color:#1f2937;margin:0; }
        .rm-modal-header button { width:28px;height:28px;background:#f0f2f7;border:none;border-radius:7px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#6b7280; }
        .rm-modal-body { padding:18px 20px;display:flex;flex-direction:column;gap:12px; }
        .rm-modal-row { display:grid;grid-template-columns:1fr 1fr;gap:12px; }
        .rm-field { display:flex;flex-direction:column;gap:5px; }
        .rm-field label { font-size:12px;font-weight:600;color:#374151; }
        .rm-field input,.rm-field select { padding:8px 11px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;color:#1f2937;background:#fff;outline:none;font-family:inherit; }
        .rm-field input:focus,.rm-field select:focus { border-color:#0061d2; }
        .rm-field input:disabled { background:#f8fafc;color:#9ca3af; }
        .rm-modal-footer { display:flex;justify-content:flex-end;gap:8px;padding:14px 20px;border-top:1px solid #e2e6ef;background:#f8fafc; }
        .rm-spin { animation:rm-spin .8s linear infinite; }
        @keyframes rm-spin { to { transform:rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default RawMaterials;