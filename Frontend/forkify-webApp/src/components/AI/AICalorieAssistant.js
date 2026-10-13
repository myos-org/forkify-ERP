// src/components/AI/AICalorieAssistant.js
// AI-powered Calorie & Meal Planning Assistant
//
// USAGE:
//   import AICalorieAssistant, { AICalorieTrigger } from '../../AI/AICalorieAssistant';
//   const [showAI, setShowAI] = useState(false);
//   <AICalorieTrigger onClick={() => setShowAI(true)} itemCount={items.length} />
//   {showAI && <AICalorieAssistant menuItems={items} onClose={() => setShowAI(false)} />}

import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles, X, Send, Zap, Flame,
  RefreshCw, CheckCircle2, Info, Bot,
} from 'lucide-react';

const API_BASE = process.env.REACT_APP_API_URL || 'https://forkify-erp.onrender.com/api';

async function askClaude(systemPrompt, conversationHistory, branchId, contextType) {
  const token = localStorage.getItem('token') || '';
  const response = await fetch(`${API_BASE}/ai/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      system: systemPrompt,
      messages: conversationHistory,
      branchId: branchId || null,
      contextType: contextType || 'all',
    }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Server error ${response.status}`);
  }
  const data = await response.json();
  return data.content?.find(b => b.type === 'text')?.text || '';
}

function buildSystemPrompt(menuItems) {
  const lines = (menuItems || []).map(item => {
    const cal     = item.calories     ?? item.recipe?.calories     ?? 0;
    const protein = item.protein      ?? item.recipe?.protein      ?? 0;
    const carbs   = item.carbs        ?? item.recipe?.carbs        ?? 0;
    const fat     = item.fat          ?? item.recipe?.fat          ?? 0;
    const name    = item.displayName  || item.recipe?.name         || item.name || 'Unknown';
    const cat     = item.menuCategory || item.recipe?.category     || item.category || '';
    const price   = item.basePrice ? ` | ₹${Number(item.basePrice).toFixed(0)}` : '';
    return `- ${name} | ${cal} kcal | Protein: ${protein}g | Carbs: ${carbs}g | Fat: ${fat}g | ${cat}${price}`;
  });

  return `You are a smart nutritional AI assistant embedded in an ERP system called Klyro.
You help staff find the best meal combinations from the restaurant's current menu based on calorie goals and nutritional preferences.

CURRENT MENU (name | calories | protein | carbs | fat | category | price):
${lines.length ? lines.join('\n') : '(No menu items loaded — answer general nutrition questions)'}

RULES:
1. Only suggest items that are on the menu above. Never invent items.
2. When the user gives a calorie target, list individual items AND 2-4 combo meals with totals.
3. For each combo show item calories and running total, plus remaining budget.
4. For protein/carb/fat queries, rank items by the requested macro.
5. Keep responses concise, friendly, well-formatted (bullet points, bold names).
6. If no items fit, say so and show the closest alternative.
7. Respond in the same language the user writes in.
8. You may answer general food & nutrition questions.`;
}

const QUICK_SUGGESTIONS = [
  'Build a 1800 kcal meal plan',
  'What items are low in stock?',
  'Show top selling recipes',
  'Highest protein recipes',
  "What's today's revenue?",
  'Which items expire this week?',
  'Low carb meals under 600 kcal',
  'Show wastage summary',
];

/* ── Trigger Button ───────────────────────────────────────────────────────── */
export function AICalorieTrigger({ onClick, itemCount = 0, label = 'AI Calorie Planner' }) {
  return (
    <button onClick={onClick} className="ai-trigger-btn">
      <Sparkles size={14} />
      <span>{label}</span>
      {itemCount > 0 && <span className="ai-trigger-badge">{itemCount} items</span>}
      <style>{`
        .ai-trigger-btn {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 8px 16px;
          background: #0061d2; border: none;
          border-radius: 9px; color: #fff;
          font-size: 13px; font-weight: 600;
          cursor: pointer; font-family: 'DM Sans', sans-serif;
          transition: background .15s, transform .1s;
          box-shadow: 0 2px 8px rgba(0,97,210,.3);
        }
        .ai-trigger-btn:hover { background: #0052b3; transform: translateY(-1px); }
        .ai-trigger-badge {
          background: rgba(255,255,255,.25); border-radius: 20px;
          padding: 1px 8px; font-size: 10px; font-weight: 700;
        }
      `}</style>
    </button>
  );
}

