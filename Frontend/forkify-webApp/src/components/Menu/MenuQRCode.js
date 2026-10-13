/**
 * MenuQRCode.js
 * ─────────────────────────────────────────────────────────────────
 * Shows inside the ERP's ActiveMenu page — generates and displays
 * a QR code for the public-facing menu page.
 *
 * Uses: qrcode (npm) rendered on a canvas — no external QR library
 * needed at runtime (generates via browser Canvas API using the
 * qrcode npm package at build time).
 *
 * QR URL format: {origin}/menu/{menuId}?branchId={branchId}
 */

import React, { useEffect, useState } from 'react';
import { QrCode, Download, ExternalLink, Copy, CheckCircle, X } from 'lucide-react';

// ── Design tokens (match ERP) ───────────────────────────────────────────────
const T = {
  bg:      '#0d1117',
  card:    '#161b22',
  card2:   '#1c2333',
  border:  '#30363d',
  primary: '#58a6ff',
  success: '#3fb950',
  warn:    '#d29922',
  muted:   '#8b949e',
  text:    '#e6edf3',
};

// ── Pure-JS QR code matrix generator (no external lib) ──────────────────────
// Uses the browser's native QRCode generation via an off-screen canvas
// by encoding the URL as a data URI. If QRCode npm package is installed,
// we use it. Otherwise we fall back to a simple URL display.
async function generateQRDataURL(text, size = 240) {
  try {
    // Dynamic import — works if qrcode is installed
    const QRCode = await import('qrcode');
    return await QRCode.default.toDataURL(text, {
      width: size,
      margin: 2,
      color: { dark: '#e6edf3', light: '#161b22' },
      errorCorrectionLevel: 'M',
    });
  } catch {
    // Fallback: use Google Charts QR API (works without npm package)
    const encoded = encodeURIComponent(text);
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}&bgcolor=161b22&color=e6edf3&margin=10`;
  }
}

// ════════════════════════════════════════════════════════════════════════════
export default function MenuQRCode({ menuId, branchId, menuName, open, onClose }) {
  const [qrSrc,   setQrSrc]   = useState(null);
  const [copied,  setCopied]  = useState(false);
  const [loading, setLoading] = useState(true);

  const publicUrl = `${window.location.origin}/menu/${menuId}?branchId=${branchId}`;

  useEffect(() => {
    if (!open || !menuId || !branchId) return;
    setLoading(true);
    setQrSrc(null);
    generateQRDataURL(publicUrl).then(src => {
      setQrSrc(src);
      setLoading(false);
    });
  }, [open, menuId, branchId, publicUrl]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const ta = document.createElement('textarea');
      ta.value = publicUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (!qrSrc) return;
    const a = document.createElement('a');
    a.href = qrSrc;
    a.download = `menu-qr-${menuName || menuId}.png`;
    a.click();
  };

  if (!open) return null;

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)',
        zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <div style={{
        background: T.card, border: `1px solid ${T.border}`,
        borderRadius: 16, padding: 28, width: '100%', maxWidth: 380,
        boxShadow: '0 24px 64px rgba(0,0,0,.5)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, background: `${T.primary}20`,
              borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <QrCode size={18} color={T.primary} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>Menu QR Code</div>
              <div style={{ fontSize: 11, color: T.muted }}>{menuName || `Menu #${menuId}`}</div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.muted, padding: 4 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* QR Code */}
        <div style={{
          background: T.card2, borderRadius: 14, padding: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          minHeight: 240, marginBottom: 16, border: `1px solid ${T.border}`,
        }}>
          {loading ? (
            <div style={{ color: T.muted, fontSize: 13, textAlign: 'center' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>⏳</div>
              Generating QR code...
            </div>
          ) : qrSrc ? (
            <img
              src={qrSrc}
              alt="Menu QR Code"
              style={{ width: 200, height: 200, borderRadius: 8, imageRendering: 'pixelated' }}
            />
          ) : (
            <div style={{ color: T.muted, fontSize: 13, textAlign: 'center' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>⚠️</div>
              Could not generate QR code
            </div>
          )}
        </div>

        {/* Info */}
        <div style={{
          background: `${T.success}10`, border: `1px solid ${T.success}30`,
          borderRadius: 10, padding: '10px 14px', fontSize: 12, color: T.muted,
          marginBottom: 16, lineHeight: 1.5,
        }}>
          <span style={{ color: T.success, fontWeight: 600 }}>Public page — no login required.</span>{' '}
          Customers scan this QR to view the menu and place orders directly.
          Out-of-stock items are shown but marked accordingly.
        </div>

        {/* URL display */}
        <div style={{
          background: T.card2, border: `1px solid ${T.border}`,
          borderRadius: 8, padding: '10px 14px', marginBottom: 16,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <div style={{ flex: 1, fontSize: 11, color: T.muted, wordBreak: 'break-all', lineHeight: 1.4 }}>
            {publicUrl}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleCopy}
            style={{
              flex: 1, background: copied ? `${T.success}20` : T.card2,
              border: `1px solid ${copied ? T.success : T.border}`,
              borderRadius: 8, padding: '10px 0', fontSize: 13, fontWeight: 600,
              color: copied ? T.success : T.text, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              transition: 'all .2s',
            }}
          >
            {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
          <button
            onClick={handleDownload}
            disabled={!qrSrc}
            style={{
              flex: 1, background: T.card2, border: `1px solid ${T.border}`,
              borderRadius: 8, padding: '10px 0', fontSize: 13, fontWeight: 600,
              color: T.text, cursor: qrSrc ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              opacity: qrSrc ? 1 : .4,
            }}
          >
            <Download size={14} /> Download
          </button>
          <button
            onClick={() => window.open(publicUrl, '_blank')}
            style={{
              background: T.primary, border: 'none', borderRadius: 8,
              padding: '10px 14px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <ExternalLink size={14} color="#0d1117" />
          </button>
        </div>
      </div>
    </div>
  );
}
