import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, TrendingDown, Package, Users, IndianRupee,
  AlertTriangle, CheckCircle, BarChart3, ShoppingCart,
  ChefHat, RefreshCw, Store, Clock, Truck, Trash2, ArrowRight,
} from 'lucide-react';
import { dashboardService } from '../../services/dashboardService';
import usePermission from '../../hooks/usePermission';
import useBranch     from '../../hooks/useBranch';

const Dashboard = () => {
  const navigate = useNavigate();
  const { isHQ }  = usePermission();
  const { branchId, branchName } = useBranch();

  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const { data: d } = await dashboardService.get(branchId);
      setData(d);
    } catch {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => { load(); }, [load]);

  const revenueChange = data && data.lastMonthRevenue > 0
    ? (((Number(data.totalRevenue) - Number(data.lastMonthRevenue)) / Number(data.lastMonthRevenue)) * 100).toFixed(1)
    : null;

  const kpis = data ? [
    {
      title: 'Revenue (This Month)',
      value: `₹${Number(data.totalRevenue || 0).toLocaleString('en-IN')}`,
      change: revenueChange ? `${revenueChange > 0 ? '+' : ''}${revenueChange}% vs last month` : 'No prior data',
      trend: revenueChange > 0 ? 'up' : revenueChange < 0 ? 'down' : 'neutral',
      icon: IndianRupee,
    },
    {
      title: 'Active Recipes',
      value: data.activeRecipes,
      change: 'Across all categories',
      trend: 'up', icon: ChefHat,
    },
    {
      title: 'Inventory Value',
      value: `₹${Number(data.inventoryValue || 0).toLocaleString('en-IN')}`,
      change: `${data.lowStockCount} item${data.lowStockCount !== 1 ? 's' : ''} low`,
      trend: data.lowStockCount > 0 ? 'down' : 'up',
      icon: Package,
    },
    {
      title: 'Monthly Orders',
      value: data.monthlyOrders,
      change: `${data.totalOrders} total sales entries`,
      trend: 'up', icon: ShoppingCart,
    },
    {
      title: 'Active Suppliers',
      value: data.activeSuppliers,
      change: 'Approved vendors',
      trend: 'up', icon: Users,
    },
    {
      title: 'Pending Wastage',
      value: data.pendingWastage,
      change: 'Awaiting approval',
      trend: data.pendingWastage > 0 ? 'down' : 'up',
      icon: Trash2,
    },
  ] : [];

  if (loading) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'60vh', gap:12, color:'#9aa3b4', fontSize:14 }}>
      <RefreshCw size={26} className="db-spin" style={{ color:'#0061d2' }} />
      <p style={{ margin:0 }}>Loading dashboard...</p>
    </div>
  );

  return (
    <div style={{ fontFamily:"'DM Sans',system-ui,sans-serif" }}>

      {/* Page header row */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:10 }}>
        <div>
          <h1 style={{ margin:0, fontSize:20, fontWeight:700, color:'#0d1017' }}>
            {isHQ ? 'HQ Dashboard' : `${branchName} Dashboard`}
          </h1>
          <p style={{ margin:'2px 0 0', fontSize:12, color:'#9aa3b4' }}>
            {new Date().toLocaleDateString('en-IN', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}
          </p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={load} className="btn-ghost-dash">
            <RefreshCw size={13} className={loading ? 'db-spin' : ''} /> Refresh
          </button>
          <button onClick={() => navigate('/fooderp/sales')} className="btn-primary-dash">
            <ShoppingCart size={13} /> Log Sales
          </button>
          <button onClick={() => navigate('/fooderp/recipes/add')} className="btn-ghost-dash">
            <ChefHat size={13} /> Add Recipe
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background:'#fde8e8', border:'1px solid #fca5a5', borderRadius:10, padding:'10px 14px', color:'#c10000', fontSize:13, marginBottom:16, display:'flex', alignItems:'center', gap:8 }}>
          <AlertTriangle size={13} />{error}
          <button onClick={load} style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:4, background:'none', border:'none', cursor:'pointer', color:'#c10000', fontSize:12 }}>
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      )}

      {/* KPI Grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:14, marginBottom:20 }}>
        {kpis.map((kpi, i) => (
          <div key={i} className="kpi-card">
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
              <div className="kpi-icon-wrap">
                <kpi.icon size={19} />
              </div>
              <div className={`kpi-change ${kpi.trend}`} style={{ display:'flex', alignItems:'center', gap:4 }}>
                {kpi.trend === 'up'   ? <TrendingUp   size={13} /> :
                 kpi.trend === 'down' ? <TrendingDown size={13} /> : null}
                {kpi.change}
              </div>
            </div>
            <div className="kpi-value">{kpi.value}</div>
            <div className="kpi-label">{kpi.title}</div>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>

        {/* Low Stock */}
        <div className="dash-card">
          <div className="dash-card-header">
            <div className="dash-card-title">
              <AlertTriangle size={15} className="dash-card-icon" />
              Low Stock Alerts
              {data?.lowStockCount > 0 && (
                <span style={{ fontSize:11, fontWeight:700, padding:'2px 7px', borderRadius:10, background:'#fde8e8', color:'#c10000' }}>
                  {data.lowStockCount}
                </span>
              )}
            </div>
            <button className="dash-link-btn" onClick={() => navigate('/fooderp/inventory/raw-materials')}>
              <ArrowRight size={13} />
            </button>
          </div>
          <div style={{ padding:'4px 0' }}>
            {(data?.lowStockItems || []).length === 0 ? (
              <div style={{ padding:'20px', textAlign:'center', color:'#9aa3b4', fontSize:13 }}>
                <CheckCircle size={18} style={{ color:'#0061d2', display:'block', margin:'0 auto 6px' }} />
                All items well stocked
              </div>
            ) : (data?.lowStockItems || []).map((item, i) => {
              const pct = item.min > 0 ? Math.min(100, (item.current / item.min) * 100) : 100;
              const cls = pct < 30 ? 'danger' : pct < 60 ? 'warn' : '';
              return (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 18px', borderBottom:'1px solid #f0f2f7' }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                      <span style={{ fontSize:13, fontWeight:600, color:'#0d1017' }}>{item.name}</span>
                      <span style={{ fontSize:12, color:'#c10000', fontWeight:600 }}>{item.current} / {item.min} {item.unit}</span>
                    </div>
                    <div className="progress-bar">
                      <div className={`progress-fill ${cls}`} style={{ width:`${pct}%` }} />
                    </div>
                  </div>
                  <button
                    onClick={() => navigate('/fooderp/procurement/indent')}
                    style={{ padding:'6px 10px', background:'#e8f0fd', border:'1px solid #b3ccf5', borderRadius:7, color:'#0061d2', cursor:'pointer', fontSize:12, fontWeight:600 }}
                  >
                    Indent
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent POs */}
        <div className="dash-card">
          <div className="dash-card-header">
            <div className="dash-card-title">
              <Truck size={15} className="dash-card-icon" /> Recent Purchase Orders
            </div>
            <button className="dash-link-btn" onClick={() => navigate('/fooderp/procurement/orders')}>
              <ArrowRight size={13} />
            </button>
          </div>
          <div>
            {(data?.recentOrders || []).length === 0 ? (
              <div style={{ padding:'20px', textAlign:'center', color:'#9aa3b4', fontSize:13 }}>No recent orders</div>
            ) : (data?.recentOrders || []).map((o, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 18px', borderBottom:'1px solid #f0f2f7' }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:'#0d1017', marginBottom:2 }}>{o.poNumber}</div>
                  <div style={{ fontSize:11, color:'#9aa3b4' }}>{o.supplierName} · {o.itemCount} items</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:13, fontWeight:700, color:'#0061d2' }}>₹{Number(o.totalAmount||0).toFixed(0)}</div>
                  <span className={`status-badge ${(o.status||'').toLowerCase()}`}>{o.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Recipes */}
        <div className="dash-card">
          <div className="dash-card-header">
            <div className="dash-card-title">
              <ChefHat size={15} className="dash-card-icon" /> Top Recipes This Month
            </div>
            <button className="dash-link-btn" onClick={() => navigate('/fooderp/recipes/list')}>
              <ArrowRight size={13} />
            </button>
          </div>
          <div>
            {(data?.topRecipes || []).length === 0 ? (
              <div style={{ padding:'20px', textAlign:'center', color:'#9aa3b4', fontSize:13 }}>
                No sales data yet.{' '}
                <button onClick={() => navigate('/fooderp/sales')} style={{ background:'none', border:'none', cursor:'pointer', color:'#0061d2', fontSize:13, textDecoration:'underline' }}>
                  Log sales
                </button>{' '}
                to see top recipes.
              </div>
            ) : (data?.topRecipes || []).map((r, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 18px', borderBottom:'1px solid #f0f2f7' }}>
                <div style={{ width:26, height:26, background:'#e8f0fd', borderRadius:7, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'#0061d2', flexShrink:0 }}>
                  #{i+1}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:'#0d1017' }}>{r.recipeName}</div>
                  <div style={{ fontSize:11, color:'#9aa3b4' }}>{r.quantitySold} covers sold</div>
                </div>
                <div style={{ fontSize:13, fontWeight:700, color:'#0061d2' }}>₹{Number(r.revenue||0).toFixed(0)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Branch Revenue OR Quick Actions */}
        {isHQ && data?.branchRevenue?.length > 0 ? (
          <div className="dash-card">
            <div className="dash-card-header">
              <div className="dash-card-title">
                <Store size={15} className="dash-card-icon" /> Revenue by Branch
              </div>
              <button className="dash-link-btn" onClick={() => navigate('/fooderp/reports/branches')}>
                <ArrowRight size={13} />
              </button>
            </div>
            <div>
              {data.branchRevenue.map((b, i) => {
                const maxRev = Math.max(...data.branchRevenue.map((br) => Number(br.revenue)));
                const pct = maxRev > 0 ? (Number(b.revenue) / maxRev) * 100 : 0;
                return (
                  <div key={i} style={{ padding:'11px 18px', borderBottom:'1px solid #f0f2f7' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                      <span style={{ fontSize:13, fontWeight:600, color:'#0d1017' }}>{b.branchName}</span>
                      <span style={{ fontSize:13, fontWeight:700, color:'#0061d2' }}>₹{Number(b.revenue).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width:`${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="dash-card">
            <div className="dash-card-header">
              <div className="dash-card-title">
                <Clock size={15} className="dash-card-icon" /> Quick Actions
              </div>
            </div>
            <div style={{ padding:'14px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              {[
                { label:'Log Sales',      icon:ShoppingCart, path:'/fooderp/sales' },
                { label:'Stock In',       icon:Package,      path:'/fooderp/inventory/stock-in' },
                { label:'Raise Indent',   icon:BarChart3,    path:'/fooderp/procurement/indent' },
                { label:'Log Wastage',    icon:Trash2,       path:'/fooderp/inventory/wastage' },
                { label:'Log Production', icon:ChefHat,      path:'/fooderp/recipes/list' },
                { label:'View Reports',   icon:TrendingUp,   path:'/fooderp/reports' },
              ].map((a, i) => (
                <button key={i} onClick={() => navigate(a.path)} className="quick-action-btn">
                  <a.icon size={15} className="quick-action-icon" />{a.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
