import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Utensils, ChefHat, IndianRupee, RefreshCw, AlertTriangle,
  CheckCircle, Send, Tag, QrCode, ExternalLink,
} from 'lucide-react';
import menuService from '../../../services/menuService';
import useBranch from '../../../hooks/useBranch';
import usePermission from '../../../hooks/usePermission';
import AICalorieAssistant, { AICalorieTrigger } from '../../AI/AICalorieAssistant';
import MenuQRCode from '../../Menu/MenuQRCode';

const MEAL_COLORS = {
  Starters:'#60a5fa', Mains:'#34d399', Desserts:'#3385e0',
  Beverages:'#3385e0', Specials:'#fbbf24',
};

const ActiveMenu = () => {
  const navigate = useNavigate();
  const { branchId } = useBranch();
  const { isHQ } = usePermission();

  const [,        setMenus]   = useState([]);
  const [active,  setActive]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [success, setSuccess] = useState(null);
  const [showAI,  setShowAI]  = useState(false);
  const [showQR,  setShowQR]  = useState(false); // ← NEW: QR code modal

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const { data } = await menuService.getAll(false);
      setMenus(data || []);
      setActive((data || []).find(m => m.active) || null);
    } catch { setError('Failed to load menus'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (success) { const t = setTimeout(() => setSuccess(null), 3000); return () => clearTimeout(t); }
  }, [success]);

  // eslint-disable-next-line no-unused-vars
  const handleActivate = async (id) => {
    try {
      await menuService.activate(id);
      setSuccess('Menu activated');
      load();
    } catch (e) { setError(e.response?.data || 'Failed'); }
  };

  const handlePush = async (id) => {
    try {
      const { data } = await menuService.push(id);
      setSuccess(data);
    } catch (e) { setError(e.response?.data || 'Push failed'); }
  };

  const catColor = (cat) => MEAL_COLORS[cat] || 'rgba(255,255,255,.4)';

  // Build the public QR URL for display purposes
  const publicMenuUrl = (active && branchId)
    ? `${window.location.origin}/menu/${active.id}?branchId=${branchId}`
    : null;

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", color:'#0d1017' }}>
      <style>{`.am-spin{animation:spin .8s linear infinite;}@keyframes spin{to{transform:rotate(360deg);}}`}</style>

      {/* ── Page header ── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, color:'#34d399' }}>
          <Utensils size={20}/>
          <div>
            <h2 style={{ margin:0, fontSize:20, fontWeight:700, color:'#0d1017' }}>Active Menu</h2>
            <p style={{ margin:0, fontSize:12, color:'#9aa3b4' }}>Current menu visible to kitchen staff</p>
          </div>
        </div>

        <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
          {/* AI Calorie Planner */}
          {active && active.items && active.items.length > 0 && (
            <AICalorieTrigger
              onClick={() => setShowAI(true)}
              itemCount={active.items.length}
            />
          )}

          {/* ── NEW: QR Code button ── */}
          {active && branchId && (
            <button
              onClick={() => setShowQR(true)}
              style={{ ...btnGhost, color:'#bc8cff', borderColor:'rgba(188,140,255,.35)' }}
            >
              <QrCode size={13}/> Menu QR Code
            </button>
          )}

          {/* ── NEW: Open public page ── */}
          {active && branchId && (
            <button
              onClick={() => window.open(publicMenuUrl, '_blank')}
              style={{ ...btnGhost }}
              title="Open public menu page"
            >
              <ExternalLink size={13}/> Public View
            </button>
          )}

          <button onClick={load} style={btnGhost}>
            <RefreshCw size={13} className={loading ? 'am-spin' : ''} />
          </button>
          {isHQ && (
            <button onClick={() => navigate('/fooderp/menu/seasonal')} style={btnPrimary}>
              Manage Menus
            </button>
          )}
        </div>
      </div>

      {error   && (
        <div style={alertStyle('error')}>
          <AlertTriangle size={13}/>{error}
          <button onClick={() => setError(null)} style={{ background:'none', border:'none', cursor:'pointer', marginLeft:'auto', opacity:.6, color:'inherit' }}>✕</button>
        </div>
      )}
      {success && <div style={alertStyle('success')}><CheckCircle size={13}/>{success}</div>}

      {loading ? (
        <div style={{ textAlign:'center', padding:50, color:'#9aa3b4', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
          <RefreshCw size={20} className="am-spin"/> Loading...
        </div>
      ) : active ? (
        <>
          {/* ── Active menu banner ── */}
          <div style={{ background:'rgba(16,185,129,.06)', border:'1px solid rgba(16,185,129,.2)', borderRadius:14, padding:'14px 18px', marginBottom:20, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <CheckCircle size={18} style={{ color:'#34d399' }}/>
              <div>
                <div style={{ fontSize:16, fontWeight:700, color:'#0d1017' }}>{active.name}</div>
                <div style={{ fontSize:12, color:'#9aa3b4', marginTop:2 }}>
                  {active.itemCount} items
                  {active.season && ` · ${active.season}`}
                  {active.validFrom && ` · Valid: ${active.validFrom} → ${active.validTo || '∞'}`}
                </div>
              </div>
            </div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {/* ── QR badge in banner ── */}
              {branchId && (
                <button
                  onClick={() => setShowQR(true)}
                  style={{ ...btnGhost, color:'#bc8cff', borderColor:'rgba(188,140,255,.35)', fontSize:11 }}
                >
                  <QrCode size={11}/> Generate QR
                </button>
              )}
              {isHQ && (
                <button onClick={() => handlePush(active.id)} style={{ ...btnGhost, color:'#3385e0' }}>
                  <Send size={12}/> Push to Branches
                </button>
              )}
              <button onClick={() => navigate('/fooderp/menu/pricing')} style={btnGhost}>
                <Tag size={12}/> Branch Pricing
              </button>
            </div>
          </div>

          {/* ── Menu items grouped by category ── */}
          {(() => {
            const grouped = {};
            (active.items || []).forEach(item => {
              const cat = item.menuCategory || 'General';
              if (!grouped[cat]) grouped[cat] = [];
              grouped[cat].push(item);
            });
            return Object.entries(grouped).map(([cat, items]) => (
              <div key={cat} style={{ marginBottom:20 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                  <div style={{ width:10, height:10, borderRadius:'50%', background:catColor(cat) }}/>
                  <div style={{ fontSize:12, fontWeight:700, color:'#9aa3b4', textTransform:'uppercase', letterSpacing:.6 }}>
                    {cat} ({items.length})
                  </div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:10 }}>
                  {items.map(item => (
                    <div key={item.id} style={{ background:'#ffffff', border:`1px solid ${catColor(cat)}25`, borderRadius:12, padding:'12px 14px' }}>
                      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:6 }}>
                        <div style={{ fontWeight:600, color:'#0d1017', fontSize:14 }}>{item.displayName}</div>
                        {item.basePrice > 0 && (
                          <div style={{ fontWeight:700, color:'#34d399', fontSize:14 }}>₹{Number(item.basePrice).toFixed(2)}</div>
                        )}
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                        <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, color:'#9aa3b4' }}>
                          <ChefHat size={10}/>{item.recipeName}
                        </span>
                        <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, color:'#9aa3b4' }}>
                          <IndianRupee size={10}/>Cost: ₹{Number(item.ingredientCost||0).toFixed(2)}
                        </span>
                        {(item.calories ?? item.recipe?.calories) > 0 && (
                          <span style={{ display:'flex', alignItems:'center', gap:3, fontSize:11, fontWeight:600, color:'#3385e0', background:'rgba(251,146,60,.1)', border:'1px solid rgba(251,146,60,.2)', borderRadius:20, padding:'1px 6px' }}>
                            🔥 {item.calories ?? item.recipe?.calories} kcal
                          </span>
                        )}
                        {item.marginPct && (
                          <span style={{ fontSize:11, fontWeight:700, color: Number(item.marginPct) > 50 ? '#34d399' : Number(item.marginPct) > 30 ? '#fbbf24' : '#f87171' }}>
                            {item.marginPct}% margin
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ));
          })()}
        </>
      ) : (
        <div style={{ textAlign:'center', padding:60, color:'#9aa3b4' }}>
          <Utensils size={48} style={{ marginBottom:14, opacity:.3 }}/>
          <h3 style={{ color:'#9aa3b4', fontSize:18, margin:'0 0 8px' }}>No active menu</h3>
          <p style={{ fontSize:13, margin:'0 0 20px' }}>Go to Seasonal Menus to activate one</p>
          {isHQ && <button onClick={() => navigate('/fooderp/menu/seasonal')} style={btnPrimary}>Manage Menus</button>}
        </div>
      )}

      {/* ── AI Calorie Assistant modal ── */}
      {showAI && (
        <AICalorieAssistant
          menuItems={active?.items || []}
          onClose={() => setShowAI(false)}
        />
      )}

      {/* ── QR Code modal (NEW) ── */}
      {showQR && active && (
        <MenuQRCode
          menuId={active.id}
          branchId={branchId}
          menuName={active.name}
          open={showQR}
          onClose={() => setShowQR(false)}
        />
      )}
    </div>
  );
};

const btnGhost   = { display:'flex', alignItems:'center', gap:6, padding:'7px 12px', background:'#f8f9fc', border:'1px solid #e2e6ef', borderRadius:8, color:'#4b5263', fontSize:12, cursor:'pointer' };
const btnPrimary = { display:'flex', alignItems:'center', gap:6, padding:'8px 14px', background:'#0061d2', border:'none', borderRadius:9, color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer' };
const alertStyle = (type) => ({ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', borderRadius:10, fontSize:13, marginBottom:14, ...(type==='error' ? { background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.25)', color:'#fca5a5' } : { background:'rgba(16,185,129,.1)', border:'1px solid rgba(16,185,129,.25)', color:'#6ee7b7' }) });

export default ActiveMenu;
