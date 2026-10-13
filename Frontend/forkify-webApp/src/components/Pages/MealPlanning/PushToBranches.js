import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Send, ArrowLeft, Store, CheckCircle, AlertTriangle,
  RefreshCw, Calendar, ChevronDown, Globe,
} from 'lucide-react';
import mealPlanService from '../../../services/mealPlanService';
import branchService   from '../../../services/branchService';

const PushToBranches = () => {
  const navigate = useNavigate();

  const [plans,          setPlans]          = useState([]);
  const [branches,       setBranches]       = useState([]);
  const [selectedPlan,   setSelectedPlan]   = useState('');
  const [selectedBranches, setSelectedBranches] = useState([]); // empty = all
  const [pushAll,        setPushAll]        = useState(true);
  const [pushing,        setPushing]        = useState(false);
  const [result,         setResult]         = useState(null);
  const [error,          setError]          = useState(null);

  useEffect(() => {
    // Load HQ template plans (branch = null)
    mealPlanService.getAll({}).then(({ data }) => {
      setPlans((data || []).filter(p => !p.branchId));
    }).catch(() => {});

    branchService.getAll().then(({ data }) => {
      setBranches((data || []).filter(b => b.type !== 'HQ'));
    }).catch(() => {});
  }, []);

  const toggleBranch = (id) => {
    setSelectedBranches(prev =>
      prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]
    );
  };

  const handlePush = async () => {
    if (!selectedPlan) { setError('Select a meal plan first'); return; }
    setPushing(true);
    setError(null);
    setResult(null);
    try {
      const branchIds = pushAll ? [] : selectedBranches;
      const { data } = await mealPlanService.pushToBranches(selectedPlan, branchIds);
      setResult(data);
    } catch (e) {
      setError(e.response?.data || 'Push failed');
    } finally {
      setPushing(false);
    }
  };

  if (result) {
    return (
      <div className="pb-page">
        <style>{css}</style>
        <div className="pb-success">
          <div className="pb-success-icon"><CheckCircle size={48} /></div>
          <h2>Plan Pushed Successfully!</h2>
          <p>Meal plan sent to {result.length} branch(es)</p>
          <div className="pb-result-list">
            {result.map(plan => (
              <div key={plan.id} className="pb-result-item">
                <Store size={14} /> {plan.branchName}
                <span className="pb-result-status">Active</span>
              </div>
            ))}
          </div>
          <div style={{ display:'flex', gap:10, justifyContent:'center', marginTop:20 }}>
            <button className="pb-btn-primary" onClick={() => { setResult(null); setSelectedPlan(''); }}>
              Push Another Plan
            </button>
            <button className="pb-btn-ghost" onClick={() => navigate('/fooderp/meal-planning/weekly')}>
              Back to Planner
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-page">
      <style>{css}</style>

      <div className="pb-header">
        <button className="pb-btn-ghost" onClick={() => navigate('/fooderp/meal-planning/weekly')}>
          <ArrowLeft size={14} /> Back
        </button>
        <div className="pb-title-wrap">
          <div className="pb-title-icon"><Send size={18} /></div>
          <div>
            <h2 className="pb-title">Push to Branches</h2>
            <div className="pb-subtitle">Distribute HQ meal plan to franchises</div>
          </div>
        </div>
      </div>

      {error && <div className="pb-error"><AlertTriangle size={14} />{error}</div>}

      <div className="pb-form">

        {/* Step 1: Select plan */}
        <div className="pb-card">
          <div className="pb-card-num">1</div>
          <div className="pb-card-body">
            <div className="pb-card-title"><Calendar size={15} /> Select Meal Plan</div>
            <div className="pb-select-wrap">
              <select
                className="pb-select"
                value={selectedPlan}
                onChange={e => setSelectedPlan(e.target.value)}
              >
                <option value="">— Choose HQ template —</option>
                {plans.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.planName} (Week {p.weekNumber}, {p.year}) — {p.status}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="pb-select-icon" />
            </div>
            {plans.length === 0 && (
              <div className="pb-hint">No HQ template plans found. Create a plan without a branch first.</div>
            )}
          </div>
        </div>

        {/* Step 2: Select branches */}
        <div className="pb-card">
          <div className="pb-card-num">2</div>
          <div className="pb-card-body">
            <div className="pb-card-title"><Store size={15} /> Select Branches</div>
            <div className="pb-toggle-row">
              <label className="pb-toggle">
                <input
                  type="checkbox"
                  checked={pushAll}
                  onChange={e => { setPushAll(e.target.checked); setSelectedBranches([]); }}
                />
                <span className="pb-toggle-label">
                  <Globe size={13} /> Push to ALL active branches
                </span>
              </label>
            </div>
            {!pushAll && (
              <div className="pb-branch-grid">
                {branches.map(b => (
                  <label key={b.id} className={`pb-branch-item ${selectedBranches.includes(b.id) ? 'selected' : ''}`}>
                    <input
                      type="checkbox"
                      checked={selectedBranches.includes(b.id)}
                      onChange={() => toggleBranch(b.id)}
                      style={{ display:'none' }}
                    />
                    <Store size={14} />
                    <div>
                      <div className="pb-branch-name">{b.name}</div>
                      <div className="pb-branch-city">{b.city}</div>
                    </div>
                    {selectedBranches.includes(b.id) && (
                      <CheckCircle size={14} style={{ marginLeft:'auto', color:'#34d399' }} />
                    )}
                  </label>
                ))}
              </div>
            )}
            {!pushAll && selectedBranches.length === 0 && (
              <div className="pb-hint">Select at least one branch</div>
            )}
          </div>
        </div>

        {/* Summary */}
        {selectedPlan && (
          <div className="pb-summary">
            <div className="pb-summary-row">
              <span>Plan:</span>
              <strong>{plans.find(p => String(p.id) === String(selectedPlan))?.planName || '—'}</strong>
            </div>
            <div className="pb-summary-row">
              <span>Target:</span>
              <strong>
                {pushAll ? `All ${branches.length} branches` : `${selectedBranches.length} selected`}
              </strong>
            </div>
          </div>
        )}

        <button
          className="pb-submit"
          onClick={handlePush}
          disabled={pushing || !selectedPlan || (!pushAll && selectedBranches.length === 0)}
        >
          {pushing ? (
            <><RefreshCw size={16} className="spin" /> Pushing...</>
          ) : (
            <><Send size={16} /> Push Meal Plan</>
          )}
        </button>
      </div>
    </div>
  );
};

