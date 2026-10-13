"use client";
import { useState } from "react";

// ── Data ────────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: "🍽️",
    color: "#e8f0fe",
    title: "Recipe Management",
    desc: "Full recipe lifecycle — ingredients, steps, nutrition, allergen matrix, version history, and real-time cost calculation.",
    tags: ["Cost Tracking", "Allergens", "Versions", "Nutrition"],
  },
  {
    icon: "📦",
    color: "#ecfdf5",
    title: "Smart Inventory",
    desc: "Track raw materials and finished goods across all branches. Low-stock alerts, stock transfers, and wastage logging in real time.",
    tags: ["Raw Materials", "Finished Goods", "Transfers", "Wastage"],
  },
  {
    icon: "🛒",
    color: "#fff7ed",
    title: "Procurement",
    desc: "End-to-end purchase flow — material indents, purchase orders, GRN, supplier ratings, and HQ-approved vendor management.",
    tags: ["PO Workflow", "GRN", "Suppliers", "Indent"],
  },
  {
    icon: "📅",
    color: "#fdf4ff",
    title: "Meal Planning",
    desc: "Build weekly meal plans, forecast ingredient requirements, and push plans to all branches from HQ with one click.",
    tags: ["Weekly Plans", "Forecasting", "Branch Push"],
  },
  {
    icon: "📱",
    color: "#eff6ff",
    title: "QR Menu Ordering",
    desc: "Customers scan a QR code, view live stock status, and place orders directly. Orders flow into the ERP for kitchen fulfilment.",
    tags: ["Public QR", "Live Stock", "Auto-CRM", "No Login"],
  },
  {
    icon: "👥",
    color: "#fef3c7",
    title: "Customer CRM",
    desc: "Loyalty points, tier management (Bronze → Silver → Gold), visit tracking, birthday rewards and spend analytics per customer.",
    tags: ["Loyalty", "Tiers", "Analytics", "Rewards"],
  },
  {
    icon: "💰",
    color: "#f0fdf4",
    title: "Sales & Revenue",
    desc: "Log daily sales with customer attribution, auto loyalty points, margin tracking, and per-dish profitability reporting.",
    tags: ["Daily Sales", "Margins", "Reports"],
  },
  {
    icon: "🏢",
    color: "#e0f2fe",
    title: "Multi-Branch",
    desc: "HQ controls menus, recipes, and plans. Each branch manages its own inventory, procurement, sales and staff schedules.",
    tags: ["HQ Control", "Branch Ops", "RBAC"],
  },
  {
    icon: "🤖",
    color: "#fce7f3",
    title: "AI Assistant",
    desc: "Groq-powered AI chat gives contextual answers about your inventory, sales trends, and recipe costs — in plain language.",
    tags: ["Groq AI", "Calorie Planner", "Insights"],
  },
];

