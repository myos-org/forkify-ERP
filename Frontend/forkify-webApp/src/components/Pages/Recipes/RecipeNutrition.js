import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Calculator, ChefHat, Clock, Users, Flame,
  TrendingUp, TrendingDown, AlertTriangle, RefreshCw,
  IndianRupee, Apple, Droplets,
} from 'lucide-react';
import { fetchRecipes } from '../../../store/actions/recipeActions';
import recipeService from '../../../services/recipeService';
import AICalorieAssistant, { AICalorieTrigger } from '../../AI/AICalorieAssistant'; // ← NEW

const RecipeNutrition = () => {
  const dispatch = useDispatch();
  const { recipes, loading } = useSelector(s => s.recipes);

  const [selectedId, setSelectedId] = useState(null);
  const [detail,     setDetail]     = useState(null);
  const [servings,   setServings]   = useState(4);
  const [fetching,   setFetching]   = useState(false);
  const [showAI,     setShowAI]     = useState(false); // ← NEW

  useEffect(() => {
    dispatch(fetchRecipes());
  }, [dispatch]);

  useEffect(() => {
    if (recipes.length > 0 && !selectedId) {
      setSelectedId(recipes[0].id);
    }
  }, [recipes, selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    setFetching(true);
    recipeService.getById(selectedId)
      .then(r => {
        setDetail(r.data);
        setServings(r.data.servings || 4);
      })
      .catch(() => setDetail(null))
      .finally(() => setFetching(false));
  }, [selectedId]);

  const scale = (val) => {
    if (!val || !detail?.servings) return 0;
    return ((val / detail.servings) * servings).toFixed(1);
  };

  const scaledCost = detail
    ? (parseFloat(detail.costPerServing || 0) * servings).toFixed(2)
    : '0.00';

  // Build AI menu items from all loaded active recipes
  const aiMenuItems = recipes
    .filter(r => r.status === 'ACTIVE')
    .map(r => ({
      displayName:  r.name,
      calories:     r.calories  || 0,
      protein:      r.protein   || 0,
      carbs:        r.carbs     || 0,
      fat:          r.fat       || 0,
      menuCategory: r.category,
    }));

  return (
    <div className="rn-page">

      <div className="rn-header">
        <div>
          <h2 className="rn-title"><Calculator size={20} /> Nutrition & Costing</h2>
          <p className="rn-subtitle">Analyze nutritional values and live cost per recipe</p>
        </div>
        {/* ── AI button in header ── */}
        {aiMenuItems.length > 0 && (
          <AICalorieTrigger
            onClick={() => setShowAI(true)}
            itemCount={aiMenuItems.length}
            label="AI Calorie Planner"
          />
        )}
      </div>

      <div className="rn-layout">

        {/* ── Sidebar ── */}
        <aside className="rn-sidebar">
          <h4 className="rn-sidebar-title">Recipes</h4>

          {loading ? (
            <div className="rn-sidebar-loading">
              <RefreshCw size={16} className="spin" />
            </div>
          ) : (
            <div className="rn-recipe-list">
              {recipes.map(r => (
                <button
                  key={r.id}
                  className={`rn-recipe-item ${selectedId === r.id ? 'active' : ''}`}
                  onClick={() => setSelectedId(r.id)}
                >
                  <div className="rn-ri-icon"><ChefHat size={14} /></div>
                  <div className="rn-ri-info">
                    <span className="rn-ri-name">{r.name}</span>
                    <span className="rn-ri-cat">{r.category}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {detail && (
            <>
              {/* Serving adjuster */}
              <div className="rn-serving-box">
                <label>Servings</label>
                <div className="rn-serving-controls">
                  <button onClick={() => setServings(s => Math.max(1, s - 1))}>−</button>
                  <span>{servings}</span>
                  <button onClick={() => setServings(s => s + 1)}>+</button>
                </div>
              </div>

              {/* Allergens */}
              {parseList(detail.allergens).length > 0 && (
                <div className="rn-allergen-box">
                  <div className="rn-allergen-title">
                    <AlertTriangle size={13} /> Allergens
                  </div>
                  <div className="rn-allergen-tags">
                    {parseList(detail.allergens).map((a, i) => (
                      <span key={i} className="rn-allergen-tag">{a}</span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </aside>

        {/* ── Main ── */}
        <main className="rn-main">
          {fetching ? (
            <div className="rn-loading">
              <RefreshCw size={24} className="spin" />
              <p>Loading...</p>
            </div>
          ) : !detail ? (
            <div className="rn-empty">
              <ChefHat size={40} />
              <p>Select a recipe to view nutrition</p>
            </div>
          ) : (
            <>
              {/* Recipe meta */}
              <div className="rn-recipe-meta">
                <div>
                  <h2 className="rn-recipe-name">{detail.name}</h2>
                  <div className="rn-recipe-stats">
                    <span><Clock size={13} /> {(detail.prepTime || 0) + (detail.cookTime || 0)} min</span>
                    <span><Users size={13} /> {servings} servings</span>
                    <span className="rn-branch-chip">{detail.branchName}</span>
                  </div>
                </div>
              </div>

              {/* Nutrition cards */}
              <div className="rn-nut-grid">
                {[
                  { label: 'Calories',  val: scale(detail.calories), unit: 'kcal', icon: Flame,       color: '#0061d2', trend: 'up'   },
                  { label: 'Protein',   val: scale(detail.protein),  unit: 'g',    icon: TrendingUp,  color: '#10b981'               },
                  { label: 'Carbs',     val: scale(detail.carbs),    unit: 'g',    icon: Apple,       color: '#3b82f6', trend: 'down' },
                  { label: 'Fat',       val: scale(detail.fat),      unit: 'g',    icon: Droplets,    color: '#f59e0b'               },
                  { label: 'Fiber',     val: scale(detail.fiber),    unit: 'g',    icon: TrendingUp,  color: '#0061d2'               },
                  { label: 'Cost',      val: `₹${scaledCost}`,       unit: 'total',icon: IndianRupee,  color: '#ec4899'               },
                ].map(n => (
                  <div key={n.label} className="rn-nut-card" style={{ '--accent': n.color }}>
                    <div className="rn-nut-icon" style={{ background: n.color + '18' }}>
                      <n.icon size={18} style={{ color: n.color }} />
                    </div>
                    <div className="rn-nut-body">
                      <div className="rn-nut-val">{n.val}</div>
                      <div className="rn-nut-label">{n.label} <span>{n.unit}</span></div>
                    </div>
                    {n.trend && (
                      <div className="rn-nut-trend" style={{ color: n.color }}>
                        {n.trend === 'up'
                          ? <TrendingUp size={14} />
                          : <TrendingDown size={14} />}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Ingredient breakdown */}
              {(detail.ingredients || []).length > 0 && (
                <div className="rn-breakdown-card">
                  <h4 className="rn-breakdown-title">
                    Ingredient Cost Breakdown
                    <span>for {servings} serving{servings !== 1 ? 's' : ''}</span>
                  </h4>
                  <div className="rn-breakdown-list">
                    {detail.ingredients.map(ing => {
                      const scaledLineCost = (
                        (parseFloat(ing.lineCost || 0) / detail.servings) * servings
                      ).toFixed(2);
                      const pct = detail.totalCost > 0
                        ? Math.round((ing.lineCost / detail.totalCost) * 100)
                        : 0;
                      return (
                        <div key={ing.id} className="rn-breakdown-row">
                          <span className="rn-bd-name">{ing.ingredientName}</span>
                          <div className="rn-bd-bar-wrap">
                            <div className="rn-bd-bar">
                              <div className="rn-bd-fill" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="rn-bd-pct">{pct}%</span>
                          </div>
                          <span className="rn-bd-cost">₹{scaledLineCost}</span>
                        </div>
                      );
                    })}
                    <div className="rn-breakdown-total">
                      <span>Total</span>
                      <strong>₹{scaledCost}</strong>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* ── AI Calorie Assistant modal ── */}
      {showAI && (
        <AICalorieAssistant
          menuItems={aiMenuItems}
          onClose={() => setShowAI(false)}
        />
      )}

      <style>{`
        .rn-page { }
        .rn-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:20px; flex-wrap:wrap; gap:10px; }
        .rn-title { display:flex;align-items:center;gap:8px;font-size:20px;font-weight:700;color:#1f2937;margin:0 0 4px; }
        .rn-subtitle { font-size:13px;color:#6b7280;margin:0; }

        .rn-layout { display:grid;grid-template-columns:240px 1fr;gap:20px;align-items:start; }
        @media(max-width:768px) { .rn-layout { grid-template-columns:1fr; } }

        /* Sidebar */
        .rn-sidebar { background:#fff;border-radius:16px;border:1px solid #e5e7eb;padding:16px;position:sticky;top:20px; }
        .rn-sidebar-title { font-size:12px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.5px;margin:0 0 12px; }
        .rn-sidebar-loading { display:flex;justify-content:center;padding:20px; }
        .rn-recipe-list { display:flex;flex-direction:column;gap:4px;max-height:300px;overflow-y:auto;margin-bottom:16px; }
        .rn-recipe-item { display:flex;align-items:center;gap:10px;padding:8px 10px;background:none;border:none;border-radius:8px;cursor:pointer;transition:all .15s;text-align:left;width:100%; }
        .rn-recipe-item:hover { background:#fafafa; }
        .rn-recipe-item.active { background:rgba(0,97,210,.1); }
        .rn-ri-icon { width:28px;height:28px;background:#f1f5f9;border-radius:6px;display:flex;align-items:center;justify-content:center;color:#6b7280;flex-shrink:0; }
        .rn-recipe-item.active .rn-ri-icon { background:rgba(0,97,210,.15);color:#0061d2; }
        .rn-ri-info { display:flex;flex-direction:column; }
        .rn-ri-name { font-size:13px;font-weight:500;color:#1f2937; }
        .rn-ri-cat { font-size:11px;color:#9ca3af; }

        .rn-serving-box { border-top:1px solid #f1f5f9;padding-top:14px;margin-top:4px; }
        .rn-serving-box label { font-size:12px;font-weight:600;color:#6b7280;display:block;margin-bottom:8px; }
        .rn-serving-controls { display:flex;align-items:center;gap:10px; }
        .rn-serving-controls button { width:30px;height:30px;background:#f1f5f9;border:1px solid #e5e7eb;border-radius:8px;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s; }
        .rn-serving-controls button:hover { background:#e8f0fd;border:1px solid #b3ccf5;color:#0052b3;border-color:#0061d2; }
        .rn-serving-controls span { font-size:18px;font-weight:800;color:#1f2937;min-width:24px;text-align:center; }

        .rn-allergen-box { background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:10px;margin-top:12px; }
        .rn-allergen-title { display:flex;align-items:center;gap:5px;font-size:11px;font-weight:700;color:#92400e;margin-bottom:8px; }
        .rn-allergen-tags { display:flex;flex-wrap:wrap;gap:4px; }
        .rn-allergen-tag { font-size:10px;font-weight:600;padding:2px 6px;background:#fef3c7;color:#92400e;border-radius:4px; }

        /* Main */
        .rn-main { }
        .rn-loading,.rn-empty { display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:60px;color:#9ca3af;text-align:center;background:#fff;border-radius:16px;border:1px solid #e5e7eb; }

        .rn-recipe-meta { background:#fff;border-radius:16px;border:1px solid #e5e7eb;padding:20px;margin-bottom:16px; }
        .rn-recipe-name { font-size:22px;font-weight:800;color:#1f2937;margin:0 0 8px; }
        .rn-recipe-stats { display:flex;gap:14px;flex-wrap:wrap;align-items:center; }
        .rn-recipe-stats span { display:flex;align-items:center;gap:5px;font-size:13px;color:#6b7280; }
        .rn-branch-chip { font-size:11px;font-weight:600;padding:3px 8px;background:#f0fdf4;color:#15803d;border-radius:20px; }

        .rn-nut-grid { display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px; }
        @media(max-width:600px) { .rn-nut-grid { grid-template-columns:repeat(2,1fr); } }
        .rn-nut-card { background:#fff;border-radius:14px;border:1px solid #e5e7eb;border-top:3px solid var(--accent);padding:16px;display:flex;align-items:center;gap:12px;transition:transform .15s; }
        .rn-nut-card:hover { transform:translateY(-2px); }
        .rn-nut-icon { width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0; }
        .rn-nut-body { flex:1; }
        .rn-nut-val { font-size:22px;font-weight:800;color:#1f2937;line-height:1.1; }
        .rn-nut-label { font-size:12px;color:#6b7280; }
        .rn-nut-label span { color:#9ca3af; }
        .rn-nut-trend { margin-left:auto; }

        .rn-breakdown-card { background:#fff;border-radius:16px;border:1px solid #e5e7eb;padding:20px; }
        .rn-breakdown-title { display:flex;align-items:center;justify-content:space-between;font-size:14px;font-weight:700;color:#1f2937;margin:0 0 16px; }
        .rn-breakdown-title span { font-size:12px;font-weight:400;color:#9ca3af; }
        .rn-breakdown-list { display:flex;flex-direction:column;gap:10px; }
        .rn-breakdown-row { display:grid;grid-template-columns:120px 1fr 60px;gap:10px;align-items:center; }
        .rn-bd-name { font-size:12px;color:#374151;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
        .rn-bd-bar-wrap { display:flex;align-items:center;gap:6px; }
        .rn-bd-bar { flex:1;height:6px;background:#f1f5f9;border-radius:3px;overflow:hidden; }
        .rn-bd-fill { height:100%;background:#0061d2;border-radius:3px;transition:width .4s; }
        .rn-bd-pct { font-size:11px;color:#9ca3af;width:28px;text-align:right; }
        .rn-bd-cost { font-size:13px;font-weight:600;color:#0061d2;text-align:right; }
        .rn-breakdown-total { display:flex;justify-content:space-between;align-items:center;padding-top:12px;border-top:2px solid #f1f5f9;font-size:14px;font-weight:700;color:#1f2937; }
        .rn-breakdown-total strong { color:#0061d2; }

        .spin { animation:rn-spin .8s linear infinite; }
        @keyframes rn-spin { to { transform:rotate(360deg); } }
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


export default RecipeNutrition;