import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  TrendingUp, AlertTriangle, CheckCircle, RefreshCw,
  Package, ArrowLeft, Download, ShoppingCart,
  Search, X, ChevronDown,
} from 'lucide-react';
import mealPlanService from '../../../services/mealPlanService';
import mealPlanSvc     from '../../../services/mealPlanService';
import procurementService from '../../../services/procurementService';
import useBranch       from '../../../hooks/useBranch';

const IngredientForecast = () => {
  const navigate          = useNavigate();
  const [searchParams]    = useSearchParams();
  const { branchId }      = useBranch();

  const planIdFromUrl     = searchParams.get('planId');

  const [plans,     setPlans]     = useState([]);
  const [planId,    setPlanId]    = useState(planIdFromUrl || '');
  const [forecast,  setForecast]  = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);
  const [filter,    setFilter]    = useState('all'); // all | shortage | sufficient
  const [search,    setSearch]    = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [indentLoading, setIndentLoading] = useState(false);
  const [indentSuccess, setIndentSuccess] = useState(null);

  // Load available plans for selector
  useEffect(() => {
    mealPlanSvc.getAll({ branchId }).then(({ data }) => setPlans(data || [])).catch(() => {});
  }, [branchId]);

  // Auto-load if planId in URL or when planId changes
  const loadForecast = useCallback(async () => {
    if (!planId) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await mealPlanService.getForecast(planId, branchId);
      setForecast(data);
    } catch (e) {
      setError(e.response?.data || 'Failed to load forecast');
    } finally {
      setLoading(false);
    }
  }, [planId, branchId]);

  useEffect(() => { loadForecast(); }, [loadForecast]);

  // ── Auto-generate Material Indent from shortage list ──────────────────────
  const handleAutoIndent = async () => {
    if (!forecast || !forecast.shortages || forecast.shortages.length === 0) return;
    setIndentLoading(true);
    setError(null);
    try {
      await procurementService.createIndent({
        notes: `Auto-generated from Meal Plan forecast — Week ${forecast.weekNumber}, ${forecast.year}`,
        items: forecast.shortages.map(s => ({
          ingredientId: s.ingredientId,
          quantity:     parseFloat(s.shortfallQuantity.toFixed(3)),
          notes:        `Shortfall for week ${forecast.weekNumber}`,
        })),
      }, branchId);
      setIndentSuccess(`Indent raised for ${forecast.shortages.length} item(s) — check Procurement → Material Indents`);
      setTimeout(() => setIndentSuccess(null), 5000);
    } catch (e) {
      setError(e.response?.data || 'Failed to create indent');
    } finally {
      setIndentLoading(false);
    }
  };

  // ── Export as CSV ──────────────────────────────────────────────────────────
  const exportCsv = () => {
    if (!forecast) return;
    const rows = [
      ['Ingredient', 'Category', 'Unit', 'Required', 'Current Stock', 'Shortfall', 'Unit Cost', 'Total Cost', 'Status'],
      ...forecast.ingredients.map(i => [
        i.ingredientName, i.category, i.unit,
        i.requiredQuantity, i.currentStock, i.shortfallQuantity,
        i.unitCost, i.totalCost,
        i.sufficient ? 'Sufficient' : 'SHORTAGE',
      ]),
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `forecast-week${forecast.weekNumber}-${forecast.year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Filtered ingredients ───────────────────────────────────────────────────
  const ingredients = (forecast?.ingredients || []).filter(i => {
    if (filter === 'shortage'  && i.sufficient)  return false;
    if (filter === 'sufficient' && !i.sufficient) return false;
    if (search && !i.ingredientName.toLowerCase().includes(search.toLowerCase())) return false;
    if (catFilter !== 'all' && i.category !== catFilter) return false;
    return true;
  });

  const categories = [...new Set((forecast?.ingredients || []).map(i => i.category).filter(Boolean))];
  const shortageCount = (forecast?.shortages || []).length;
  const totalIngredients = (forecast?.ingredients || []).length;

  return (
    <div className="if-page">
      <style>{css}</style>

      {/* Header */}
      <div className="if-header">
        <button className="if-btn-ghost" onClick={() => navigate('/fooderp/meal-planning/weekly')}>
          <ArrowLeft size={14} /> Back to Planner
        </button>
        <div className="if-title-wrap">
          <div className="if-title-icon"><TrendingUp size={18} /></div>
          <div>
            <h2 className="if-title">Ingredient Forecast</h2>
            <div className="if-subtitle">Stock requirements for the week</div>
          </div>
        </div>
        <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
          {forecast && (
            <>
              <button className="if-btn-ghost" onClick={exportCsv}>
                <Download size={13} /> Export CSV
              </button>
              {shortageCount > 0 && (
                <button
                  className="if-btn-warning"
                  onClick={handleAutoIndent}
                  disabled={indentLoading}
                >
                  <ShoppingCart size={13} />
                  {indentLoading ? 'Raising...' : `Raise Indent (${shortageCount})`}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Plan selector */}
      <div className="if-plan-row">
        <label className="if-label">Select Meal Plan</label>
        <div className="if-select-wrap">
          <select
            className="if-select"
            value={planId}
            onChange={e => setPlanId(e.target.value)}
          >
            <option value="">— Choose a plan —</option>
            {plans.map(p => (
              <option key={p.id} value={p.id}>
                {p.planName} (Week {p.weekNumber}, {p.year})
                {p.branchName !== 'HQ Template' ? ` — ${p.branchName}` : ' — HQ Template'}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="if-select-icon" />
        </div>
        <button className="if-btn-outline" onClick={loadForecast} disabled={!planId || loading}>
          <RefreshCw size={13} className={loading ? 'spin' : ''} /> Calculate
        </button>
      </div>

      {error && (
        <div className="if-error"><AlertTriangle size={14} />{error}</div>
      )}

      {indentSuccess && (
        <div className="if-success"><CheckCircle size={14} />{indentSuccess}</div>
      )}

      {loading && (
        <div className="if-loading"><RefreshCw size={20} className="spin" /> Calculating forecast...</div>
      )}

      {forecast && !loading && (
        <>
          {/* Summary cards */}
          <div className="if-summary">
            <div className="if-sum-card">
              <div className="if-sum-label">Total Ingredients</div>
              <div className="if-sum-val">{totalIngredients}</div>
              <div className="if-sum-sub">needed this week</div>
            </div>
            <div className={`if-sum-card ${shortageCount > 0 ? 'danger' : 'ok'}`}>
              <div className="if-sum-label">Shortages</div>
              <div className="if-sum-val" style={{ color: shortageCount > 0 ? '#f87171' : '#34d399' }}>
                {shortageCount}
              </div>
              <div className="if-sum-sub">{shortageCount > 0 ? 'need to procure' : 'all stocked'}</div>
            </div>
            <div className="if-sum-card">
              <div className="if-sum-label">Estimated Cost</div>
              <div className="if-sum-val">₹{Number(forecast.totalEstimatedCost || 0).toFixed(0)}</div>
              <div className="if-sum-sub">ingredient cost</div>
            </div>
            <div className="if-sum-card ok">
              <div className="if-sum-label">Sufficient</div>
              <div className="if-sum-val" style={{ color:'#34d399' }}>
                {totalIngredients - shortageCount}
              </div>
              <div className="if-sum-sub">in stock</div>
            </div>
          </div>

          {/* Shortage banner */}
          {shortageCount > 0 && (
            <div className="if-shortage-banner">
              <AlertTriangle size={16} />
              <div>
                <strong>{shortageCount} ingredient(s) need procurement</strong>
                <div style={{ fontSize:12, marginTop:2, opacity:.8 }}>
                  {forecast.shortages.map(s => s.ingredientName).join(', ')}
                </div>
              </div>
            </div>
          )}

          {/* Toolbar */}
          <div className="if-toolbar">
            <div className="if-search">
              <Search size={13} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search ingredient..."
              />
              {search && <button onClick={() => setSearch('')}><X size={12}/></button>}
            </div>
            <div className="if-filter-group">
              {['all','shortage','sufficient'].map(f => (
                <button
                  key={f}
                  className={`if-filter-btn ${filter === f ? 'active' : ''}`}
                  onClick={() => setFilter(f)}
                >
                  {f === 'all' ? 'All' : f === 'shortage' ? `⚠ Shortage (${shortageCount})` : '✓ Sufficient'}
                </button>
              ))}
            </div>
            {categories.length > 1 && (
              <div className="if-select-wrap" style={{ minWidth:140 }}>
                <select className="if-select" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
                  <option value="all">All Categories</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <ChevronDown size={12} className="if-select-icon" />
              </div>
            )}
          </div>

          {/* Table */}
          <div className="if-table-wrap">
            <table className="if-table">
              <thead>
                <tr>
                  <th className="if-th">Ingredient</th>
                  <th className="if-th">Category</th>
                  <th className="if-th">Required</th>
                  <th className="if-th">In Stock</th>
                  <th className="if-th">Shortfall</th>
                  <th className="if-th">Stock Level</th>
                  <th className="if-th">Unit Cost</th>
                  <th className="if-th">Total Cost</th>
                  <th className="if-th">Status</th>
                </tr>
              </thead>
              <tbody>
                {ingredients.map(ing => {
                  const pct = ing.requiredQuantity > 0
                    ? Math.min(100, (ing.currentStock / ing.requiredQuantity) * 100)
                    : 100;
                  return (
                    <tr key={ing.ingredientId} className={`if-tr ${!ing.sufficient ? 'shortage-row' : ''}`}>
                      <td className="if-td">
                        <div className="if-ing-name">
                          <Package size={12} style={{ color: ing.sufficient ? '#34d399' : '#f87171', flexShrink:0 }} />
                          {ing.ingredientName}
                        </div>
                      </td>
                      <td className="if-td">
                        <span className="if-cat-chip">{ing.category}</span>
                      </td>
                      <td className="if-td if-num">
                        {Number(ing.requiredQuantity).toFixed(3)} <span className="if-unit">{ing.unit}</span>
                      </td>
                      <td className="if-td if-num">
                        {Number(ing.currentStock).toFixed(3)} <span className="if-unit">{ing.unit}</span>
                      </td>
                      <td className="if-td if-num">
                        {ing.sufficient ? (
                          <span style={{ color:'#34d399' }}>—</span>
                        ) : (
                          <span style={{ color:'#f87171', fontWeight:700 }}>
                            -{Number(ing.shortfallQuantity).toFixed(3)} {ing.unit}
                          </span>
                        )}
                      </td>
                      <td className="if-td">
                        <div className="if-bar-track">
                          <div
                            className={`if-bar-fill ${ing.sufficient ? 'ok' : 'bad'}`}
                            style={{ width:`${pct}%` }}
                          />
                        </div>
                        <div className="if-bar-pct" style={{ color: ing.sufficient ? '#34d399' : '#f87171' }}>
                          {pct.toFixed(0)}%
                        </div>
                      </td>
                      <td className="if-td if-num">₹{Number(ing.unitCost || 0).toFixed(2)}</td>
                      <td className="if-td if-num" style={{ color:'#3385e0', fontWeight:600 }}>
                        ₹{Number(ing.totalCost || 0).toFixed(2)}
                      </td>
                      <td className="if-td">
                        {ing.sufficient ? (
                          <span className="if-badge ok"><CheckCircle size={11} /> Sufficient</span>
                        ) : (
                          <span className="if-badge bad"><AlertTriangle size={11} /> Shortage</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {ingredients.length === 0 && (
              <div className="if-empty">No ingredients match filters</div>
            )}
          </div>
        </>
      )}

      {!planId && !loading && (
        <div className="if-empty-state">
          <TrendingUp size={48} />
          <h3>Select a meal plan</h3>
          <p>Choose a meal plan above to calculate ingredient requirements</p>
        </div>
      )}
    </div>
  );
};

const css = `
  .if-page { font-family:'DM Sans',sans-serif; color:#1f2937; }
  .if-header { display:flex; align-items:center; gap:12px; margin-bottom:20px; flex-wrap:wrap; }
  .if-title-wrap { display:flex; align-items:center; gap:12px; }
  .if-title-icon { width:38px; height:38px; background:rgba(16,185,129,.12); border-radius:10px; display:flex; align-items:center; justify-content:center; color:#34d399; }
  .if-title    { font-size:20px; font-weight:700; color:#1f2937; margin:0 0 2px; }
  .if-subtitle { font-size:12px; color:#9aa3b4; }

  .if-btn-ghost   { display:flex; align-items:center; gap:6px; padding:8px 13px; background:#f0f2f7; border:1px solid #e2e6ef; border-radius:9px; color:#374151; font-size:13px; cursor:pointer; transition:all .15s; white-space:nowrap; }
  .if-btn-ghost:hover { background:#e8ebf2; color:#1f2937; }
  .if-btn-outline { display:flex; align-items:center; gap:6px; padding:8px 13px; background:transparent; border:1px solid #e2e6ef; border-radius:9px; color:#4b5263; font-size:13px; cursor:pointer; transition:all .15s; white-space:nowrap; }
  .if-btn-outline:hover:not(:disabled) { background:#e2e6ef; color:#0052b3; }
  .if-btn-outline:disabled { opacity:.4; cursor:not-allowed; }
  .if-btn-warning { display:flex; align-items:center; gap:6px; padding:8px 13px; background:rgba(245,158,11,.15); border:1px solid rgba(245,158,11,.3); border-radius:9px; color:#fbbf24; font-size:13px; font-weight:600; cursor:pointer; transition:all .15s; white-space:nowrap; }
  .if-btn-warning:hover { background:rgba(245,158,11,.25); }

  .if-plan-row { display:flex; align-items:center; gap:10px; margin-bottom:16px; flex-wrap:wrap; }
  .if-label    { font-size:12px; font-weight:600; color:#9aa3b4; text-transform:uppercase; letter-spacing:.4px; white-space:nowrap; }
  .if-select-wrap { position:relative; }
  .if-select   { appearance:none; background:#f0f2f7; border:1px solid #e2e6ef; border-radius:9px; padding:8px 32px 8px 12px; color:#1f2937; font-size:13px; outline:none; cursor:pointer; min-width:260px; }
  .if-select:focus { border-color:#0061d2; }
  .if-select-icon { position:absolute; right:10px; top:50%; transform:translateY(-50%); color:#9aa3b4; pointer-events:none; }

  .if-error   { display:flex; align-items:center; gap:8px; background:rgba(239,68,68,.1); border:1px solid rgba(239,68,68,.25); border-radius:10px; padding:11px 14px; color:#fca5a5; font-size:13px; margin-bottom:14px; }
  .if-success { display:flex; align-items:center; gap:8px; background:rgba(16,185,129,.1); border:1px solid rgba(16,185,129,.25); border-radius:10px; padding:11px 14px; color:#6ee7b7; font-size:13px; margin-bottom:14px; }
  .if-loading { text-align:center; padding:40px; color:#9aa3b4; display:flex; align-items:center; justify-content:center; gap:8px; }

  .if-summary { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-bottom:16px; }
  @media(max-width:700px) { .if-summary { grid-template-columns:1fr 1fr; } }
  .if-sum-card { background:#ffffff; border:1px solid #e2e6ef; border-radius:14px; padding:16px 18px; }
  .if-sum-card.danger { border-color:rgba(239,68,68,.2); background:rgba(239,68,68,.06); }
  .if-sum-card.ok     { border-color:rgba(16,185,129,.2); background:rgba(16,185,129,.05); }
  .if-sum-label { font-size:11px; font-weight:600; letter-spacing:.5px; text-transform:uppercase; color:#9aa3b4; margin-bottom:8px; }
  .if-sum-val   { font-size:26px; font-weight:800; color:#1f2937; }
  .if-sum-sub   { font-size:11px; color:#9aa3b4; margin-top:2px; }

  .if-shortage-banner { display:flex; align-items:flex-start; gap:10px; background:rgba(239,68,68,.1); border:1px solid rgba(239,68,68,.25); border-radius:12px; padding:14px 16px; color:#fca5a5; font-size:13px; margin-bottom:16px; }

  .if-toolbar { display:flex; gap:10px; margin-bottom:14px; flex-wrap:wrap; align-items:center; }
  .if-search  { display:flex; align-items:center; gap:8px; background:#f8f9fc; border:1px solid #e2e6ef; border-radius:9px; padding:0 12px; flex:1; min-width:180px; }
  .if-search input { background:none; border:none; outline:none; color:#1f2937; font-size:13px; width:100%; padding:8px 0; }
  .if-search input::placeholder { color:#9aa3b4; }
  .if-search button { background:none; border:none; cursor:pointer; color:#9aa3b4; display:flex; }
  .if-filter-group { display:flex; gap:4px; }
  .if-filter-btn { padding:7px 12px; background:#ffffff; border:1px solid #e2e6ef; border-radius:8px; color:#9aa3b4; font-size:12px; cursor:pointer; transition:all .15s; white-space:nowrap; }
  .if-filter-btn:hover { background:#e2e6ef; color:#1f2937; }
  .if-filter-btn.active { background:rgba(0,97,210,.12); border-color:rgba(0,97,210,.2); color:#3385e0; }

  .if-table-wrap { background:#ffffff; border:1px solid #e2e6ef; border-radius:14px; overflow:hidden; overflow-x:auto; }
  .if-table { width:100%; border-collapse:collapse; min-width:860px; }
  .if-th    { padding:10px 14px; font-size:11px; font-weight:700; letter-spacing:.5px; text-transform:uppercase; color:#9aa3b4; text-align:left; border-bottom:1px solid #e2e6ef; white-space:nowrap; background:#fafbfc; }
  .if-td    { padding:11px 14px; font-size:13px; color:#9aa3b4; border-bottom:1px solid #f0f2f7; vertical-align:middle; }
  .if-tr:last-child .if-td { border-bottom:none; }
  .if-tr:hover .if-td { background:#fafbfc; }
  .if-tr.shortage-row .if-td { background:rgba(239,68,68,.03); }
  .if-ing-name { display:flex; align-items:center; gap:7px; font-weight:600; color:#1f2937; }
  .if-num  { font-variant-numeric:tabular-nums; }
  .if-unit { font-size:11px; color:#9aa3b4; }
  .if-cat-chip { font-size:10.5px; font-weight:600; padding:2px 7px; background:#e2e6ef; border-radius:4px; color:#9aa3b4; }
  .if-bar-track { height:5px; background:#e2e6ef; border-radius:3px; overflow:hidden; width:80px; margin-bottom:3px; }
  .if-bar-fill  { height:100%; border-radius:3px; transition:width .4s; }
  .if-bar-fill.ok  { background:#34d399; }
  .if-bar-fill.bad { background:#f87171; }
  .if-bar-pct { font-size:10px; font-weight:700; }
  .if-badge { display:inline-flex; align-items:center; gap:4px; font-size:11px; font-weight:700; padding:3px 8px; border-radius:5px; white-space:nowrap; }
  .if-badge.ok  { background:rgba(16,185,129,.12); color:#34d399; }
  .if-badge.bad { background:rgba(239,68,68,.12); color:#f87171; }
  .if-empty  { text-align:center; padding:30px; color:#9aa3b4; font-size:13px; }
  .if-empty-state { text-align:center; padding:60px 20px; color:#9aa3b4; }
  .if-empty-state h3 { font-size:18px; color:#9aa3b4; margin:14px 0 6px; }
  .if-empty-state p  { font-size:13px; }
  .spin { animation:spin .8s linear infinite; }
  @keyframes spin { to { transform:rotate(360deg); } }
`;

export default IngredientForecast;