const MODULES = [
  {
    id: "inventory",
    label: "📦 Inventory",
    title: "Complete Stock Visibility",
    sub: "Track every ingredient and finished dish across all your branches, with automated alerts and transfer management.",
    features: [
      "Raw material tracking per branch",
      "Finished goods stock levels",
      "Low-stock alerts with reorder triggers",
      "Inter-branch stock transfers",
      "Wastage logging with cost impact",
      "Full stock transaction ledger",
    ],
    rows: [
      { name: "Chicken Breast", val: "48 kg", pill: "good", pillLabel: "In Stock" },
      { name: "Olive Oil", val: "12 ltr", pill: "amber", pillLabel: "Low Stock" },
      { name: "Pasta (500g)", val: "0 pcs", pill: "red", pillLabel: "Out of Stock" },
      { name: "Tomato Sauce", val: "60 ltr", pill: "good", pillLabel: "In Stock" },
    ],
  },
  {
    id: "procurement",
    label: "🛒 Procurement",
    title: "Streamlined Purchasing",
    sub: "From material indent to goods received — a fully tracked procurement pipeline with supplier management.",
    features: [
      "Material indent approval workflow",
      "Purchase order creation & tracking",
      "Goods received notes (GRN)",
      "Supplier rating system",
      "HQ-approved vendor list",
      "PO status: Draft → Sent → Approved → Received",
    ],
    rows: [
      { name: "PO-2025-0142", val: "Fresh Farms Ltd", pill: "good", pillLabel: "Received" },
      { name: "PO-2025-0143", val: "Spice World Co", pill: "blue", pillLabel: "Approved" },
      { name: "PO-2025-0144", val: "Dairy Direct", pill: "amber", pillLabel: "Sent" },
      { name: "PO-2025-0145", val: "Grain Masters", pill: "amber", pillLabel: "Draft" },
    ],
  },
  {
    id: "sales",
    label: "💰 Sales",
    title: "Sales & Revenue Tracking",
    sub: "Log daily sales with full profitability analysis, customer attribution, and auto loyalty points.",
    features: [
      "Daily sales entry with customer CRM link",
      "Auto loyalty points (1pt per ₹10)",
      "Finished goods deduction on sale",
      "Gross margin per dish",
      "QR menu order integration",
      "Revenue & COGS reporting",
    ],
    rows: [
      { name: "Pasta Arrabiata", val: "24 sold · ₹4,800", pill: "good", pillLabel: "67% margin" },
      { name: "Caesar Salad", val: "18 sold · ₹2,700", pill: "good", pillLabel: "72% margin" },
      { name: "Grilled Chicken", val: "31 sold · ₹9,300", pill: "amber", pillLabel: "48% margin" },
      { name: "Tiramisu", val: "12 sold · ₹2,400", pill: "good", pillLabel: "80% margin" },
    ],
  },
  {
    id: "crm",
    label: "👥 CRM",
    title: "Customer Loyalty Engine",
    sub: "Build a loyal customer base with automated points, tier upgrades, and visit tracking — works from QR orders too.",
    features: [
      "Auto customer registration via QR menu",
      "3-tier loyalty: Bronze → Silver → Gold",
      "Points awarded on order fulfilment",
      "Total spend & visit history",
      "Birthday & anniversary tracking",
      "Search by name or phone number",
    ],
    rows: [
      { name: "Priya Sharma", val: "1,240 pts · ₹62k spend", pill: "good", pillLabel: "GOLD" },
      { name: "Rahul Mehta", val: "680 pts · ₹28k spend", pill: "blue", pillLabel: "SILVER" },
      { name: "Anita Patel", val: "210 pts · ₹9k spend", pill: "amber", pillLabel: "BRONZE" },
      { name: "Vikram Singh", val: "950 pts · ₹41k spend", pill: "blue", pillLabel: "SILVER" },
    ],
  },
];

const STEPS = [
  { n: "01", title: "Set Up Your Branch", desc: "Admin creates branches, assigns roles (Admin / Manager / Staff) and configures HQ." },
  { n: "02", title: "Build Your Recipes", desc: "Add recipes with ingredients, steps, nutrition, allergens and auto-calculated costs." },
  { n: "03", title: "Manage Inventory & Procurement", desc: "Track stock, raise indents, approve purchase orders and receive goods with GRN." },
  { n: "04", title: "Go Live & Serve Customers", desc: "Activate menus, share QR codes, log sales and watch real-time analytics." },
];

const TECH = [
  {
    tier: "Frontend",
    layer: "React Web App",
    items: ["React 18 + Redux Toolkit", "React Router v6", "Axios + JWT interceptor", "Lucide icons", "60+ page modules"],
  },
  {
    tier: "Mobile",
    layer: "React Native App",
    items: ["Expo SDK + Expo Router", "File-based navigation", "SecureStore for JWT", "Redux auth slice", "iOS & Android"],
  },
  {
    tier: "Backend",
    layer: "Spring Boot API",
    items: ["Spring Boot 3 + Java 17", "Spring Security + JWT", "JPA / Hibernate + MySQL 8", "28 REST controllers", "Groq AI integration"],
  },
];

