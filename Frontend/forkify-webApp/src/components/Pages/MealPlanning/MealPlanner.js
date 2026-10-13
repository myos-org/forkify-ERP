import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, Plus, Trash2, RefreshCw, ChefHat,
  Send, TrendingUp, AlertTriangle, CheckCircle,
  X, Search, Users, Clock,
} from 'lucide-react';
import mealPlanService from '../../../services/mealPlanService';
import recipeService   from '../../../services/recipeService';
import usePermission   from '../../../hooks/usePermission';
import useBranch       from '../../../hooks/useBranch';

const DAYS       = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const MEAL_TYPES = ['BREAKFAST','LUNCH','DINNER','SNACK'];
const MEAL_COLORS = {
  BREAKFAST:{ bg:'rgba(251,191,36,.13)', color:'#f59e0b', border:'rgba(251,191,36,.3)' },
  LUNCH:    { bg:'rgba(16,185,129,.13)', color:'#10b981', border:'rgba(16,185,129,.3)' },
  DINNER:   { bg:'rgba(99,102,241,.13)', color:'#6366f1', border:'rgba(99,102,241,.3)' },
  SNACK:    { bg:'rgba(236,72,153,.13)', color:'#ec4899', border:'rgba(236,72,153,.3)' },
};

const getISOWeek = (d) => {
  const date = new Date(d); date.setHours(0,0,0,0);
  date.setDate(date.getDate() + 3 - ((date.getDay()+6)%7));
  const w1 = new Date(date.getFullYear(),0,4);
  return 1 + Math.round(((date-w1)/86400000 - 3 + ((w1.getDay()+6)%7))/7);
};

