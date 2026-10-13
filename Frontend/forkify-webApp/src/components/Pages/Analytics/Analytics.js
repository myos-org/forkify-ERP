import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, IndianRupee, ShoppingCart,
  BarChart3, RefreshCw, AlertTriangle, ChefHat,
  Percent, Calendar,
} from 'lucide-react';
import { analyticsService } from '../../../services/newServices';
import useBranch from '../../../hooks/useBranch';

const DAYS = ['MON','TUE','WED','THU','FRI','SAT','SUN'];
const DOW_ORDER = ['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY'];

const fmt  = (n) => `₹${Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:0})}`;
const fmtK = (n) => { const v=Number(n||0); return v>=1000 ? `₹${(v/1000).toFixed(1)}K` : fmt(v); };

export default function Analytics() {
  const { branchId } = useBranch();
  const [data,    setData]    = useState(null);
  const [fc,      setFc]      = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [days,    setDays]    = useState(30);
  const [tab,     setTab]     = useState('overview'); // overview | foodcost | items

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [ovRes, fcRes] = await Promise.all([
        analyticsService.getOverview(branchId, days),
        analyticsService.getFoodCost(branchId, days),
      ]);
      setData(ovRes.data);
      setFc(fcRes.data || []);
    } catch { setError('Failed to load analytics'); }
    finally { setLoading(false); }
  }, [branchId, days]);

  useEffect(() => { load(); }, [load]);

  const dowData = data?.byDayOfWeek || [];
  const maxDow  = Math.max(...dowData.map(d => Number(d.revenue||0)), 1);
  const trendData = data?.dailyTrend || [];
  const maxTrend  = Math.max(...trendData.map(d => Number(d.revenue||0)), 1);

  const foodCostColor = (pct) => {
    const v = Number(pct||0);
    if (v > 40) return '#ef4444';
    if (v > 35) return '#f59e0b';
    return '#10b981';
  };

  return (
    <div className="an-page">
      {/* Header */}
      <div className="an-header">
        <div>
          <h2 className="an-title"><TrendingUp size={20}/> Analytics</h2>
          <p className="an-sub">Revenue trends, food cost % and top performers</p>
        </div>
        <div className="an-header-right">
          <div className="an-period-tabs">
            {[7,30,90].map(d => (
              <button key={d} className={`an-period-btn ${days===d?'active':''}`}
                onClick={()=>setDays(d)}>{d}D</button>
            ))}
          </div>
          <button className="an-btn" onClick={load} disabled={loading}>
            <RefreshCw size={13} className={loading?'an-spin':''}/>
          </button>
        </div>
      </div>

      {error && <div className="an-error"><AlertTriangle size={14}/>{error}</div>}

      {loading ? (
        <div className="an-loading"><RefreshCw size={24} className="an-spin"/><p>Loading analytics...</p></div>
      ) : data && (
        <>
          {/* KPI Cards */}
          <div className="an-kpis">
            {[
              { label:'Revenue',      val: fmtK(data.revenue),      sub: `${Number(data.revenueGrowth||0)>0?'+':''}${data.revenueGrowth}% vs prev`, icon:IndianRupee, color:'#10b981', up: Number(data.revenueGrowth||0)>=0 },
              { label:'Gross Profit', val: fmtK(data.grossProfit),  sub: `${Number(data.foodCostPct||0).toFixed(1)}% food cost`, icon:TrendingUp, color:'#3b82f6' },
              { label:'Food Cost %',  val: `${data.foodCostPct}%`,  sub: Number(data.foodCostPct||0)>35?'⚠ Above target (35%)':'✓ Within target', icon:Percent, color:foodCostColor(data.foodCostPct) },
              { label:'Total Covers', val: (data.totalCovers||0).toLocaleString(), sub:`Avg ${fmtK(data.avgOrderValue)} per cover`, icon:ShoppingCart, color:'#0061d2' },
              { label:'Wastage Loss', val: fmtK(data.wastageLoss),  sub:`${data.wastagePct||0}% of revenue`, icon:AlertTriangle, color:'#0061d2' },
              { label:'Unique Dishes', val: (data.topRecipes||[]).length, sub:'contributing to revenue', icon:ChefHat, color:'#6b7280' },
            ].map((k,i)=>(
              <div key={i} className="an-kpi" style={{borderTop:`3px solid ${k.color}`}}>
                <div className="an-kpi-top">
                  <div className="an-kpi-icon" style={{background:k.color+'18',color:k.color}}><k.icon size={16}/></div>
                  {k.up !== undefined && <span style={{fontSize:11,color:k.up?'#10b981':'#ef4444',fontWeight:600}}>{k.up?'↑':'↓'}</span>}
                </div>
                <div className="an-kpi-val" style={{color:k.color}}>{k.val}</div>
                <div className="an-kpi-lbl">{k.label}</div>
                <div className="an-kpi-sub">{k.sub}</div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="an-tabs">
            {['overview','foodcost','items'].map(t=>(
              <button key={t} className={`an-tab ${tab===t?'active':''}`} onClick={()=>setTab(t)}>
                {t==='overview'?'Revenue Trends':t==='foodcost'?'Food Cost Analysis':'Top Items'}
              </button>
            ))}
          </div>

          {tab === 'overview' && (
            <div className="an-grid-2">
              {/* Daily trend bar chart */}
              <div className="an-card an-card-wide">
                <h4 className="an-card-title"><BarChart3 size={15}/> Daily Revenue — Last {days} Days</h4>
                {trendData.length === 0 ? (
                  <div className="an-empty-msg">No sales data in this period</div>
                ) : (
                  <div className="an-trend-chart">
                    {trendData.map((d,i)=>{
                      const pct = Math.max(2, (Number(d.revenue)/maxTrend)*100);
                      return (
                        <div key={i} className="an-trend-col" title={`${d.date}: ${fmt(d.revenue)}`}>
                          <div className="an-trend-bar" style={{height:`${pct}%`}}/>
                          {trendData.length <= 15 && <div className="an-trend-lbl">{d.date?.slice(5)}</div>}
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="an-chart-range">
                  {trendData.length>0 && `${trendData[0]?.date} → ${trendData[trendData.length-1]?.date}`}
                </div>
              </div>

              {/* Day of week heatmap */}
              <div className="an-card">
                <h4 className="an-card-title"><Calendar size={15}/> Revenue by Day of Week</h4>
                <div className="an-dow-list">
                  {DOW_ORDER.map((dow, i) => {
                    const d = dowData.find(x => x.day === dow);
                    const pct = d ? (Number(d.revenue)/maxDow)*100 : 0;
                    const isBest = d && Number(d.revenue) === maxDow;
                    return (
                      <div key={dow} className="an-dow-row">
                        <span className="an-dow-label">{DAYS[i]}</span>
                        <div className="an-dow-track">
                          <div className="an-dow-fill" style={{width:`${pct}%`, background: isBest?'#0061d2':'#3b82f6'}}/>
                        </div>
                        <div className="an-dow-vals">
                          <span style={{fontWeight:700,color:isBest?'#0061d2':'#1f2937'}}>{fmtK(d?.revenue||0)}</span>
                          <span className="an-dow-covers">{d?.covers||0} covers</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {tab === 'foodcost' && (
            <div className="an-card">
              <h4 className="an-card-title"><Percent size={15}/> Food Cost % by Recipe — Target: &lt;35%</h4>
              {fc.length === 0 ? (
                <div className="an-empty-msg">No sales data to analyse</div>
              ) : (
                <div className="an-fc-table-wrap">
                  <table className="an-table">
                    <thead>
                      <tr><th>Recipe</th><th>Category</th><th>Revenue</th><th>COGS</th><th>Gross Margin</th><th>Food Cost %</th><th>Covers</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      {fc.map((item, i) => {
                        const pct = Number(item.foodCostPct||0);
                        return (
                          <tr key={i} className={`an-tr ${item.alert?'an-tr-alert':''}`}>
                            <td><strong>{item.recipeName}</strong></td>
                            <td><span className="an-cat-chip">{item.category}</span></td>
                            <td className="an-num">{fmt(item.revenue)}</td>
                            <td className="an-num">{fmt(item.cogs)}</td>
                            <td className="an-num" style={{color:'#10b981',fontWeight:700}}>{fmt(item.grossMargin)}</td>
                            <td>
                              <div className="an-fc-cell">
                                <div className="an-fc-bar-track">
                                  <div className="an-fc-bar" style={{width:`${Math.min(100,pct)}%`,background:foodCostColor(pct)}}/>
                                </div>
                                <span style={{fontWeight:700,color:foodCostColor(pct),minWidth:36}}>{pct}%</span>
                              </div>
                            </td>
                            <td className="an-num">{item.covers}</td>
                            <td>
                              {item.alert
                                ? <span className="an-badge red"><AlertTriangle size={11}/> High</span>
                                : <span className="an-badge green">✓ OK</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {tab === 'items' && (
            <div className="an-card">
              <h4 className="an-card-title"><ChefHat size={15}/> Top Items — Revenue & Margin Ranking</h4>
              {(data.topRecipes||[]).length === 0 ? (
                <div className="an-empty-msg">No sales data in this period</div>
              ) : (
                <div className="an-items-list">
                  {data.topRecipes.map((r, i) => {
                    const maxRev = Number(data.topRecipes[0]?.revenue||1);
                    const pct    = (Number(r.revenue)/maxRev)*100;
                    return (
                      <div key={i} className="an-item-row">
                        <div className="an-item-rank">#{i+1}</div>
                        <div className="an-item-info">
                          <div className="an-item-name">{r.recipeName}
                            <span className="an-cat-chip" style={{marginLeft:8}}>{r.category}</span>
                          </div>
                          <div className="an-item-bar-track">
                            <div className="an-item-bar" style={{width:`${pct}%`}}/>
                          </div>
                          <div className="an-item-meta">
                            {r.covers} covers · Food cost {r.foodCostPct}%
                          </div>
                        </div>
                        <div className="an-item-revenue">
                          <div style={{fontWeight:800,fontSize:14,color:'#1f2937'}}>{fmt(r.revenue)}</div>
                          <div style={{fontSize:11,color:'#10b981',fontWeight:600}}>+{fmt(r.margin)} margin</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      <style>{`
        .an-page{max-width:1200px;font-family:'DM Sans',sans-serif;}
        .an-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px;flex-wrap:wrap;gap:10px;}
        .an-title{display:flex;align-items:center;gap:8px;font-size:20px;font-weight:700;color:#1f2937;margin:0 0 3px;}
        .an-sub{font-size:12px;color:#9ca3af;margin:0;}
        .an-header-right{display:flex;gap:8px;align-items:center;}
        .an-period-tabs{display:flex;gap:4px;}
        .an-period-btn{padding:5px 12px;background:#f1f5f9;border:1px solid #e5e7eb;border-radius:20px;font-size:12px;font-weight:600;color:#64748b;cursor:pointer;}
        .an-period-btn.active{background:#e8f0fd;border-color:#0061d2;color:#0061d2;}
        .an-btn{display:flex;align-items:center;gap:5px;padding:7px 12px;background:#f0f2f7;border:1px solid #e2e6ef;border-radius:8px;font-size:12px;cursor:pointer;}
        .an-error{display:flex;align-items:center;gap:8px;padding:9px 12px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;color:#dc2626;font-size:13px;margin-bottom:14px;}
        .an-loading{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:60px;color:#9ca3af;text-align:center;}
        .an-kpis{display:grid;grid-template-columns:repeat(6,1fr);gap:10px;margin-bottom:18px;}
        @media(max-width:1100px){.an-kpis{grid-template-columns:repeat(3,1fr);}}
        @media(max-width:600px){.an-kpis{grid-template-columns:repeat(2,1fr);}}
        .an-kpi{background:#fff;border-radius:12px;border:1px solid #e5e7eb;padding:14px;}
        .an-kpi-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;}
        .an-kpi-icon{width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;}
        .an-kpi-val{font-size:18px;font-weight:800;margin-bottom:2px;line-height:1;}
        .an-kpi-lbl{font-size:11px;color:#374151;font-weight:600;margin-bottom:2px;}
        .an-kpi-sub{font-size:10px;color:#9ca3af;}
        .an-tabs{display:flex;gap:4px;margin-bottom:16px;background:#f8fafc;padding:4px;border-radius:12px;width:fit-content;border:1px solid #e5e7eb;}
        .an-tab{padding:7px 16px;border-radius:8px;font-size:13px;font-weight:500;color:#6b7280;cursor:pointer;border:none;background:transparent;}
        .an-tab.active{background:#fff;color:#0061d2;font-weight:700;box-shadow:0 1px 4px #e2e6ef;}
        .an-grid-2{display:grid;grid-template-columns:1fr 340px;gap:16px;}
        @media(max-width:900px){.an-grid-2{grid-template-columns:1fr;}}
        .an-card{background:#fff;border-radius:12px;border:1px solid #e5e7eb;padding:18px;margin-bottom:16px;}
        .an-card-wide{}
        .an-card-title{display:flex;align-items:center;gap:7px;font-size:13px;font-weight:700;color:#374151;margin:0 0 16px;}
        .an-trend-chart{display:flex;align-items:flex-end;gap:2px;height:140px;border-bottom:1px solid #f1f5f9;padding-bottom:4px;}
        .an-trend-col{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:2px;min-width:0;}
        .an-trend-bar{width:100%;background:linear-gradient(to top,#0061d2,#3385e0);border-radius:2px 2px 0 0;min-height:2px;transition:height .4s;}
        .an-trend-lbl{font-size:8px;color:#9ca3af;white-space:nowrap;}
        .an-chart-range{font-size:11px;color:#9ca3af;margin-top:6px;text-align:right;}
        .an-empty-msg{font-size:13px;color:#9ca3af;text-align:center;padding:24px 0;font-style:italic;}
        .an-dow-list{display:flex;flex-direction:column;gap:10px;}
        .an-dow-row{display:grid;grid-template-columns:36px 1fr auto;gap:8px;align-items:center;}
        .an-dow-label{font-size:11px;font-weight:700;color:#6b7280;}
        .an-dow-track{height:8px;background:#f1f5f9;border-radius:4px;overflow:hidden;}
        .an-dow-fill{height:100%;border-radius:4px;transition:width .5s;}
        .an-dow-vals{display:flex;flex-direction:column;align-items:flex-end;min-width:70px;}
        .an-dow-covers{font-size:10px;color:#9ca3af;}
        .an-fc-table-wrap{overflow-x:auto;}
        .an-table{width:100%;border-collapse:collapse;min-width:700px;}
        .an-table thead tr{background:#f8fafc;border-bottom:1px solid #e5e7eb;}
        .an-table th{padding:9px 12px;text-align:left;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;}
        .an-tr{border-bottom:1px solid #f1f5f9;}
        .an-tr:hover{background:#fafafa;}
        .an-tr-alert td:first-child{border-left:3px solid #ef4444;}
        .an-table td{padding:10px 12px;font-size:13px;vertical-align:middle;}
        .an-num{font-variant-numeric:tabular-nums;}
        .an-cat-chip{font-size:10px;font-weight:600;padding:2px 6px;background:#f0fdf4;color:#15803d;border-radius:20px;}
        .an-fc-cell{display:flex;align-items:center;gap:8px;}
        .an-fc-bar-track{flex:1;height:6px;background:#f1f5f9;border-radius:3px;overflow:hidden;min-width:60px;}
        .an-fc-bar{height:100%;border-radius:3px;transition:width .4s;}
        .an-badge{display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:700;padding:3px 8px;border-radius:20px;}
        .an-badge.red{background:#fef2f2;color:#dc2626;}
        .an-badge.green{background:#f0fdf4;color:#15803d;}
        .an-items-list{display:flex;flex-direction:column;gap:12px;}
        .an-item-row{display:flex;align-items:center;gap:12px;}
        .an-item-rank{width:28px;height:28px;background:#f1f5f9;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#6b7280;flex-shrink:0;}
        .an-item-info{flex:1;min-width:0;}
        .an-item-name{font-size:13px;font-weight:600;color:#1f2937;margin-bottom:4px;display:flex;align-items:center;flex-wrap:wrap;gap:4px;}
        .an-item-bar-track{height:5px;background:#f1f5f9;border-radius:3px;overflow:hidden;margin-bottom:4px;}
        .an-item-bar{height:100%;background:linear-gradient(90deg,#0061d2,#3385e0);border-radius:3px;transition:width .5s;}
        .an-item-meta{font-size:11px;color:#9ca3af;}
        .an-item-revenue{text-align:right;flex-shrink:0;}
        .an-spin{animation:an-spin .8s linear infinite;}
        @keyframes an-spin{to{transform:rotate(360deg);}}
      `}</style>
    </div>
  );
}