const PRICING = [
  {
    plan: "Starter",
    price: "₹2,999",
    per: "/mo",
    desc: "Perfect for single-location restaurants",
    featured: false,
    features: [
      { t: "1 Branch", ok: true },
      { t: "Up to 5 users", ok: true },
      { t: "Recipe & Inventory management", ok: true },
      { t: "Daily Sales tracking", ok: true },
      { t: "QR Menu Ordering", ok: true },
      { t: "Multi-branch support", ok: false },
      { t: "AI Assistant", ok: false },
      { t: "Analytics & Reports", ok: false },
    ],
  },
  {
    plan: "Growth",
    price: "₹7,999",
    per: "/mo",
    desc: "For growing multi-location chains",
    featured: true,
    features: [
      { t: "Up to 5 Branches", ok: true },
      { t: "Up to 25 users", ok: true },
      { t: "Full Recipe & Inventory suite", ok: true },
      { t: "Procurement workflow", ok: true },
      { t: "QR Menu + Customer CRM", ok: true },
      { t: "Multi-branch transfers", ok: true },
      { t: "AI Calorie Assistant", ok: true },
      { t: "Analytics & Reports", ok: true },
    ],
  },
  {
    plan: "Enterprise",
    price: "Custom",
    per: "",
    desc: "For large chains and franchises",
    featured: false,
    features: [
      { t: "Unlimited Branches", ok: true },
      { t: "Unlimited users", ok: true },
      { t: "Everything in Growth", ok: true },
      { t: "Custom integrations", ok: true },
      { t: "Dedicated support", ok: true },
      { t: "On-premise deployment", ok: true },
      { t: "Custom AI training", ok: true },
      { t: "SLA guarantee", ok: true },
    ],
  },
];

