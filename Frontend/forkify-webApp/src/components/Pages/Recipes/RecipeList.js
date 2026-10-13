import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  ChefHat, Search, Plus, Edit2, Trash2, Eye, Play,
  Clock, Users, IndianRupee, Filter, Tag, Flame,
  AlertTriangle, RefreshCw, Lock,
} from 'lucide-react';
import { fetchRecipes, deleteRecipe, clearRecipeError } from '../../../store/actions/recipeActions';
import usePermission from '../../../hooks/usePermission';
import AICalorieAssistant, { AICalorieTrigger } from '../../AI/AICalorieAssistant'; // ← NEW

const STATUS_COLORS = {
  ACTIVE:   { bg: '#dcfce7', color: '#15803d', label: 'Active'   },
  DRAFT:    { bg: '#fef9c3', color: '#a16207', label: 'Draft'    },
  ARCHIVED: { bg: '#f1f5f9', color: '#64748b', label: 'Archived' },
};

// Normalise tags: backend sends a comma-separated string, frontend expects array
const parseTags = (tags) => {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags.filter(Boolean);
  return String(tags).split(',').map(t => t.trim()).filter(Boolean);
};


const RecipeList = () => {
  const dispatch   = useDispatch();
  const navigate   = useNavigate();
  const { isHQ, canEditMasterData } = usePermission();
  const { recipes, loading, error } = useSelector(s => s.recipes);

  const [search,        setSearch]        = useState('');
  const [category,      setCategory]      = useState('all');
  const [categories,    setCategories]    = useState([]);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [showAI,        setShowAI]        = useState(false); // ← NEW

  const load = useCallback(() => {
    const params = {};
    if (search)             params.search   = search;
    if (category !== 'all') params.category = category;
    dispatch(fetchRecipes(params));
  }, [dispatch, search, category]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    import('../../../services/recipeService')
      .then(m => m.default.getCategories())
      .then(r => setCategories(r.data || []))
      .catch(() => setCategories([]));
  }, []);

  const handleDelete = async (id) => {
    const result = await dispatch(deleteRecipe(id));
    if (result.success) setConfirmDelete(null);
  };

  const filtered = recipes.filter(r => {
    const matchSearch   = !search || r.name.toLowerCase().includes(search.toLowerCase());
    const matchCategory = category === 'all' || r.category === category;
    return matchSearch && matchCategory;
  });

  // Shape active recipes as menu-item-like objects for the AI assistant
  const aiMenuItems = filtered
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
    <div className="recipe-list-page">

      {/* ── Header ── */}
      <div className="rl-header">
        <div>
          <h2 className="rl-title"><ChefHat size={22} /> Recipe Library</h2>
          <p className="rl-subtitle">
            {filtered.length} recipe{filtered.length !== 1 ? 's' : ''} found
          </p>
        </div>
        <div className="rl-header-actions">
          {/* ── AI Calorie Planner button ── */}
          {aiMenuItems.length > 0 && (
            <AICalorieTrigger
              onClick={() => setShowAI(true)}
              itemCount={aiMenuItems.length}
              label="AI Nutrition Planner"
            />
          )}

          <button className="rl-btn-ghost" onClick={load} disabled={loading}>
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
          </button>
          {(isHQ || true) && (
            <button className="rl-btn-primary" onClick={() => navigate('/fooderp/recipes/add')}>
              <Plus size={16} /> New Recipe
            </button>
          )}
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="rl-error-banner">
          <AlertTriangle size={16} />
          <span>{error}</span>
          <button onClick={() => dispatch(clearRecipeError())}>✕</button>
        </div>
      )}

      {/* ── Filters ── */}
      <div className="rl-filters">
        <div className="rl-search">
          <Search size={15} />
          <input
            placeholder="Search recipes..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="rl-filter-select">
          <Filter size={14} />
          <select value={category} onChange={e => setCategory(e.target.value)}>
            <option value="all">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* ── Table ── */}
      {loading && recipes.length === 0 ? (
        <div className="rl-loading">
          <RefreshCw size={24} className="spin" />
          <p>Loading recipes...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rl-empty">
          <ChefHat size={48} />
          <h3>No recipes found</h3>
          <p>Try adjusting your search or create a new recipe</p>
          <button className="rl-btn-primary" onClick={() => navigate('/fooderp/recipes/add')}>
            <Plus size={16} /> Create First Recipe
          </button>
        </div>
      ) : (
        <div className="rl-table-wrap">
          <table className="rl-table">
            <thead>
              <tr>
                <th>Recipe</th>
                <th>Category</th>
                <th>Servings</th>
                <th>Prep + Cook</th>
                <th>Calories</th>{/* ← NEW column */}
                <th>Cost / Serving</th>
                <th>Tags</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(recipe => {
                const sc = STATUS_COLORS[recipe.status] || STATUS_COLORS.DRAFT;
                return (
                  <tr key={recipe.id} className="rl-row">
                    <td>
                      <div className="rl-name-cell">
                        <div className="rl-recipe-icon">
                          <ChefHat size={14} />
                        </div>
                        <div>
                          <div className="rl-recipe-name">{recipe.name}</div>
                          <div className="rl-recipe-branch">{recipe.branchName}</div>
                        </div>
                        {recipe.hqOwned && (
                          <span className="rl-hq-badge"><Lock size={10} /> HQ</span>
                        )}
                      </div>
                    </td>
                    <td><span className="rl-category-tag">{recipe.category}</span></td>
                    <td>
                      <span className="rl-meta-chip">
                        <Users size={12} /> {recipe.servings}
                      </span>
                    </td>
                    <td>
                      <span className="rl-meta-chip">
                        <Clock size={12} /> {(recipe.prepTime || 0) + (recipe.cookTime || 0)} min
                      </span>
                    </td>
                    {/* ── Calories column (NEW) ── */}
                    <td>
                      {recipe.calories > 0 ? (
                        <span className="rl-cal-chip">
                          <Flame size={11} /> {recipe.calories} kcal
                        </span>
                      ) : (
                        <span style={{ fontSize:12, color:'#9ca3af' }}>—</span>
                      )}
                    </td>
                    <td>
                      <span className="rl-cost">
                        <IndianRupee size={12} />
                        {recipe.costPerServing != null
                          ? parseFloat(recipe.costPerServing).toFixed(2)
                          : '—'}
                      </span>
                    </td>
                    <td>
                      <div className="rl-tags">
                        {parseTags(recipe.tags).slice(0, 2).map((t, i) => (
                          <span key={i} className="rl-tag">
                            <Tag size={10} /> {t}
                          </span>
                        ))}
                        {parseTags(recipe.tags).length > 2 && (
                          <span className="rl-tag-more">+{parseTags(recipe.tags).length - 2}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="rl-status-badge"
                        style={{ background: sc.bg, color: sc.color }}>
                        {sc.label}
                      </span>
                    </td>
                    <td>
                      <div className="rl-actions">
                        <button
                          className="rl-action-btn"
                          title="View details"
                          onClick={() => navigate(`/fooderp/recipes/${recipe.id}`)}
                        >
                          <Eye size={14} />
                        </button>
                        {recipe.status === 'ACTIVE' && (
                          <button
                            className="rl-action-btn produce"
                            title="Log Production"
                            onClick={() => navigate(`/fooderp/recipes/${recipe.id}/produce`)}
                          >
                            <Play size={14} />
                          </button>
                        )}
                        {!recipe.hqOwned || canEditMasterData ? (
                          <button
                            className="rl-action-btn"
                            title="Edit"
                            onClick={() => navigate(`/fooderp/recipes/${recipe.id}/edit`)}
                          >
                            <Edit2 size={14} />
                          </button>
                        ) : (
                          <button className="rl-action-btn disabled" title="HQ-owned — read only" disabled>
                            <Lock size={14} />
                          </button>
                        )}
                        {canEditMasterData && (
                          <button
                            className="rl-action-btn danger"
                            title="Delete"
                            onClick={() => setConfirmDelete(recipe)}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Delete confirm modal ── */}
      {confirmDelete && (
        <div className="rl-modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="rl-modal" onClick={e => e.stopPropagation()}>
            <div className="rl-modal-icon"><Trash2 size={28} /></div>
            <h3>Delete Recipe</h3>
            <p>Are you sure you want to delete <strong>{confirmDelete.name}</strong>?
              This cannot be undone.</p>
            <div className="rl-modal-actions">
              <button className="rl-btn-ghost" onClick={() => setConfirmDelete(null)}>
                Cancel
              </button>
              <button
                className="rl-btn-danger"
                onClick={() => handleDelete(confirmDelete.id)}
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── AI Calorie Assistant modal ── */}
      {showAI && (
        <AICalorieAssistant
          menuItems={aiMenuItems}
          onClose={() => setShowAI(false)}
        />
      )}

      <style>{`
        .rl-header { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:20px; flex-wrap:wrap; gap:10px; }
        .rl-title { display:flex; align-items:center; gap:8px; font-size:20px; font-weight:700; color:#1f2937; margin:0 0 4px; }
        .rl-subtitle { font-size:13px; color:#6b7280; margin:0; }
        .rl-header-actions { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
        .rl-btn-primary { display:flex; align-items:center; gap:6px; padding:8px 16px; background:#e8f0fd; border:1px solid #b3ccf5; color:#0052b3; border-radius:8px; font-size:13px; font-weight:600; cursor:pointer; transition:background .15s; }
        .rl-btn-primary:hover { background:#d4e4fb; }
        .rl-btn-ghost { display:flex; align-items:center; justify-content:center; width:34px; height:34px; background:#f0f2f7; border:1px solid #e2e6ef; border-radius:8px; cursor:pointer; color:#6b7280; transition:background .15s; }
        .rl-btn-ghost:hover { background:#e8ebf2; color:#1f2937; }
        .rl-btn-danger { padding:8px 16px; background:#fef2f2; color:#dc2626; border:1px solid #fecaca; border-radius:8px; font-size:13px; font-weight:600; cursor:pointer; transition:background .15s; }
        .rl-btn-danger:hover { background:#fee2e2; }

        .rl-error-banner { display:flex; align-items:center; gap:8px; padding:10px 14px; background:#fef2f2; border:1px solid #fecaca; border-radius:8px; color:#dc2626; font-size:13px; margin-bottom:16px; }
        .rl-error-banner button { margin-left:auto; background:none; border:none; color:#dc2626; cursor:pointer; font-size:16px; }

        .rl-filters { display:flex; gap:12px; margin-bottom:16px; flex-wrap:wrap; }
        .rl-search { display:flex; align-items:center; gap:8px; padding:8px 12px; background:#fff; border:1px solid #e5e7eb; border-radius:8px; flex:1; min-width:200px; }
        .rl-search:focus-within { border-color:#0061d2; box-shadow:0 0 0 3px rgba(0,97,210,.1); }
        .rl-search input { border:none; outline:none; font-size:13px; color:#1f2937; flex:1; background:transparent; }
        .rl-filter-select { display:flex; align-items:center; gap:6px; padding:8px 12px; background:#fff; border:1px solid #e5e7eb; border-radius:8px; color:#6b7280; }
        .rl-filter-select select { border:none; outline:none; font-size:13px; color:#1f2937; background:transparent; cursor:pointer; }

        .rl-table-wrap { background:#fff; border-radius:12px; border:1px solid #e5e7eb; overflow:hidden; }
        .rl-table { width:100%; border-collapse:collapse; }
        .rl-table thead tr { background:#f8fafc; border-bottom:1px solid #e5e7eb; }
        .rl-table th { padding:12px 16px; text-align:left; font-size:11px; font-weight:700; color:#6b7280; text-transform:uppercase; letter-spacing:.5px; white-space:nowrap; }
        .rl-row { border-bottom:1px solid #f1f5f9; transition:background .1s; }
        .rl-row:last-child { border-bottom:none; }
        .rl-row:hover { background:#fafafa; }
        .rl-table td { padding:12px 16px; vertical-align:middle; }

        .rl-name-cell { display:flex; align-items:center; gap:10px; }
        .rl-recipe-icon { width:32px; height:32px; background:rgba(0,97,210,.1); border-radius:8px; display:flex; align-items:center; justify-content:center; color:#0061d2; flex-shrink:0; }
        .rl-recipe-name { font-size:13px; font-weight:600; color:#1f2937; }
        .rl-recipe-branch { font-size:11px; color:#9ca3af; margin-top:1px; }
        .rl-hq-badge { display:flex; align-items:center; gap:3px; font-size:9px; font-weight:700; padding:2px 6px; background:rgba(0,97,210,.1); color:#0061d2; border-radius:4px; white-space:nowrap; }

        .rl-category-tag { font-size:11px; font-weight:600; padding:3px 8px; background:#f0fdf4; color:#15803d; border-radius:20px; }
        .rl-meta-chip { display:inline-flex; align-items:center; gap:4px; font-size:12px; color:#6b7280; }
        .rl-cost { display:inline-flex; align-items:center; gap:2px; font-size:13px; font-weight:600; color:#0061d2; }

        /* Calorie chip — NEW */
        .rl-cal-chip { display:inline-flex; align-items:center; gap:4px; font-size:12px; font-weight:600; color:#0052b3; background:rgba(0,97,210,.08); border:1px solid rgba(0,97,210,.15); border-radius:20px; padding:2px 8px; }

        .rl-tags { display:flex; gap:4px; flex-wrap:wrap; }
        .rl-tag { display:inline-flex; align-items:center; gap:3px; font-size:10px; padding:2px 6px; background:#f1f5f9; color:#64748b; border-radius:20px; }
        .rl-tag-more { font-size:10px; color:#9ca3af; }

        .rl-status-badge { font-size:11px; font-weight:700; padding:3px 8px; border-radius:20px; }

        .rl-actions { display:flex; gap:4px; }
        .rl-action-btn { width:28px; height:28px; display:flex; align-items:center; justify-content:center; background:#f0f2f7; border:1px solid #e2e6ef; border-radius:6px; cursor:pointer; color:#6b7280; transition:all .15s; }
        .rl-action-btn:hover { background:rgba(0,97,210,.1); color:#0061d2; border-color:rgba(0,97,210,.15); }
        .rl-action-btn.produce { background:rgba(16,185,129,.1); border-color:rgba(16,185,129,.25); color:#15803d; }
        .rl-action-btn.produce:hover { background:rgba(16,185,129,.18); }
        .rl-action-btn.danger:hover { background:rgba(239,68,68,.1); color:#ef4444; border-color:rgba(239,68,68,.2); }
        .rl-action-btn.disabled { opacity:.35; cursor:not-allowed; }

        .rl-loading { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:12px; padding:60px; color:#9ca3af; }
        .rl-empty { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:12px; padding:60px; color:#9ca3af; text-align:center; background:#fff; border-radius:12px; border:1px solid #e5e7eb; }
        .rl-empty h3 { font-size:18px; font-weight:600; color:#374151; margin:0; }
        .rl-empty p { font-size:14px; margin:0; }

        .rl-modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.5); display:flex; align-items:center; justify-content:center; z-index:1000; }
        .rl-modal { background:#fff; border-radius:16px; padding:32px; max-width:400px; width:90%; text-align:center; box-shadow:0 20px 60px rgba(0,0,0,.2); }
        .rl-modal-icon { width:56px; height:56px; background:rgba(239,68,68,.1); border-radius:50%; display:flex; align-items:center; justify-content:center; color:#ef4444; margin:0 auto 16px; }
        .rl-modal h3 { font-size:18px; font-weight:700; color:#1f2937; margin:0 0 8px; }
        .rl-modal p { font-size:14px; color:#6b7280; margin:0 0 24px; }
        .rl-modal-actions { display:flex; gap:12px; justify-content:center; }

        .spin { animation: rl-spin .8s linear infinite; }
        @keyframes rl-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default RecipeList;