import React, { useState, useEffect, useCallback } from 'react';
import { Shield, RefreshCw, AlertTriangle, Download, Filter, X } from 'lucide-react';
import { allergenService } from '../../../services/newServices';

const ALLERGEN_ICONS = {
  Gluten:'🌾', Dairy:'🥛', Eggs:'🥚', Nuts:'🌰', Peanuts:'🥜',
  Soy:'🫘', Fish:'🐟', Shellfish:'🦐', Sesame:'⚪', Mustard:'🟡',
  Celery:'🥬', Sulphites:'🍷', Lupin:'🫘', Molluscs:'🐚',
};

export default function AllergenMatrix() {
  const [matrix,   setMatrix]   = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [catFilter,setCatFilter] = useState('all');
  const [search,   setSearch]   = useState('');
  const [highlight,setHighlight] = useState(null); // highlight a single allergen column

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const { data } = await allergenService.getMatrix(catFilter !== 'all' ? catFilter : null, 'ACTIVE');
      setMatrix(data);
    } catch { setError('Failed to load allergen data'); }
    finally { setLoading(false); }
  }, [catFilter]);

  useEffect(() => { load(); }, [load]);

  const categories = matrix ? [...new Set(matrix.recipes.map(r => r.category))].sort() : [];
  const filtered = (matrix?.recipes || []).filter(r =>
    !search || r.recipeName.toLowerCase().includes(search.toLowerCase())
  );

  const exportCsv = () => {
    if (!matrix) return;
    const allergens = matrix.allergens;
    const rows = [
      ['Recipe', 'Category', ...allergens],
      ...filtered.map(r => [r.recipeName, r.category, ...allergens.map(a => r.allergenMap[a] ? 'YES' : '')]),
    ];
    const csv  = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const link = document.createElement('a');
    link.href  = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
    link.download = 'allergen-matrix.csv';
    link.click();
  };

  return (
    <div className="am-page">
      {/* Header */}
      <div className="am-header">
        <div>
          <h2 className="am-title"><Shield size={20}/> Allergen Matrix</h2>
          <p className="am-sub">Cross-reference all active recipes against 14 major allergens</p>
        </div>
        <div className="am-header-right">
          <button className="am-btn" onClick={load} disabled={loading}><RefreshCw size={13} className={loading?'am-spin':''}/></button>
          <button className="am-btn" onClick={exportCsv}><Download size={13}/> Export</button>
        </div>
      </div>

      {error && <div className="am-error"><AlertTriangle size={14}/>{error}</div>}

      {/* Allergen summary pills */}
      {matrix && (
        <div className="am-summary-row">
          <span className="am-summary-label">Most common allergens:</span>
          {Object.entries(matrix.summary||{})
            .filter(([,count]) => Number(count) > 0)
            .sort((a,b) => Number(b[1]) - Number(a[1]))
            .slice(0,8)
            .map(([allergen, count]) => (
              <button
                key={allergen}
                className={`am-allergen-pill ${highlight===allergen?'active':''}`}
                onClick={() => setHighlight(highlight===allergen ? null : allergen)}
              >
                <span>{ALLERGEN_ICONS[allergen]||'⚠'}</span>
                {allergen} <span className="am-pill-count">{count}</span>
              </button>
            ))}
          {highlight && <button className="am-clear-btn" onClick={()=>setHighlight(null)}><X size={12}/> Clear</button>}
        </div>
      )}

      {/* Filters */}
      <div className="am-filters">
        <div className="am-search">
          <input placeholder="Search recipe..." value={search} onChange={e=>setSearch(e.target.value)}/>
          {search && <button onClick={()=>setSearch('')}><X size={11}/></button>}
        </div>
        <div className="am-cat-wrap">
          <Filter size={13}/>
          <select value={catFilter} onChange={e=>setCatFilter(e.target.value)}>
            <option value="all">All Categories</option>
            {categories.map(c=><option key={c}>{c}</option>)}
          </select>
        </div>
        {matrix && (
          <div className="am-stats">
            <span>{filtered.length} recipes</span>
            <span>·</span>
            <span>{matrix.allergens?.length || 0} allergens checked</span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="am-loading"><RefreshCw size={22} className="am-spin"/><p>Loading allergen data...</p></div>
      ) : matrix && (
        <div className="am-table-outer">
          <table className="am-table">
            <thead>
              <tr>
                <th className="am-th-recipe">Recipe</th>
                <th className="am-th-cat">Category</th>
                <th className="am-th-count">#</th>
                {matrix.allergens.map(a => (
                  <th key={a}
                    className={`am-th-allergen ${highlight===a?'am-th-highlight':''}`}
                    onClick={() => setHighlight(highlight===a?null:a)}
                    title={`${a} — click to highlight`}
                  >
                    <div className="am-th-inner">
                      <span className="am-th-icon">{ALLERGEN_ICONS[a]||'⚠'}</span>
                      <span className="am-th-name">{a}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={matrix.allergens.length + 3} className="am-empty-row">No recipes found</td></tr>
              ) : filtered.map(recipe => (
                <tr key={recipe.recipeId} className="am-tr">
                  <td className="am-td-recipe">
                    <div className="am-recipe-name">{recipe.recipeName}</div>
                  </td>
                  <td className="am-td-cat"><span className="am-cat-chip">{recipe.category}</span></td>
                  <td className="am-td-count">
                    <span className={`am-count-badge ${recipe.allergenCount>0?'has':'none'}`}>
                      {recipe.allergenCount}
                    </span>
                  </td>
                  {matrix.allergens.map(allergen => {
                    const has = recipe.allergenMap[allergen];
                    return (
                      <td key={allergen}
                        className={`am-td-cell ${highlight===allergen?'am-td-highlight':''}`}
                        title={has ? `${recipe.recipeName} contains ${allergen}` : ''}
                      >
                        {has
                          ? <div className="am-dot am-dot-yes" title={allergen}/>
                          : <div className="am-dot am-dot-no"/>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          {/* Legend */}
          <div className="am-legend">
            <div className="am-legend-item"><div className="am-dot am-dot-yes"/><span>Contains allergen</span></div>
            <div className="am-legend-item"><div className="am-dot am-dot-no"/><span>Does not contain</span></div>
            <span className="am-legend-note">Click a column header to highlight all recipes containing that allergen</span>
          </div>
        </div>
      )}

      <style>{`
        .am-page{max-width:100%;font-family:'DM Sans',sans-serif;}
        .am-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;flex-wrap:wrap;gap:10px;}
        .am-title{display:flex;align-items:center;gap:8px;font-size:20px;font-weight:700;color:#1f2937;margin:0 0 3px;}
        .am-sub{font-size:12px;color:#9ca3af;margin:0;}
        .am-header-right{display:flex;gap:8px;}
        .am-btn{display:flex;align-items:center;gap:5px;padding:7px 12px;background:#f0f2f7;border:1px solid #e2e6ef;border-radius:8px;font-size:12px;cursor:pointer;color:#374151;}
        .am-error{display:flex;align-items:center;gap:8px;padding:9px 12px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;color:#dc2626;font-size:13px;margin-bottom:12px;}
        .am-summary-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:14px;}
        .am-summary-label{font-size:12px;font-weight:600;color:#6b7280;}
        .am-allergen-pill{display:flex;align-items:center;gap:4px;padding:4px 10px;background:#f1f5f9;border:1px solid #e5e7eb;border-radius:20px;font-size:12px;cursor:pointer;color:#374151;transition:all .15s;}
        .am-allergen-pill:hover{border-color:#0061d2;color:#0061d2;}
        .am-allergen-pill.active{background:#e8f0fd;border-color:#0061d2;color:#0061d2;font-weight:600;}
        .am-pill-count{font-weight:700;background:#e5e7eb;border-radius:10px;padding:0 5px;font-size:10px;}
        .am-clear-btn{display:flex;align-items:center;gap:4px;padding:4px 8px;background:#fef2f2;border:1px solid #fecaca;border-radius:20px;font-size:11px;cursor:pointer;color:#dc2626;}
        .am-filters{display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap;align-items:center;}
        .am-search{display:flex;align-items:center;gap:7px;padding:8px 12px;background:#fff;border:1px solid #e5e7eb;border-radius:8px;flex:1;min-width:180px;}
        .am-search:focus-within{border-color:#0061d2;}
        .am-search input{border:none;outline:none;font-size:13px;flex:1;background:transparent;color:#1f2937;}
        .am-search button{background:none;border:none;cursor:pointer;color:#9ca3af;}
        .am-cat-wrap{display:flex;align-items:center;gap:7px;padding:8px 12px;background:#fff;border:1px solid #e5e7eb;border-radius:8px;color:#6b7280;}
        .am-cat-wrap select{border:none;outline:none;font-size:13px;color:#1f2937;background:transparent;cursor:pointer;}
        .am-stats{font-size:12px;color:#9ca3af;white-space:nowrap;}
        .am-loading{display:flex;align-items:center;justify-content:center;gap:10px;padding:48px;color:#9ca3af;}
        .am-table-outer{overflow:auto;border-radius:12px;border:1px solid #e5e7eb;background:#fff;}
        .am-table{border-collapse:collapse;min-width:900px;}
        .am-table thead tr{background:#f8fafc;border-bottom:1px solid #e5e7eb;}
        .am-th-recipe{padding:10px 14px;text-align:left;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;position:sticky;left:0;background:#f8fafc;min-width:160px;z-index:2;}
        .am-th-cat{padding:10px 12px;text-align:left;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;min-width:110px;}
        .am-th-count{padding:10px 8px;text-align:center;font-size:11px;font-weight:700;color:#6b7280;min-width:36px;}
        .am-th-allergen{padding:8px 6px;text-align:center;font-size:10px;font-weight:600;color:#6b7280;cursor:pointer;min-width:68px;transition:background .15s;}
        .am-th-allergen:hover{background:#e8f0fd;color:#0061d2;}
        .am-th-highlight{background:#e8f0fd !important;color:#0061d2 !important;}
        .am-th-inner{display:flex;flex-direction:column;align-items:center;gap:3px;}
        .am-th-icon{font-size:16px;}
        .am-th-name{font-size:9.5px;white-space:nowrap;}
        .am-tr{border-bottom:1px solid #f1f5f9;}
        .am-tr:last-child{border-bottom:none;}
        .am-tr:hover{background:#fafafa;}
        .am-td-recipe{padding:11px 14px;font-size:13px;position:sticky;left:0;background:inherit;z-index:1;min-width:160px;}
        .am-tr:hover .am-td-recipe{background:#fafafa;}
        .am-recipe-name{font-weight:600;color:#1f2937;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:180px;}
        .am-td-cat{padding:11px 12px;}
        .am-td-count{padding:11px 8px;text-align:center;}
        .am-td-cell{padding:8px 6px;text-align:center;transition:background .15s;}
        .am-td-highlight{background:#e8f0fd;}
        .am-cat-chip{font-size:10px;font-weight:600;padding:2px 7px;background:#f0f9ff;color:#0369a1;border-radius:20px;white-space:nowrap;}
        .am-count-badge{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;font-size:11px;font-weight:700;}
        .am-count-badge.has{background:#fef2f2;color:#dc2626;}
        .am-count-badge.none{background:#f0fdf4;color:#15803d;}
        .am-dot{width:14px;height:14px;border-radius:50%;margin:0 auto;}
        .am-dot-yes{background:#ef4444;box-shadow:0 0 0 2px #fecaca;}
        .am-dot-no{background:#e5e7eb;}
        .am-empty-row{text-align:center;padding:30px;color:#9ca3af;font-size:13px;}
        .am-legend{display:flex;align-items:center;gap:16px;padding:12px 16px;border-top:1px solid #f1f5f9;flex-wrap:wrap;}
        .am-legend-item{display:flex;align-items:center;gap:6px;font-size:12px;color:#6b7280;}
        .am-legend-note{font-size:11px;color:#9ca3af;font-style:italic;margin-left:auto;}
        .am-spin{animation:am-spin .8s linear infinite;}
        @keyframes am-spin{to{transform:rotate(360deg);}}
      `}</style>
    </div>
  );
}