// ── Pill helper ──────────────────────────────────────────────────────────────
function Pill({ type, label }: { type: string; label: string }) {
  const cls: Record<string, string> = {
    good: "pill-green", amber: "pill-amber", blue: "pill-blue", red: "pill-red",
  };
  return <span className={`module-pill ${cls[type] || "pill-blue"}`}>{label}</span>;
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function Home() {
  const [activeModule, setActiveModule] = useState(0);

  return (
    <>
      {/* ── NAV ── */}
      <nav>
        <div className="container nav-inner">
          <a href="#" className="nav-logo" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <img src="/brand/klyro-symbol.svg" alt="Klyro" style={{ width: "32px", height: "32px" }} />
            <span className="nav-logo-text">Klyro<span>ERP</span></span>
          </a>
          <ul className="nav-links">
            <li><a href="#features">Features</a></li>
            <li><a href="#how-it-works">How it works</a></li>
            <li><a href="#modules">Modules</a></li>
            <li><a href="#pricing">Pricing</a></li>
            <li><a href="#tech">Tech Stack</a></li>
          </ul>
          <div className="nav-cta">
            <a href="#pricing" className="btn-outline" style={{ padding: "9px 18px", fontSize: 13 }}>View Pricing</a>
            <a href="https://forkify-erp.vercel.app/" className="btn-primary" style={{ padding: "9px 18px", fontSize: 13 }}>Log In →</a>
          </div>
        </div>
      </nav>

      <main>
        {/* ── HERO ── */}
        <section className="hero">
          <div className="container hero-grid">
            {/* Left */}
            <div>
              <div className="hero-kicker animate-fade-up">
                <span className="hero-kicker-dot">✨</span>
                Modern Business Operations Platform
              </div>
              <h1 className="hero-h1 animate-fade-up delay-100">
                Run your entire{" "}
                <span className="gradient-text">business operations</span>{" "}
                from one platform
              </h1>
              <p className="hero-sub animate-fade-up delay-200">
                Klyro ERP brings together recipes, inventory, procurement, meal planning,
                QR ordering and customer loyalty — built for multi-branch operations.
              </p>
              <div className="hero-actions animate-fade-up delay-300">
                <a href="#cta" className="btn-primary">Start Free Trial →</a>
                <a href="#features" className="btn-outline">Explore Features</a>
              </div>
              {/* <div className="hero-stats animate-fade-up delay-400">
                {[
                  { val: "28+", lbl: "API Endpoints" },
                  { val: "60+", lbl: "App Screens" },
                  { val: "3", lbl: "Platforms" },
                ].map((s) => (
                  <div key={s.lbl}>
                    <div className="hero-stat-val">{s.val}</div>
                    <div className="hero-stat-lbl">{s.lbl}</div>
                  </div>
                ))}
              </div> */}
            </div>

            {/* Right — dashboard mockup */}
            <div className="hero-visual animate-fade-up delay-200">
              {/* Floating badges */}
              <div className="hero-badge animate-float" style={{ top: -16, left: -24 }}>
                <span className="hero-badge-icon">📦</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--navy)" }}>Stock Alert</div>
                  <div style={{ fontSize: 11, color: "var(--gray-400)" }}>Olive oil running low</div>
                </div>
              </div>
              <div className="hero-badge animate-float delay-300" style={{ bottom: 24, right: -24 }}>
                <span className="hero-badge-icon">🎉</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--navy)" }}>QR Order</div>
                  <div style={{ fontSize: 11, color: "var(--gray-400)" }}>Table 7 · ₹1,240</div>
                </div>
              </div>

              <div className="dashboard-mockup">
                <div className="mockup-bar">
                  <div className="mockup-dot" style={{ background: "#f87171" }} />
                  <div className="mockup-dot" style={{ background: "#fbbf24" }} />
                  <div className="mockup-dot" style={{ background: "#34d399" }} />
                  <div style={{ flex: 1, background: "rgba(255,255,255,.06)", borderRadius: 4, height: 22, marginLeft: 8 }} />
                </div>
                <div className="mockup-body">
                  <div className="mockup-card">
                    <div className="mockup-label">Today Revenue</div>
                    <div className="mockup-val mockup-green">₹42,800</div>
                    <div className="mockup-tag mockup-tag-green">↑ 18% vs yesterday</div>
                  </div>
                  <div className="mockup-card">
                    <div className="mockup-label">Covers Sold</div>
                    <div className="mockup-val">284</div>
                    <div className="mockup-tag mockup-tag-amber">3 low-stock items</div>
                  </div>
                  <div className="mockup-card mockup-card-full">
                    <div className="mockup-label">Weekly Sales Trend</div>
                    <div className="mockup-bar-chart">
                      {[35, 55, 45, 70, 60, 85, 100].map((h, i) => (
                        <div
                          key={i}
                          className="mockup-bar-item"
                          style={{
                            height: `${h}%`,
                            background: i === 6 ? "#3b82f6" : "rgba(255,255,255,.12)",
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="mockup-card">
                    <div className="mockup-label">Gross Margin</div>
                    <div className="mockup-val" style={{ fontSize: 18 }}>64.2%</div>
                    <div className="mockup-tag mockup-tag-green">Healthy</div>
                  </div>
                  <div className="mockup-card">
                    <div className="mockup-label">Active Menu</div>
                    <div className="mockup-val-sm">Summer Special</div>
                    <div className="mockup-val-sm" style={{ color: "rgba(255,255,255,.35)", fontSize: 11 }}>24 items · 3 branches</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── FEATURES ── */}
        <section className="features" id="features">
          <div className="container">
            <div className="section-eyebrow animate-fade-up">Everything you need</div>
            <div className="section-divider" />
            <h2 className="section-title animate-fade-up delay-100">
              All your restaurant operations<br />in one connected system
            </h2>
            <p className="section-sub animate-fade-up delay-200">
              From kitchen to customer — Klyro ERP connects every part of your operation
              so nothing falls through the cracks.
            </p>
            <div className="features-grid">
              {FEATURES.map((f, i) => (
                <div
                  key={f.title}
                  className="feature-card animate-fade-up"
                  style={{ animationDelay: `${i * 0.05 + 0.1}s` }}
                >
                  <div className="feature-icon" style={{ background: f.color }}>
                    {f.icon}
                  </div>
                  <div className="feature-title">{f.title}</div>
                  <div className="feature-desc">{f.desc}</div>
                  <div className="feature-tags">
                    {f.tags.map((t) => <span key={t} className="feature-tag">{t}</span>)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section className="how-it-works" id="how-it-works">
          <div className="container">
            <div style={{ textAlign: "center", maxWidth: 600, margin: "0 auto" }}>
              <div className="section-eyebrow">Get started fast</div>
              <div className="section-divider" style={{ margin: "10px auto 0" }} />
              <h2 className="section-title" style={{ margin: "10px 0 12px" }}>
                Up and running in four steps
              </h2>
              <p className="section-sub" style={{ margin: "0 auto" }}>
                Klyro ERP is designed to be intuitive — most teams are fully operational within a day.
              </p>
            </div>
            <div className="steps">
              {STEPS.map((step, i) => (
                <div
                  key={step.n}
                  className="step animate-fade-up"
                  style={{ animationDelay: `${i * 0.12}s` }}
                >
                  <div className="step-num">{step.n}</div>
                  <div className="step-title">{step.title}</div>
                  <div className="step-desc">{step.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── MODULES ── */}
        <section className="modules" id="modules">
          <div className="container">
            <div className="section-eyebrow">Deep dive</div>
            <div className="section-divider" />
            <h2 className="section-title">
              Explore every module
            </h2>
            <p className="section-sub">
              Each module is built to solve a specific operational problem — and they all talk to each other.
            </p>

            <div className="modules-tabs">
              {MODULES.map((m, i) => (
                <button
                  key={m.id}
                  className={`module-tab ${activeModule === i ? "active" : ""}`}
                  onClick={() => setActiveModule(i)}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <div className="module-panel">
              <div>
                <h3 style={{ fontSize: 26, fontWeight: 800, color: "var(--navy)", marginBottom: 8 }}>
                  {MODULES[activeModule].title}
                </h3>
                <p style={{ fontSize: 15, color: "var(--gray-600)", lineHeight: 1.7, marginBottom: 0 }}>
                  {MODULES[activeModule].sub}
                </p>
                <ul className="module-feature-list">
                  {MODULES[activeModule].features.map((f) => <li key={f}>{f}</li>)}
                </ul>
                <a href="#cta" className="btn-primary">Get this feature →</a>
              </div>

              <div className="module-visual">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,.4)", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: ".08em" }}>
                    {MODULES[activeModule].label} Live View
                  </span>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#34d399", display: "inline-block", boxShadow: "0 0 0 3px rgba(52,211,153,.2)" }} />
                </div>
                {MODULES[activeModule].rows.map((row) => (
                  <div key={row.name} className="module-row">
                    <div>
                      <div className="module-row-title">{row.name}</div>
                      <div className="module-row-val">{row.val}</div>
                    </div>
                    <Pill type={row.pill} label={row.pillLabel} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── TECH STACK ── */}
        <section className="tech" id="tech">
          <div className="container">
            <div className="section-eyebrow">Under the hood</div>
            <div className="section-divider" />
            <h2 className="section-title">Built on a modern, proven stack</h2>
            <p className="section-sub">
              Enterprise-grade technologies chosen for reliability, scalability and developer velocity.
            </p>
            <div className="tech-grid">
              {TECH.map((t, i) => (
                <div key={t.tier} className="tech-card animate-fade-up" style={{ animationDelay: `${i * 0.1}s` }}>
                  <div className="tech-tier">{t.tier}</div>
                  <div className="tech-layer">{t.layer}</div>
                  <div className="tech-items">
                    {t.items.map((item) => (
                      <div key={item} className="tech-item">
                        <div className="tech-dot" />
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Architecture note */}
              <div className="tech-card" style={{ borderColor: "var(--sky-d)", background: "var(--sky)", gridColumn: "1 / -1" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                  <div style={{ fontSize: 28 }}>🏗️</div>
                  <div>
                    <div style={{ fontWeight: 700, color: "var(--navy)", marginBottom: 6 }}>
                      Full-stack, API-first architecture
                    </div>
                    <div style={{ fontSize: 14, color: "var(--gray-600)", lineHeight: 1.65 }}>
                      The React web app, React Native mobile app and Spring Boot backend all communicate via a single secured REST API
                      using JWT authentication. Every action is audit-logged, roles are enforced at both the route and API level,
                      and the QR menu endpoints are public — no customer login required.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── PRICING ── */}
        <section className="pricing" id="pricing">
          <div className="container">
            <div style={{ textAlign: "center", maxWidth: 560, margin: "0 auto" }}>
              <div className="section-eyebrow">Transparent pricing</div>
              <div className="section-divider" style={{ margin: "10px auto 0" }} />
              <h2 className="section-title" style={{ margin: "10px 0 12px" }}>
                Simple plans, no surprises
              </h2>
              <p className="section-sub" style={{ margin: "0 auto" }}>
                Start with what you need. Scale as you grow. Cancel anytime.
              </p>
            </div>
            <div className="pricing-grid">
              {PRICING.map((p) => (
                <div key={p.plan} className={`pricing-card ${p.featured ? "featured" : ""}`}>
                  {p.featured && <div className="pricing-popular">Most Popular</div>}
                  <div className="pricing-plan">{p.plan}</div>
                  <div className="pricing-price">
                    {p.price}<span>{p.per}</span>
                  </div>
                  <div className="pricing-desc">{p.desc}</div>
                  <ul className="pricing-features">
                    {p.features.map((f) => (
                      <li key={f.t}>
                        <span className={f.ok ? "pricing-check" : "pricing-x"}>
                          {f.ok ? "✓" : "✕"}
                        </span>
                        {f.t}
                      </li>
                    ))}
                  </ul>
                  <a
                    href="#cta"
                    className={p.featured ? "btn-primary" : "btn-outline"}
                    style={{ width: "100%", justifyContent: "center" }}
                  >
                    {p.plan === "Enterprise" ? "Contact Sales" : "Get Started →"}
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA BANNER ── */}
        <div id="cta">
          <div className="cta-banner">
            <div className="cta-banner-title">
              Ready to transform your business operations?
            </div>
            <p className="cta-banner-sub">
              Join businesses already using Klyro ERP to cut waste, streamline procurement<br />
              and serve customers faster — from one unified platform.
            </p>
          </div>
        </div>
      </main>

      {/* ── FOOTER ── */}
      <footer>
        <div className="container">
          <div className="footer-grid">
            <div>
              <div className="nav-logo" style={{ marginBottom: 0, display: "flex", alignItems: "center", gap: 10 }}>
                <img src="/brand/klyro-symbol.svg" alt="Klyro" style={{ width: 28, height: 28 }} />
                <span className="nav-logo-text" style={{ color: "#fff" }}>
                  Klyro<span>ERP</span>
                </span>
              </div>
              <p className="footer-brand-text">
                The complete business operations platform. Built for multi-branch organizations
                that want to move fast without losing control.
              </p>
            </div>
            <div>
              <div className="footer-col-title">Product</div>
              <ul className="footer-col-links">
                <li><a href="#features">Features</a></li>
                <li><a href="#modules">Modules</a></li>
                <li><a href="#pricing">Pricing</a></li>
                <li><a href="#tech">Tech Stack</a></li>
              </ul>
            </div>
            <div>
              <div className="footer-col-title">Modules</div>
              <ul className="footer-col-links">
                <li><a href="#modules">Recipe Management</a></li>
                <li><a href="#modules">Inventory</a></li>
                <li><a href="#modules">Procurement</a></li>
                <li><a href="#modules">QR Menu</a></li>
                <li><a href="#modules">Customer CRM</a></li>
              </ul>
            </div>
            <div>
              <div className="footer-col-title">Company</div>
              <ul className="footer-col-links">
                <li><a href="#cta">Request Demo</a></li>
                <li><a href="mailto:hello@klyroerp.com">Contact</a></li>
                <li><a href="#">Privacy Policy</a></li>
                <li><a href="#">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <p>© 2026 Klyro ERP. All rights reserved.</p>
            <div className="footer-tech-stack">
              {["Next.js", "React", "Spring Boot", "MySQL", "JWT", "Groq AI"].map((t) => (
                <span key={t} className="footer-tech-chip">{t}</span>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