const css = `
  .pb-page { font-family:'DM Sans',sans-serif; color:#1f2937; max-width:640px; }
  .pb-header { display:flex; align-items:center; gap:12px; margin-bottom:22px; }
  .pb-title-wrap { display:flex; align-items:center; gap:12px; }
  .pb-title-icon { width:38px; height:38px; background:rgba(0,97,210,.15); border-radius:10px; display:flex; align-items:center; justify-content:center; color:#3385e0; }
  .pb-title    { font-size:20px; font-weight:700; color:#1f2937; margin:0 0 2px; }
  .pb-subtitle { font-size:12px; color:#9aa3b4; }
  .pb-btn-ghost   { display:flex; align-items:center; gap:6px; padding:8px 13px; background:#f0f2f7; border:1px solid #e2e6ef; border-radius:9px; color:#374151; font-size:13px; cursor:pointer; white-space:nowrap; }
  .pb-btn-ghost:hover { background:#e2e6ef; color:#0052b3; }
  .pb-btn-primary { display:flex; align-items:center; gap:6px; padding:9px 18px; background:#3385e0; border:none; border-radius:9px; color:#0052b3; font-size:13px; font-weight:600; cursor:pointer; }

  .pb-error { display:flex; align-items:center; gap:8px; background:rgba(239,68,68,.1); border:1px solid rgba(239,68,68,.25); border-radius:10px; padding:11px 14px; color:#fca5a5; font-size:13px; margin-bottom:14px; }

  .pb-form { display:flex; flex-direction:column; gap:14px; }
  .pb-card { display:flex; gap:14px; background:#ffffff; border:1px solid #e2e6ef; border-radius:14px; padding:18px 20px; }
  .pb-card-num { width:26px; height:26px; border-radius:50%; background:rgba(0,97,210,.15); border:1px solid rgba(0,97,210,.2); color:#3385e0; font-size:12px; font-weight:800; display:flex; align-items:center; justify-content:center; flex-shrink:0; margin-top:1px; }
  .pb-card-body { flex:1; }
  .pb-card-title { display:flex; align-items:center; gap:7px; font-size:13px; font-weight:700; color:#9aa3b4; margin-bottom:12px; }
  .pb-select-wrap { position:relative; }
  .pb-select { appearance:none; width:100%; background:#f0f2f7; border:1px solid #e2e6ef; border-radius:9px; padding:9px 32px 9px 12px; color:#1f2937; font-size:13px; outline:none; cursor:pointer; }
  .pb-select:focus { border-color:#3385e0; }
  .pb-select-icon { position:absolute; right:10px; top:50%; transform:translateY(-50%); color:#9aa3b4; pointer-events:none; }
  .pb-hint { font-size:12px; color:#9aa3b4; margin-top:8px; }

  .pb-toggle-row { margin-bottom:12px; }
  .pb-toggle { display:flex; align-items:center; gap:8px; cursor:pointer; }
  .pb-toggle input { width:16px; height:16px; accent-color:#3385e0; }
  .pb-toggle-label { display:flex; align-items:center; gap:6px; font-size:13px; color:#4b5263; }
  .pb-branch-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; max-height:220px; overflow-y:auto; }
  .pb-branch-item { display:flex; align-items:center; gap:8px; padding:10px 12px; background:#ffffff; border:1px solid #e2e6ef; border-radius:10px; cursor:pointer; transition:all .15s; color:#4b5263; font-size:13px; }
  .pb-branch-item:hover { background:#e2e6ef; color:#1f2937; }
  .pb-branch-item.selected { background:rgba(0,97,210,.12); border-color:rgba(0,97,210,.3); color:#1f2937; }
  .pb-branch-name { font-weight:600; font-size:13px; }
  .pb-branch-city { font-size:11px; color:#9aa3b4; }

  .pb-summary { background:#ffffff; border:1px solid #e2e6ef; border-radius:10px; padding:14px 16px; }
  .pb-summary-row { display:flex; justify-content:space-between; align-items:center; font-size:13px; color:#9aa3b4; padding:4px 0; }
  .pb-summary-row strong { color:#1f2937; }

  .pb-submit { width:100%; padding:13px; background:#3385e0; border:none; border-radius:12px; color:#0052b3; font-size:15px; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; transition:all .2s; }
  .pb-submit:hover:not(:disabled) { background:#0061d2; transform:translateY(-1px); box-shadow:0 6px 20px rgba(0,97,210,.3); }
  .pb-submit:disabled { opacity:.4; cursor:not-allowed; }

  .pb-success { text-align:center; padding:40px 20px; }
  .pb-success-icon { color:#34d399; margin-bottom:16px; }
  .pb-success h2 { font-size:22px; font-weight:800; margin:0 0 6px; }
  .pb-success p  { color:#9aa3b4; font-size:13px; margin-bottom:16px; }
  .pb-result-list { display:flex; flex-direction:column; gap:6px; max-width:360px; margin:0 auto; }
  .pb-result-item { display:flex; align-items:center; gap:8px; padding:9px 14px; background:rgba(16,185,129,.08); border:1px solid rgba(16,185,129,.2); border-radius:9px; font-size:13px; color:#4b5263; }
  .pb-result-status { margin-left:auto; font-size:10px; font-weight:700; text-transform:uppercase; color:#34d399; }

  .spin { animation:spin .8s linear infinite; }
  @keyframes spin { to { transform:rotate(360deg); } }
`;

export default PushToBranches;
