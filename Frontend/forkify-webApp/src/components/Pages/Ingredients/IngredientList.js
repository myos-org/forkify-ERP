import React, { useState, useEffect, useCallback } from 'react';
import {
  Package, Search, Plus, Edit2, Trash2, Filter,
  AlertTriangle, RefreshCw, IndianRupee,
  X, Check, Save, Flame,
} from 'lucide-react';
import recipeService from '../../../services/recipeService';
import usePermission from '../../../hooks/usePermission';

// ── Constants ─────────────────────────────────────────────────────────────────
const CATEGORIES = [
  'Vegetables', 'Fruits', 'Meat', 'Seafood', 'Dairy',
  'Grains', 'Spices', 'Oils', 'Herbs', 'Condiments',
  'Beverages', 'Bakery', 'Frozen', 'Other',
];

const UNITS = [
  { value: 'kg',    label: 'Kilogram (kg)'   },
  { value: 'g',     label: 'Gram (g)'        },
  { value: 'ltr',   label: 'Litre (ltr)'     },
  { value: 'ml',    label: 'Millilitre (ml)' },
  { value: 'pcs',   label: 'Pieces (pcs)'    },
  { value: 'dozen', label: 'Dozen'           },
  { value: 'cup',   label: 'Cup'             },
  { value: 'tbsp',  label: 'Tablespoon'      },
  { value: 'tsp',   label: 'Teaspoon'        },
  { value: 'pack',  label: 'Pack'            },
];

const ALLERGEN_OPTIONS = [
  'Gluten', 'Dairy', 'Eggs', 'Nuts', 'Peanuts',
  'Soy', 'Fish', 'Shellfish', 'Sesame',
];

const CATEGORY_COLORS = {
  Vegetables: { bg: '#f0fdf4', color: '#15803d' },
  Fruits:     { bg: '#e8f0fd', color: '#0052b3' },
  Meat:       { bg: '#fef2f2', color: '#b91c1c' },
  Seafood:    { bg: '#eff6ff', color: '#1d4ed8' },
  Dairy:      { bg: '#fefce8', color: '#a16207' },
  Grains:     { bg: '#fdf4ff', color: '#7e22ce' },
  Spices:     { bg: '#e8f0fd', color: '#0052b3' },
  Oils:       { bg: '#f0fdf4', color: '#15803d' },
  Herbs:      { bg: '#f0fdf4', color: '#166534' },
  default:    { bg: '#f1f5f9', color: '#475569' },
};

const emptyForm = () => ({
  name: '', unit: 'kg', category: '', costPerUnit: 0,
  caloriesPerUnit: 0, proteinPerUnit: 0, carbsPerUnit: 0,
  fatPerUnit: 0, fiberPerUnit: 0, allergens: [],
});

