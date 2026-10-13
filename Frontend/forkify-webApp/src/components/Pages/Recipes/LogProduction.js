import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChefHat, Users, ArrowLeft, CheckCircle, XCircle,
  AlertTriangle, IndianRupee, Package, RefreshCw,
  Play, Minus, Plus, Info,
} from 'lucide-react';
import productionService from '../../../services/productionService';
import recipeService     from '../../../services/recipeService';
import useBranch         from '../../../hooks/useBranch';

const LogProduction = () => {
  const { id: recipeId } = useParams();          // /fooderp/recipes/:id/produce
  const navigate         = useNavigate();
  const { branchId }     = useBranch();

  const [recipe,    setRecipe]    = useState(null);
  const [servings,  setServings]  = useState(4);
  const [preview,   setPreview]   = useState(null);
  const [notes,     setNotes]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [success,   setSuccess]   = useState(null);
  const [error,     setError]     = useState(null);

  // Load recipe details
  useEffect(() => {
    recipeService.getById(recipeId).then(({ data }) => {
      setRecipe(data);
      setServings(data.servings || 4);
    }).catch(() => setError('Failed to load recipe'));
  }, [recipeId]);

  // Load preview whenever servings change (debounced)
  useEffect(() => {
    if (!recipe || !branchId || servings < 1) return;
    const timer = setTimeout(() => fetchPreview(), 400);
    return () => clearTimeout(timer);
  }, [recipe, servings, branchId]);

  const fetchPreview = async () => {
    if (!branchId || !recipeId || servings < 1) return;
    setPreviewLoading(true);
    try {
      const { data } = await productionService.preview(recipeId, servings, branchId);
      setPreview(data);
    } catch (e) {
      setPreview(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!branchId) { setError('No branch assigned'); return; }
    if (preview?.insufficientItems?.length > 0) {
      setError('Cannot produce — insufficient stock for some ingredients');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data } = await productionService.logProduction(
        { recipeId: Number(recipeId), servingsProduced: servings, notes },
        branchId
      );
      setSuccess(data);
    } catch (e) {
      setError(e.response?.data || e.message || 'Production logging failed');
    } finally {
      setLoading(false);
    }
  };

  const canProduce = preview &&
    preview.insufficientItems?.length === 0 &&
    preview.deductions?.length > 0;

  if (success) {
    return (
      <div className="lp-success">
        <style>{successCss}</style>
        <div className="lp-success-icon"><CheckCircle size={48} /></div>
        <h2>Production Logged!</h2>
        <p>
          <strong>{success.recipeName}</strong> — {success.servingsProduced} servings
        </p>
        <p style={{ fontSize:13, color:'#9aa3b4' }}>
          Total cost: ₹{Number(success.totalCost || 0).toFixed(2)} &nbsp;|&nbsp;
          Cost/serving: ₹{Number(success.costPerServing || 0).toFixed(2)}
        </p>
        <div style={{ display:'flex', gap:10, marginTop:20, justifyContent:'center' }}>
          <button className="lp-btn-primary" onClick={() => {
            setSuccess(null); setPreview(null); setServings(recipe?.servings || 4);
          }}>
            Log Another Batch
          </button>
          <button className="lp-btn-ghost" onClick={() => navigate(`/fooderp/recipes/${recipeId}`)}>
            Back to Recipe
          </button>
          <button className="lp-btn-ghost" onClick={() => navigate('/fooderp/inventory/stock-out')}>
            View Stock Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="lp-page">
      <style>{pageCss}</style>

      {/* Header */}
      <div className="lp-header">
        <button className="lp-btn-ghost" onClick={() => navigate(`/fooderp/recipes/${recipeId}`)}>
          <ArrowLeft size={15} /> Back to Recipe
        </button>
        <div>
          <h2 className="lp-title">
            <ChefHat size={20} /> Log Production
          </h2>
          {recipe && (
            <div className="lp-subtitle">{recipe.name} · {recipe.category}</div>
          )}
        </div>
      </div>

      <div className="lp-grid">

        {/* LEFT: controls */}
        <div className="lp-left">

          {/* Serving selector */}
          <div className="lp-card">
            <div className="lp-card-title"><Users size={16} /> Servings to Produce</div>
            <div className="lp-serving-row">
              <button
                className="lp-serving-btn"
                onClick={() => setServings(s => Math.max(1, s - (recipe?.servings || 1)))}
                disabled={servings <= 1}
              >
                <Minus size={16} />
              </button>
              <input
                type="number"
                className="lp-serving-input"
                value={servings}
                min={1}
                onChange={e => {
                  const v = parseInt(e.target.value);
                  if (!isNaN(v) && v > 0) setServings(v);
                }}
              />
              <button
                className="lp-serving-btn"
                onClick={() => setServings(s => s + (recipe?.servings || 1))}
              >
                <Plus size={16} />
              </button>
            </div>
            {recipe && (
              <div className="lp-serving-hint">
                Base recipe: {recipe.servings} servings &nbsp;·&nbsp;
                {servings / recipe.servings}× batch
              </div>
            )}
            {/* Quick batch buttons */}
            {recipe && (
              <div className="lp-batch-row">
                {[1, 2, 3, 5].map(mult => (
                  <button
                    key={mult}
                    className={`lp-batch-btn ${servings === recipe.servings * mult ? 'active' : ''}`}
                    onClick={() => setServings(recipe.servings * mult)}
                  >
                    {mult}× ({recipe.servings * mult})
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="lp-card">
            <div className="lp-card-title"><Info size={16} /> Notes (optional)</div>
            <textarea
              className="lp-textarea"
              placeholder="Batch reference, shift notes..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Cost summary */}
          {preview && (
            <div className="lp-card lp-cost-card">
              <div className="lp-card-title"><IndianRupee size={16} /> Estimated Cost</div>
              <div className="lp-cost-big">
                ₹{Number(preview.estimatedCost || 0).toFixed(2)}
              </div>
              <div className="lp-cost-per">
                ₹{servings > 0
                  ? (Number(preview.estimatedCost || 0) / servings).toFixed(2)
                  : '0.00'} per serving
              </div>
            </div>
          )}

          {/* Errors */}
          {error && (
            <div className="lp-error">
              <AlertTriangle size={15} />
              <span>{error}</span>
            </div>
          )}

          {/* Submit */}
          <button
            className={`lp-submit ${!canProduce || loading ? 'disabled' : ''}`}
            onClick={handleSubmit}
            disabled={!canProduce || loading}
          >
            {loading ? (
              <><RefreshCw size={16} className="spin" /> Processing...</>
            ) : !preview ? (
              <><RefreshCw size={16} className="spin" /> Loading preview...</>
            ) : preview.insufficientItems?.length > 0 ? (
              <><XCircle size={16} /> Insufficient Stock</>
            ) : (
              <><Play size={16} /> Confirm Production</>
            )}
          </button>
        </div>

        {/* RIGHT: ingredient deduction preview */}
        <div className="lp-right">
          <div className="lp-card">
            <div className="lp-card-title" style={{ marginBottom:14 }}>
              <Package size={16} /> Ingredient Deductions
              {previewLoading && <RefreshCw size={13} className="spin" style={{ marginLeft:8 }} />}
            </div>

            {/* Insufficient stock banner */}
            {preview?.insufficientItems?.length > 0 && (
              <div className="lp-insufficient-banner">
                <AlertTriangle size={15} />
                <div>
                  <strong>Insufficient stock for {preview.insufficientItems.length} ingredient(s)</strong>
                  <ul style={{ margin:'6px 0 0 16px', fontSize:12, opacity:.85 }}>
                    {preview.insufficientItems.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {!preview && !previewLoading && (
              <div className="lp-preview-empty">
                Adjust servings to see ingredient deductions
              </div>
            )}

            {preview?.deductions?.map(d => (
              <div key={d.ingredientId} className={`lp-ing-row ${d.sufficient ? '' : 'insufficient'}`}>
                <div className="lp-ing-info">
                  <div className="lp-ing-name">
                    {d.sufficient
                      ? <CheckCircle size={13} style={{ color:'#34d399' }} />
                      : <XCircle size={13} style={{ color:'#f87171' }} />
                    }
                    {d.ingredientName}
                  </div>
                  <div className="lp-ing-detail">
                    Need {d.requiredQty.toFixed(3)} {d.unit}
                    &nbsp;·&nbsp;
                    Have {d.availableQty.toFixed(3)} {d.unit}
                  </div>
                </div>
                <div className="lp-ing-right">
                  <div className="lp-ing-cost">₹{Number(d.lineCost || 0).toFixed(2)}</div>
                  <div className={`lp-ing-stock ${d.sufficient ? 'ok' : 'bad'}`}>
                    {d.sufficient ? 'OK' : 'LOW'}
                  </div>
                </div>
                {/* Progress bar: available vs required */}
                <div className="lp-ing-bar-track">
                  <div
                    className={`lp-ing-bar-fill ${d.sufficient ? 'ok' : 'bad'}`}
                    style={{ width: `${Math.min(100, (d.availableQty / Math.max(d.requiredQty, 0.001)) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const pageCss = `
  .lp-page { font-family:'DM Sans',sans-serif; color:#1f2937; max-width:1100px; }
  .lp-header { display:flex; align-items:flex-start; gap:16px; margin-bottom:24px; }
  .lp-title  { display:flex; align-items:center; gap:8px; font-size:20px; font-weight:700; color:#1f2937; margin:0 0 4px; }
  .lp-subtitle { font-size:13px; color:#9aa3b4; }
  .lp-btn-ghost { display:flex; align-items:center; gap:6px; padding:8px 14px; background:#f8f9fc; border:1px solid #e2e6ef; border-radius:9px; color:#374151; font-size:13px; cursor:pointer; white-space:nowrap; transition:background .15s; }
  .lp-btn-ghost:hover { background:#e2e6ef; color:#1f2937; }
  .lp-btn-primary { display:flex; align-items:center; gap:6px; padding:9px 18px; background:#e8f0fd; border:1px solid #b3ccf5; border-radius:9px; color:#0052b3; font-size:13px; font-weight:600; cursor:pointer; transition:all .15s; }
  .lp-btn-primary:hover { background:#d4e4fb; }

  .lp-grid  { display:grid; grid-template-columns:380px 1fr; gap:20px; }
  @media(max-width:800px) { .lp-grid { grid-template-columns:1fr; } }

  .lp-card  { background:#ffffff; border:1px solid #e2e6ef; border-radius:14px; padding:18px; margin-bottom:14px; }
  .lp-card-title { display:flex; align-items:center; gap:7px; font-size:13px; font-weight:600; color:#4b5263; margin-bottom:14px; }

  .lp-serving-row { display:flex; align-items:center; gap:12px; margin-bottom:10px; }
  .lp-serving-btn { width:36px; height:36px; background:#e2e6ef; border:1px solid #e2e6ef; border-radius:9px; display:flex; align-items:center; justify-content:center; color:#1f2937; cursor:pointer; transition:all .15s; }
  .lp-serving-btn:hover:not(:disabled) { background:rgba(0,97,210,.15); border-color:#0061d2; }
  .lp-serving-btn:disabled { opacity:.3; cursor:not-allowed; }
  .lp-serving-input { flex:1; background:#e2e6ef; border:1px solid #e2e6ef; border-radius:9px; padding:8px 12px; color:#1f2937; font-size:20px; font-weight:700; text-align:center; outline:none; }
  .lp-serving-input:focus { border-color:#0061d2; }
  .lp-serving-hint { font-size:11.5px; color:#9aa3b4; text-align:center; margin-bottom:12px; }
  .lp-batch-row { display:flex; gap:6px; flex-wrap:wrap; }
  .lp-batch-btn { flex:1; min-width:60px; padding:6px; background:#ffffff; border:1px solid #e2e6ef; border-radius:8px; color:#9aa3b4; font-size:12px; cursor:pointer; text-align:center; transition:all .15s; }
  .lp-batch-btn:hover, .lp-batch-btn.active { background:rgba(0,97,210,.12); border-color:#0061d2; color:#3385e0; }

  .lp-textarea { width:100%; background:#f8f9fc; border:1px solid #e2e6ef; border-radius:9px; padding:10px 12px; color:#1f2937; font-size:13px; resize:vertical; outline:none; font-family:inherit; box-sizing:border-box; }
  .lp-textarea:focus { border-color:#0061d2; }

  .lp-cost-card { background:rgba(0,97,210,.06); border-color:rgba(0,97,210,.15); }
  .lp-cost-big  { font-size:32px; font-weight:800; color:#0061d2; }
  .lp-cost-per  { font-size:13px; color:#9aa3b4; margin-top:4px; }

  .lp-error { display:flex; align-items:flex-start; gap:8px; background:rgba(239,68,68,.1); border:1px solid rgba(239,68,68,.25); border-radius:10px; padding:12px 14px; color:#fca5a5; font-size:13px; margin-bottom:14px; }

  .lp-submit { width:100%; padding:13px; background:#e8f0fd; border:1px solid #b3ccf5; border-radius:12px; color:#0052b3; font-size:15px; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; transition:all .2s; }
  .lp-submit:hover:not(.disabled) { background:#d4e4fb; transform:translateY(-1px); box-shadow:0 6px 20px rgba(0,97,210,.2); }
  .lp-submit.disabled { opacity:.45; cursor:not-allowed; }

  .lp-insufficient-banner { display:flex; align-items:flex-start; gap:10px; background:rgba(239,68,68,.1); border:1px solid rgba(239,68,68,.25); border-radius:10px; padding:12px 14px; color:#fca5a5; font-size:13px; margin-bottom:14px; }
  .lp-preview-empty { text-align:center; padding:32px; color:#c8cedb; font-size:13px; }

  .lp-ing-row { padding:10px 0; border-bottom:1px solid #f8f9fc; display:grid; grid-template-columns:1fr auto; grid-template-rows:auto auto; gap:2px 10px; }
  .lp-ing-row:last-child { border-bottom:none; }
  .lp-ing-row.insufficient { background:rgba(239,68,68,.04); border-radius:8px; padding:10px 8px; margin:0 -8px; }
  .lp-ing-info { grid-column:1; grid-row:1; }
  .lp-ing-right { grid-column:2; grid-row:1; text-align:right; }
  .lp-ing-bar-track { grid-column:1/-1; grid-row:2; height:3px; background:#e2e6ef; border-radius:2px; overflow:hidden; margin-top:6px; }
  .lp-ing-name   { display:flex; align-items:center; gap:6px; font-size:13px; font-weight:600; color:#1f2937; }
  .lp-ing-detail { font-size:11.5px; color:#9aa3b4; margin-top:3px; margin-left:19px; }
  .lp-ing-cost   { font-size:13px; font-weight:600; color:#3385e0; }
  .lp-ing-stock  { font-size:10px; font-weight:700; letter-spacing:.5px; text-transform:uppercase; margin-top:3px; }
  .lp-ing-stock.ok  { color:#34d399; }
  .lp-ing-stock.bad { color:#f87171; }
  .lp-ing-bar-fill { height:100%; border-radius:2px; transition:width .4s; }
  .lp-ing-bar-fill.ok  { background:#34d399; }
  .lp-ing-bar-fill.bad { background:#f87171; }

  .spin { animation:spin .8s linear infinite; }
  @keyframes spin { to { transform:rotate(360deg); } }
`;

const successCss = `
  .lp-success { font-family:'DM Sans',sans-serif; text-align:center; padding:60px 20px; color:#1f2937; }
  .lp-success-icon { color:#34d399; margin-bottom:16px; }
  .lp-success h2 { font-size:24px; font-weight:800; margin:0 0 8px; }
  .lp-success p { color:#9aa3b4; margin:4px 0; font-size:14px; }
  .lp-btn-primary { display:inline-flex; align-items:center; gap:6px; padding:9px 18px; background:#e8f0fd; border:1px solid #b3ccf5; border-radius:9px; color:#0052b3; font-size:13px; font-weight:600; cursor:pointer; }
  .lp-btn-ghost { display:inline-flex; align-items:center; gap:6px; padding:9px 18px; background:#f0f2f7; border:1px solid #e2e6ef; border-radius:9px; color:#374151; font-size:13px; cursor:pointer; }
  .spin { animation:spin .8s linear infinite; }
  @keyframes spin { to { transform:rotate(360deg); } }
`;

export default LogProduction;