/* ── Main Modal ───────────────────────────────────────────────────────────── */
export default function AICalorieAssistant({ menuItems = [], onClose, branchId = null, contextType = 'all' }) {
  const itemCount    = menuItems.length;
  const systemPrompt = buildSystemPrompt(menuItems);

  const cals   = menuItems.map(i => i.calories ?? i.recipe?.calories ?? 0).filter(Boolean);
  const minCal = cals.length ? Math.min(...cals) : 0;
  const maxCal = cals.length ? Math.max(...cals) : 0;
  const avgCal = cals.length ? Math.round(cals.reduce((a, b) => a + b, 0) / cals.length) : 0;

  const [messages, setMessages] = useState([{
    role: 'assistant',
    text: `👋 Hi! I'm your **AI ERP Assistant** with live access to your full database.\n\nI can help with:\n• 🍽️ Calorie planning from your **complete recipe catalogue**\n• 📦 Inventory levels and stock alerts\n• 📊 Sales trends and top-sellers\n• 🚚 Supplier and procurement info\n• 🗑️ Wastage analysis\n\nTry: _"What are my low stock items?"_ or _"Build a 2000 calorie meal plan"_`,
  }]);
  const [history,  setHistory]  = useState([]);
  const [input,    setInput]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);

  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const send = async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput('');
    setError(null);
    setMessages(prev => [...prev, { role: 'user', text: msg }]);
    const updatedHistory = [...history, { role: 'user', content: msg }];
    setLoading(true);
    try {
      const reply = await askClaude(systemPrompt, updatedHistory, branchId, contextType);
      setHistory([...updatedHistory, { role: 'assistant', content: reply }]);
      setMessages(prev => [...prev, { role: 'assistant', text: reply }]);
    } catch {
      setError('Could not reach the AI. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const clearChat = () => {
    setHistory([]);
    setMessages([{ role: 'assistant', text: `Chat cleared! I still have **${itemCount} menu items** loaded. What would you like to know?` }]);
  };

  const renderText = (raw) =>
    (raw || '')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/_(.*?)_/g, '<em>$1</em>')
      .replace(/\n/g, '<br/>');

  return (
    <>
      <style>{`
        @keyframes ai-spin   { to { transform: rotate(360deg); } }
        @keyframes ai-fadeIn { from { opacity:0; transform:translateY(5px); } to { opacity:1; transform:translateY(0); } }
        @keyframes ai-bounce {
          0%,80%,100% { transform: translateY(0); opacity: .35; }
          40%          { transform: translateY(-4px); opacity: 1; }
        }

        .ai-overlay {
          position: fixed; inset: 0;
          background: rgba(0,0,0,.5);
          backdrop-filter: blur(3px);
          z-index: 9999;
          display: flex; align-items: center; justify-content: center;
          padding: 16px;
          font-family: 'DM Sans', system-ui, sans-serif;
        }

        .ai-modal {
          width: 100%; max-width: 560px; max-height: 90vh;
          background: #ffffff;
          border: 1px solid #e2e6ef;
          border-radius: 18px;
          display: flex; flex-direction: column;
          box-shadow: 0 24px 64px rgba(0,0,0,.18), 0 4px 16px rgba(0,97,210,.08);
          overflow: hidden;
        }

        /* ── Header ── */
        .ai-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 18px;
          background: #0061d2;
          flex-shrink: 0;
        }
        .ai-header-left { display: flex; align-items: center; gap: 11px; }
        .ai-header-icon {
          width: 34px; height: 34px; border-radius: 9px;
          background: rgba(255,255,255,.2);
          display: flex; align-items: center; justify-content: center;
          color: #fff; flex-shrink: 0;
        }
        .ai-header-title { font-size: 14px; font-weight: 700; color: #fff; }
        .ai-header-sub   { font-size: 11px; color: rgba(255,255,255,.7); margin-top: 1px; display:flex; align-items:center; gap:4px; }
        .ai-icon-btn {
          width: 30px; height: 30px; border-radius: 8px;
          background: rgba(255,255,255,.15); border: 1px solid rgba(255,255,255,.2);
          color: rgba(255,255,255,.85); cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: background .15s;
        }
        .ai-icon-btn:hover { background: rgba(255,255,255,.25); color: #fff; }

        /* ── Stats bar ── */
        .ai-stats-bar {
          display: flex; align-items: center; justify-content: center; gap: 0;
          background: #f0f2f7;
          border-bottom: 1px solid #e2e6ef;
          flex-shrink: 0;
        }
        .ai-stat-pill {
          flex: 1; text-align: center; padding: 9px 0;
        }
        .ai-stat-label { font-size: 10px; color: #9aa3b4; font-weight: 600; text-transform: uppercase; letter-spacing: .4px; margin-bottom: 2px; }
        .ai-stat-value { font-size: 13px; font-weight: 800; }
        .ai-stat-divider { width: 1px; height: 28px; background: #e2e6ef; }

        /* ── Messages ── */
        .ai-messages {
          flex: 1; overflow-y: auto; padding: 16px;
          scrollbar-width: thin; scrollbar-color: #e2e6ef transparent;
          background: #fafbfc;
        }
        .ai-messages::-webkit-scrollbar { width: 4px; }
        .ai-messages::-webkit-scrollbar-thumb { background: #e2e6ef; border-radius: 2px; }

        .ai-msg-row {
          display: flex; align-items: flex-start; gap: 9px; margin-bottom: 14px;
          animation: ai-fadeIn .2s ease forwards;
        }
        .ai-msg-row.user { flex-direction: row-reverse; }

        .ai-avatar-bot {
          width: 28px; height: 28px; border-radius: 8px; flex-shrink: 0;
          background: #0061d2;
          display: flex; align-items: center; justify-content: center;
          color: #fff; margin-top: 2px;
        }
        .ai-avatar-user {
          width: 28px; height: 28px; border-radius: 8px; flex-shrink: 0;
          background: #e8f0fd;
          display: flex; align-items: center; justify-content: center;
          color: #0061d2; margin-top: 2px;
        }

        .ai-bubble-bot {
          background: #ffffff; border: 1px solid #e2e6ef;
          border-radius: 4px 14px 14px 14px;
          padding: 11px 14px; max-width: 82%;
          font-size: 13px; line-height: 1.65; color: #1a1e2d;
          box-shadow: 0 1px 3px rgba(0,0,0,.05);
        }
        .ai-bubble-user {
          background: #0061d2; border: none;
          border-radius: 14px 4px 14px 14px;
          padding: 11px 14px; max-width: 82%;
          font-size: 13px; line-height: 1.65; color: #fff;
        }
        .ai-bubble-bot strong { color: #0061d2; }
        .ai-bubble-bot em     { color: #6b7385; font-style: italic; }

        /* Typing dots */
        .ai-typing {
          display: flex; align-items: center; gap: 5px;
          padding: 12px 14px; background: #ffffff;
          border: 1px solid #e2e6ef;
          border-radius: 4px 14px 14px 14px;
        }
        .ai-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: #0061d2; display: inline-block;
          animation: ai-bounce 1.2s ease-in-out infinite;
        }
        .ai-dot:nth-child(2) { animation-delay: .15s; }
        .ai-dot:nth-child(3) { animation-delay: .3s; }

        /* Error */
        .ai-error {
          display: flex; align-items: center; gap: 8px;
          background: #fde8e8; border: 1px solid #fca5a5;
          color: #c10000; border-radius: 9px;
          padding: 9px 12px; font-size: 12px; margin-bottom: 8px;
        }
        .ai-error-close { margin-left:auto; background:none; border:none; color:#c10000; cursor:pointer; font-size:14px; }

        /* ── Chips ── */
        .ai-chips {
          display: flex; flex-wrap: wrap; gap: 6px;
          padding: 10px 16px;
          border-top: 1px solid #e2e6ef;
          background: #fff;
          flex-shrink: 0;
        }
        .ai-chip {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 5px 10px; font-size: 11px; font-weight: 500;
          background: #e8f0fd; border: 1px solid #b3ccf5;
          border-radius: 20px; color: #0061d2;
          cursor: pointer; white-space: nowrap;
          transition: background .15s;
          font-family: 'DM Sans', sans-serif;
        }
        .ai-chip:hover { background: #d0e3fb; }

        /* ── Input row ── */
        .ai-input-row {
          display: flex; align-items: flex-end; gap: 9px;
          padding: 12px 14px;
          border-top: 1px solid #e2e6ef;
          background: #fff;
          flex-shrink: 0;
        }
        .ai-textarea {
          flex: 1; resize: none;
          background: #f8f9fc; border: 1px solid #e2e6ef;
          border-radius: 10px; padding: 9px 12px;
          color: #0d1017; font-size: 13px; line-height: 1.5;
          font-family: 'DM Sans', sans-serif;
          outline: none; transition: border-color .15s;
          min-height: 38px;
        }
        .ai-textarea:focus { border-color: #0061d2; box-shadow: 0 0 0 3px rgba(0,97,210,.1); }
        .ai-textarea::placeholder { color: #9aa3b4; }
        .ai-textarea:disabled { opacity: .6; }

        .ai-send-btn {
          width: 38px; height: 38px; flex-shrink: 0; border-radius: 10px;
          background: #0061d2; border: none; color: #fff;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: background .15s, opacity .2s;
          box-shadow: 0 2px 8px rgba(0,97,210,.25);
        }
        .ai-send-btn:hover:not(:disabled) { background: #0052b3; }
        .ai-send-btn:disabled { opacity: .4; cursor: not-allowed; }

        /* ── Hint ── */
        .ai-hint {
          text-align: center; font-size: 10px; color: #9aa3b4;
          padding: 0 16px 10px; flex-shrink: 0; background: #fff;
        }
      `}</style>

      <div className="ai-overlay" onClick={onClose}>
        <div className="ai-modal" onClick={e => e.stopPropagation()}>

          {/* Header */}
          <div className="ai-header">
            <div className="ai-header-left">
              <div className="ai-header-icon">
                <Sparkles size={16} />
              </div>
              <div>
                <div className="ai-header-title">AI Calorie Assistant</div>
                <div className="ai-header-sub">
                  <Flame size={10} />
                  Live database access · {itemCount > 0 ? `${itemCount} menu items` : 'All data'}
                </div>
              </div>
            </div>
            <div style={{ display:'flex', gap:6 }}>
              <button className="ai-icon-btn" onClick={clearChat} title="Clear chat">
                <RefreshCw size={13} />
              </button>
              <button className="ai-icon-btn" onClick={onClose} title="Close (Esc)">
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Stats bar */}
          {cals.length > 0 && (
            <div className="ai-stats-bar">
              <div className="ai-stat-pill">
                <div className="ai-stat-label">Min</div>
                <div className="ai-stat-value" style={{ color:'#0a6640' }}>{minCal} kcal</div>
              </div>
              <div className="ai-stat-divider" />
              <div className="ai-stat-pill">
                <div className="ai-stat-label">Avg</div>
                <div className="ai-stat-value" style={{ color:'#0061d2' }}>{avgCal} kcal</div>
              </div>
              <div className="ai-stat-divider" />
              <div className="ai-stat-pill">
                <div className="ai-stat-label">Max</div>
                <div className="ai-stat-value" style={{ color:'#c10000' }}>{maxCal} kcal</div>
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="ai-messages">
            {messages.map((m, i) => (
              <div key={i} className={`ai-msg-row ${m.role}`}>
                {m.role === 'assistant'
                  ? <div className="ai-avatar-bot"><Bot size={13} /></div>
                  : <div className="ai-avatar-user"><CheckCircle2 size={13} /></div>
                }
                <div
                  className={m.role === 'user' ? 'ai-bubble-user' : 'ai-bubble-bot'}
                  dangerouslySetInnerHTML={{ __html: renderText(m.text) }}
                />
              </div>
            ))}

            {loading && (
              <div className="ai-msg-row">
                <div className="ai-avatar-bot"><Sparkles size={13} /></div>
                <div className="ai-typing">
                  <span className="ai-dot" />
                  <span className="ai-dot" />
                  <span className="ai-dot" />
                </div>
              </div>
            )}

            {error && (
              <div className="ai-error">
                <Info size={13} style={{ flexShrink:0 }} />
                <span>{error}</span>
                <button className="ai-error-close" onClick={() => setError(null)}>✕</button>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Quick chips */}
          <div className="ai-chips">
            {QUICK_SUGGESTIONS.map(s => (
              <button key={s} className="ai-chip" onClick={() => send(s)} disabled={loading}>
                <Zap size={9} />
                {s}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="ai-input-row">
            <textarea
              ref={inputRef}
              className="ai-textarea"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="e.g. I want to eat only 2000 calories today…"
              rows={2}
              disabled={loading}
            />
            <button
              className="ai-send-btn"
              onClick={() => send()}
              disabled={!input.trim() || loading}
            >
              {loading
                ? <RefreshCw size={15} style={{ animation:'ai-spin .8s linear infinite' }} />
                : <Send size={15} />
              }
            </button>
          </div>

          <div className="ai-hint">Press Enter to send · Shift+Enter for new line · Esc to close</div>
        </div>
      </div>
    </>
  );
}