/**
 * QRMenuPage.js
 * ─────────────────────────────────────────────────────────────────
 * PUBLIC route: /menu/:menuId?branchId=X
 *
 * No auth required. Loaded when a customer scans the QR code.
 *
 * Features:
 *  - Shows full menu grouped by category
 *  - Real-time stock status: in-stock vs out-of-stock per item
 *  - Customer can add items to a cart
 *  - Place order → POST to /api/menus/public/order
 *  - Order goes to ERP Daily Sales (tagged [QR-ORDER:...])
 *  - Kitchen produces → Log Production → stock out in inventory
 *
 * Uses qrcode.react for generating QR codes inside the ERP (ActiveMenu),
 * but THIS file is the landing page the QR code points to.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  ShoppingCart, X, Plus, Minus,
  AlertCircle, CheckCircle, Loader, Send, Phone, User,
  UtensilsCrossed, Info, Hash,
} from 'lucide-react';
import menuService from '../../../services/menuService';

// ── Category display order & icons ──────────────────────────────────────────
const CAT_ORDER = ['Starters', 'Soups', 'Mains', 'Breads', 'Sides', 'Desserts', 'Beverages', 'Specials'];
const CAT_EMOJI = {
  Starters:  '🥗', Soups: '🍲', Mains: '🍛', Breads: '🫓',
  Sides:     '🥙', Desserts: '🍮', Beverages: '🥤', Specials: '⭐',
};

// ── Design tokens matching ERP dark theme ───────────────────────────────────
const T = {
  bg:      '#0d1117',
  card:    '#161b22',
  card2:   '#1c2333',
  border:  '#30363d',
  primary: '#58a6ff',
  success: '#3fb950',
  warn:    '#d29922',
  danger:  '#f85149',
  muted:   '#8b949e',
  text:    '#e6edf3',
  purple:  '#bc8cff',
};

// ── CSS ─────────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: ${T.bg}; color: ${T.text}; font-family: 'DM Sans', sans-serif; min-height: 100vh; }
  .qr-page { max-width: 680px; margin: 0 auto; padding: 0 0 120px; }

  /* header */
  .qr-header {
    background: ${T.card2};
    border-bottom: 1px solid ${T.border};
    padding: 20px 20px 14px;
    position: sticky; top: 0; z-index: 50;
  }
  .qr-restaurant { font-size: 11px; color: ${T.muted}; text-transform: uppercase; letter-spacing: 1.2px; }
  .qr-menu-name  { font-size: 22px; font-weight: 700; color: ${T.text}; margin-top: 2px; }
  .qr-season     { font-size: 12px; color: ${T.warn}; margin-top: 3px; }
  .qr-cart-btn {
    position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
    background: ${T.primary}; color: #0d1117; border: none; border-radius: 50px;
    padding: 14px 28px; font-size: 15px; font-weight: 700; cursor: pointer;
    display: flex; align-items: center; gap: 10px;
    box-shadow: 0 4px 24px rgba(88,166,255,.35);
    min-width: 220px; justify-content: center; z-index: 100;
    transition: transform .15s, box-shadow .15s;
  }
  .qr-cart-btn:hover { transform: translateX(-50%) translateY(-2px); box-shadow: 0 8px 32px rgba(88,166,255,.45); }
  .qr-cart-badge {
    background: ${T.danger}; color: #fff;
    border-radius: 50%; width: 20px; height: 20px;
    font-size: 11px; font-weight: 700;
    display: flex; align-items: center; justify-content: center;
  }

  /* category section */
  .qr-category-title {
    font-size: 13px; font-weight: 600; color: ${T.muted};
    text-transform: uppercase; letter-spacing: 1px;
    padding: 20px 20px 8px; display: flex; align-items: center; gap: 8px;
  }
  .qr-category-line { flex: 1; height: 1px; background: ${T.border}; }

  /* item card */
  .qr-item {
    margin: 0 16px 10px;
    background: ${T.card};
    border: 1px solid ${T.border};
    border-radius: 14px;
    padding: 16px;
    display: flex;
    gap: 14px;
    align-items: flex-start;
    transition: border-color .2s;
    position: relative;
    overflow: hidden;
  }
  .qr-item.in-stock { border-color: ${T.border}; }
  .qr-item.out-stock { opacity: .55; border-color: ${T.border}; }
  .qr-item:hover.in-stock { border-color: ${T.primary}40; }
  .qr-item-left  { flex: 1; }
  .qr-item-name  { font-size: 15px; font-weight: 600; color: ${T.text}; }
  .qr-item-desc  { font-size: 12px; color: ${T.muted}; margin-top: 4px; line-height: 1.5; }
  .qr-item-price { font-size: 16px; font-weight: 700; color: ${T.success}; margin-top: 8px; }
  .qr-item-tags  { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px; }
  .qr-tag {
    font-size: 10px; padding: 2px 8px; border-radius: 20px; font-weight: 500;
    background: ${T.card2}; border: 1px solid ${T.border};
  }
  .qr-tag.allergen { color: ${T.warn}; border-color: ${T.warn}40; }
  .qr-tag.oos      { color: ${T.danger}; border-color: ${T.danger}40; background: ${T.danger}10; }
  .qr-tag.instock  { color: ${T.success}; border-color: ${T.success}40; }

  /* qty control */
  .qr-qty {
    display: flex; flex-direction: column; align-items: center; gap: 6px;
    min-width: 80px;
  }
  .qr-qty-row { display: flex; align-items: center; gap: 6px; }
  .qr-qty-btn {
    width: 28px; height: 28px; border-radius: 50%; border: 1px solid ${T.border};
    background: ${T.card2}; color: ${T.text}; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    font-size: 14px; font-weight: 700; transition: all .15s;
  }
  .qr-qty-btn:hover:not(:disabled) { background: ${T.primary}; border-color: ${T.primary}; color: #0d1117; }
  .qr-qty-btn:disabled { opacity: .3; cursor: not-allowed; }
  .qr-qty-val { font-size: 15px; font-weight: 700; color: ${T.text}; min-width: 20px; text-align: center; }
  .qr-add-btn {
    background: ${T.primary}; color: #0d1117; border: none;
    border-radius: 20px; padding: 6px 14px; font-size: 12px; font-weight: 700;
    cursor: pointer; transition: all .15s; white-space: nowrap;
  }
  .qr-add-btn:hover { opacity: .88; }
  .qr-oos-badge {
    position: absolute; top: 0; right: 0;
    background: ${T.danger}; color: #fff;
    font-size: 9px; font-weight: 700; padding: 3px 10px;
    border-bottom-left-radius: 10px;
    text-transform: uppercase; letter-spacing: .5px;
  }

  /* modal overlay */
  .qr-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,.7);
    z-index: 200; display: flex; align-items: flex-end; justify-content: center;
  }
  .qr-modal {
    background: ${T.card}; border-top: 1px solid ${T.border};
    border-radius: 22px 22px 0 0; padding: 24px 20px 40px;
    width: 100%; max-width: 680px; max-height: 90vh; overflow-y: auto;
  }
  .qr-modal-title { font-size: 18px; font-weight: 700; color: ${T.text}; margin-bottom: 20px; display: flex; align-items: center; gap: 8px; }
  .qr-modal-close { margin-left: auto; background: none; border: none; color: ${T.muted}; cursor: pointer; }
  .qr-cart-item {
    display: flex; align-items: center; gap: 12px;
    padding: 12px 0; border-bottom: 1px solid ${T.border};
  }
  .qr-cart-item-name { flex: 1; font-size: 14px; color: ${T.text}; }
  .qr-cart-item-price { font-size: 14px; color: ${T.success}; font-weight: 600; min-width: 64px; text-align: right; }

  /* form */
  .qr-form-group { margin-bottom: 14px; }
  .qr-label { font-size: 12px; color: ${T.muted}; margin-bottom: 5px; display: block; }
  .qr-input {
    width: 100%; background: ${T.card2}; border: 1px solid ${T.border};
    border-radius: 8px; padding: 10px 14px; color: ${T.text}; font-size: 14px;
    outline: none; font-family: 'DM Sans', sans-serif;
    transition: border-color .2s;
  }
  .qr-input:focus { border-color: ${T.primary}; }
  .qr-total-row { display: flex; justify-content: space-between; align-items: center; padding: 14px 0; margin-top: 6px; }
  .qr-total-label { font-size: 14px; color: ${T.muted}; }
  .qr-total-val   { font-size: 20px; font-weight: 700; color: ${T.text}; }
  .qr-place-btn {
    width: 100%; background: ${T.success}; color: #0d1117;
    border: none; border-radius: 12px; padding: 15px;
    font-size: 16px; font-weight: 700; cursor: pointer;
    display: flex; align-items: center; justify-content: center; gap: 8px;
    margin-top: 12px; transition: opacity .15s;
  }
  .qr-place-btn:hover:not(:disabled) { opacity: .88; }
  .qr-place-btn:disabled { opacity: .45; cursor: not-allowed; }

  /* success state */
  .qr-success {
    text-align: center; padding: 40px 20px;
  }
  .qr-success-icon { font-size: 56px; margin-bottom: 16px; }
  .qr-success-title { font-size: 22px; font-weight: 700; color: ${T.success}; margin-bottom: 8px; }
  .qr-success-sub   { font-size: 14px; color: ${T.muted}; margin-bottom: 6px; }
  .qr-order-num {
    display: inline-block; background: ${T.card2}; border: 1px solid ${T.primary};
    border-radius: 8px; padding: 10px 20px; font-size: 18px; font-weight: 700;
    color: ${T.primary}; margin: 12px 0;
  }
  .qr-spin { animation: spin .8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .qr-skeleton { background: ${T.card2}; border-radius: 8px; animation: shimmer 1.5s infinite; }
  @keyframes shimmer { 0%,100%{opacity:1} 50%{opacity:.4} }
`;

// ── Cart entry helper ────────────────────────────────────────────────────────
const cartKey = (item) => `${item.menuItemId}-${item.recipeId}`;

// ════════════════════════════════════════════════════════════════════════════
export default function QRMenuPage() {
  const { menuId }        = useParams();
  const [searchParams]    = useSearchParams();
  const branchId          = searchParams.get('branchId');

  const [menu,        setMenu]        = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [cart,        setCart]        = useState({});        // { key: { item, qty } }
  const [showCart,    setShowCart]    = useState(false);
  const [placing,     setPlacing]     = useState(false);
  const [orderResult, setOrderResult] = useState(null);
  const [tableNum,    setTableNum]    = useState('');
  const [custName,    setCustName]    = useState('');
  const [custPhone,   setCustPhone]   = useState('');
  const [orderNotes,  setOrderNotes]  = useState('');

  // ── Load public menu ───────────────────────────────────────────────────────
  const loadMenu = useCallback(async () => {
    if (!menuId || !branchId) {
      setError('Invalid QR code — missing menu or branch information.');
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data } = await menuService.getPublicMenu(menuId, branchId);
      setMenu(data);
    } catch (e) {
      setError(e.response?.status === 404
        ? 'This menu is no longer available.'
        : 'Could not load menu. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [menuId, branchId]);

  useEffect(() => { loadMenu(); }, [loadMenu]);

  // ── Cart helpers ───────────────────────────────────────────────────────────
  const addToCart = (item) => {
    const k = cartKey(item);
    setCart(c => ({ ...c, [k]: { item, qty: (c[k]?.qty || 0) + 1 } }));
  };

  const removeFromCart = (item) => {
    const k = cartKey(item);
    setCart(c => {
      const next = { ...c };
      if (!next[k]) return next;
      if (next[k].qty <= 1) { delete next[k]; }
      else { next[k] = { ...next[k], qty: next[k].qty - 1 }; }
      return next;
    });
  };

  const cartItems    = Object.values(cart);
  const cartCount    = cartItems.reduce((s, e) => s + e.qty, 0);
  const cartTotal    = cartItems.reduce((s, e) => s + (parseFloat(e.item.basePrice || 0) * e.qty), 0);
  const getQty       = (item) => cart[cartKey(item)]?.qty || 0;

  // ── Place order ────────────────────────────────────────────────────────────
  const handlePlaceOrder = async () => {
    if (!cartItems.length) return;
    setPlacing(true);
    try {
      const payload = {
        branchId:     Number(branchId),
        menuId:       Number(menuId),
        tableNumber:  tableNum || null,
        customerName: custName || null,
        customerPhone:custPhone || null,
        notes:        orderNotes || null,
        items: cartItems.map(({ item, qty }) => ({
          recipeId:   item.recipeId,
          menuItemId: item.menuItemId,
          quantity:   qty,
          unitPrice:  parseFloat(item.basePrice || 0),
        })),
      };
      const { data } = await menuService.placePublicOrder(payload);
      setOrderResult(data);
      setCart({});
      setShowCart(false);
    } catch (e) {
      alert(e.response?.data || 'Failed to place order. Please try again.');
    } finally {
      setPlacing(false);
    }
  };

  // ── Group items by category ────────────────────────────────────────────────
  const grouped = {};
  (menu?.items || []).forEach(item => {
    const cat = item.menuCategory || 'Other';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  });
  const categories = [
    ...CAT_ORDER.filter(c => grouped[c]),
    ...Object.keys(grouped).filter(c => !CAT_ORDER.includes(c)),
  ];

  // ────────────────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{css}</style>

      {/* Order success */}
      {orderResult && (
        <div className="qr-page">
          <div className="qr-success">
            <div className="qr-success-icon">🎉</div>
            <div className="qr-success-title">Order Placed!</div>
            <p className="qr-success-sub">Your order has been received by the kitchen.</p>
            <div className="qr-order-num">{orderResult.orderNumber}</div>
            <p className="qr-success-sub" style={{ marginTop: 8 }}>
              Total: ₹{Number(orderResult.totalAmount || 0).toFixed(2)}
            </p>

            {/* Customer loyalty card */}
            {orderResult.customerId && (
              <div style={{
                margin: '20px auto 0', maxWidth: 320,
                background: orderResult.newCustomer ? `${T.success}12` : `${T.primary}12`,
                border: `1px solid ${orderResult.newCustomer ? T.success : T.primary}40`,
                borderRadius: 14, padding: '16px 20px', textAlign: 'left',
              }}>
                {orderResult.newCustomer ? (
                  <>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.success, marginBottom: 6 }}>
                      🎊 Welcome! You're now registered.
                    </div>
                    <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.6 }}>
                      Hi <strong style={{ color: T.text }}>{orderResult.customerName}</strong>!
                      Your loyalty account has been created.
                      Earn points on every order — redeem for rewards!
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.primary, marginBottom: 6 }}>
                      👋 Welcome back, {orderResult.customerName}!
                    </div>
                    <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.6 }}>
                      Points will be added to your account once your order is fulfilled by the kitchen.
                    </div>
                  </>
                )}
                <div style={{
                  marginTop: 12, display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <div style={{
                    background: orderResult.customerTier === 'GOLD' ? '#92400e'
                      : orderResult.customerTier === 'SILVER' ? '#374151' : '#1e3a5f',
                    color: orderResult.customerTier === 'GOLD' ? '#fcd34d'
                      : orderResult.customerTier === 'SILVER' ? '#d1d5db' : '#93c5fd',
                    fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                  }}>
                    {orderResult.customerTier}
                  </div>
                  <div style={{ fontSize: 12, color: T.muted }}>
                    <strong style={{ color: T.text }}>{orderResult.currentLoyaltyPoints}</strong> pts balance
                  </div>
                </div>
              </div>
            )}

            <p style={{ fontSize: 13, color: T.muted, marginTop: 16, lineHeight: 1.6 }}>
              {orderResult.message}
            </p>
            <button
              onClick={() => { setOrderResult(null); loadMenu(); }}
              style={{
                marginTop: 28, background: T.primary, color: '#0d1117',
                border: 'none', borderRadius: 10, padding: '12px 28px',
                fontSize: 14, fontWeight: 700, cursor: 'pointer',
              }}
            >
              Order More
            </button>
          </div>
        </div>
      )}

      {!orderResult && (
        <div className="qr-page">
          {/* Header */}
          <div className="qr-header">
            <div className="qr-restaurant">
              <UtensilsCrossed size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
              Klyro Dining
            </div>
            {loading
              ? <div className="qr-skeleton" style={{ height: 28, width: 180, marginTop: 6 }} />
              : <div className="qr-menu-name">{menu?.menuName || '—'}</div>
            }
            {menu?.season && <div className="qr-season">✨ {menu.season}</div>}
          </div>

          {/* Error */}
          {error && (
            <div style={{
              margin: 20, padding: 16, background: '#f8514920', border: '1px solid #f8514960',
              borderRadius: 12, color: T.danger, display: 'flex', gap: 10, alignItems: 'flex-start',
            }}>
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Menu Unavailable</div>
                <div style={{ fontSize: 13, opacity: .8 }}>{error}</div>
              </div>
            </div>
          )}

          {/* Loading skeletons */}
          {loading && !error && (
            <div style={{ padding: 16 }}>
              {[1, 2, 3].map(i => (
                <div key={i} className="qr-skeleton" style={{ height: 90, borderRadius: 14, marginBottom: 10 }} />
              ))}
            </div>
          )}

          {/* Menu categories */}
          {!loading && !error && categories.map(cat => (
            <div key={cat}>
              <div className="qr-category-title">
                <span>{CAT_EMOJI[cat] || '🍽️'} {cat}</span>
                <div className="qr-category-line" />
              </div>

              {grouped[cat].map(item => {
                const qty = getQty(item);
                return (
                  <div key={item.menuItemId} className={`qr-item ${item.inStock ? 'in-stock' : 'out-stock'}`}>
                    {!item.inStock && <div className="qr-oos-badge">Out of stock</div>}

                    <div className="qr-item-left">
                      <div className="qr-item-name">{item.name}</div>
                      {item.description && (
                        <div className="qr-item-desc">{item.description}</div>
                      )}
                      <div className="qr-item-price">
                        ₹{Number(item.basePrice || 0).toFixed(2)}
                      </div>
                      <div className="qr-item-tags">
                        {item.inStock
                          ? <span className="qr-tag instock">
                              <CheckCircle size={9} style={{ marginRight: 3, verticalAlign: 'middle' }} />
                              Available
                            </span>
                          : <span className="qr-tag oos">
                              <X size={9} style={{ marginRight: 3, verticalAlign: 'middle' }} />
                              Out of stock — will be prepared on order
                            </span>
                        }
                        {item.allergens && item.allergens.split(',').map(a => a.trim()).filter(Boolean).map(a => (
                          <span key={a} className="qr-tag allergen">⚠️ {a}</span>
                        ))}
                      </div>
                    </div>

                    {/* Quantity control */}
                    <div className="qr-qty">
                      {qty === 0 ? (
                        <button
                          className="qr-add-btn"
                          onClick={() => addToCart(item)}
                          disabled={false} // allow order even if OOS — kitchen will produce
                        >
                          <Plus size={12} style={{ marginRight: 3 }} /> Add
                        </button>
                      ) : (
                        <div className="qr-qty-row">
                          <button className="qr-qty-btn" onClick={() => removeFromCart(item)}>
                            <Minus size={12} />
                          </button>
                          <span className="qr-qty-val">{qty}</span>
                          <button className="qr-qty-btn" onClick={() => addToCart(item)}>
                            <Plus size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}

          {/* Info footer */}
          {!loading && !error && (
            <div style={{
              margin: '20px 16px 0', padding: 14,
              background: '#58a6ff10', border: '1px solid #58a6ff30',
              borderRadius: 12, fontSize: 12, color: T.muted, lineHeight: 1.6,
            }}>
              <Info size={13} style={{ marginRight: 6, verticalAlign: 'middle', color: T.primary }} />
              Items marked <strong style={{ color: T.danger }}>Out of Stock</strong> can still be ordered —
              our kitchen will prepare them fresh for you. Items marked{' '}
              <strong style={{ color: T.success }}>Available</strong> are ready to serve immediately.
            </div>
          )}

          {/* Floating cart button */}
          {cartCount > 0 && (
            <button className="qr-cart-btn" onClick={() => setShowCart(true)}>
              <ShoppingCart size={18} />
              View Order
              <span className="qr-cart-badge">{cartCount}</span>
              <span style={{ marginLeft: 'auto', fontSize: 13 }}>₹{cartTotal.toFixed(2)}</span>
            </button>
          )}

          {/* Cart / Checkout modal */}
          {showCart && (
            <div className="qr-overlay" onClick={(e) => e.target === e.currentTarget && setShowCart(false)}>
              <div className="qr-modal">
                <div className="qr-modal-title">
                  <ShoppingCart size={18} />
                  Your Order
                  <button className="qr-modal-close" onClick={() => setShowCart(false)}>
                    <X size={20} />
                  </button>
                </div>

                {/* Cart items */}
                {cartItems.map(({ item, qty }) => (
                  <div key={cartKey(item)} className="qr-cart-item">
                    <div className="qr-qty-row">
                      <button className="qr-qty-btn" onClick={() => removeFromCart(item)}><Minus size={11} /></button>
                      <span className="qr-qty-val" style={{ fontSize: 13 }}>{qty}</span>
                      <button className="qr-qty-btn" onClick={() => addToCart(item)}><Plus size={11} /></button>
                    </div>
                    <div className="qr-cart-item-name">
                      {item.name}
                      {!item.inStock && (
                        <span style={{ fontSize: 10, color: T.warn, marginLeft: 6 }}>(fresh prep)</span>
                      )}
                    </div>
                    <div className="qr-cart-item-price">
                      ₹{(parseFloat(item.basePrice || 0) * qty).toFixed(2)}
                    </div>
                  </div>
                ))}

                {/* Total */}
                <div className="qr-total-row">
                  <span className="qr-total-label">Total</span>
                  <span className="qr-total-val">₹{cartTotal.toFixed(2)}</span>
                </div>

                {/* Optional guest details */}
                <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 16, marginTop: 4 }}>
                  <p style={{ fontSize: 12, color: T.muted, marginBottom: 12 }}>
                    Optional — helps us personalise your experience
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div className="qr-form-group">
                      <label className="qr-label"><Hash size={10} /> Table Number</label>
                      <input
                        className="qr-input"
                        placeholder="e.g. T-5"
                        value={tableNum}
                        onChange={e => setTableNum(e.target.value)}
                      />
                    </div>
                    <div className="qr-form-group">
                      <label className="qr-label"><User size={10} /> Your Name</label>
                      <input
                        className="qr-input"
                        placeholder="e.g. Rahul"
                        value={custName}
                        onChange={e => setCustName(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="qr-form-group">
                    <label className="qr-label"><Phone size={10} /> Phone (for loyalty points)</label>
                    <input
                      className="qr-input"
                      placeholder="e.g. 9876543210"
                      type="tel"
                      value={custPhone}
                      onChange={e => setCustPhone(e.target.value)}
                    />
                  </div>
                  <div className="qr-form-group">
                    <label className="qr-label">Special Requests</label>
                    <input
                      className="qr-input"
                      placeholder="Allergies, spice level, etc."
                      value={orderNotes}
                      onChange={e => setOrderNotes(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  className="qr-place-btn"
                  onClick={handlePlaceOrder}
                  disabled={placing || !cartItems.length}
                >
                  {placing
                    ? <><Loader size={16} className="qr-spin" /> Placing Order...</>
                    : <><Send size={16} /> Place Order · ₹{cartTotal.toFixed(2)}</>
                  }
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