export default function MealPlanner() {
  const navigate            = useNavigate();
  const { isHQ }            = usePermission();
  const { branchId }        = useBranch();

  const [week,        setWeek]        = useState(getISOWeek(new Date()));
  const [year,        setYear]        = useState(new Date().getFullYear());
  const [plans,       setPlans]       = useState([]);
  const [activePlan,  setActivePlan]  = useState(null);
  const [recipes,     setRecipes]     = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState(null);
  const [success,     setSuccess]     = useState(null);
  const [createModal, setCreateModal] = useState(false);
  const [planName,    setPlanName]    = useState('');
  const [addModal,    setAddModal]    = useState(null); // {day, mealType}
  const [recipeSearch,setRecipeSearch]= useState('');
  const [covers,      setCovers]      = useState(10);

  // ── keep a stable ref to activePlan so async saves don't close over stale value
  const activePlanRef = useRef(activePlan);
  useEffect(() => { activePlanRef.current = activePlan; }, [activePlan]);

  // ── Load recipes once ──────────────────────────────────────────────────────
  useEffect(() => {
    recipeService.getAll({ status:'ACTIVE' })
      .then(({ data }) => setRecipes(data || []))
      .catch(() => {});
  }, []);

  // ── Load plans whenever week/year/branch changes ───────────────────────────
  const loadPlans = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const { data } = await mealPlanService.getAll({ week, year, branchId });
      const list = data || [];
      setPlans(list);
      setActivePlan(prev => {
        if (!prev) return list[0] || null;
        const still = list.find(p => p.id === prev.id);
        return still || list[0] || null;
      });
    } catch { setError('Failed to load meal plans'); }
    finally { setLoading(false); }
  }, [week, year, branchId]);

  useEffect(() => { loadPlans(); }, [loadPlans]);

  useEffect(() => {
    if (success) { const t = setTimeout(() => setSuccess(null), 3000); return () => clearTimeout(t); }
  }, [success]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const getSlotItems = (day, mealType) =>
    (activePlan?.items || []).filter(i => i.day === day && i.mealType === mealType);

  const filteredRecipes = recipes.filter(r =>
    !recipeSearch ||
    r.name.toLowerCase().includes(recipeSearch.toLowerCase()) ||
    r.category?.toLowerCase().includes(recipeSearch.toLowerCase())
  );

  // ── Create plan ────────────────────────────────────────────────────────────
  const handleCreatePlan = async () => {
    if (!planName.trim()) return;
    setSaving(true);
    try {
      const { data } = await mealPlanService.create(
        { planName: planName.trim(), weekNumber: week, year, status: 'DRAFT', items: [] },
        branchId
      );
      setPlans(prev => [data, ...prev]);
      setActivePlan(data);
      setCreateModal(false); setPlanName('');
      setSuccess('Meal plan created');
    } catch (e) { setError(e.response?.data || 'Failed to create plan'); }
    finally { setSaving(false); }
  };

  // ── Core save — sends full item list to PUT, handles dedup ─────────────────
  const savePlan = useCallback(async (plan, newItems) => {
    setSaving(true);

    // Optimistic update immediately so rapid clicks read fresh state
    const optimistic = { ...plan, items: newItems };
    setActivePlan(optimistic);
    activePlanRef.current = optimistic;
    setPlans(prev => prev.map(p => p.id === plan.id ? optimistic : p));

    try {
      const { data } = await mealPlanService.update(plan.id, {
        planName:   plan.planName,
        weekNumber: plan.weekNumber,
        year:       plan.year,
        status:     plan.status,
        items: newItems.map(i => ({
          recipeId:       i.recipeId,
          day:            i.day,
          mealType:       i.mealType,
          expectedCovers: i.expectedCovers || 10,
          displayName:    i.displayName || i.recipeName,
          notes:          i.notes || null,
        })),
      });

      // Deduplicate server response — guards against Hibernate cascade double-insert
      const seen = new Set();
      const clean = { ...data, items: (data.items || []).filter(item => {
        const k = `${item.recipeId}:${item.day}:${item.mealType}`;
        return seen.has(k) ? false : (seen.add(k), true);
      })};

      setActivePlan(clean);
      activePlanRef.current = clean;
      setPlans(prev => prev.map(p => p.id === clean.id ? clean : p));
    } catch (e) {
      // Rollback
      setActivePlan(plan);
      activePlanRef.current = plan;
      setPlans(prev => prev.map(p => p.id === plan.id ? plan : p));
      setError(e.response?.data || 'Failed to save');
    } finally { setSaving(false); }
  }, []);

  // ── Add item ───────────────────────────────────────────────────────────────
  const handleAddItem = async (recipe) => {
    const plan = activePlanRef.current;
    if (!plan || !addModal) return;

    const newItems = [
      ...(plan.items || []),
      {
        recipeId:       recipe.id,
        recipeName:     recipe.name,
        recipeCategory: recipe.category,
        day:            addModal.day,
        mealType:       addModal.mealType,
        expectedCovers: covers,
        displayName:    recipe.name,
      },
    ];
    setAddModal(null); setRecipeSearch(''); setCovers(10);
    await savePlan(plan, newItems);
  };

  // ── Remove item ────────────────────────────────────────────────────────────
  const handleRemoveItem = async (item) => {
    const plan = activePlanRef.current;
    if (!plan) return;
    const newItems = (plan.items || []).filter(
      i => !(i.recipeId === item.recipeId && i.day === item.day && i.mealType === item.mealType)
    );
    await savePlan(plan, newItems);
  };

  // ── Push to branches ───────────────────────────────────────────────────────
  const handlePush = async () => {
    if (!activePlan) return;
    setSaving(true);
    try {
      await mealPlanService.pushToBranches(activePlan.id, []);
      setSuccess('Plan pushed to all branches');
      loadPlans();
    } catch (e) { setError(e.response?.data || 'Push failed'); }
    finally { setSaving(false); }
  };

  // ── Delete plan ────────────────────────────────────────────────────────────
  const handleDeletePlan = async () => {
    if (!activePlan || !window.confirm(`Delete "${activePlan.planName}"?`)) return;
    setSaving(true);
    try {
      await mealPlanService.delete(activePlan.id);
      const remaining = plans.filter(p => p.id !== activePlan.id);
      setPlans(remaining);
      setActivePlan(remaining[0] || null);
      setSuccess('Plan deleted');
    } catch (e) { setError(e.response?.data || 'Failed to delete'); }
    finally { setSaving(false); }
  };

  const totalItems  = (activePlan?.items || []).length;
  const totalCovers = (activePlan?.items || []).reduce((s,i) => s+(i.expectedCovers||0), 0);
  const daysCovered = DAYS.filter((_,i) => (activePlan?.items||[]).some(item => item.day === i+1)).length;

  return (
    <div className="mp-page">

      {/* ── Top bar ── */}
      <div className="mp-topbar">
        <div className="mp-topbar-left">
          <div className="mp-icon-wrap"><Calendar size={18}/></div>
          <div>
            <h2 className="mp-title">Meal Planner</h2>
            <p className="mp-sub">Weekly menu scheduling</p>
          </div>
        </div>
        <div className="mp-topbar-right">
          <div className="mp-week-nav">
            <button onClick={() => setWeek(w => w > 1 ? w-1 : (setYear(y=>y-1),52))}>‹</button>
            <span>Week {week}, {year}</span>
            <button onClick={() => setWeek(w => w < 52 ? w+1 : (setYear(y=>y+1),1))}>›</button>
          </div>
          <button className="mp-btn-outline" onClick={() => setCreateModal(true)}>
            <Plus size={14}/> New Plan
          </button>
          {activePlan && (
            <button className="mp-btn-ghost" onClick={() => navigate(`/fooderp/meal-planning/forecast?planId=${activePlan.id}`)}>
              <TrendingUp size={14}/> Forecast
            </button>
          )}
          {isHQ && activePlan && (
            <button className="mp-btn-primary" onClick={handlePush} disabled={saving}>
              <Send size={14}/> Push to Branches
            </button>
          )}
        </div>
      </div>

      {/* ── Banners ── */}
      {error   && <div className="mp-banner error"><AlertTriangle size={14}/>{error}<button onClick={()=>setError(null)}><X size={12}/></button></div>}
      {success && <div className="mp-banner success"><CheckCircle size={14}/>{success}</div>}
      {saving  && <div className="mp-banner info"><RefreshCw size={13} className="spin"/> Saving...</div>}

      {/* ── Plan tabs ── */}
      {plans.length > 0 && (
        <div className="mp-plan-tabs">
          {plans.map(p => (
            <button key={p.id} className={`mp-plan-tab ${activePlan?.id===p.id?'active':''}`} onClick={() => setActivePlan(p)}>
              {p.planName}
              <span className={`mp-chip ${p.status.toLowerCase()}`}>{p.status}</span>
            </button>
          ))}
        </div>
      )}

      {/* ── Stats bar ── */}
      {activePlan && (
        <div className="mp-stats">
          <div className="mp-stat"><span className="mp-stat-val">{totalItems}</span><span className="mp-stat-lbl">Meals</span></div>
          <div className="mp-stat"><span className="mp-stat-val">{totalCovers}</span><span className="mp-stat-lbl">Covers</span></div>
          <div className="mp-stat"><span className="mp-stat-val">{daysCovered}/7</span><span className="mp-stat-lbl">Days</span></div>
          <div className="mp-stat"><span className="mp-stat-val">{activePlan.status}</span><span className="mp-stat-lbl">Status</span></div>
          <div style={{marginLeft:'auto',display:'flex',gap:8}}>
            <button className="mp-btn-ghost mp-btn-sm" onClick={loadPlans} disabled={loading}>
              <RefreshCw size={12} className={loading?'spin':''}/> Refresh
            </button>
            <button className="mp-btn-danger mp-btn-sm" onClick={handleDeletePlan} disabled={saving}>
              <Trash2 size={12}/> Delete Plan
            </button>
          </div>
        </div>
      )}

      {/* ── Loading ── */}
      {loading && (
        <div className="mp-loading"><RefreshCw size={20} className="spin"/> Loading plans...</div>
      )}

      {/* ── Empty ── */}
      {!loading && plans.length === 0 && (
        <div className="mp-empty">
          <Calendar size={48}/>
          <h3>No plans for Week {week}, {year}</h3>
          <p>Create a meal plan to start scheduling</p>
          <button className="mp-btn-primary" onClick={() => setCreateModal(true)}>
            <Plus size={14}/> Create Meal Plan
          </button>
        </div>
      )}

      {/* ── Weekly Grid ── */}
      {activePlan && !loading && (
        <div className="mp-grid-wrap">
          <table className="mp-grid">
            <thead>
              <tr>
                <th className="mp-th mp-th-type">Meal</th>
                {DAYS.map(d => <th key={d} className="mp-th">{d}</th>)}
              </tr>
            </thead>
            <tbody>
              {MEAL_TYPES.map(mealType => {
                const cfg = MEAL_COLORS[mealType];
                return (
                  <tr key={mealType}>
                    <td className="mp-td-type" style={{borderLeft:`3px solid ${cfg.color}`}}>
                      <span style={{color:cfg.color,fontWeight:700,fontSize:11}}>{mealType}</span>
                    </td>
                    {DAYS.map((_,di) => {
                      const dayNum = di+1;
                      const items  = getSlotItems(dayNum, mealType);
                      return (
                        <td key={dayNum} className="mp-td">
                          {items.map((item, idx) => (
                            <div key={`${item.recipeId}-${idx}`} className="mp-chip-meal" style={{background:cfg.bg,borderColor:cfg.border}}>
                              <div className="mp-chip-name">{item.displayName||item.recipeName}</div>
                              <div className="mp-chip-meta"><Users size={10}/> {item.expectedCovers}</div>
                              <button className="mp-chip-del" onClick={() => handleRemoveItem(item)} title="Remove">
                                <X size={10}/>
                              </button>
                            </div>
                          ))}
                          <button className="mp-add-cell" onClick={() => setAddModal({day:dayNum,mealType})} title={`Add ${mealType}`}>
                            <Plus size={11}/>
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Create Plan Modal ── */}
      {createModal && (
        <div className="mp-overlay" onClick={()=>setCreateModal(false)}>
          <div className="mp-modal" onClick={e=>e.stopPropagation()}>
            <div className="mp-modal-hdr">
              <h3>New Meal Plan — Week {week}, {year}</h3>
              <button className="mp-modal-close" onClick={()=>setCreateModal(false)}><X size={15}/></button>
            </div>
            <div className="mp-modal-body">
              <label className="mp-label">Plan Name</label>
              <input
                className="mp-input"
                placeholder={`Week ${week} Menu`}
                value={planName}
                onChange={e=>setPlanName(e.target.value)}
                autoFocus
                onKeyDown={e=>e.key==='Enter'&&handleCreatePlan()}
              />
            </div>
            <div className="mp-modal-ftr">
              <button className="mp-btn-ghost" onClick={()=>setCreateModal(false)}>Cancel</button>
              <button className="mp-btn-primary" onClick={handleCreatePlan} disabled={saving||!planName.trim()}>
                {saving?<RefreshCw size={13} className="spin"/>:<Plus size={13}/>} Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Recipe Modal ── */}
      {addModal && (
        <div className="mp-overlay" onClick={()=>{setAddModal(null);setRecipeSearch('');setCovers(10);}}>
          <div className="mp-modal mp-modal-lg" onClick={e=>e.stopPropagation()}>
            <div className="mp-modal-hdr">
              <h3>Add {addModal.mealType} — {DAYS[addModal.day-1]}</h3>
              <button className="mp-modal-close" onClick={()=>{setAddModal(null);setRecipeSearch('');setCovers(10);}}><X size={15}/></button>
            </div>
            <div className="mp-modal-body">
              <div className="mp-covers-row">
                <label className="mp-label" style={{marginBottom:0,whiteSpace:'nowrap'}}><Users size={12}/> Expected Covers:</label>
                <input type="number" className="mp-input" style={{width:80}} value={covers} min={1} onChange={e=>setCovers(parseInt(e.target.value)||1)}/>
              </div>
              <div className="mp-search-wrap">
                <Search size={14}/>
                <input className="mp-search-in" placeholder="Search recipes..." value={recipeSearch} onChange={e=>setRecipeSearch(e.target.value)} autoFocus/>
                {recipeSearch && <button onClick={()=>setRecipeSearch('')}><X size={12}/></button>}
              </div>
              <div className="mp-recipe-list">
                {filteredRecipes.length === 0 ? (
                  <div className="mp-recipe-empty">No recipes found</div>
                ) : filteredRecipes.map(r => (
                  <div key={r.id} className="mp-recipe-row" onClick={()=>handleAddItem(r)}>
                    <div className="mp-recipe-row-left">
                      <ChefHat size={13} style={{color:'#0061d2',flexShrink:0}}/>
                      <span className="mp-recipe-name">{r.name}</span>
                    </div>
                    <div className="mp-recipe-meta">
                      <span>{r.category}</span>
                      {(r.prepTime+r.cookTime)>0 && <span><Clock size={10}/> {r.prepTime+r.cookTime}m</span>}
                      {r.costPerServing && <span>₹{Number(r.costPerServing).toFixed(0)}/srv</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .mp-page{font-family:'DM Sans',sans-serif;color:#1f2937;}
        .mp-topbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;flex-wrap:wrap;gap:12px;}
        .mp-topbar-left{display:flex;align-items:center;gap:12px;}
        .mp-topbar-right{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
        .mp-icon-wrap{width:38px;height:38px;background:rgba(0,97,210,.12);border-radius:10px;display:flex;align-items:center;justify-content:center;color:#0061d2;}
        .mp-title{font-size:20px;font-weight:700;color:#1f2937;margin:0 0 2px;}
        .mp-sub{font-size:12px;color:#9ca3af;margin:0;}

        .mp-week-nav{display:flex;align-items:center;gap:8px;background:#f8f9fc;border:1px solid #e5e7eb;border-radius:9px;padding:5px 10px;}
        .mp-week-nav button{background:none;border:none;cursor:pointer;font-size:16px;color:#9ca3af;padding:0 3px;}
        .mp-week-nav button:hover{color:#1f2937;}
        .mp-week-nav span{font-size:13px;font-weight:600;color:#1f2937;white-space:nowrap;}

        .mp-btn-ghost{display:flex;align-items:center;gap:6px;padding:8px 13px;background:#f0f2f7;border:1px solid #e2e6ef;border-radius:9px;color:#374151;font-size:13px;cursor:pointer;white-space:nowrap;}
        .mp-btn-ghost:hover{background:#e8ebf2;}
        .mp-btn-ghost:disabled{opacity:.5;cursor:not-allowed;}
        .mp-btn-outline{display:flex;align-items:center;gap:6px;padding:8px 13px;background:#fff;border:1px solid #e2e6ef;border-radius:9px;color:#374151;font-size:13px;cursor:pointer;white-space:nowrap;}
        .mp-btn-outline:hover{background:#f0f2f7;}
        .mp-btn-primary{display:flex;align-items:center;gap:6px;padding:8px 14px;background:#e8f0fd;border:1px solid #b3ccf5;border-radius:9px;color:#0052b3;font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap;}
        .mp-btn-primary:hover:not(:disabled){background:#d4e4fb;}
        .mp-btn-primary:disabled{opacity:.45;cursor:not-allowed;}
        .mp-btn-danger{display:flex;align-items:center;gap:6px;padding:8px 13px;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.2);border-radius:9px;color:#ef4444;font-size:13px;cursor:pointer;}
        .mp-btn-danger:hover{background:rgba(239,68,68,.15);}
        .mp-btn-sm{padding:5px 10px;font-size:12px;}

        .mp-banner{display:flex;align-items:center;gap:8px;padding:9px 13px;border-radius:9px;font-size:13px;margin-bottom:12px;}
        .mp-banner button{background:none;border:none;cursor:pointer;margin-left:auto;}
        .mp-banner.error  {background:#fef2f2;border:1px solid #fecaca;color:#dc2626;}
        .mp-banner.success{background:#f0fdf4;border:1px solid #bbf7d0;color:#15803d;}
        .mp-banner.info   {background:#eff6ff;border:1px solid #bfdbfe;color:#1d4ed8;}

        .mp-plan-tabs{display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap;}
        .mp-plan-tab{display:flex;align-items:center;gap:8px;padding:7px 14px;background:#fff;border:1px solid #e5e7eb;border-radius:9px;color:#6b7280;font-size:13px;cursor:pointer;transition:all .15s;}
        .mp-plan-tab:hover{background:#f0f2f7;}
        .mp-plan-tab.active{background:#eff6ff;border-color:#bfdbfe;color:#1d4ed8;}
        .mp-chip{font-size:9px;font-weight:700;text-transform:uppercase;padding:2px 6px;border-radius:4px;letter-spacing:.4px;}
        .mp-chip.draft   {background:#f3f4f6;color:#9ca3af;}
        .mp-chip.active  {background:#dcfce7;color:#15803d;}
        .mp-chip.pushed  {background:#eff6ff;color:#1d4ed8;}
        .mp-chip.archived{background:#f3f4f6;color:#9ca3af;}

        .mp-stats{display:flex;align-items:center;gap:20px;background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:12px 18px;margin-bottom:16px;flex-wrap:wrap;}
        .mp-stat{display:flex;flex-direction:column;gap:2px;}
        .mp-stat-val{font-size:20px;font-weight:800;color:#1f2937;line-height:1;}
        .mp-stat-lbl{font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:.5px;}

        .mp-loading,.mp-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:48px;color:#9ca3af;text-align:center;}
        .mp-empty h3{font-size:17px;color:#374151;font-weight:600;margin:0;}
        .mp-empty p{font-size:13px;margin:0;}

        .mp-grid-wrap{overflow-x:auto;border-radius:14px;border:1px solid #e5e7eb;}
        .mp-grid{width:100%;border-collapse:collapse;min-width:920px;}
        .mp-th{padding:10px 8px;font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.5px;text-align:left;background:#f8fafc;border-bottom:1px solid #e5e7eb;white-space:nowrap;}
        .mp-th-type{width:90px;}
        .mp-td-type{padding:10px 12px;background:#fafafa;border-right:1px solid #f1f5f9;border-bottom:1px solid #f1f5f9;vertical-align:top;white-space:nowrap;}
        .mp-td{padding:6px;border-right:1px solid #f9fafb;border-bottom:1px solid #f1f5f9;vertical-align:top;min-width:110px;}
        tr:last-child .mp-td,tr:last-child .mp-td-type{border-bottom:none;}

        .mp-chip-meal{position:relative;border:1px solid;border-radius:8px;padding:5px 22px 5px 7px;margin-bottom:4px;}
        .mp-chip-name{font-size:11px;font-weight:600;color:#1f2937;line-height:1.3;}
        .mp-chip-meta{display:flex;align-items:center;gap:3px;font-size:10px;color:#9ca3af;margin-top:2px;}
        .mp-chip-del{position:absolute;top:4px;right:4px;background:rgba(239,68,68,.1);border:none;border-radius:3px;padding:2px;cursor:pointer;color:rgba(239,68,68,.5);display:flex;opacity:0;transition:opacity .15s;}
        .mp-chip-meal:hover .mp-chip-del{opacity:1;}
        .mp-chip-del:hover{background:rgba(239,68,68,.25);color:#ef4444;}

        .mp-add-cell{width:100%;padding:4px;background:none;border:1px dashed #e2e6ef;border-radius:7px;color:#d1d5db;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;}
        .mp-add-cell:hover{border-color:#0061d2;color:#0061d2;background:rgba(0,97,210,.05);}

        .mp-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:1000;padding:20px;}
        .mp-modal{background:#fff;border:1px solid #e5e7eb;border-radius:16px;width:100%;max-width:440px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.15);}
        .mp-modal-lg{max-width:560px;}
        .mp-modal-hdr{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid #e5e7eb;background:#f8fafc;}
        .mp-modal-hdr h3{margin:0;font-size:15px;font-weight:700;color:#1f2937;}
        .mp-modal-close{background:#e8f0fd;border:1px solid #b3ccf5;border-radius:7px;width:28px;height:28px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#0052b3;}
        .mp-modal-body{padding:18px 20px;}
        .mp-modal-ftr{display:flex;gap:10px;justify-content:flex-end;padding:14px 20px;border-top:1px solid #e5e7eb;background:#f8fafc;}

        .mp-label{display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#6b7280;margin-bottom:6px;}
        .mp-input{width:100%;padding:9px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;color:#1f2937;outline:none;font-family:inherit;box-sizing:border-box;}
        .mp-input:focus{border-color:#0061d2;box-shadow:0 0 0 3px rgba(0,97,210,.1);}

        .mp-covers-row{display:flex;align-items:center;gap:10px;margin-bottom:14px;}
        .mp-search-wrap{display:flex;align-items:center;gap:8px;padding:0 12px;background:#f8f9fc;border:1px solid #e5e7eb;border-radius:9px;margin-bottom:10px;}
        .mp-search-wrap button{background:none;border:none;cursor:pointer;color:#9ca3af;display:flex;}
        .mp-search-in{background:none;border:none;outline:none;color:#1f2937;font-size:13px;width:100%;padding:9px 0;}
        .mp-search-in::placeholder{color:#9ca3af;}

        .mp-recipe-list{max-height:320px;overflow-y:auto;}
        .mp-recipe-empty{padding:24px;text-align:center;color:#9ca3af;font-size:13px;}
        .mp-recipe-row{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 12px;border-radius:9px;cursor:pointer;transition:background .15s;}
        .mp-recipe-row:hover{background:rgba(0,97,210,.07);}
        .mp-recipe-row-left{display:flex;align-items:center;gap:7px;min-width:0;}
        .mp-recipe-name{font-size:13px;font-weight:600;color:#1f2937;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .mp-recipe-meta{display:flex;align-items:center;gap:8px;font-size:11px;color:#9ca3af;flex-shrink:0;}

        .spin{animation:spin .8s linear infinite;}
        @keyframes spin{to{transform:rotate(360deg);}}
      `}</style>
    </div>
  );
}