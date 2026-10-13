import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChefHat, Clock, Users, IndianRupee, ArrowLeft,
  Edit2, Trash2, Lock, AlertTriangle, Flame, Play,
  Tag, Package, RefreshCw, CheckCircle,
  ListOrdered, Timer, GitBranch,
} from 'lucide-react';
import { fetchRecipeById, deleteRecipe } from '../../../store/actions/recipeActions';
import usePermission from '../../../hooks/usePermission';

// Backend returns tags/allergens as comma-separated strings — normalise to array
const parseList = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) return val.filter(Boolean);
  return String(val).split(',').map(s => s.trim()).filter(Boolean);
};

const RecipeDetail = () => {
  const { id }     = useParams();
  const dispatch   = useDispatch();
  const navigate   = useNavigate();
  const { canEditMasterData } = usePermission();
  const { selected: recipe, loading } = useSelector(s => s.recipes);
  const [servings, setServings]       = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [activeTab, setActiveTab]     = useState('ingredients'); // 'ingredients' | 'steps'

  useEffect(() => {
    dispatch(fetchRecipeById(id));
  }, [dispatch, id]);

  useEffect(() => {
    if (recipe) setServings(recipe.servings);
  }, [recipe]);

  if (loading && !recipe) {
    return (
      <div className="rd-loading">
        <RefreshCw size={28} className="spin" />
        <p>Loading recipe...</p>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="rd-empty">
        <ChefHat size={48} />
        <h3>Recipe not found</h3>
        <button className="rd-btn-ghost" onClick={() => navigate('/fooderp/recipes/list')}>
          ← Back to Recipes
        </button>
      </div>
    );
  }

  const scale = (val) => {
    if (!val || !recipe.servings) return '0';
    return ((val / recipe.servings) * servings).toFixed(1);
  };

  const scaledCost = recipe.costPerServing
    ? (parseFloat(recipe.costPerServing) * servings).toFixed(2)
    : '0.00';

  const canEdit  = !recipe.hqOwned || canEditMasterData;
  const steps    = recipe.steps || [];
  const tags     = parseList(recipe.tags);
  const allergens= parseList(recipe.allergens);

  const totalStepTime = steps.reduce((s, st) => s + (st.durationMinutes || 0), 0);

  const handleDelete = async () => {
    const res = await dispatch(deleteRecipe(recipe.id));
    if (res.success) navigate('/fooderp/recipes/list');
  };

  return (
    <div className="rd-container">

      {/* ── Top bar ── */}
      <div className="rd-topbar">
        <button className="rd-btn-ghost" onClick={() => navigate('/fooderp/recipes/list')}>
          <ArrowLeft size={16} /> Back
        </button>
        <div className="rd-topbar-actions">
          {recipe.hqOwned && (
            <span className="rd-hq-chip"><Lock size={11} /> HQ Recipe</span>
          )}
          {recipe.status === 'ACTIVE' && (
            <button
              className="rd-btn-produce"
              onClick={() => navigate(`/fooderp/recipes/${recipe.id}/produce`)}
            >
              <Play size={14} /> Log Production
            </button>
          )}
          <button
            className="rd-btn-versions"
            onClick={() => navigate(`/fooderp/recipes/${recipe.id}/versions`)}
          >
            <GitBranch size={14} /> Version History
          </button>
          {canEdit && (
            <button
              className="rd-btn-outline"
              onClick={() => navigate(`/fooderp/recipes/${recipe.id}/edit`)}
            >
              <Edit2 size={14} /> Edit
            </button>
          )}
          {canEditMasterData && (
            <button className="rd-btn-danger-outline" onClick={() => setConfirmDelete(true)}>
              <Trash2 size={14} /> Delete
            </button>
          )}
        </div>
      </div>

      {/* ── Main grid ── */}
      <div className="rd-grid">

        {/* LEFT */}
        <div className="rd-left">

          {/* Hero card */}
          <div className="rd-hero-card">
            <div className="rd-hero-icon">
              <ChefHat size={32} />
            </div>
            <div className="rd-hero-body">
              <div className="rd-hero-meta">
                <span className="rd-category">{recipe.category}</span>
                <span className="rd-status" data-status={recipe.status}>
                  {recipe.status}
                </span>
                {steps.length > 0 && (
                  <span className="rd-steps-chip">
                    <ListOrdered size={11} /> {steps.length} steps
                  </span>
                )}
              </div>
              <h1 className="rd-name">{recipe.name}</h1>
              {recipe.description && (
                <p className="rd-desc">{recipe.description}</p>
              )}
              <div className="rd-stats-row">
                <div className="rd-stat">
                  <Clock size={15} />
                  <span>{(recipe.prepTime || 0) + (recipe.cookTime || 0)} min total</span>
                </div>
                <div className="rd-stat">
                  <Users size={15} />
                  <span>{recipe.servings} base servings</span>
                </div>
                <div className="rd-stat">
                  <Flame size={15} />
                  <span>{scale(recipe.calories)} kcal</span>
                </div>
                <div className="rd-stat">
                  <Package size={15} />
                  <span>{recipe.branchName}</span>
                </div>
              </div>
              {tags.length > 0 && (
                <div className="rd-tags-row">
                  {tags.map((t, i) => (
                    <span key={i} className="rd-tag"><Tag size={10} />{t}</span>
                  ))}
                </div>
              )}
              {allergens.length > 0 && (
                <div className="rd-allergens">
                  <AlertTriangle size={13} />
                  <strong>Allergens:</strong>
                  {allergens.map((a, i) => (
                    <span key={i} className="rd-allergen">{a}</span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Serving adjuster */}
          <div className="rd-serving-card">
            <div className="rd-serving-label">
              <Users size={16} /> Adjust Servings
            </div>
            <div className="rd-serving-controls">
              <button onClick={() => setServings(s => Math.max(1, s - 1))}>−</button>
              <span>{servings}</span>
              <button onClick={() => setServings(s => s + 1)}>+</button>
            </div>
            <div className="rd-serving-reset">
              {servings !== recipe.servings && (
                <button
                  className="rd-reset-btn"
                  onClick={() => setServings(recipe.servings)}
                >
                  Reset to {recipe.servings}
                </button>
              )}
            </div>
          </div>

          {/* Tabs: Ingredients | Cooking Steps */}
          <div className="rd-section-card">
            <div className="rd-tabs">
              <button
                className={`rd-tab ${activeTab === 'ingredients' ? 'active' : ''}`}
                onClick={() => setActiveTab('ingredients')}
              >
                <Package size={14} />
                Ingredients
                <span className="rd-tab-count">{recipe.ingredients?.length || 0}</span>
              </button>
              <button
                className={`rd-tab ${activeTab === 'steps' ? 'active' : ''}`}
                onClick={() => setActiveTab('steps')}
              >
                <ListOrdered size={14} />
                Cooking Steps
                <span className="rd-tab-count">{steps.length}</span>
              </button>
            </div>

            {/* ── Ingredients panel ── */}
            {activeTab === 'ingredients' && (
              <div className="rd-tab-panel">
                <div className="rd-section-header">
                  <h3><Package size={18} /> Ingredients</h3>
                  <span className="rd-section-note">
                    for {servings} serving{servings !== 1 ? 's' : ''}
                  </span>
                </div>
                {!recipe.ingredients || recipe.ingredients.length === 0 ? (
                  <p className="rd-no-data">No ingredients added yet</p>
                ) : (
                  <div className="rd-ing-table">
                    <div className="rd-ing-header">
                      <span>Ingredient</span>
                      <span>Qty</span>
                      <span>Unit Cost</span>
                      <span>Line Cost</span>
                    </div>
                    {recipe.ingredients.map(ing => {
                      const scaledQty  = ((ing.quantity / recipe.servings) * servings).toFixed(2);
                      const scaledLine = (parseFloat(ing.lineCost || 0) / recipe.servings * servings).toFixed(2);
                      return (
                        <div key={ing.id} className="rd-ing-row">
                          <span className="rd-ing-name">
                            <CheckCircle size={12} />
                            {ing.ingredientName}
                            {ing.notes && <em className="rd-ing-note">{ing.notes}</em>}
                          </span>
                          <span className="rd-ing-qty">
                            {scaledQty} {ing.unit}
                          </span>
                          <span className="rd-ing-cost">
                            ₹{parseFloat(ing.unitCost || 0).toFixed(2)}
                          </span>
                          <span className="rd-ing-line">
                            ₹{scaledLine}
                          </span>
                        </div>
                      );
                    })}
                    <div className="rd-ing-total">
                      <span>Total Cost</span>
                      <span></span>
                      <span></span>
                      <span>₹{scaledCost}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Cooking Steps panel ── */}
            {activeTab === 'steps' && (
              <div className="rd-tab-panel">
                <div className="rd-section-header">
                  <h3><ListOrdered size={18} /> Cooking Steps</h3>
                  {totalStepTime > 0 && (
                    <span className="rd-section-note">
                      <Timer size={11} /> {totalStepTime} min total
                    </span>
                  )}
                </div>
                {steps.length === 0 ? (
                  <p className="rd-no-data">No cooking steps added yet</p>
                ) : (
                  <div className="rd-steps-list">
                    {steps.map((step, i) => (
                      <div key={step.id || i} className="rd-step-row">
                        <div className="rd-step-num">{step.stepNumber || i + 1}</div>
                        <div className="rd-step-body">
                          <div className="rd-step-title">
                            {step.title}
                            {step.durationMinutes && (
                              <span className="rd-step-duration">
                                <Timer size={11} /> {step.durationMinutes} min
                              </span>
                            )}
                          </div>
                          {step.instruction && (
                            <div className="rd-step-instruction">{step.instruction}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — nutrition + cost */}
        <div className="rd-right">

          {/* Cost card */}
          <div className="rd-cost-card">
            <h3><IndianRupee size={18} /> Cost Analysis</h3>
            <div className="rd-cost-big">
              <span className="rd-cost-value">₹{scaledCost}</span>
              <span className="rd-cost-label">total for {servings} serving{servings !== 1 ? 's' : ''}</span>
            </div>
            <div className="rd-cost-per">
              <span>Per serving</span>
              <strong>₹{parseFloat(recipe.costPerServing || 0).toFixed(2)}</strong>
            </div>
            {recipe.ingredients && recipe.ingredients.length > 0 && (
              <div className="rd-cost-breakdown">
                {recipe.ingredients.slice(0, 5).map(ing => (
                  <div key={ing.id} className="rd-cost-bar-row">
                    <span className="rd-cbar-name">{ing.ingredientName}</span>
                    <span className="rd-cbar-val">
                      ₹{parseFloat(ing.lineCost || 0).toFixed(2)}
                    </span>
                    <div className="rd-cbar-track">
                      <div
                        className="rd-cbar-fill"
                        style={{
                          width: `${Math.min(100, (ing.lineCost / (recipe.totalCost || 1)) * 100)}%`
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Nutrition card */}
          <div className="rd-nutrition-card">
            <h3><Flame size={18} /> Nutrition</h3>
            <p className="rd-nutrition-note">per {servings} serving{servings !== 1 ? 's' : ''}</p>
            <div className="rd-nutrition-grid">
              {[
                { label: 'Calories', val: scale(recipe.calories), unit: 'kcal', color: '#0061d2' },
                { label: 'Protein',  val: scale(recipe.protein),  unit: 'g',    color: '#10b981' },
                { label: 'Carbs',    val: scale(recipe.carbs),    unit: 'g',    color: '#3b82f6' },
                { label: 'Fat',      val: scale(recipe.fat),      unit: 'g',    color: '#f59e0b' },
                { label: 'Fiber',    val: scale(recipe.fiber),    unit: 'g',    color: '#8b5cf6' },
              ].map(n => (
                <div key={n.label} className="rd-nut-card" style={{ '--accent': n.color }}>
                  <div className="rd-nut-val">{n.val}</div>
                  <div className="rd-nut-unit">{n.unit}</div>
                  <div className="rd-nut-label">{n.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Time breakdown */}
          <div className="rd-time-card">
            <h3><Clock size={18} /> Time</h3>
            <div className="rd-time-rows">
              <div className="rd-time-row">
                <span>Prep time</span>
                <strong>{recipe.prepTime || 0} min</strong>
              </div>
              <div className="rd-time-row">
                <span>Cook time</span>
                <strong>{recipe.cookTime || 0} min</strong>
              </div>
              {steps.length > 0 && (
                <div className="rd-time-row">
                  <span>Steps total</span>
                  <strong>{totalStepTime} min</strong>
                </div>
              )}
              <div className="rd-time-row total">
                <span>Total</span>
                <strong>{(recipe.prepTime || 0) + (recipe.cookTime || 0)} min</strong>
              </div>
            </div>
          </div>

          {/* Quick steps summary in sidebar (if steps exist) */}
          {steps.length > 0 && (
            <div className="rd-steps-summary-card">
              <h3><ListOrdered size={18} /> Steps Summary</h3>
              <div className="rd-steps-summary-list">
                {steps.map((step, i) => (
                  <div key={step.id || i} className="rd-steps-summary-row">
                    <span className="rd-steps-summary-num">{step.stepNumber || i + 1}</span>
                    <span className="rd-steps-summary-title">{step.title}</span>
                    {step.durationMinutes && (
                      <span className="rd-steps-summary-time">{step.durationMinutes}m</span>
                    )}
                  </div>
                ))}
              </div>
              <button
                className="rd-steps-summary-btn"
                onClick={() => { setActiveTab('steps'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              >
                View full instructions ↑
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Delete modal ── */}
      {confirmDelete && (
        <div className="rd-modal-overlay" onClick={() => setConfirmDelete(false)}>
          <div className="rd-modal" onClick={e => e.stopPropagation()}>
            <div className="rd-modal-icon"><Trash2 size={28} /></div>
            <h3>Delete Recipe</h3>
            <p>Delete <strong>{recipe.name}</strong>? This cannot be undone.</p>
            <div className="rd-modal-btns">
              <button className="rd-btn-ghost" onClick={() => setConfirmDelete(false)}>Cancel</button>
              <button className="rd-btn-danger-solid" onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .rd-container { max-width:1200px; font-family:'DM Sans',sans-serif; }
        .rd-loading,.rd-empty { display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:60px;color:#9ca3af;text-align:center; }
        .rd-empty h3 { font-size:18px;font-weight:600;color:#374151;margin:0; }

        .rd-topbar { display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:10px; }
        .rd-topbar-actions { display:flex;gap:8px;align-items:center;flex-wrap:wrap; }
        .rd-btn-ghost { display:flex;align-items:center;gap:6px;padding:7px 14px;background:#f0f2f7;border:1px solid #d8dde8;border-radius:8px;font-size:13px;color:#374151;cursor:pointer;transition:all .15s; }
        .rd-btn-ghost:hover { background:#e2e6ef; }
        .rd-btn-produce { display:flex;align-items:center;gap:6px;padding:8px 16px;background:#dcfce7;border:1px solid #bbf7d0;border-radius:9px;color:#15803d;font-size:13px;font-weight:600;cursor:pointer;transition:all .15s; }
        .rd-btn-produce:hover { background:#bbf7d0; }
        .rd-btn-versions { display:flex;align-items:center;gap:6px;padding:7px 14px;background:#f5f3ff;border:1px solid #ddd6fe;border-radius:8px;font-size:13px;color:#7c3aed;font-weight:600;cursor:pointer;transition:all .15s; }
        .rd-btn-versions:hover { background:#ede9fe; }
        .rd-btn-outline { display:flex;align-items:center;gap:6px;padding:7px 14px;background:#fff;border:1px solid #0061d2;border-radius:8px;font-size:13px;color:#0061d2;font-weight:600;cursor:pointer;transition:all .15s; }
        .rd-btn-outline:hover { background:rgba(0,97,210,.08); }
        .rd-btn-danger-outline { display:flex;align-items:center;gap:6px;padding:7px 14px;background:#fff;border:1px solid #ef4444;border-radius:8px;font-size:13px;color:#ef4444;font-weight:600;cursor:pointer;transition:all .15s; }
        .rd-btn-danger-outline:hover { background:rgba(239,68,68,.08); }
        .rd-btn-danger-solid { padding:8px 20px;background:#ef4444;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer; }
        .rd-hq-chip { display:flex;align-items:center;gap:4px;font-size:11px;font-weight:700;padding:4px 10px;background:rgba(0,97,210,.1);color:#0061d2;border-radius:20px; }

        .rd-grid { display:grid;grid-template-columns:1fr 340px;gap:20px; }
        @media(max-width:900px) { .rd-grid { grid-template-columns:1fr; } }

        /* Hero */
        .rd-hero-card { background:#fff;border-radius:16px;border:1px solid #e5e7eb;padding:24px;display:flex;gap:20px;margin-bottom:16px; }
        .rd-hero-icon { width:64px;height:64px;background:linear-gradient(135deg,rgba(0,97,210,.12),rgba(0,97,210,.05));border-radius:16px;display:flex;align-items:center;justify-content:center;color:#0061d2;flex-shrink:0; }
        .rd-hero-body { flex:1;min-width:0; }
        .rd-hero-meta { display:flex;gap:8px;align-items:center;margin-bottom:8px;flex-wrap:wrap; }
        .rd-category { font-size:11px;font-weight:700;padding:3px 8px;background:#f0fdf4;color:#15803d;border-radius:20px; }
        .rd-status { font-size:11px;font-weight:700;padding:3px 8px;border-radius:20px; }
        .rd-status[data-status="ACTIVE"]   { background:#dcfce7;color:#15803d; }
        .rd-status[data-status="DRAFT"]    { background:#fef9c3;color:#a16207; }
        .rd-status[data-status="ARCHIVED"] { background:#f1f5f9;color:#64748b; }
        .rd-steps-chip { display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:700;padding:3px 8px;background:#f5f3ff;color:#7c3aed;border-radius:20px; }
        .rd-name { font-size:24px;font-weight:800;color:#1f2937;margin:0 0 8px;line-height:1.2; }
        .rd-desc { font-size:14px;color:#6b7280;margin:0 0 12px;line-height:1.6; }
        .rd-stats-row { display:flex;gap:16px;flex-wrap:wrap;margin-bottom:10px; }
        .rd-stat { display:flex;align-items:center;gap:5px;font-size:13px;color:#6b7280; }
        .rd-tags-row { display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px; }
        .rd-tag { display:inline-flex;align-items:center;gap:4px;font-size:11px;padding:3px 8px;background:#f1f5f9;color:#64748b;border-radius:20px; }
        .rd-allergens { display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:12px;color:#92400e;background:#fffbeb;border:1px solid #fde68a;padding:6px 10px;border-radius:8px;margin-top:8px; }
        .rd-allergen { font-size:11px;font-weight:600;padding:2px 6px;background:#fef3c7;color:#92400e;border-radius:4px; }

        /* Serving card */
        .rd-serving-card { background:#fff;border-radius:12px;border:1px solid #e5e7eb;padding:16px;display:flex;align-items:center;gap:20px;margin-bottom:16px;flex-wrap:wrap; }
        .rd-serving-label { display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:#374151; }
        .rd-serving-controls { display:flex;align-items:center;gap:12px; }
        .rd-serving-controls button { width:32px;height:32px;background:#f1f5f9;border:1px solid #e5e7eb;border-radius:8px;font-size:18px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#374151;transition:all .15s; }
        .rd-serving-controls button:hover { background:#e8f0fd;border-color:#0061d2;color:#0052b3; }
        .rd-serving-controls span { font-size:20px;font-weight:800;color:#1f2937;min-width:32px;text-align:center; }
        .rd-reset-btn { font-size:12px;color:#0061d2;background:none;border:none;cursor:pointer;text-decoration:underline; }

        /* Tabs */
        .rd-section-card { background:#fff;border-radius:16px;border:1px solid #e5e7eb;overflow:hidden; }
        .rd-tabs { display:flex;border-bottom:1px solid #e5e7eb;background:#f8fafc; }
        .rd-tab { display:flex;align-items:center;gap:6px;padding:12px 20px;font-size:13px;font-weight:600;color:#6b7280;background:none;border:none;cursor:pointer;border-bottom:2px solid transparent;transition:all .15s;margin-bottom:-1px; }
        .rd-tab:hover { color:#374151;background:#f1f5f9; }
        .rd-tab.active { color:#0061d2;border-bottom-color:#0061d2;background:#fff; }
        .rd-tab-count { font-size:10px;font-weight:700;padding:1px 6px;background:#f1f5f9;border-radius:10px;color:#6b7280; }
        .rd-tab.active .rd-tab-count { background:#e8f0fd;color:#0061d2; }
        .rd-tab-panel { padding:20px; }

        /* Section header */
        .rd-section-header { display:flex;align-items:center;justify-content:space-between;margin-bottom:16px; }
        .rd-section-header h3 { display:flex;align-items:center;gap:8px;font-size:15px;font-weight:700;color:#1f2937;margin:0; }
        .rd-section-note { display:flex;align-items:center;gap:4px;font-size:12px;color:#9ca3af; }
        .rd-no-data { font-size:13px;color:#9ca3af;font-style:italic;text-align:center;padding:20px 0;margin:0; }

        /* Ingredients */
        .rd-ing-table { display:flex;flex-direction:column; }
        .rd-ing-header { display:grid;grid-template-columns:1fr 100px 80px 80px;padding:6px 0;border-bottom:2px solid #f1f5f9;font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.5px; }
        .rd-ing-row { display:grid;grid-template-columns:1fr 100px 80px 80px;padding:10px 0;border-bottom:1px solid #f9fafb;align-items:center; }
        .rd-ing-row:last-of-type { border-bottom:none; }
        .rd-ing-name { display:flex;align-items:center;gap:6px;font-size:13px;color:#374151;font-weight:500; }
        .rd-ing-name svg { color:#10b981;flex-shrink:0; }
        .rd-ing-note { font-size:11px;color:#9ca3af;font-style:italic;margin-left:4px; }
        .rd-ing-qty,.rd-ing-cost { font-size:13px;color:#6b7280; }
        .rd-ing-line { font-size:13px;font-weight:600;color:#0061d2; }
        .rd-ing-total { display:grid;grid-template-columns:1fr 100px 80px 80px;padding:12px 0 0;border-top:2px solid #f1f5f9;font-size:14px;font-weight:700;color:#1f2937; }
        .rd-ing-total span:last-child { color:#0061d2; }

        /* ── Cooking Steps ── */
        .rd-steps-list { display:flex;flex-direction:column;gap:0; }
        .rd-step-row { display:flex;gap:16px;padding:16px 0;border-bottom:1px solid #f1f5f9;align-items:flex-start; }
        .rd-step-row:last-child { border-bottom:none; }
        .rd-step-num { width:32px;height:32px;background:linear-gradient(135deg,#0061d2,#3385e0);color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;flex-shrink:0;margin-top:2px; }
        .rd-step-body { flex:1;min-width:0; }
        .rd-step-title { display:flex;align-items:center;gap:10px;font-size:14px;font-weight:700;color:#1f2937;margin-bottom:6px;flex-wrap:wrap; }
        .rd-step-duration { display:inline-flex;align-items:center;gap:3px;font-size:11px;font-weight:600;color:#0052b3;background:#e8f0fd;border:1px solid #b3ccf5;border-radius:12px;padding:2px 8px; }
        .rd-step-instruction { font-size:13px;color:#4b5563;line-height:1.7; }

        /* Steps summary sidebar card */
        .rd-steps-summary-card { background:#fff;border-radius:16px;border:1px solid #e5e7eb;padding:20px;margin-top:0; }
        .rd-steps-summary-card h3 { display:flex;align-items:center;gap:8px;font-size:15px;font-weight:700;color:#1f2937;margin:0 0 14px; }
        .rd-steps-summary-list { display:flex;flex-direction:column;gap:0; }
        .rd-steps-summary-row { display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #f9fafb;font-size:12px; }
        .rd-steps-summary-row:last-child { border-bottom:none; }
        .rd-steps-summary-num { width:22px;height:22px;background:#e8f0fd;color:#0061d2;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;flex-shrink:0; }
        .rd-steps-summary-title { flex:1;color:#374151;font-weight:500; }
        .rd-steps-summary-time { font-size:11px;color:#9ca3af;white-space:nowrap; }
        .rd-steps-summary-btn { display:block;width:100%;margin-top:12px;padding:8px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;font-size:12px;color:#0061d2;font-weight:600;cursor:pointer;text-align:center; }
        .rd-steps-summary-btn:hover { background:#e8f0fd; }

        /* Right column cards */
        .rd-cost-card,.rd-nutrition-card,.rd-time-card { background:#fff;border-radius:16px;border:1px solid #e5e7eb;padding:20px;margin-bottom:16px; }
        .rd-cost-card h3,.rd-nutrition-card h3,.rd-time-card h3 { display:flex;align-items:center;gap:8px;font-size:15px;font-weight:700;color:#1f2937;margin:0 0 16px; }
        .rd-cost-big { display:flex;align-items:baseline;gap:8px;margin-bottom:12px; }
        .rd-cost-value { font-size:36px;font-weight:800;color:#0061d2; }
        .rd-cost-label { font-size:13px;color:#9ca3af; }
        .rd-cost-per { display:flex;justify-content:space-between;align-items:center;font-size:13px;color:#6b7280;padding:10px 0;border-top:1px solid #f1f5f9;margin-bottom:12px; }
        .rd-cost-per strong { color:#1f2937; }
        .rd-cost-breakdown { display:flex;flex-direction:column;gap:8px; }
        .rd-cost-bar-row { display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center; }
        .rd-cbar-name { font-size:12px;color:#6b7280;grid-column:1; }
        .rd-cbar-val { font-size:12px;font-weight:600;color:#1f2937;text-align:right; }
        .rd-cbar-track { grid-column:1/-1;height:4px;background:#f1f5f9;border-radius:2px;overflow:hidden; }
        .rd-cbar-fill { height:100%;background:#0061d2;border-radius:2px;transition:width .4s; }

        .rd-nutrition-note { font-size:12px;color:#9ca3af;margin:-12px 0 14px; }
        .rd-nutrition-grid { display:grid;grid-template-columns:repeat(3,1fr);gap:10px; }
        .rd-nut-card { padding:12px;background:#fafafa;border-radius:10px;border:1px solid #f1f5f9;text-align:center;border-top:3px solid var(--accent); }
        .rd-nut-val { font-size:20px;font-weight:800;color:#1f2937; }
        .rd-nut-unit { font-size:10px;color:#9ca3af; }
        .rd-nut-label { font-size:11px;font-weight:600;color:#6b7280;margin-top:2px; }

        .rd-time-rows { display:flex;flex-direction:column;gap:0; }
        .rd-time-row { display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#6b7280; }
        .rd-time-row:last-child { border-bottom:none; }
        .rd-time-row.total { font-weight:700;color:#1f2937; }
        .rd-time-row strong { color:#1f2937; }

        /* Modal */
        .rd-modal-overlay { position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:1000; }
        .rd-modal { background:#fff;border-radius:16px;padding:32px;max-width:400px;width:90%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.2); }
        .rd-modal-icon { width:56px;height:56px;background:rgba(239,68,68,.1);border-radius:50%;display:flex;align-items:center;justify-content:center;color:#ef4444;margin:0 auto 16px; }
        .rd-modal h3 { font-size:18px;font-weight:700;color:#1f2937;margin:0 0 8px; }
        .rd-modal p { font-size:14px;color:#6b7280;margin:0 0 24px; }
        .rd-modal-btns { display:flex;gap:12px;justify-content:center; }

        .spin { animation:spin .8s linear infinite; }
        @keyframes spin { to { transform:rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default RecipeDetail;