// ── Component ─────────────────────────────────────────────────────────────────
const IngredientList = () => {
  const { canEditMasterData } = usePermission();

  const [ingredients,  setIngredients]  = useState([]);
  const [categories,   setCategories]   = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [search,       setSearch]       = useState('');
  const [catFilter,    setCatFilter]    = useState('all');
  const [modalOpen,    setModalOpen]    = useState(false);
  const [editTarget,   setEditTarget]   = useState(null); // null = create
  const [form,         setForm]         = useState(emptyForm());
  const [formErrors,   setFormErrors]   = useState({});
  const [saving,       setSaving]       = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [apiError,     setApiError]     = useState(null);
  const [successMsg,   setSuccessMsg]   = useState(null);

  // ── Load ──────────────────────────────────────────────────────────────────
  const load = useCallback(async (searchVal, catVal) => {
    setLoading(true);
    try {
      const params = {};
      if (searchVal !== undefined ? searchVal : search)              params.q        = searchVal !== undefined ? searchVal : search;
      if ((catVal !== undefined ? catVal : catFilter) !== 'all') params.category = catVal !== undefined ? catVal : catFilter;
      const { data } = await recipeService.getAllIngredients(params);
      setIngredients(data || []);
    } catch (e) {
      setApiError('Failed to load ingredients');
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line

  useEffect(() => { load(search, catFilter); }, [load, search, catFilter]);

  // Load categories once
  useEffect(() => {
    recipeService.getIngredientCategories()
      .then(r => setCategories(r.data || []))
      .catch(() => {});
  }, []);

  // Auto-dismiss success msg
  useEffect(() => {
    if (!successMsg) return;
    const t = setTimeout(() => setSuccessMsg(null), 3000);
    return () => clearTimeout(t);
  }, [successMsg]);

  // ── Modal helpers ─────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditTarget(null);
    setForm(emptyForm());
    setFormErrors({});
    setModalOpen(true);
  };

  const openEdit = (ing) => {
    setEditTarget(ing);
    setForm({
      name:            ing.name,
      unit:            ing.unit,
      category:        ing.category,
      costPerUnit:     parseFloat(ing.costPerUnit || 0),
      caloriesPerUnit: ing.caloriesPerUnit || 0,
      proteinPerUnit:  ing.proteinPerUnit  || 0,
      carbsPerUnit:    ing.carbsPerUnit    || 0,
      fatPerUnit:      ing.fatPerUnit      || 0,
      fiberPerUnit:    ing.fiberPerUnit    || 0,
      allergens:       parseList(ing.allergens),
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const closeModal = () => { setModalOpen(false); setFormErrors({}); };

  // ── Validation ────────────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!form.name.trim())     e.name     = 'Name is required';
    if (!form.unit)            e.unit     = 'Unit is required';
    if (!form.category.trim()) e.category = 'Category is required';
    if (form.costPerUnit < 0)  e.costPerUnit = 'Cost cannot be negative';
    setFormErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        allergens: form.allergens.join(','),
      };
      if (editTarget) {
        await recipeService.updateIngredient(editTarget.id, payload);
        setSuccessMsg(`"${form.name}" updated successfully`);
      } else {
        await recipeService.createIngredient(payload);
        setSuccessMsg(`"${form.name}" added successfully`);
      }
      closeModal();
      load(search, catFilter);
    } catch (e) {
      const msg = e.response?.data?.message || e.response?.data || 'Save failed';
      setFormErrors({ submit: typeof msg === 'string' ? msg : 'Save failed' });
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await recipeService.deleteIngredient(deleteTarget.id);
      setSuccessMsg(`"${deleteTarget.name}" removed`);
      setDeleteTarget(null);
      load(search, catFilter);
    } catch {
      setApiError('Failed to delete ingredient');
      setDeleteTarget(null);
    }
  };

  const toggleAllergen = (a) => {
    setForm(f => ({
      ...f,
      allergens: f.allergens.includes(a)
        ? f.allergens.filter(x => x !== a)
        : [...f.allergens, a],
    }));
  };

  const catColor = (cat) => CATEGORY_COLORS[cat] || CATEGORY_COLORS.default;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="il-page">

      {/* ── Header ── */}
      <div className="il-header">
        <div>
          <h1 className="il-title"><Package size={22} /> Ingredients</h1>
          <p className="il-subtitle">
            Master ingredient library — costs, nutrition and allergens
          </p>
        </div>
        <div className="il-header-actions">
          <button className="il-btn-ghost" onClick={load} disabled={loading}>
            <RefreshCw size={15} className={loading ? 'il-spin' : ''} />
          </button>
          {canEditMasterData && (
            <button className="il-btn-primary" onClick={openCreate}>
              <Plus size={16} /> Add Ingredient
            </button>
          )}
        </div>
      </div>

      {/* ── Notifications ── */}
      {apiError && (
        <div className="il-banner error">
          <AlertTriangle size={15} />
          <span>{apiError}</span>
          <button onClick={() => setApiError(null)}>✕</button>
        </div>
      )}
      {successMsg && (
        <div className="il-banner success">
          <Check size={15} />
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)}>✕</button>
        </div>
      )}

      {/* ── Stats strip ── */}
      <div className="il-stats">
        <div className="il-stat-card">
          <Package size={20} />
          <div>
            <div className="il-stat-val">{ingredients.length}</div>
            <div className="il-stat-lbl">Total Ingredients</div>
          </div>
        </div>
        <div className="il-stat-card">
          <Filter size={20} />
          <div>
            <div className="il-stat-val">{categories.length}</div>
            <div className="il-stat-lbl">Categories</div>
          </div>
        </div>
        <div className="il-stat-card">
          <IndianRupee size={20} />
          <div>
            <div className="il-stat-val">
              ${ingredients.length > 0
                ? (ingredients.reduce((s, i) => s + parseFloat(i.costPerUnit || 0), 0) / ingredients.length).toFixed(2)
                : '0.00'}
            </div>
            <div className="il-stat-lbl">Avg Cost / Unit</div>
          </div>
        </div>
        <div className="il-stat-card">
          <AlertTriangle size={20} />
          <div>
            <div className="il-stat-val">
              {ingredients.filter(i => parseList(i.allergens).length > 0).length}
            </div>
            <div className="il-stat-lbl">With Allergens</div>
          </div>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="il-filters">
        <div className="il-search">
          <Search size={15} />
          <input
            placeholder="Search ingredients..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="il-clear-btn" onClick={() => setSearch('')}>
              <X size={13} />
            </button>
          )}
        </div>
        <div className="il-cat-filters">
          <button
            className={`il-cat-chip ${catFilter === 'all' ? 'active' : ''}`}
            onClick={() => setCatFilter('all')}
          >
            All
          </button>
          {categories.map(c => (
            <button
              key={c}
              className={`il-cat-chip ${catFilter === c ? 'active' : ''}`}
              style={catFilter === c ? { background: catColor(c).bg, color: catColor(c).color } : {}}
              onClick={() => setCatFilter(catFilter === c ? 'all' : c)}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table ── */}
      {loading && ingredients.length === 0 ? (
        <div className="il-loading">
          <RefreshCw size={24} className="il-spin" />
          <p>Loading ingredients...</p>
        </div>
      ) : ingredients.length === 0 ? (
        <div className="il-empty">
          <Package size={52} />
          <h3>No ingredients yet</h3>
          <p>Add your first ingredient to start building recipes with live costing</p>
          {canEditMasterData && (
            <button className="il-btn-primary" onClick={openCreate}>
              <Plus size={15} /> Add First Ingredient
            </button>
          )}
        </div>
      ) : (
        <div className="il-table-wrap">
          <table className="il-table">
            <thead>
              <tr>
                <th>Ingredient</th>
                <th>Category</th>
                <th>Unit</th>
                <th>Cost / Unit</th>
                <th>Nutrition (per unit)</th>
                <th>Allergens</th>
                {canEditMasterData && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {ingredients.map(ing => {
                const cc = catColor(ing.category);
                return (
                  <tr key={ing.id} className="il-row">
                    <td>
                      <div className="il-name-cell">
                        <div className="il-ing-avatar"
                          style={{ background: cc.bg, color: cc.color }}>
                          {ing.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="il-ing-name">{ing.name}</div>
                          <div className="il-ing-id">ID: {ing.id}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="il-cat-badge"
                        style={{ background: cc.bg, color: cc.color }}>
                        {ing.category}
                      </span>
                    </td>
                    <td>
                      <span className="il-unit-badge">{ing.unit}</span>
                    </td>
                    <td>
                      <span className="il-cost">
                        <IndianRupee size={12} />
                        {parseFloat(ing.costPerUnit || 0).toFixed(2)}
                      </span>
                    </td>
                    <td>
                      <div className="il-nutrition-chips">
                        {ing.caloriesPerUnit > 0 && (
                          <span className="il-nut-chip cal">
                            <Flame size={9} /> {ing.caloriesPerUnit} kcal
                          </span>
                        )}
                        {ing.proteinPerUnit > 0 && (
                          <span className="il-nut-chip pro">
                            P: {ing.proteinPerUnit}g
                          </span>
                        )}
                        {ing.carbsPerUnit > 0 && (
                          <span className="il-nut-chip carb">
                            C: {ing.carbsPerUnit}g
                          </span>
                        )}
                        {ing.fatPerUnit > 0 && (
                          <span className="il-nut-chip fat">
                            F: {ing.fatPerUnit}g
                          </span>
                        )}
                        {!ing.caloriesPerUnit && !ing.proteinPerUnit && !ing.carbsPerUnit && !ing.fatPerUnit && (
                          <span className="il-nut-none">—</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="il-allergen-list">
                        {parseList(ing.allergens).length === 0
                          ? <span className="il-no-allergen">None</span>
                          : parseList(ing.allergens).map((a, i) => (
                              <span key={i} className="il-allergen-chip">{a}</span>
                            ))
                        }
                      </div>
                    </td>
                    {canEditMasterData && (
                      <td>
                        <div className="il-actions">
                          <button
                            className="il-action-btn"
                            title="Edit"
                            onClick={() => openEdit(ing)}
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            className="il-action-btn danger"
                            title="Delete"
                            onClick={() => setDeleteTarget(ing)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="il-table-footer">
            Showing {ingredients.length} ingredient{ingredients.length !== 1 ? 's' : ''}
            {catFilter !== 'all' && ` in ${catFilter}`}
            {search && ` matching "${search}"`}
          </div>
        </div>
      )}

      {/* ── Create / Edit Modal ── */}
      {modalOpen && (
        <div className="il-overlay" onClick={closeModal}>
          <div className="il-modal" onClick={e => e.stopPropagation()}>

            {/* Modal header */}
            <div className="il-modal-header">
              <div className="il-modal-title-row">
                <div className="il-modal-icon">
                  {editTarget ? <Edit2 size={20} /> : <Plus size={20} />}
                </div>
                <div>
                  <h2 className="il-modal-title">
                    {editTarget ? 'Edit Ingredient' : 'Add New Ingredient'}
                  </h2>
                  <p className="il-modal-subtitle">
                    {editTarget
                      ? `Editing "${editTarget.name}"`
                      : 'Fill in the details below'}
                  </p>
                </div>
              </div>
              <button className="il-modal-close" onClick={closeModal}>
                <X size={18} />
              </button>
            </div>

            {/* Submit error */}
            {formErrors.submit && (
              <div className="il-form-error-banner">
                <AlertTriangle size={14} /> {formErrors.submit}
              </div>
            )}

            <div className="il-modal-body">

              {/* ── Section: Basic Info ── */}
              <div className="il-form-section">
                <h4 className="il-form-section-title">Basic Information</h4>
                <div className="il-form-grid-2">
                  <div className="il-field il-field-full">
                    <label>Ingredient Name *</label>
                    <input
                      className={formErrors.name ? 'err' : ''}
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="e.g. Fresh Tomatoes"
                    />
                    {formErrors.name && (
                      <span className="il-field-err">{formErrors.name}</span>
                    )}
                  </div>

                  <div className="il-field">
                    <label>Category *</label>
                    <select
                      className={formErrors.category ? 'err' : ''}
                      value={form.category}
                      onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    >
                      <option value="">Select category</option>
                      {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                    {formErrors.category && (
                      <span className="il-field-err">{formErrors.category}</span>
                    )}
                  </div>

                  <div className="il-field">
                    <label>Unit of Measure *</label>
                    <select
                      className={formErrors.unit ? 'err' : ''}
                      value={form.unit}
                      onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                    >
                      {UNITS.map(u => (
                        <option key={u.value} value={u.value}>{u.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="il-field">
                    <label>Cost per Unit (₹ / $) *</label>
                    <div className="il-input-prefix">
                      <IndianRupee size={14} />
                      <input
                        type="number" min="0" step="0.01"
                        className={formErrors.costPerUnit ? 'err' : ''}
                        value={form.costPerUnit}
                        onChange={e => setForm(f => ({
                          ...f, costPerUnit: parseFloat(e.target.value) || 0,
                        }))}
                        placeholder="0.00"
                      />
                    </div>
                    {formErrors.costPerUnit && (
                      <span className="il-field-err">{formErrors.costPerUnit}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Section: Nutrition ── */}
              <div className="il-form-section">
                <h4 className="il-form-section-title">
                  Nutrition Values
                  <span className="il-section-hint">per {form.unit || 'unit'}</span>
                </h4>
                <div className="il-form-grid-5">
                  {[
                    { key: 'caloriesPerUnit', label: 'Calories', unit: 'kcal', color: '#0061d2' },
                    { key: 'proteinPerUnit',  label: 'Protein',  unit: 'g',    color: '#10b981' },
                    { key: 'carbsPerUnit',    label: 'Carbs',    unit: 'g',    color: '#3b82f6' },
                    { key: 'fatPerUnit',      label: 'Fat',      unit: 'g',    color: '#f59e0b' },
                    { key: 'fiberPerUnit',    label: 'Fiber',    unit: 'g',    color: '#0061d2' },
                  ].map(n => (
                    <div key={n.key} className="il-field">
                      <label style={{ color: n.color }}>
                        {n.label} ({n.unit})
                      </label>
                      <input
                        type="number" min="0" step="0.1"
                        value={form[n.key]}
                        onChange={e => setForm(f => ({
                          ...f, [n.key]: parseFloat(e.target.value) || 0,
                        }))}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Section: Allergens ── */}
              <div className="il-form-section">
                <h4 className="il-form-section-title">Allergens</h4>
                <div className="il-allergen-picker">
                  {ALLERGEN_OPTIONS.map(a => (
                    <button
                      key={a}
                      type="button"
                      className={`il-allergen-btn ${form.allergens.includes(a) ? 'active' : ''}`}
                      onClick={() => toggleAllergen(a)}
                    >
                      {form.allergens.includes(a) && <Check size={11} />}
                      {a}
                    </button>
                  ))}
                </div>
                {form.allergens.length > 0 && (
                  <div className="il-allergen-selected">
                    Selected: <strong>{form.allergens.join(', ')}</strong>
                  </div>
                )}
              </div>
            </div>

            {/* Modal footer */}
            <div className="il-modal-footer">
              <button className="il-btn-ghost" onClick={closeModal} disabled={saving}>
                Cancel
              </button>
              <button className="il-btn-primary" onClick={handleSave} disabled={saving}>
                {saving
                  ? <><RefreshCw size={14} className="il-spin" /> Saving...</>
                  : <><Save size={14} /> {editTarget ? 'Update' : 'Add'} Ingredient</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ── */}
      {deleteTarget && (
        <div className="il-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="il-confirm" onClick={e => e.stopPropagation()}>
            <div className="il-confirm-icon"><Trash2 size={26} /></div>
            <h3>Delete Ingredient</h3>
            <p>
              Delete <strong>"{deleteTarget.name}"</strong>?
              Any recipes using this ingredient will lose their costing data.
            </p>
            <div className="il-confirm-actions">
              <button className="il-btn-ghost" onClick={() => setDeleteTarget(null)}>
                Cancel
              </button>
              <button className="il-btn-danger" onClick={handleDelete}>
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Styles ── */}
      <style>{`
        /* Page */
        .il-page { max-width:1200px; }

        /* Header */
        .il-header { display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px; }
        .il-title { display:flex;align-items:center;gap:8px;font-size:20px;font-weight:700;color:#1f2937;margin:0 0 4px; }
        .il-subtitle { font-size:13px;color:#6b7280;margin:0; }
        .il-header-actions { display:flex;gap:8px;align-items:center; }

        /* Buttons */
        .il-btn-primary { display:flex;align-items:center;gap:6px;padding:8px 16px;background:#e8f0fd;border:1px solid #b3ccf5;color:#0052b3;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;transition:all .15s;white-space:nowrap; }
        .il-btn-primary:hover:not(:disabled) { background:#d4e4fb; }
        .il-btn-primary:disabled { opacity:.6;cursor:not-allowed; }
        .il-btn-ghost { display:flex;align-items:center;gap:6px;padding:8px 14px;background:#f0f2f7;border:1px solid #e2e6ef;border-radius:8px;font-size:13px;color:#374151;cursor:pointer;transition:all .15s; }
        .il-btn-ghost:hover:not(:disabled) { background:#e2e6ef; }
        .il-btn-ghost:disabled { opacity:.5;cursor:not-allowed; }
        .il-btn-danger { padding:8px 16px;background:#ef4444;color:#0052b3;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;transition:all .15s; }
        .il-btn-danger:hover { background:#dc2626; }

        /* Banners */
        .il-banner { display:flex;align-items:center;gap:8px;padding:10px 14px;border-radius:8px;font-size:13px;margin-bottom:16px; }
        .il-banner button { margin-left:auto;background:none;border:none;cursor:pointer;font-size:15px;opacity:.7; }
        .il-banner.error { background:#fef2f2;border:1px solid #fecaca;color:#dc2626; }
        .il-banner.error button { color:#dc2626; }
        .il-banner.success { background:#f0fdf4;border:1px solid #bbf7d0;color:#15803d; }
        .il-banner.success button { color:#15803d; }

        /* Stats */
        .il-stats { display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px; }
        @media(max-width:700px) { .il-stats { grid-template-columns:repeat(2,1fr); } }
        .il-stat-card { background:#fff;border-radius:12px;border:1px solid #e5e7eb;padding:14px 16px;display:flex;align-items:center;gap:12px; }
        .il-stat-card svg { color:#0061d2;flex-shrink:0; }
        .il-stat-val { font-size:22px;font-weight:800;color:#1f2937;line-height:1; }
        .il-stat-lbl { font-size:11px;color:#9ca3af;margin-top:2px; }

        /* Filters */
        .il-filters { display:flex;flex-direction:column;gap:10px;margin-bottom:16px; }
        .il-search { display:flex;align-items:center;gap:8px;padding:9px 12px;background:#fff;border:1px solid #e5e7eb;border-radius:8px;max-width:400px; }
        .il-search:focus-within { border-color:#0061d2;box-shadow:0 0 0 3px rgba(0,97,210,.1); }
        .il-search input { border:none;outline:none;font-size:13px;color:#1f2937;flex:1;background:transparent; }
        .il-clear-btn { background:none;border:none;cursor:pointer;color:#9ca3af;display:flex;padding:0; }
        .il-cat-filters { display:flex;gap:6px;flex-wrap:wrap; }
        .il-cat-chip { padding:5px 12px;background:#f1f5f9;border:1px solid #e5e7eb;border-radius:20px;font-size:12px;font-weight:500;color:#64748b;cursor:pointer;transition:all .15s; }
        .il-cat-chip:hover { border-color:#d1d5db;color:#374151; }
        .il-cat-chip.active { background:#e8f0fd;border-color:#0061d2;color:#0061d2;font-weight:600; }

        /* Table */
        .il-table-wrap { background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden; }
        .il-table { width:100%;border-collapse:collapse; }
        .il-table thead tr { background:#f8fafc;border-bottom:1px solid #e5e7eb; }
        .il-table th { padding:11px 14px;text-align:left;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;white-space:nowrap; }
        .il-row { border-bottom:1px solid #f1f5f9;transition:background .1s; }
        .il-row:last-child { border-bottom:none; }
        .il-row:hover { background:#fafafa; }
        .il-table td { padding:12px 14px;vertical-align:middle; }

        .il-name-cell { display:flex;align-items:center;gap:10px; }
        .il-ing-avatar { width:34px;height:34px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;flex-shrink:0; }
        .il-ing-name { font-size:13px;font-weight:600;color:#1f2937; }
        .il-ing-id { font-size:11px;color:#d1d5db; }

        .il-cat-badge { font-size:11px;font-weight:600;padding:3px 8px;border-radius:20px; }
        .il-unit-badge { font-size:12px;font-weight:600;padding:3px 8px;background:#f1f5f9;color:#475569;border-radius:6px; }
        .il-cost { display:inline-flex;align-items:center;gap:2px;font-size:14px;font-weight:700;color:#1f2937; }

        .il-nutrition-chips { display:flex;gap:4px;flex-wrap:wrap; }
        .il-nut-chip { display:inline-flex;align-items:center;gap:2px;font-size:10px;font-weight:600;padding:2px 6px;border-radius:4px; }
        .il-nut-chip.cal  { background:#e8f0fd;color:#0052b3; }
        .il-nut-chip.pro  { background:#f0fdf4;color:#15803d; }
        .il-nut-chip.carb { background:#eff6ff;color:#1d4ed8; }
        .il-nut-chip.fat  { background:#fefce8;color:#a16207; }
        .il-nut-none { font-size:12px;color:#d1d5db; }

        .il-allergen-list { display:flex;gap:4px;flex-wrap:wrap; }
        .il-allergen-chip { font-size:10px;font-weight:600;padding:2px 6px;background:#fef2f2;color:#b91c1c;border-radius:4px; }
        .il-no-allergen { font-size:12px;color:#d1d5db; }

        .il-actions { display:flex;gap:4px; }
        .il-action-btn { width:28px;height:28px;display:flex;align-items:center;justify-content:center;background:#f0f2f7;border:1px solid #e2e6ef;border-radius:6px;cursor:pointer;color:#6b7280;transition:all .15s; }
        .il-action-btn:hover { background:rgba(0,97,210,.1);color:#0061d2;border-color:rgba(0,97,210,.15); }
        .il-action-btn.danger:hover { background:rgba(239,68,68,.1);color:#ef4444;border-color:rgba(239,68,68,.2); }

        .il-table-footer { padding:10px 14px;font-size:12px;color:#9ca3af;border-top:1px solid #f1f5f9; }

        /* Empty / Loading */
        .il-loading,.il-empty { display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:60px;color:#9ca3af;text-align:center;background:#fff;border-radius:12px;border:1px solid #e5e7eb; }
        .il-empty h3 { font-size:18px;font-weight:600;color:#374151;margin:0; }
        .il-empty p { font-size:14px;margin:0;max-width:360px; }

        /* ── Modal ── */
        .il-overlay { position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;z-index:1000;padding:16px; }
        .il-modal { background:#fff;border-radius:20px;width:100%;max-width:680px;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(0,0,0,.2);overflow:hidden; }

        .il-modal-header { display:flex;align-items:flex-start;justify-content:space-between;padding:24px 24px 0;flex-shrink:0; }
        .il-modal-title-row { display:flex;align-items:center;gap:14px; }
        .il-modal-icon { width:44px;height:44px;background:rgba(0,97,210,.1);border-radius:12px;display:flex;align-items:center;justify-content:center;color:#0061d2;flex-shrink:0; }
        .il-modal-title { font-size:18px;font-weight:700;color:#1f2937;margin:0 0 2px; }
        .il-modal-subtitle { font-size:13px;color:#9ca3af;margin:0; }
        .il-modal-close { width:32px;height:32px;background:#f0f2f7;border:none;border-radius:8px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#6b7280;transition:all .15s;flex-shrink:0; }
        .il-modal-close:hover { background:#d8dde8;color:#1f2937; }

        .il-form-error-banner { display:flex;align-items:center;gap:8px;padding:10px 24px;background:#fef2f2;color:#dc2626;font-size:13px;border-top:1px solid #fecaca;margin-top:12px; }

        .il-modal-body { flex:1;overflow-y:auto;padding:20px 24px; }
        .il-form-section { margin-bottom:24px; }
        .il-form-section:last-child { margin-bottom:0; }
        .il-form-section-title { font-size:12px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.6px;margin:0 0 14px;display:flex;align-items:center;gap:8px; }
        .il-section-hint { font-size:11px;font-weight:400;text-transform:none;letter-spacing:0;color:#cbd5e1; }

        .il-form-grid-2 { display:grid;grid-template-columns:1fr 1fr;gap:14px; }
        .il-form-grid-5 { display:grid;grid-template-columns:repeat(5,1fr);gap:12px; }
        @media(max-width:600px) {
          .il-form-grid-2 { grid-template-columns:1fr; }
          .il-form-grid-5 { grid-template-columns:repeat(3,1fr); }
        }
        .il-field-full { grid-column:1/-1; }

        .il-field { display:flex;flex-direction:column;gap:5px; }
        .il-field label { font-size:12px;font-weight:600;color:#374151; }
        .il-field input, .il-field select { padding:8px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;color:#1f2937;background:#fff;outline:none;transition:border .15s;width:100%;box-sizing:border-box;font-family:inherit; }
        .il-field input:focus, .il-field select:focus { border-color:#0061d2;box-shadow:0 0 0 3px rgba(0,97,210,.1); }
        .il-field input.err, .il-field select.err { border-color:#ef4444; }
        .il-field-err { font-size:11px;color:#ef4444; }

        .il-input-prefix { display:flex;align-items:center;gap:6px;padding:8px 12px;border:1px solid #e5e7eb;border-radius:8px;background:#fff;transition:border .15s; }
        .il-input-prefix:focus-within { border-color:#0061d2;box-shadow:0 0 0 3px rgba(0,97,210,.1); }
        .il-input-prefix svg { color:#9ca3af;flex-shrink:0; }
        .il-input-prefix input { border:none;outline:none;font-size:13px;color:#1f2937;flex:1;background:transparent;padding:0;width:100%; }
        .il-input-prefix input.err { border:none; }

        .il-allergen-picker { display:flex;flex-wrap:wrap;gap:8px; }
        .il-allergen-btn { display:flex;align-items:center;gap:4px;padding:6px 12px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:20px;font-size:12px;font-weight:500;color:#64748b;cursor:pointer;transition:all .15s; }
        .il-allergen-btn:hover { border-color:#fca5a5;color:#b91c1c; }
        .il-allergen-btn.active { background:#fef2f2;border-color:#f87171;color:#b91c1c;font-weight:600; }
        .il-allergen-selected { font-size:12px;color:#6b7280;margin-top:10px; }
        .il-allergen-selected strong { color:#b91c1c; }

        .il-modal-footer { display:flex;align-items:center;justify-content:flex-end;gap:10px;padding:16px 24px;border-top:1px solid #f1f5f9;flex-shrink:0; }

        /* Confirm dialog */
        .il-confirm { background:#fff;border-radius:16px;padding:32px;max-width:400px;width:90%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.2); }
        .il-confirm-icon { width:56px;height:56px;background:rgba(239,68,68,.1);border-radius:50%;display:flex;align-items:center;justify-content:center;color:#ef4444;margin:0 auto 16px; }
        .il-confirm h3 { font-size:18px;font-weight:700;color:#1f2937;margin:0 0 8px; }
        .il-confirm p { font-size:14px;color:#6b7280;margin:0 0 24px;line-height:1.6; }
        .il-confirm-actions { display:flex;gap:12px;justify-content:center; }

        .il-spin { animation:il-spin .8s linear infinite; }
        @keyframes il-spin { to { transform:rotate(360deg); } }
      `}</style>
    </div>
  );
};

// Backend returns allergens as comma-separated string — normalise to array
const parseList = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) return val.filter(Boolean);
  return String(val).split(',').map(s => s.trim()).filter(Boolean);
};


export default IngredientList;