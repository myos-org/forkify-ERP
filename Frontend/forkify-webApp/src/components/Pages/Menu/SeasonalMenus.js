import React, { useState, useEffect, useCallback } from 'react';
import {
  Utensils, Plus, Edit2, Trash2, RefreshCw, CheckCircle,
  XCircle, Send, Search, X, Save, AlertTriangle, ChevronDown,
} from 'lucide-react';
import menuService  from '../../../services/menuService';
import recipeService from '../../../services/recipeService';
import usePermission from '../../../hooks/usePermission';

const SEASONS = ['REGULAR', 'SEASONAL', 'FESTIVAL', 'WEEKEND', 'SUMMER', 'WINTER'];
const MENU_CATS = ['Starters', 'Mains', 'Desserts', 'Beverages', 'Specials', 'Breakfast', 'Lunch', 'Dinner'];

const emptyForm = () => ({
  name: '', description: '', season: 'REGULAR', validFrom: '', validTo: '',
  active: false, hqMenu: true,
  items: [],
});

const SeasonalMenus = () => {
  const { isHQ } = usePermission();

  const [menus,       setMenus]       = useState([]);
  const [recipes,     setRecipes]     = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [modal,       setModal]       = useState(false);
  const [editId,      setEditId]      = useState(null);
  const [form,        setForm]        = useState(emptyForm());
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState(null);
  const [success,     setSuccess]     = useState(null);
  const [deleteId,    setDeleteId]    = useState(null);
  const [search,      setSearch]      = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [menuRes, recipeRes] = await Promise.all([
        menuService.getAll(false),
        recipeService.getAll({ status: 'ACTIVE' }),
      ]);
      setMenus(menuRes.data || []);
      setRecipes(recipeRes.data || []);
    } catch { setError('Failed to load menus'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (success) { const t = setTimeout(() => setSuccess(null), 3000); return () => clearTimeout(t); }
  }, [success]);

  const openCreate = () => { setEditId(null); setForm(emptyForm()); setError(null); setModal(true); };
  const openEdit   = (m) => {
    setEditId(m.id);
    setForm({
      name: m.name || '', description: m.description || '',
      season: m.season || 'REGULAR', validFrom: m.validFrom || '', validTo: m.validTo || '',
      active: m.active, hqMenu: m.hqMenu,
      items: (m.items || []).map(i => ({
        recipeId: i.recipeId, displayName: i.displayName || '',
        basePrice: i.basePrice || 0, menuCategory: i.menuCategory || '',
        description: i.description || '',
      })),
    });
    setError(null); setModal(true);
  };

  const addItem = () => setForm(f => ({
    ...f, items: [...f.items, { recipeId: '', displayName: '', basePrice: '', menuCategory: '', description: '' }],
  }));
  const removeItem = (i) => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));
  const updateItem = (i, field, val) => setForm(f => ({
    ...f, items: f.items.map((item, idx) => idx === i ? { ...item, [field]: val } : item),
  }));

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Menu name is required'); return; }
    setSaving(true); setError(null);
    try {
      const payload = {
        ...form,
        items: form.items.filter(i => i.recipeId).map(i => ({
          recipeId: Number(i.recipeId),
          displayName: i.displayName || null,
          basePrice: i.basePrice ? Number(i.basePrice) : 0,
          menuCategory: i.menuCategory || null,
          description: i.description || null,
        })),
      };
      if (editId) {
        const { data } = await menuService.update(editId, payload);
        setMenus(prev => prev.map(m => m.id === editId ? data : m));
        setSuccess('Menu updated');
      } else {
        const { data } = await menuService.create(payload);
        setMenus(prev => [data, ...prev]);
        setSuccess('Menu created');
      }
      setModal(false);
    } catch (e) { setError(e.response?.data || 'Save failed'); }
    finally { setSaving(false); }
  };

  const handleToggleActive = async (m) => {
    try {
      const { data } = m.active ? await menuService.deactivate(m.id) : await menuService.activate(m.id);
      setMenus(prev => prev.map(menu => menu.id === m.id ? data : menu));
      setSuccess(m.active ? 'Menu deactivated' : 'Menu activated');
    } catch (e) { setError(e.response?.data || 'Failed'); }
  };

  const handlePush = async (id) => {
    try { const { data } = await menuService.push(id); setSuccess(data); }
    catch (e) { setError(e.response?.data || 'Push failed'); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await menuService.delete(deleteId);
      setMenus(prev => prev.filter(m => m.id !== deleteId));
      setSuccess('Menu deleted');
    } catch (e) { setError(e.response?.data || 'Delete failed'); }
    finally { setDeleteId(null); }
  };

  const filtered = menus.filter(m =>
    !search || m.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", color:'#0d1017' }}>
      <style>{`.sm-spin{animation:spin .8s linear infinite;}@keyframes spin{to{transform:rotate(360deg);}}`}</style>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18, flexWrap:'wrap', gap:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, color:'#3385e0' }}>
          <Utensils size={20}/>
          <div>
            <h2 style={{ margin:0, fontSize:20, fontWeight:700, color:'#0d1017' }}>Menu Management</h2>
            <p style={{ margin:0, fontSize:12, color:'#9aa3b4' }}>{menus.length} menus · {menus.filter(m=>m.active).length} active</p>
          </div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={load} style={btnGhost}><RefreshCw size={13} className={loading?'sm-spin':''}/></button>
          {isHQ && <button onClick={openCreate} style={btnPrimary}><Plus size={14}/> New Menu</button>}
        </div>
      </div>

      {error   && <div style={alert('error')}><AlertTriangle size={13}/>{error}<button onClick={()=>setError(null)} style={{ background:'none',border:'none',cursor:'pointer',marginLeft:'auto',opacity:.6,color:'inherit' }}>✕</button></div>}
      {success && <div style={alert('success')}><CheckCircle size={13}/>{success}</div>}

      {/* Search */}
      <div style={{ display:'flex', alignItems:'center', gap:6, background:'#f8f9fc', border:'1px solid #e2e6ef', borderRadius:9, padding:'0 12px', marginBottom:16, maxWidth:320 }}>
        <Search size={13} style={{ color:'#9aa3b4' }}/>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search menus..." style={{ background:'none', border:'none', outline:'none', color:'#0d1017', fontSize:13, padding:'9px 0', width:'100%' }}/>
        {search && <button onClick={()=>setSearch('')} style={{ background:'none',border:'none',cursor:'pointer',color:'#9aa3b4',display:'flex' }}><X size={12}/></button>}
      </div>

      {/* Menu grid */}
      {loading ? (
        <div style={{ textAlign:'center', padding:40, color:'#9aa3b4', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}><RefreshCw size={18} className="sm-spin"/> Loading...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:'center', padding:50, color:'#9aa3b4' }}><Utensils size={40} style={{ marginBottom:12, opacity:.3 }}/><p>No menus yet. Create your first menu.</p></div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(320px, 1fr))', gap:14 }}>
          {filtered.map(m => (
            <div key={m.id} style={{ background:'#ffffff', border:`1px solid ${m.active ? 'rgba(16,185,129,.25)' : '#e2e6ef'}`, borderRadius:14, overflow:'hidden', transition:'border-color .15s' }}>
              <div style={{ padding:'14px 16px' }}>
                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:10 }}>
                  <div>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                      <span style={{ fontSize:15, fontWeight:700, color:'#0d1017' }}>{m.name}</span>
                      {m.active && <span style={{ fontSize:10, fontWeight:700, padding:'2px 6px', borderRadius:4, background:'rgba(16,185,129,.15)', color:'#34d399' }}>ACTIVE</span>}
                      {m.hqMenu && <span style={{ fontSize:10, fontWeight:700, padding:'2px 6px', borderRadius:4, background:'rgba(0,97,210,.15)', color:'#3385e0' }}>HQ</span>}
                    </div>
                    <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                      <span style={{ fontSize:11, color:'#9aa3b4' }}>{m.season}</span>
                      <span style={{ fontSize:11, color:'#9aa3b4' }}>{m.itemCount} items</span>
                      {m.validFrom && <span style={{ fontSize:11, color:'#9aa3b4' }}>{m.validFrom} → {m.validTo || '∞'}</span>}
                    </div>
                  </div>
                  {isHQ && (
                    <div style={{ display:'flex', gap:4 }}>
                      <button style={iconBtn} onClick={() => openEdit(m)} title="Edit"><Edit2 size={13}/></button>
                      <button style={{ ...iconBtn, color:m.active?'#fbbf24':'#34d399' }} onClick={() => handleToggleActive(m)} title={m.active?'Deactivate':'Activate'}>
                        {m.active ? <XCircle size={13}/> : <CheckCircle size={13}/>}
                      </button>
                      {m.hqMenu && <button style={{ ...iconBtn, color:'#3385e0' }} onClick={() => handlePush(m.id)} title="Push to branches"><Send size={13}/></button>}
                      <button style={{ ...iconBtn, color:'#f87171' }} onClick={() => setDeleteId(m.id)} title="Delete"><Trash2 size={13}/></button>
                    </div>
                  )}
                </div>
                {m.description && <p style={{ fontSize:12, color:'#9aa3b4', margin:'0 0 10px', lineHeight:1.5 }}>{m.description}</p>}

                {/* Item preview */}
                {(m.items || []).slice(0, 3).map(item => (
                  <div key={item.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'5px 0', borderTop:'1px solid #f8f9fc' }}>
                    <span style={{ fontSize:12, color:'#4b5263' }}>{item.displayName}</span>
                    {item.basePrice > 0 && <span style={{ fontSize:12, fontWeight:600, color:'#34d399' }}>₹{Number(item.basePrice).toFixed(2)}</span>}
                  </div>
                ))}
                {m.itemCount > 3 && <div style={{ fontSize:11, color:'#9aa3b4', marginTop:6 }}>+{m.itemCount - 3} more items</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {modal && (
        <div style={overlay} onClick={() => setModal(false)}>
          <div style={modalStyle} onClick={e => e.stopPropagation()}>
            <div style={modalHeader}>
              <h3 style={{ margin:0, fontSize:15, fontWeight:700, color:'#0d1017' }}>{editId ? 'Edit Menu' : 'Create Menu'}</h3>
              <button style={closeBtn} onClick={() => setModal(false)}><X size={15}/></button>
            </div>
            <div style={{ padding:'18px 20px', overflowY:'auto', flex:1 }}>
              {error && <div style={{ ...alert('error'), marginBottom:12 }}><AlertTriangle size={13}/>{error}</div>}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
                <div style={{ gridColumn:'1/-1' }}>
                  <label style={labelStyle}>Menu Name *</label>
                  <input style={inputStyle} value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder="e.g. Summer Specials 2024"/>
                </div>
                <div>
                  <label style={labelStyle}>Season</label>
                  <div style={{ position:'relative' }}>
                    <select style={selectStyle} value={form.season} onChange={e=>setForm(p=>({...p,season:e.target.value}))}>
                      {SEASONS.map(s=><option key={s} value={s}>{s}</option>)}
                    </select>
                    <ChevronDown size={12} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', color:'#9aa3b4', pointerEvents:'none' }}/>
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Valid From</label>
                  <input type="date" style={inputStyle} value={form.validFrom} onChange={e=>setForm(p=>({...p,validFrom:e.target.value}))}/>
                </div>
                <div>
                  <label style={labelStyle}>Valid To</label>
                  <input type="date" style={inputStyle} value={form.validTo} onChange={e=>setForm(p=>({...p,validTo:e.target.value}))}/>
                </div>
                <div style={{ gridColumn:'1/-1' }}>
                  <label style={labelStyle}>Description</label>
                  <textarea style={{ ...inputStyle, minHeight:55, resize:'vertical', width:'100%' }} value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} placeholder="Optional description..."/>
                </div>
                <div style={{ gridColumn:'1/-1', display:'flex', gap:16 }}>
                  <label style={{ display:'flex', alignItems:'center', gap:7, cursor:'pointer', fontSize:13, color:'#4b5263' }}>
                    <input type="checkbox" checked={form.active} onChange={e=>setForm(p=>({...p,active:e.target.checked}))} style={{ accentColor:'#0061d2', width:15, height:15 }}/>
                    Activate immediately
                  </label>
                  <label style={{ display:'flex', alignItems:'center', gap:7, cursor:'pointer', fontSize:13, color:'#4b5263' }}>
                    <input type="checkbox" checked={form.hqMenu} onChange={e=>setForm(p=>({...p,hqMenu:e.target.checked}))} style={{ accentColor:'#3385e0', width:15, height:15 }}/>
                    HQ menu (can push to branches)
                  </label>
                </div>
              </div>

              {/* Menu Items */}
              <div style={{ borderTop:'1px solid #e2e6ef', paddingTop:14 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                  <label style={labelStyle}>Menu Items ({form.items.length})</label>
                  <button onClick={addItem} style={{ ...btnGhost, fontSize:12, padding:'5px 10px' }}><Plus size={11}/> Add Item</button>
                </div>
                {form.items.map((item, idx) => (
                  <div key={idx} style={{ background:'#ffffff', border:'1px solid #e2e6ef', borderRadius:10, padding:12, marginBottom:8 }}>
                    <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr auto', gap:8, alignItems:'center' }}>
                      <div style={{ position:'relative' }}>
                        <select style={selectStyle} value={item.recipeId} onChange={e=>updateItem(idx,'recipeId',e.target.value)}>
                          <option value="">— Select Recipe —</option>
                          {recipes.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                        <ChevronDown size={11} style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', color:'#9aa3b4', pointerEvents:'none' }}/>
                      </div>
                      <input style={inputStyle} type="number" min="0" step="0.01" placeholder="Price ₹" value={item.basePrice} onChange={e=>updateItem(idx,'basePrice',e.target.value)}/>
                      <div style={{ position:'relative' }}>
                        <select style={selectStyle} value={item.menuCategory} onChange={e=>updateItem(idx,'menuCategory',e.target.value)}>
                          <option value="">Category</option>
                          {MENU_CATS.map(c=><option key={c} value={c}>{c}</option>)}
                        </select>
                        <ChevronDown size={11} style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', color:'#9aa3b4', pointerEvents:'none' }}/>
                      </div>
                      <button onClick={()=>removeItem(idx)} style={{ background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.2)', borderRadius:7, padding:7, display:'flex', cursor:'pointer', color:'#f87171' }}><Trash2 size={13}/></button>
                    </div>
                    <input style={{ ...inputStyle, marginTop:6, width:'100%' }} placeholder="Display name (optional)" value={item.displayName} onChange={e=>updateItem(idx,'displayName',e.target.value)}/>
                  </div>
                ))}
                {form.items.length === 0 && <div style={{ textAlign:'center', padding:20, color:'#c8cedb', fontSize:12 }}>No items yet — click Add Item</div>}
              </div>
            </div>
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end', padding:'14px 20px', borderTop:'1px solid #e2e6ef' }}>
              <button style={btnGhost} onClick={() => setModal(false)}>Cancel</button>
              <button style={btnPrimary} onClick={handleSave} disabled={saving}>
                {saving ? <RefreshCw size={13} className="sm-spin"/> : <Save size={13}/>}
                {editId ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div style={overlay} onClick={() => setDeleteId(null)}>
          <div style={{ background:'#1a1a24', border:'1px solid #e2e6ef', borderRadius:16, padding:28, textAlign:'center', maxWidth:360, width:'100%' }} onClick={e => e.stopPropagation()}>
            <Trash2 size={28} style={{ color:'#f87171', margin:'0 auto 12px', display:'block' }}/>
            <h3 style={{ color:'#0d1017', margin:'0 0 8px', fontSize:17 }}>Delete Menu?</h3>
            <p style={{ color:'#9aa3b4', fontSize:13, margin:'0 0 16px' }}>This will permanently delete the menu and all its items.</p>
            <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
              <button style={btnGhost} onClick={() => setDeleteId(null)}>Cancel</button>
              <button style={{ padding:'8px 18px', background:'#ef4444', border:'none', borderRadius:9, color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer' }} onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const btnGhost   = { display:'flex', alignItems:'center', gap:6, padding:'7px 12px', background:'#f8f9fc', border:'1px solid #e2e6ef', borderRadius:8, color:'#4b5263', fontSize:12, cursor:'pointer' };
const btnPrimary = { display:'flex', alignItems:'center', gap:6, padding:'8px 14px', background:'#0061d2', border:'none', borderRadius:9, color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer' };
const iconBtn    = { width:28, height:28, background:'#f8f9fc', border:'1px solid #e2e6ef', borderRadius:7, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#6b7385', transition:'all .15s' };
const inputStyle = { background:'#f0f2f7', border:'1px solid #e2e6ef', borderRadius:9, padding:'9px 12px', color:'#0d1017', fontSize:13, outline:'none', fontFamily:'inherit', width:'100%', boxSizing:'border-box' };
const selectStyle= { appearance:'none', ...{ background:'#f0f2f7', border:'1px solid #e2e6ef', borderRadius:9, padding:'9px 28px 9px 12px', color:'#0d1017', fontSize:13, outline:'none', cursor:'pointer', width:'100%' } };
const labelStyle = { display:'block', fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:.4, color:'#9aa3b4', marginBottom:5 };
const overlay    = { position:'fixed', inset:0, background:'rgba(0,0,0,.65)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 };
const modalStyle = { background:'#1a1a24', border:'1px solid #e2e6ef', borderRadius:16, width:'100%', maxWidth:640, maxHeight:'90vh', overflow:'hidden', display:'flex', flexDirection:'column' };
const modalHeader= { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', borderBottom:'1px solid #e2e6ef' };
const closeBtn   = { background:'#e2e6ef', border:'none', borderRadius:7, width:26, height:26, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#6b7385' };
const alert = (type) => ({ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', borderRadius:10, fontSize:13, marginBottom:14, ...(type==='error' ? { background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.25)', color:'#fca5a5' } : { background:'rgba(16,185,129,.1)', border:'1px solid rgba(16,185,129,.25)', color:'#6ee7b7' }) });

export default SeasonalMenus;
