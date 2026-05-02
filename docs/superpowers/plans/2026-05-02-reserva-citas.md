# Reserva de Citas Online — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a trilingual (ES/EU/FR) appointment booking page that emails the request with an `.ics` calendar attachment to the optician for one-tap Apple Calendar import.

**Architecture:** Three new static HTML pages (one per language) sharing a single JS module (`assets/js/cita.js`) and CSS additions to `main.css`. Frontend posts JSON to a Google Apps Script Web App endpoint that validates, generates the `.ics`, and sends the email. The site stays 100% static. A floating "Pedir cita" CTA is added globally via JS injection.

**Tech Stack:** Vanilla HTML/CSS/JS, GSAP 3 (already loaded), Google Apps Script (for the email backend, deployed separately).

**Spec:** `docs/superpowers/specs/2026-05-02-reserva-citas-design.md`

**Verification approach:** This is a static site with no automated test framework. Each task ends with manual browser verification (open the page, exercise the feature, confirm the expected behavior). Treat the verification step the same way you would a passing test: do not move on if it fails.

---

## File Structure

**New files:**
- `cita-previa/index.html` — Spanish appointment page
- `eu/hitzordua/index.html` — Basque appointment page
- `fr/rendez-vous/index.html` — French appointment page
- `assets/js/cita.js` — form logic (validation, slot generation, fetch, status UI)
- `apps-script/Code.gs` — Google Apps Script source (versioned in repo as reference; deployed manually by user)
- `apps-script/README.md` — deployment instructions for the user

**Modified files:**
- `assets/css/main.css` — appended new section "RESERVA DE CITAS" with all styles for the page + FAB
- `assets/js/main.js` — adds `initFloatingCitaCTA()` to inject the FAB on every non-cita page
- `sitemap.xml` — adds 3 new URL entries
- All existing pages with the navbar (12 pages: home + 4 sections × 3 languages, plus 6 collection subpages × 3 languages) — add the "Pedir cita" link

**Responsibility split:**
- `cita.js` owns: slot generation per day, validation, fetch to Apps Script, success/error UI states.
- `Code.gs` owns: server-side validation, `.ics` generation, email composition + send.
- `main.js` owns: the global FAB injection, nothing else cita-specific.
- `main.css` owns: all visual styles, mobile-first, with explicit `@media` blocks at 768px and 1024px.

---

## Task 1: Add CSS variables and base layout for the appointment page

**Files:**
- Modify: `assets/css/main.css` (append at end)

- [ ] **Step 1: Append the new CSS section**

Append to the very end of `assets/css/main.css`:

```css
/* ══════════════════════════════════════════════════
   RESERVA DE CITAS
══════════════════════════════════════════════════ */

/* ── Page layout ── */
.cita-grid{
  display:grid;
  grid-template-columns:1fr;
  gap:2rem;
  margin-top:2rem;
}
@media(min-width:768px){
  .cita-grid{grid-template-columns:1fr 1.4fr;gap:2.5rem}
}
@media(min-width:1024px){
  .cita-grid{grid-template-columns:1fr 1.6fr;gap:3rem;align-items:start}
  .cita-info-card{position:sticky;top:calc(var(--nav-h) + 1.5rem)}
}

/* ── Info card (left column) ── */
.cita-info-card{
  background:var(--white);
  border:1px solid var(--border);
  border-radius:var(--radius-lg);
  padding:1.75rem;
  box-shadow:var(--shadow);
}
.cita-info-card h2{font-size:1.4rem;margin-bottom:1.25rem}
.cita-steps{list-style:none;padding:0;margin:0 0 1.5rem;display:flex;flex-direction:column;gap:1rem}
.cita-step{display:flex;gap:.85rem;align-items:flex-start}
.cita-step-num{
  flex-shrink:0;width:30px;height:30px;border-radius:50%;
  background:var(--primary);color:var(--white);
  display:grid;place-items:center;font-weight:700;font-size:.9rem;
  font-family:var(--ff-body)
}
.cita-step-text{font-size:.95rem;color:var(--text-muted);line-height:1.5}
.cita-step-text strong{color:var(--text);font-weight:600;display:block;margin-bottom:.15rem;font-family:var(--ff-body)}

/* ── Form card (right column) ── */
.cita-form-card{
  background:var(--white);
  border:1px solid var(--border);
  border-radius:var(--radius-lg);
  padding:1.75rem;
  box-shadow:var(--shadow);
}
@media(min-width:768px){
  .cita-form-card{padding:2.25rem}
}
.cita-fieldset{border:none;padding:0;margin:0 0 2rem}
.cita-fieldset:last-of-type{margin-bottom:1rem}
.cita-legend{
  display:flex;align-items:center;gap:.6rem;
  font-family:var(--ff-body);font-size:.78rem;font-weight:700;
  letter-spacing:.14em;text-transform:uppercase;color:var(--primary);
  margin-bottom:1rem;padding:0
}
.cita-legend-num{
  display:grid;place-items:center;
  width:24px;height:24px;border-radius:50%;
  background:var(--primary);color:var(--white);
  font-size:.75rem;font-weight:700
}

/* ── Step 1: motivo cards ── */
.cita-motivos{
  display:grid;
  grid-template-columns:repeat(2,1fr);
  gap:.75rem;
}
@media(min-width:768px){
  .cita-motivos{grid-template-columns:repeat(3,1fr)}
}
.cita-motivo{
  position:relative;
  display:flex;flex-direction:column;align-items:center;gap:.5rem;
  padding:1rem .75rem;
  background:var(--primary-bg);
  border:1.5px solid var(--border);
  border-radius:var(--radius);
  cursor:pointer;
  text-align:center;
  min-height:96px;
  transition:transform var(--t) var(--ease),border-color var(--t),background var(--t),box-shadow var(--t)
}
.cita-motivo input{position:absolute;opacity:0;pointer-events:none}
.cita-motivo:hover{border-color:var(--primary-light);background:var(--white)}
.cita-motivo:has(input:checked){
  border-color:var(--primary);
  background:var(--white);
  box-shadow:var(--shadow-gold);
  transform:translateY(-2px)
}
.cita-motivo-icon{
  width:36px;height:36px;
  display:grid;place-items:center;
  color:var(--primary);
  flex-shrink:0
}
.cita-motivo-label{
  font-family:var(--ff-body);font-size:.82rem;font-weight:600;
  color:var(--text);line-height:1.25
}

/* ── Step 2: date + time ── */
.cita-date-row{display:flex;flex-direction:column;gap:.4rem;margin-bottom:1.25rem}
.cita-date-row label{font-size:.85rem;font-weight:600;color:var(--text)}
.cita-date-row input[type="date"]{
  font-family:var(--ff-body);font-size:1rem;
  padding:.75rem .9rem;
  border:1.5px solid var(--border);
  border-radius:var(--radius);
  background:var(--white);color:var(--text);
  min-height:48px;
  transition:border-color var(--t)
}
.cita-date-row input[type="date"]:focus{outline:none;border-color:var(--primary)}

.cita-slots-wrap{display:none}
.cita-slots-wrap.is-visible{display:block}
.cita-slots-group{margin-bottom:1rem}
.cita-slots-title{
  font-family:var(--ff-body);font-size:.78rem;font-weight:600;
  letter-spacing:.1em;text-transform:uppercase;color:var(--text-muted);
  margin-bottom:.5rem
}
.cita-slots{
  display:grid;
  grid-template-columns:repeat(3,1fr);
  gap:.5rem;
}
@media(min-width:768px){
  .cita-slots{grid-template-columns:repeat(4,1fr)}
}
.cita-slot{
  background:var(--primary-bg);
  border:1.5px solid var(--border);
  border-radius:8px;
  padding:.65rem .25rem;
  font-family:var(--ff-body);font-size:.9rem;font-weight:600;
  color:var(--text);cursor:pointer;
  min-height:44px;
  transition:background var(--t),border-color var(--t),color var(--t),transform var(--t)
}
.cita-slot:hover{border-color:var(--primary-light);background:var(--white)}
.cita-slot.is-selected{
  background:var(--primary);border-color:var(--primary);color:var(--white)
}
.cita-slot:focus-visible{outline-offset:3px}

.cita-no-slots{color:var(--text-muted);font-size:.9rem;font-style:italic;padding:.5rem 0}

/* ── Step 3: personal data (reuses .form-row, .form-group from contact) ── */
.cita-form-card .form-row{display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem}
@media(max-width:600px){.cita-form-card .form-row{grid-template-columns:1fr}}
.cita-form-card .form-group{display:flex;flex-direction:column;gap:.4rem;margin-bottom:1rem}
.cita-form-card .form-group label{font-size:.85rem;font-weight:600;color:var(--text)}
.cita-form-card .form-group input,
.cita-form-card .form-group textarea{
  font-family:var(--ff-body);font-size:16px; /* 16px prevents iOS zoom */
  padding:.75rem .9rem;
  border:1.5px solid var(--border);
  border-radius:var(--radius);
  background:var(--white);color:var(--text);
  min-height:48px;
  transition:border-color var(--t)
}
.cita-form-card .form-group textarea{min-height:96px;resize:vertical;line-height:1.5}
.cita-form-card .form-group input:focus,
.cita-form-card .form-group textarea:focus{outline:none;border-color:var(--primary)}
.cita-form-card .form-group input[aria-invalid="true"],
.cita-form-card .form-group textarea[aria-invalid="true"]{border-color:#c0392b}
.cita-field-error{font-size:.78rem;color:#c0392b;min-height:1em}

/* Honeypot — visually hidden but still a "real" field for bots */
.cita-hp{
  position:absolute !important;
  left:-9999px !important;
  width:1px !important;height:1px !important;
  opacity:0 !important;pointer-events:none !important
}

/* Submit button states */
.cita-submit{
  width:100%;justify-content:center;
  min-height:52px;
  position:relative
}
.cita-submit[data-state="loading"]{pointer-events:none;opacity:.85}
.cita-submit[data-state="loading"] .cita-submit-label{visibility:hidden}
.cita-submit[data-state="loading"]::after{
  content:"";position:absolute;
  width:20px;height:20px;border-radius:50%;
  border:2.5px solid rgba(255,255,255,.35);
  border-top-color:var(--white);
  animation:cita-spin .7s linear infinite
}
.cita-submit[data-state="success"]{background:#1d8c4a;border-color:#1d8c4a;pointer-events:none}
@keyframes cita-spin{to{transform:rotate(360deg)}}
@media(prefers-reduced-motion:reduce){
  .cita-submit[data-state="loading"]::after{animation:none}
}

.cita-form-msg{
  margin-top:1rem;padding:.85rem 1rem;border-radius:var(--radius);
  font-size:.9rem;line-height:1.5;display:none
}
.cita-form-msg.is-success{display:block;background:#e7f6ec;color:#155724;border:1px solid #b6e0c2}
.cita-form-msg.is-error{display:block;background:#fdecec;color:#7a1f1f;border:1px solid #f1c0c0}

/* ── Floating CTA (FAB) — appears on every page except the cita pages themselves ── */
.cita-fab{
  position:fixed;
  right:1rem;
  bottom:max(1rem, env(safe-area-inset-bottom));
  z-index:900;
  display:inline-flex;align-items:center;gap:.5rem;
  padding:.85rem 1.25rem;
  background:var(--primary);color:var(--white);
  border-radius:50px;
  font-family:var(--ff-body);font-size:.9rem;font-weight:600;
  letter-spacing:.02em;
  box-shadow:0 8px 24px rgba(212,98,14,.35);
  text-decoration:none;
  transition:transform var(--t) var(--ease),box-shadow var(--t),background var(--t);
  min-height:48px
}
.cita-fab:hover{
  background:var(--primary-dark);
  transform:translateY(-2px);
  box-shadow:0 12px 32px rgba(212,98,14,.45)
}
.cita-fab svg{width:18px;height:18px;flex-shrink:0}
.cita-fab-label{white-space:nowrap}

/* On desktop, the CTA inside the navbar is enough — hide the FAB */
@media(min-width:1024px){
  .cita-fab{display:none}
}

/* If the cookie banner is open at the bottom, push the FAB up */
body.cookie-open .cita-fab{bottom:calc(max(1rem, env(safe-area-inset-bottom)) + 80px)}

/* ── Navbar CTA (replaces the regular link styling for the cita item) ── */
.nav-links li a.nav-cta{
  background:var(--primary);
  color:var(--white) !important;
  padding:.45rem 1rem;
  border-radius:50px;
  font-weight:600;
  margin-left:.4rem;
  transition:background var(--t),box-shadow var(--t),transform var(--t)
}
.nav-links li a.nav-cta:hover{
  background:var(--primary-dark);
  box-shadow:0 4px 14px rgba(212,98,14,.3)
}
.nav-links li a.nav-cta::after{display:none}
.site-header.scrolled .nav-links li a.nav-cta{color:var(--white) !important}
@media(max-width:900px){
  .nav-links li a.nav-cta{
    background:var(--primary-bg);color:var(--primary) !important;
    border-radius:0;padding:.8rem 0;margin-left:0;
    text-align:left
  }
  .site-header.scrolled .nav-links li a.nav-cta{color:var(--primary) !important}
}
```

- [ ] **Step 2: Verify CSS parses without errors**

Open `assets/css/main.css` in a browser via any existing page (e.g. `index.html`). Open DevTools → Console. Expected: no CSS parse errors. The home page should look identical to before (the new section only defines new classes; nothing existing is overridden).

- [ ] **Step 3: Commit**

```bash
git add assets/css/main.css
git commit -m "Add appointment booking page CSS (mobile-first)"
```

---

## Task 2: Build the Spanish appointment page (cita-previa/index.html)

**Files:**
- Create: `cita-previa/index.html`

- [ ] **Step 1: Create the file with the full markup**

Create `cita-previa/index.html` with this exact content:

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover"/>
  <meta name="theme-color" content="#D4620E"/>
  <title>Pedir cita online — Óptica Anaka Irún</title>
  <meta name="description" content="Pide tu cita online en Óptica Anaka, Irún. Revisión visual, retinografía, lentes de contacto y más. Confirmamos por teléfono."/>
  <link rel="canonical" href="https://www.anakaoptica.com/cita-previa/"/>
  <link rel="alternate" hreflang="es" href="https://www.anakaoptica.com/cita-previa/"/>
  <link rel="alternate" hreflang="eu" href="https://www.anakaoptica.com/eu/hitzordua/"/>
  <link rel="alternate" hreflang="fr" href="https://www.anakaoptica.com/fr/rendez-vous/"/>
  <link rel="alternate" hreflang="x-default" href="https://www.anakaoptica.com/cita-previa/"/>
  <meta property="og:type" content="website"/>
  <meta property="og:locale" content="es_ES"/>
  <meta property="og:title" content="Pedir cita online — Óptica Anaka Irún"/>
  <meta property="og:description" content="Reserva tu cita online en Óptica Anaka, Irún."/>
  <meta property="og:url" content="https://www.anakaoptica.com/cita-previa/"/>
  <meta property="og:image" content="https://www.anakaoptica.com/logos/OPTICA-ANACA-LOGO-1.webp"/>
  <link rel="icon" type="image/webp" href="../logos/OPTICA-ANACA-LOGO-1.webp"/>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
  <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin/>
  <link rel="preload" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Outfit:wght@300;400;500;600;700&display=swap" as="style" onload="this.onload=null;this.rel='stylesheet'"/>
  <noscript><link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet"/></noscript>
  <link rel="stylesheet" href="../assets/css/main.css"/>
  <script type="application/ld+json">{"@context":"https://schema.org","@type":"Service","name":"Reserva de cita online","provider":{"@type":"Optician","name":"Óptica Anaka","telephone":"+34943248490","address":{"@type":"PostalAddress","streetAddress":"C. de Fuenterrabía, 14","addressLocality":"Irún","postalCode":"20301","addressRegion":"Gipuzkoa","addressCountry":"ES"}},"areaServed":{"@type":"City","name":"Irún"},"url":"https://www.anakaoptica.com/cita-previa/"}</script>
  <script type="application/ld+json">{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Inicio","item":"https://www.anakaoptica.com/"},{"@type":"ListItem","position":2,"name":"Pedir cita","item":"https://www.anakaoptica.com/cita-previa/"}]}</script>
</head>
<body>
<a class="skip-link" href="#main">Saltar al contenido</a>
<div class="scroll-progress" aria-hidden="true"></div>

<header class="site-header" role="banner">
  <nav class="nav-inner" aria-label="Navegación principal">
    <a class="nav-logo" href="../index.html" aria-label="Óptica Anaka — Inicio">
      <img src="../logos/OPTICA-ANACA-LOGO-1.webp" alt="Logo Óptica Anaka" width="120" height="44"/>
    </a>
    <button class="nav-toggle" id="navToggle" aria-label="Abrir menú" aria-expanded="false" aria-controls="navLinks">
      <span></span><span></span><span></span>
    </button>
    <ul class="nav-links" id="navLinks" role="list">
      <li><a href="../index.html">Inicio</a></li>
      <li><a href="../servicios/index.html">Servicios</a></li>
      <li><a href="../colecciones/index.html">Colecciones</a></li>
      <li><a href="../contacto/index.html">Contacto</a></li>
      <li><a href="index.html" class="nav-cta active" aria-current="page">Pedir cita</a></li>
    </ul>
    <div class="nav-lang" aria-label="Idioma">
      <a href="index.html" class="active" lang="es" hreflang="es">ES</a>
      <span aria-hidden="true">|</span>
      <a href="../eu/hitzordua/index.html" lang="eu" hreflang="eu">EU</a>
      <span aria-hidden="true">|</span>
      <a href="../fr/rendez-vous/index.html" lang="fr" hreflang="fr">FR</a>
    </div>
    <a class="nav-phone" href="tel:+34943248490" aria-label="Llamar al 943 24 84 90">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.58.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1C10.29 21 3 13.71 3 4.5 3 3.95 3.45 3.5 4 3.5H7.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.24 1.02L6.6 10.8z"/></svg>
      943 24 84 90
    </a>
  </nav>
</header>

<main id="main">

<nav class="breadcrumb" aria-label="Ruta de navegación">
  <a href="../index.html">Inicio</a>
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>
  <span>Pedir cita</span>
</nav>

<div class="page-hero">
  <div class="container">
    <span class="label-tag">Reserva tu cita</span>
    <h1 class="reveal">Pide tu cita en <span class="hl">Óptica Anaka</span></h1>
    <p class="reveal">Elige el día y la hora que mejor te venga. Te confirmaremos por teléfono o email.</p>
  </div>
</div>

<section aria-labelledby="cita-title">
  <div class="container">
    <h2 class="sr-only" id="cita-title">Formulario de reserva de cita</h2>
    <div class="cita-grid">

      <aside class="cita-info-card reveal">
        <h2>Cómo funciona</h2>
        <ol class="cita-steps">
          <li class="cita-step"><span class="cita-step-num">1</span><span class="cita-step-text"><strong>Rellena el formulario</strong>Elige motivo, día y hora.</span></li>
          <li class="cita-step"><span class="cita-step-num">2</span><span class="cita-step-text"><strong>Recibimos tu solicitud</strong>Llega al instante a la óptica.</span></li>
          <li class="cita-step"><span class="cita-step-num">3</span><span class="cita-step-text"><strong>Te confirmamos</strong>Por teléfono o email en horario comercial.</span></li>
        </ol>

        <div class="horario-box">
          <h3 style="font-size:.95rem;margin-bottom:.65rem;font-family:'Outfit',sans-serif;font-weight:600;letter-spacing:.05em;text-transform:uppercase;">Horario</h3>
          <table class="horario-table" aria-label="Horario de apertura">
            <tbody>
              <tr><th scope="row">Lun–Sáb (mañanas)</th><td>9:30h – 13:30h</td></tr>
              <tr><th scope="row">Lun–Vie (tardes)</th><td>16:30h – 20:00h</td></tr>
              <tr><th scope="row">Sáb tarde / Dom</th><td class="td-closed">CERRADO</td></tr>
            </tbody>
          </table>
        </div>

        <p style="margin-top:1.25rem;font-size:.85rem;color:var(--text-muted)">¿Prefieres llamar?</p>
        <a class="btn btn-ghost" href="tel:+34943248490" style="gap:.5rem;margin-top:.4rem">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.58.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1C10.29 21 3 13.71 3 4.5 3 3.95 3.45 3.5 4 3.5H7.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.24 1.02L6.6 10.8z"/></svg>
          943 24 84 90
        </a>
      </aside>

      <div class="cita-form-card reveal">
        <form id="citaForm" novalidate data-lang="es">

          <fieldset class="cita-fieldset">
            <legend class="cita-legend"><span class="cita-legend-num">1</span>Motivo de la cita</legend>
            <div class="cita-motivos" role="radiogroup" aria-required="true" aria-labelledby="motivo-error">
              <label class="cita-motivo"><input type="radio" name="motivo" value="revision" required/>
                <span class="cita-motivo-icon" aria-hidden="true"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></span>
                <span class="cita-motivo-label">Revisión de la vista</span></label>
              <label class="cita-motivo"><input type="radio" name="motivo" value="comprar"/>
                <span class="cita-motivo-icon" aria-hidden="true"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="6" cy="15" r="4"/><circle cx="18" cy="15" r="4"/><path d="M10 15h4M2 12l4-2M22 12l-4-2"/></svg></span>
                <span class="cita-motivo-label">Comprar gafas / monturas</span></label>
              <label class="cita-motivo"><input type="radio" name="motivo" value="lentillas"/>
                <span class="cita-motivo-icon" aria-hidden="true"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/></svg></span>
                <span class="cita-motivo-label">Lentes de contacto</span></label>
              <label class="cita-motivo"><input type="radio" name="motivo" value="retinografia"/>
                <span class="cita-motivo-icon" aria-hidden="true"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg></span>
                <span class="cita-motivo-label">Retinografía</span></label>
              <label class="cita-motivo"><input type="radio" name="motivo" value="reparacion"/>
                <span class="cita-motivo-icon" aria-hidden="true"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M14.7 6.3a4.5 4.5 0 0 0-6.4 6.4L3 18l3 3 5.3-5.3a4.5 4.5 0 0 0 6.4-6.4l-2.5 2.5L13 9l2.2-2.7z"/></svg></span>
                <span class="cita-motivo-label">Reparación o ajuste</span></label>
              <label class="cita-motivo"><input type="radio" name="motivo" value="otro"/>
                <span class="cita-motivo-icon" aria-hidden="true"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01"/></svg></span>
                <span class="cita-motivo-label">Otro</span></label>
            </div>
            <p class="cita-field-error" id="motivo-error" aria-live="polite"></p>
          </fieldset>

          <fieldset class="cita-fieldset">
            <legend class="cita-legend"><span class="cita-legend-num">2</span>Fecha y hora</legend>
            <div class="cita-date-row">
              <label for="cita-fecha">Día</label>
              <input type="date" id="cita-fecha" name="fecha" required aria-describedby="fecha-error"/>
              <p class="cita-field-error" id="fecha-error" aria-live="polite"></p>
            </div>
            <div class="cita-slots-wrap" id="citaSlotsWrap">
              <div class="cita-slots-group" data-period="morning">
                <p class="cita-slots-title">Mañana</p>
                <div class="cita-slots" id="citaSlotsMorning" role="radiogroup" aria-label="Horas disponibles por la mañana"></div>
              </div>
              <div class="cita-slots-group" data-period="afternoon">
                <p class="cita-slots-title">Tarde</p>
                <div class="cita-slots" id="citaSlotsAfternoon" role="radiogroup" aria-label="Horas disponibles por la tarde"></div>
              </div>
              <p class="cita-field-error" id="hora-error" aria-live="polite"></p>
            </div>
            <input type="hidden" name="hora" id="citaHoraHidden" required/>
          </fieldset>

          <fieldset class="cita-fieldset">
            <legend class="cita-legend"><span class="cita-legend-num">3</span>Tus datos</legend>
            <div class="form-row">
              <div class="form-group">
                <label for="cita-nombre">Nombre <span aria-hidden="true">*</span></label>
                <input type="text" id="cita-nombre" name="nombre" required autocomplete="given-name" placeholder="Tu nombre" aria-describedby="nombre-error"/>
                <p class="cita-field-error" id="nombre-error" aria-live="polite"></p>
              </div>
              <div class="form-group">
                <label for="cita-apellidos">Apellidos <span aria-hidden="true">*</span></label>
                <input type="text" id="cita-apellidos" name="apellidos" required autocomplete="family-name" placeholder="Tus apellidos" aria-describedby="apellidos-error"/>
                <p class="cita-field-error" id="apellidos-error" aria-live="polite"></p>
              </div>
            </div>
            <div class="form-group">
              <label for="cita-telefono">Teléfono <span aria-hidden="true">*</span></label>
              <input type="tel" id="cita-telefono" name="telefono" required autocomplete="tel" inputmode="tel" placeholder="612 345 678" aria-describedby="telefono-error"/>
              <p class="cita-field-error" id="telefono-error" aria-live="polite"></p>
            </div>
            <div class="form-group">
              <label for="cita-email">Email <span aria-hidden="true">*</span></label>
              <input type="email" id="cita-email" name="email" required autocomplete="email" inputmode="email" placeholder="tu@email.com" aria-describedby="email-error"/>
              <p class="cita-field-error" id="email-error" aria-live="polite"></p>
            </div>
            <div class="form-group">
              <label for="cita-obs">Observaciones <span style="color:var(--text-muted);font-weight:400">(opcional)</span></label>
              <textarea id="cita-obs" name="observaciones" rows="3" maxlength="500" placeholder="Si quieres añadir algún detalle..."></textarea>
            </div>

            <!-- honeypot -->
            <div class="cita-hp" aria-hidden="true">
              <label for="website">Web</label>
              <input type="text" id="website" name="website" tabindex="-1" autocomplete="off"/>
            </div>

            <div class="form-group" style="flex-direction:row;align-items:flex-start;gap:.75rem">
              <input type="checkbox" id="cita-rgpd" name="rgpd" required style="margin-top:.25rem;flex-shrink:0"/>
              <label for="cita-rgpd" style="font-size:.85rem;line-height:1.5;font-weight:400">He leído y acepto el <a href="../aviso-legal/index.html" target="_blank" rel="noopener noreferrer">Aviso Legal</a> y la política de privacidad. <span aria-hidden="true">*</span></label>
            </div>
          </fieldset>

          <button type="submit" class="btn btn-primary cita-submit" id="citaSubmit">
            <span class="cita-submit-label">Solicitar cita</span>
          </button>
          <div class="cita-form-msg" id="citaFormMsg" role="status" aria-live="polite"></div>
        </form>

        <div class="rgpd-note" style="margin-top:1.5rem;font-size:.78rem;line-height:1.6;color:var(--text-muted)">
          <strong>Información básica sobre protección de datos:</strong><br/>
          <strong>Responsable:</strong> ÓPTICA ANAKA &nbsp;|&nbsp;
          <strong>Finalidad:</strong> Gestionar tu solicitud de cita &nbsp;|&nbsp;
          <strong>Legitimación:</strong> Tu consentimiento expreso &nbsp;|&nbsp;
          <strong>Destinatario:</strong> ÓPTICA ANAKA &nbsp;|&nbsp;
          <strong>Derechos:</strong> acceso, rectificación, supresión, limitación, portabilidad y olvido.
        </div>
      </div>

    </div>
  </div>
</section>

</main>

<footer class="site-footer" role="contentinfo">
  <div class="container">
    <div class="footer-grid">
      <div class="footer-logo">
        <img src="../logos/OPTICA-ANACA-LOGO-1.webp" alt="Logo Óptica Anaka" width="120" height="46"/>
        <p>Tu óptica de referencia<br/>en Irún desde 2007.</p>
      </div>
      <div class="footer-col">
        <h4>Navegación</h4>
        <a href="../index.html">Inicio</a>
        <a href="../servicios/index.html">Servicios</a>
        <a href="../colecciones/index.html">Colecciones</a>
        <a href="../contacto/index.html">Contacto</a>
        <a href="index.html">Pedir cita</a>
      </div>
      <div class="footer-col">
        <h4>Legal</h4>
        <a href="../aviso-legal/index.html">Aviso Legal</a>
        <a href="../politica-cookies/index.html">Política de Cookies</a>
        <a href="../personalizar-cookies/index.html">Personalizar Cookies</a>
      </div>
    </div>
    <div class="footer-bottom">
      <p>© 2026 Óptica Anaka · C. de Fuenterrabía, 14, 20301 Irún, Gipuzkoa</p>
      <p>Diseñado por <strong style="color:rgba(255,255,255,.55)">Unax Aller</strong></p>
    </div>
  </div>
</footer>

<div class="cookie-banner" role="dialog" aria-modal="true" aria-label="Cookies" aria-live="polite">
  <p>Usamos cookies para mejorar tu experiencia. <a href="../politica-cookies/index.html">Más información</a>.</p>
  <div class="cookie-btns">
    <button class="cookie-btn cookie-accept">Aceptar</button>
    <a href="../personalizar-cookies/index.html" class="cookie-btn cookie-decline" style="text-align:center">Configurar</a>
    <button class="cookie-btn cookie-decline">Rechazar</button>
  </div>
</div>

<script defer src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js"></script>
<script defer src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js"></script>
<script defer src="../assets/js/main.js"></script>
<script defer src="../assets/js/cita.js"></script>
</body>
</html>
```

- [ ] **Step 2: Verify the page renders**

Open `cita-previa/index.html` in a browser. Expected:
- Header with the new "Pedir cita" link styled as a pill button.
- Breadcrumb: `Inicio > Pedir cita`.
- Page hero with the title.
- Two-column layout on desktop (info card sticky on the left, form card on the right).
- All 6 motivo cards visible with icons.
- Date input visible.
- Slots wrapper hidden until a date is selected (this happens via the `is-visible` class added by JS in Task 4).
- Three personal data fields + RGPD checkbox + submit button.
- Footer with the new "Pedir cita" link.
- The browser console may log "cita.js missing function" or similar — that's expected, the JS comes in Task 4.

- [ ] **Step 3: Commit**

```bash
git add cita-previa/index.html
git commit -m "Add Spanish appointment booking page (markup only)"
```

---

## Task 3: Build the Basque (eu) and French (fr) appointment pages

**Files:**
- Create: `eu/hitzordua/index.html`
- Create: `fr/rendez-vous/index.html`

- [ ] **Step 1: Create the Basque page**

Create `eu/hitzordua/index.html`. The structure is identical to Task 2, with these substitutions throughout. **All paths are `../../` instead of `../` because this page lives one level deeper.**

Key strings (replace 1:1 from the Spanish version):

| Spanish | Basque |
|---|---|
| `lang="es"` | `lang="eu"` |
| `Pedir cita online — Óptica Anaka Irún` | `Hitzordua eskatu online — Optika Anaka Irun` |
| `Pide tu cita online en Óptica Anaka, Irún. Revisión visual, retinografía, lentes de contacto y más. Confirmamos por teléfono.` | `Eskatu zure hitzordua online Optika Anakan, Irunen. Ikusmen-azterketa, erretinografia, kontaktuko lenteak eta gehiago. Telefonoz baieztatuko dizugu.` |
| canonical href | `https://www.anakaoptica.com/eu/hitzordua/` |
| `og:locale` value | `eu_ES` |
| `Saltar al contenido` | `Edukira salto egin` |
| `Navegación principal` | `Nabigazio nagusia` |
| `Inicio` (nav) | `Hasiera` |
| `Servicios` | `Zerbitzuak` |
| `Colecciones` | `Bildumak` |
| `Contacto` | `Kontaktua` |
| `Pedir cita` (nav) | `Hitzordua eskatu` |
| `Llamar al 943 24 84 90` | `943 24 84 90 deitu` |
| `Ruta de navegación` | `Nabigazio-bidea` |
| `Inicio` (breadcrumb) | `Hasiera` |
| `Pedir cita` (breadcrumb) | `Hitzordua eskatu` |
| `Reserva tu cita` | `Eskatu zure hitzordua` |
| `Pide tu cita en Óptica Anaka` | `Eskatu zure hitzordua Optika Anakan` |
| `Elige el día y la hora que mejor te venga. Te confirmaremos por teléfono o email.` | `Aukeratu egokien zaizun eguna eta ordua. Telefonoz edo emailez baieztatuko dizugu.` |
| `Cómo funciona` | `Nola funtzionatzen du` |
| `Rellena el formulario` | `Bete inprimakia` |
| `Elige motivo, día y hora.` | `Aukeratu arrazoia, eguna eta ordua.` |
| `Recibimos tu solicitud` | `Zure eskaera jasoko dugu` |
| `Llega al instante a la óptica.` | `Berehala iristen zaigu optikara.` |
| `Te confirmamos` | `Baieztatuko dizugu` |
| `Por teléfono o email en horario comercial.` | `Telefonoz edo emailez ordutegi komertzialean.` |
| `Horario` | `Ordutegia` |
| `Horario de apertura` | `Ireki ordutegia` |
| `Lun–Sáb (mañanas)` | `Al–Lr (goizak)` |
| `Lun–Vie (tardes)` | `Al–Or (arratsaldeak)` |
| `Sáb tarde / Dom` | `Lr arratsaldea / Iga` |
| `CERRADO` | `ITXITA` |
| `¿Prefieres llamar?` | `Nahiago duzu deitu?` |
| `Motivo de la cita` | `Hitzorduaren arrazoia` |
| `Revisión de la vista` | `Ikusmen-azterketa` |
| `Comprar gafas / monturas` | `Betaurrekoak / armazoiak erostea` |
| `Lentes de contacto` | `Kontaktuko lenteak` |
| `Retinografía` | `Erretinografia` |
| `Reparación o ajuste` | `Konponketa edo doikuntza` |
| `Otro` | `Bestelakoa` |
| `Fecha y hora` | `Eguna eta ordua` |
| `Día` | `Eguna` |
| `Mañana` (slots title) | `Goiza` |
| `Tarde` (slots title) | `Arratsaldea` |
| `Horas disponibles por la mañana` | `Goizeko ordu erabilgarriak` |
| `Horas disponibles por la tarde` | `Arratsaldeko ordu erabilgarriak` |
| `Tus datos` | `Zure datuak` |
| `Nombre` | `Izena` |
| `Tu nombre` | `Zure izena` |
| `Apellidos` | `Abizenak` |
| `Tus apellidos` | `Zure abizenak` |
| `Teléfono` | `Telefonoa` |
| `Email` | `Emaila` |
| `Observaciones` | `Oharrak` |
| `(opcional)` | `(aukerakoa)` |
| `Si quieres añadir algún detalle...` | `Xehetasunen bat gehitu nahi baduzu...` |
| `He leído y acepto el` | `Irakurri dut eta onartzen dut` |
| `Aviso Legal` | `Lege-oharra` |
| `y la política de privacidad.` | `eta pribatutasun-politika.` |
| `Solicitar cita` (button) | `Eskatu hitzordua` |
| `Información básica sobre protección de datos:` | `Datuen babeserako oinarrizko informazioa:` |
| `Responsable:` | `Arduraduna:` |
| `Finalidad:` | `Helburua:` |
| `Gestionar tu solicitud de cita` | `Zure hitzordu-eskaera kudeatzea` |
| `Legitimación:` | `Legitimazioa:` |
| `Tu consentimiento expreso` | `Zure baimen espresua` |
| `Destinatario:` | `Hartzailea:` |
| `Derechos:` | `Eskubideak:` |
| `acceso, rectificación, supresión, limitación, portabilidad y olvido.` | `sarbidea, zuzenketa, ezabatzea, mugatzea, eramangarritasuna eta ahaztea.` |
| `Tu óptica de referencia<br/>en Irún desde 2007.` | `Zure erreferentziazko optika<br/>Irunen 2007tik.` |
| `Navegación` | `Nabigazioa` |
| `Legal` | `Legezkoa` |
| `Política de Cookies` | `Cookien Politika` |
| `Personalizar Cookies` | `Cookiak pertsonalizatu` |
| `Cookies` (banner) | `Cookiak` |
| `Usamos cookies para mejorar tu experiencia.` | `Cookiak erabiltzen ditugu zure esperientzia hobetzeko.` |
| `Más información` | `Informazio gehiago` |
| `Aceptar` | `Onartu` |
| `Configurar` | `Konfiguratu` |
| `Rechazar` | `Baztertu` |
| `Diseñado por` | `Diseinatua` |

Internal navigation links inside the navbar should point to:
- `Hasiera` → `../index.html`
- `Zerbitzuak` → `../zerbitzuak/index.html`
- `Bildumak` → `../bildumak/index.html`
- `Kontaktua` → `../kontaktua/index.html`
- `Hitzordua eskatu` → `index.html` (active)
- ES lang link → `../../cita-previa/index.html`
- EU lang link → `index.html` (active)
- FR lang link → `../../fr/rendez-vous/index.html`

Footer links: `../index.html`, `../zerbitzuak/index.html`, `../bildumak/index.html`, `../kontaktua/index.html`, `index.html`, `../../aviso-legal/index.html`, `../../politica-cookies/index.html`, `../../personalizar-cookies/index.html`.

Asset paths use `../../` prefix: `../../logos/OPTICA-ANACA-LOGO-1.webp`, `../../assets/css/main.css`, `../../assets/js/main.js`, `../../assets/js/cita.js`.

The `<form>` tag must be: `<form id="citaForm" novalidate data-lang="eu">`.

Schema-org JSON-LD: replace `name` → `Hitzorduaren erreserba online`, `provider.name` → `Optika Anaka`. Breadcrumb position 1 name → `Hasiera`, item → `https://www.anakaoptica.com/eu/`. Position 2 name → `Hitzordua eskatu`, item → `https://www.anakaoptica.com/eu/hitzordua/`.

- [ ] **Step 2: Create the French page**

Create `fr/rendez-vous/index.html`. Same structural rules as the Basque page (paths use `../../` for assets, `../` for sibling sections). Translations:

| Spanish | French |
|---|---|
| `lang="es"` | `lang="fr"` |
| `Pedir cita online — Óptica Anaka Irún` | `Réserver un rendez-vous en ligne — Optique Anaka Irún` |
| meta description | `Réservez votre rendez-vous en ligne à l'Optique Anaka, Irún. Examen de vue, rétinographie, lentilles de contact et plus. Nous confirmons par téléphone.` |
| canonical | `https://www.anakaoptica.com/fr/rendez-vous/` |
| `og:locale` | `fr_FR` |
| `Saltar al contenido` | `Aller au contenu` |
| `Navegación principal` | `Navigation principale` |
| `Inicio` (nav) | `Accueil` |
| `Servicios` | `Services` |
| `Colecciones` | `Collections` |
| `Contacto` | `Contact` |
| `Pedir cita` (nav) | `Réserver` |
| `Llamar al 943 24 84 90` | `Appeler le 943 24 84 90` |
| `Ruta de navegación` | `Fil d'Ariane` |
| `Inicio` (breadcrumb) | `Accueil` |
| `Pedir cita` (breadcrumb) | `Réserver` |
| `Reserva tu cita` | `Réservez votre rendez-vous` |
| `Pide tu cita en Óptica Anaka` | `Prenez rendez-vous à l'Optique Anaka` |
| `Elige el día...` | `Choisissez le jour et l'heure qui vous conviennent. Nous confirmerons par téléphone ou email.` |
| `Cómo funciona` | `Comment ça marche` |
| `Rellena el formulario` | `Remplissez le formulaire` |
| `Elige motivo, día y hora.` | `Choisissez le motif, le jour et l'heure.` |
| `Recibimos tu solicitud` | `Nous recevons votre demande` |
| `Llega al instante a la óptica.` | `Elle arrive instantanément à l'optique.` |
| `Te confirmamos` | `Nous confirmons` |
| `Por teléfono o email en horario comercial.` | `Par téléphone ou email aux heures d'ouverture.` |
| `Horario` | `Horaires` |
| `Horario de apertura` | `Horaires d'ouverture` |
| `Lun–Sáb (mañanas)` | `Lun–Sam (matins)` |
| `Lun–Vie (tardes)` | `Lun–Ven (après-midis)` |
| `Sáb tarde / Dom` | `Sam après-midi / Dim` |
| `CERRADO` | `FERMÉ` |
| `¿Prefieres llamar?` | `Vous préférez appeler ?` |
| `Motivo de la cita` | `Motif du rendez-vous` |
| `Revisión de la vista` | `Examen de vue` |
| `Comprar gafas / monturas` | `Acheter des lunettes` |
| `Lentes de contacto` | `Lentilles de contact` |
| `Retinografía` | `Rétinographie` |
| `Reparación o ajuste` | `Réparation ou ajustement` |
| `Otro` | `Autre` |
| `Fecha y hora` | `Date et heure` |
| `Día` | `Jour` |
| `Mañana` (slots title) | `Matin` |
| `Tarde` (slots title) | `Après-midi` |
| `Horas disponibles por la mañana` | `Heures disponibles le matin` |
| `Horas disponibles por la tarde` | `Heures disponibles l'après-midi` |
| `Tus datos` | `Vos coordonnées` |
| `Nombre` | `Prénom` |
| `Tu nombre` | `Votre prénom` |
| `Apellidos` | `Nom` |
| `Tus apellidos` | `Votre nom` |
| `Teléfono` | `Téléphone` |
| `Email` | `Email` |
| `Observaciones` | `Remarques` |
| `(opcional)` | `(facultatif)` |
| `Si quieres añadir algún detalle...` | `Si vous souhaitez ajouter un détail...` |
| `He leído y acepto el` | `J'ai lu et j'accepte les` |
| `Aviso Legal` | `Mentions légales` |
| `y la política de privacidad.` | `et la politique de confidentialité.` |
| `Solicitar cita` | `Demander rendez-vous` |
| `Información básica sobre protección de datos:` | `Informations de base sur la protection des données :` |
| `Responsable:` | `Responsable :` |
| `Finalidad:` | `Finalité :` |
| `Gestionar tu solicitud de cita` | `Gérer votre demande de rendez-vous` |
| `Legitimación:` | `Base légale :` |
| `Tu consentimiento expreso` | `Votre consentement exprès` |
| `Destinatario:` | `Destinataire :` |
| `Derechos:` | `Droits :` |
| `acceso...y olvido.` | `accès, rectification, suppression, limitation, portabilité et oubli.` |
| `Tu óptica de referencia<br/>en Irún desde 2007.` | `Votre optique de référence<br/>à Irún depuis 2007.` |
| `Navegación` | `Navigation` |
| `Legal` | `Légal` |
| `Política de Cookies` | `Politique de Cookies` |
| `Personalizar Cookies` | `Personnaliser les Cookies` |
| `Usamos cookies para mejorar tu experiencia.` | `Nous utilisons des cookies pour améliorer votre expérience.` |
| `Más información` | `En savoir plus` |
| `Aceptar` | `Accepter` |
| `Configurar` | `Configurer` |
| `Rechazar` | `Refuser` |
| `Diseñado por` | `Conçu par` |

Internal navigation links inside the navbar:
- `Accueil` → `../index.html`
- `Services` → `../services/index.html`
- `Collections` → `../collections/index.html`
- `Contact` → `../contact/index.html`
- `Réserver` → `index.html` (active)
- ES lang → `../../cita-previa/index.html`
- EU lang → `../../eu/hitzordua/index.html`
- FR lang → `index.html` (active)

Footer links: `../index.html`, `../services/index.html`, `../collections/index.html`, `../contact/index.html`, `index.html`, `../../aviso-legal/index.html`, etc.

`<form id="citaForm" novalidate data-lang="fr">`.

Schema: `provider.name` → `Optique Anaka`. Breadcrumb names: `Accueil`, `Réserver`.

- [ ] **Step 3: Verify both pages render**

Open `eu/hitzordua/index.html` and `fr/rendez-vous/index.html` in the browser. Expected: identical layout to the Spanish page; all text in the right language; the language switcher in the navbar correctly highlights the current language and links to the others; assets (CSS, fonts, logo) all load (no 404s in DevTools Network tab).

- [ ] **Step 4: Commit**

```bash
git add eu/hitzordua/index.html fr/rendez-vous/index.html
git commit -m "Add Basque and French appointment booking pages"
```

---

## Task 4: Build the form JavaScript (assets/js/cita.js)

**Files:**
- Create: `assets/js/cita.js`

- [ ] **Step 1: Create the JS file with all logic**

Create `assets/js/cita.js`:

```javascript
/* ══════════════════════════════════════════════════
   ÓPTICA ANAKA — Citas (Appointment booking)
   Validates form, generates time slots, posts to Apps Script
══════════════════════════════════════════════════ */

(function () {
  'use strict';

  // === CONFIG ===
  // Replace this constant with the deployed Apps Script Web App URL after deployment.
  const APPS_SCRIPT_URL = 'REPLACE_WITH_DEPLOYED_APPS_SCRIPT_URL';
  const RATE_LIMIT_KEY = 'cita_last_submit_ts';
  const RATE_LIMIT_MS = 60_000;
  const MAX_DAYS_AHEAD = 60;

  // i18n strings
  const I18N = {
    es: {
      requiredMotivo: 'Selecciona un motivo.',
      requiredDate: 'Elige una fecha.',
      requiredTime: 'Elige una hora.',
      requiredField: 'Este campo es obligatorio.',
      invalidEmail: 'Introduce un email válido.',
      invalidPhone: 'Introduce un teléfono válido.',
      invalidDatePast: 'La fecha no puede ser pasada.',
      invalidDateSunday: 'Los domingos cerramos.',
      invalidDateFar: 'Solo aceptamos citas hasta 60 días vista.',
      noAfternoonSat: 'Los sábados por la tarde cerramos.',
      mustAcceptRgpd: 'Debes aceptar la política de privacidad.',
      rateLimited: 'Acabas de enviar una solicitud. Espera un minuto antes de enviar otra.',
      success: 'Solicitud enviada. Te contactaremos pronto para confirmar tu cita.',
      errorNetwork: 'No hemos podido enviar tu solicitud. Llámanos al 943 24 84 90.'
    },
    eu: {
      requiredMotivo: 'Aukeratu arrazoi bat.',
      requiredDate: 'Aukeratu data bat.',
      requiredTime: 'Aukeratu ordu bat.',
      requiredField: 'Eremu hau beharrezkoa da.',
      invalidEmail: 'Sartu baliozko email bat.',
      invalidPhone: 'Sartu baliozko telefono bat.',
      invalidDatePast: 'Data ezin da iragan.',
      invalidDateSunday: 'Igandeetan itxita.',
      invalidDateFar: '60 egun barruko hitzorduak bakarrik onartzen ditugu.',
      noAfternoonSat: 'Larunbat arratsaldeetan itxita.',
      mustAcceptRgpd: 'Pribatutasun-politika onartu behar duzu.',
      rateLimited: 'Eskaera bat bidali berri duzu. Itxaron minutu bat beste bat bidali aurretik.',
      success: 'Eskaera bidalia. Laster jarriko gara zurekin harremanetan zure hitzordua baieztatzeko.',
      errorNetwork: 'Ezin izan dugu zure eskaera bidali. Deitu 943 24 84 90 zenbakira.'
    },
    fr: {
      requiredMotivo: 'Sélectionnez un motif.',
      requiredDate: 'Choisissez une date.',
      requiredTime: 'Choisissez une heure.',
      requiredField: 'Ce champ est obligatoire.',
      invalidEmail: 'Entrez un email valide.',
      invalidPhone: 'Entrez un téléphone valide.',
      invalidDatePast: 'La date ne peut pas être dans le passé.',
      invalidDateSunday: 'Nous sommes fermés le dimanche.',
      invalidDateFar: 'Nous acceptons les rendez-vous jusqu’à 60 jours.',
      noAfternoonSat: 'Nous sommes fermés le samedi après-midi.',
      mustAcceptRgpd: 'Vous devez accepter la politique de confidentialité.',
      rateLimited: 'Vous venez d’envoyer une demande. Patientez une minute avant d’en envoyer une autre.',
      success: 'Demande envoyée. Nous vous contacterons bientôt pour confirmer votre rendez-vous.',
      errorNetwork: 'Nous n’avons pas pu envoyer votre demande. Appelez-nous au 943 24 84 90.'
    }
  };

  // === SLOT GENERATION ===
  // Last appointment is 1h before closing.
  // Mon-Fri morning: 09:30 -> 12:30 (every 30 min, 7 slots)
  // Mon-Fri afternoon: 16:30 -> 19:00 (every 30 min, 6 slots)
  // Saturday morning: 09:30 -> 12:30 (7 slots), no afternoon
  // Sunday: closed
  const MORNING_SLOTS = ['09:30','10:00','10:30','11:00','11:30','12:00','12:30'];
  const AFTERNOON_SLOTS = ['16:30','17:00','17:30','18:00','18:30','19:00'];

  function slotsForDate(dateStr) {
    // dateStr is "YYYY-MM-DD" from <input type="date">
    if (!dateStr) return { morning: [], afternoon: [], closed: true };
    // Parse as local date (avoid UTC shift)
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    const dow = dt.getDay(); // 0=Sun, 6=Sat
    if (dow === 0) return { morning: [], afternoon: [], closed: true };
    if (dow === 6) return { morning: MORNING_SLOTS.slice(), afternoon: [], closed: false };
    return { morning: MORNING_SLOTS.slice(), afternoon: AFTERNOON_SLOTS.slice(), closed: false };
  }

  // === VALIDATION ===
  function isValidEmail(s) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(s || '').trim());
  }
  function isValidPhone(s) {
    // Accept digits, spaces, +, -, parentheses; require at least 9 digits
    const digits = String(s || '').replace(/\D/g, '');
    return digits.length >= 9 && digits.length <= 15;
  }

  function validateDate(dateStr, t) {
    if (!dateStr) return t.requiredDate;
    const [y, m, d] = dateStr.split('-').map(Number);
    const picked = new Date(y, m - 1, d);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (picked < today) return t.invalidDatePast;
    const max = new Date(today);
    max.setDate(max.getDate() + MAX_DAYS_AHEAD);
    if (picked > max) return t.invalidDateFar;
    if (picked.getDay() === 0) return t.invalidDateSunday;
    return null;
  }

  // === DOM HELPERS ===
  function setError(fieldId, msg) {
    const errEl = document.getElementById(fieldId + '-error');
    const inputEl = document.getElementById('cita-' + fieldId) || document.querySelector('[name="' + fieldId + '"]');
    if (errEl) errEl.textContent = msg || '';
    if (inputEl) {
      if (msg) inputEl.setAttribute('aria-invalid', 'true');
      else inputEl.removeAttribute('aria-invalid');
    }
  }

  function clearAllErrors(form) {
    form.querySelectorAll('.cita-field-error').forEach(el => { el.textContent = ''; });
    form.querySelectorAll('[aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));
  }

  function showFormMsg(state, text) {
    const el = document.getElementById('citaFormMsg');
    if (!el) return;
    el.classList.remove('is-success', 'is-error');
    if (state) el.classList.add('is-' + state);
    el.textContent = text || '';
  }

  // === SLOT RENDERING ===
  function renderSlots(dateStr) {
    const wrap = document.getElementById('citaSlotsWrap');
    const morningEl = document.getElementById('citaSlotsMorning');
    const afternoonEl = document.getElementById('citaSlotsAfternoon');
    const hidden = document.getElementById('citaHoraHidden');
    if (!wrap || !morningEl || !afternoonEl || !hidden) return;

    hidden.value = '';
    morningEl.innerHTML = '';
    afternoonEl.innerHTML = '';

    const { morning, afternoon, closed } = slotsForDate(dateStr);
    const morningGroup = wrap.querySelector('[data-period="morning"]');
    const afternoonGroup = wrap.querySelector('[data-period="afternoon"]');

    if (closed || (!morning.length && !afternoon.length)) {
      wrap.classList.remove('is-visible');
      return;
    }

    morning.forEach(time => morningEl.appendChild(makeSlotButton(time, hidden)));
    afternoon.forEach(time => afternoonEl.appendChild(makeSlotButton(time, hidden)));

    morningGroup.style.display = morning.length ? '' : 'none';
    afternoonGroup.style.display = afternoon.length ? '' : 'none';

    wrap.classList.add('is-visible');

    // Reveal animation
    if (window.gsap && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.fromTo(wrap, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' });
    }
  }

  function makeSlotButton(time, hiddenInput) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cita-slot';
    btn.textContent = time;
    btn.setAttribute('role', 'radio');
    btn.setAttribute('aria-checked', 'false');
    btn.dataset.time = time;
    btn.addEventListener('click', () => {
      document.querySelectorAll('.cita-slot.is-selected').forEach(el => {
        el.classList.remove('is-selected');
        el.setAttribute('aria-checked', 'false');
      });
      btn.classList.add('is-selected');
      btn.setAttribute('aria-checked', 'true');
      hiddenInput.value = time;
      setError('hora', '');
    });
    return btn;
  }

  // === RATE LIMIT ===
  function isRateLimited() {
    try {
      const last = parseInt(localStorage.getItem(RATE_LIMIT_KEY) || '0', 10);
      return Date.now() - last < RATE_LIMIT_MS;
    } catch (e) { return false; }
  }
  function markSubmitted() {
    try { localStorage.setItem(RATE_LIMIT_KEY, String(Date.now())); } catch (e) {}
  }

  // === FORM SUBMIT ===
  async function handleSubmit(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const lang = form.dataset.lang || 'es';
    const t = I18N[lang] || I18N.es;
    clearAllErrors(form);
    showFormMsg(null, '');

    const fd = new FormData(form);
    const data = {
      motivo: fd.get('motivo') || '',
      fecha: fd.get('fecha') || '',
      hora: fd.get('hora') || '',
      nombre: (fd.get('nombre') || '').toString().trim(),
      apellidos: (fd.get('apellidos') || '').toString().trim(),
      telefono: (fd.get('telefono') || '').toString().trim(),
      email: (fd.get('email') || '').toString().trim(),
      observaciones: (fd.get('observaciones') || '').toString().trim().slice(0, 500),
      rgpd: !!fd.get('rgpd'),
      website: (fd.get('website') || '').toString(), // honeypot
      lang: lang
    };

    let firstError = null;
    function fail(field, msg) {
      setError(field, msg);
      if (!firstError) firstError = field;
    }

    if (!data.motivo) fail('motivo', t.requiredMotivo);
    const dateErr = validateDate(data.fecha, t);
    if (dateErr) fail('fecha', dateErr);
    if (!data.hora) fail('hora', t.requiredTime);
    if (!data.nombre) fail('nombre', t.requiredField);
    if (!data.apellidos) fail('apellidos', t.requiredField);
    if (!data.telefono) fail('telefono', t.requiredField);
    else if (!isValidPhone(data.telefono)) fail('telefono', t.invalidPhone);
    if (!data.email) fail('email', t.requiredField);
    else if (!isValidEmail(data.email)) fail('email', t.invalidEmail);
    if (!data.rgpd) {
      showFormMsg('error', t.mustAcceptRgpd);
      if (!firstError) firstError = 'rgpd';
    }

    if (firstError) {
      const target = document.getElementById('cita-' + firstError) || document.querySelector('[name="' + firstError + '"]');
      if (target && typeof target.focus === 'function') target.focus({ preventScroll: false });
      return;
    }

    if (isRateLimited()) {
      showFormMsg('error', t.rateLimited);
      return;
    }

    // Honeypot: if filled, fake success silently — never call the backend.
    if (data.website) {
      markSubmitted();
      showFormMsg('success', t.success);
      form.reset();
      return;
    }

    const submitBtn = document.getElementById('citaSubmit');
    submitBtn.dataset.state = 'loading';

    try {
      const res = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(data)
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.ok) throw new Error(body.error || 'send failed');

      submitBtn.dataset.state = 'success';
      showFormMsg('success', t.success);
      markSubmitted();
      form.reset();
      document.querySelectorAll('.cita-slot.is-selected').forEach(el => {
        el.classList.remove('is-selected');
        el.setAttribute('aria-checked', 'false');
      });
      document.getElementById('citaSlotsWrap').classList.remove('is-visible');
    } catch (err) {
      submitBtn.dataset.state = '';
      showFormMsg('error', t.errorNetwork);
    }
  }

  // === INIT ===
  function init() {
    const form = document.getElementById('citaForm');
    if (!form) return;

    // Date input min/max
    const dateEl = document.getElementById('cita-fecha');
    if (dateEl) {
      const today = new Date();
      const max = new Date(today);
      max.setDate(max.getDate() + MAX_DAYS_AHEAD);
      const fmt = d => d.toISOString().slice(0, 10);
      dateEl.min = fmt(today);
      dateEl.max = fmt(max);
      dateEl.addEventListener('change', () => {
        setError('fecha', '');
        const lang = form.dataset.lang || 'es';
        const t = I18N[lang] || I18N.es;
        const err = validateDate(dateEl.value, t);
        if (err) {
          setError('fecha', err);
          document.getElementById('citaSlotsWrap').classList.remove('is-visible');
          document.getElementById('citaHoraHidden').value = '';
          return;
        }
        renderSlots(dateEl.value);
      });
    }

    // Motivo: clear error when one is selected
    form.querySelectorAll('input[name="motivo"]').forEach(r => {
      r.addEventListener('change', () => setError('motivo', ''));
    });

    form.addEventListener('submit', handleSubmit);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
```

- [ ] **Step 2: Verify the form interactivity manually**

Open `cita-previa/index.html` in a browser. Test each behavior:

1. Click a motivo card → it visually highlights with shadow + slight lift; no others stay highlighted.
2. Pick today's date → if today is Monday-Friday, both "Mañana" and "Tarde" slot groups appear; if Saturday, only "Mañana"; if Sunday, the input itself rejects it visually (because we set `min`/`max` excluding past, and the JS shows `Los domingos cerramos.`).
3. Pick a date 70 days in the future (force it via DevTools removing the `max` attr) → error `Solo aceptamos citas hasta 60 días vista.`
4. Click a slot → it highlights orange; the hidden `hora` field gets the value.
5. Submit empty form → first invalid field gets focus, errors appear inline.
6. Fill everything but invalid email → email error appears.
7. Submit with valid data → button enters loading state (spinner). Because `APPS_SCRIPT_URL` is the placeholder, fetch will fail and the error message shows: `No hemos podido enviar tu solicitud. Llámanos al 943 24 84 90.` This is the expected outcome until Task 6 deploys the backend.
8. Repeat in EU and FR pages: error messages appear in the matching language.

- [ ] **Step 3: Commit**

```bash
git add assets/js/cita.js
git commit -m "Add appointment form JS (validation, slots, fetch)"
```

---

## Task 5: Add the floating CTA (FAB) on every other page

**Files:**
- Modify: `assets/js/main.js`

- [ ] **Step 1: Read the current main.js to find the init pipeline**

Open `assets/js/main.js`. Locate the `DOMContentLoaded` handler (around line 7) and the `initPageAnimations` function (around line 37). The new init function will be called from `DOMContentLoaded` (FAB persists across page loads, not part of the SPA re-init).

- [ ] **Step 2: Add the new init function and call it**

Append this function at the end of `assets/js/main.js`:

```javascript
/* ── Floating "Pedir cita" CTA ── */
function initFloatingCitaCTA() {
  // Suppress on the cita pages themselves
  const path = window.location.pathname;
  if (/\/cita-previa\//.test(path) || /\/eu\/hitzordua\//.test(path) || /\/fr\/rendez-vous\//.test(path)) return;
  if (document.querySelector('.cita-fab')) return; // idempotent

  const lang = (document.documentElement.lang || 'es').slice(0, 2);
  const labels = { es: 'Pedir cita', eu: 'Hitzordua', fr: 'Réserver' };
  const aria = {
    es: 'Pedir cita en Óptica Anaka',
    eu: 'Hitzordua eskatu Optika Anakan',
    fr: 'Réserver un rendez-vous à l’Optique Anaka'
  };
  const hrefBase = { es: '/cita-previa/', eu: '/eu/hitzordua/', fr: '/fr/rendez-vous/' };

  // Resolve a relative href so the FAB works on file:// during local preview too.
  // Detect language by URL prefix.
  let prefix;
  if (/^\/eu(\/|$)/.test(path)) prefix = 'eu';
  else if (/^\/fr(\/|$)/.test(path)) prefix = 'fr';
  else prefix = 'es';

  // Compute relative depth from current path back to site root
  // Strip trailing filename if any
  const segments = path.split('/').filter(Boolean).filter(s => !s.endsWith('.html'));
  const depth = segments.length;
  const up = depth > 0 ? '../'.repeat(depth) : './';
  const targetMap = { es: 'cita-previa/', eu: 'eu/hitzordua/', fr: 'fr/rendez-vous/' };
  const href = up + targetMap[prefix];

  const a = document.createElement('a');
  a.className = 'cita-fab';
  a.href = href;
  a.setAttribute('aria-label', aria[prefix] || aria.es);
  a.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
      <path d="M9 16l2 2 4-4"/>
    </svg>
    <span class="cita-fab-label">${labels[prefix] || labels.es}</span>
  `;
  document.body.appendChild(a);
}
```

Then, inside the existing `DOMContentLoaded` handler, add a call to `initFloatingCitaCTA()` after `initCookieBanner()` and before `initSpaRouter()`:

Find this block (around lines 14-20):
```javascript
  initNav();
  initScrollProgress();
  initCursor();
  initPageAnimations();
  initCookieBanner();
  initSpaRouter();
```

Replace with:
```javascript
  initNav();
  initScrollProgress();
  initCursor();
  initPageAnimations();
  initCookieBanner();
  initFloatingCitaCTA();
  initSpaRouter();
```

- [ ] **Step 3: Verify the FAB appears**

Open `index.html` (the home page). Resize the browser to a width below 1024px. Expected: an orange pill button "Pedir cita" appears fixed at the bottom-right. Click it → navigates to `cita-previa/index.html`.
Resize above 1024px → the FAB disappears (CSS hides it on desktop where the navbar CTA is enough).

Open `cita-previa/index.html` → the FAB does NOT appear (the early-return guard works).

Open `eu/index.html` → the FAB shows `Hitzordua` and links to `eu/hitzordua/`.

Open `fr/index.html` → the FAB shows `Réserver` and links to `fr/rendez-vous/`.

- [ ] **Step 4: Commit**

```bash
git add assets/js/main.js
git commit -m "Inject floating Pedir cita CTA on every page"
```

---

## Task 6: Add the navbar CTA link to all existing pages

This is a repetitive markup edit across many pages. The new `<li>` is inserted as the LAST item in `<ul class="nav-links">`. The same pattern repeats once per language.

**Files modified:** all 33 existing HTML pages with a navbar (1 root + 4 ES sections + 6 ES collection subpages + 1 EU root + 4 EU sections + 6 EU collection subpages + 1 FR root + 4 FR sections + 6 FR collection subpages = 33 pages).

For each language, the `<li>` to insert and the relative path to the cita page differ.

### 6a. Spanish (root + first-level sections)

- [ ] **Step 1: Update root `index.html`**

In `index.html`, find:
```html
      <li><a href="contacto/index.html">Contacto</a></li>
    </ul>
```
Replace with:
```html
      <li><a href="contacto/index.html">Contacto</a></li>
      <li><a href="cita-previa/index.html" class="nav-cta">Pedir cita</a></li>
    </ul>
```

- [ ] **Step 2: Update `servicios/index.html`, `colecciones/index.html`, `contacto/index.html`**

In each of these three files, find:
```html
      <li><a href="../contacto/index.html"...>Contacto</a></li>
    </ul>
```
(the `class="active" aria-current="page"` may or may not be present on the `Contacto` link depending on the page).

Insert AFTER the Contacto `<li>` and BEFORE `</ul>`:
```html
      <li><a href="../cita-previa/index.html" class="nav-cta">Pedir cita</a></li>
```

- [ ] **Step 3: Update the 6 collection subpages**

In each of `colecciones/carolina-herrera/index.html`, `colecciones/etnia/index.html`, `colecciones/lacoste/index.html`, `colecciones/longchamp/index.html`, `colecciones/oakley/index.html`, `colecciones/silhouette/index.html`:

Find the navbar's Contacto link and insert AFTER it inside the same `<ul>`:
```html
      <li><a href="../../cita-previa/index.html" class="nav-cta">Pedir cita</a></li>
```

- [ ] **Step 4: Verify ES pages**

Open `index.html` in a browser. Expected: navbar shows the new orange "Pedir cita" pill at the end. Click it → opens `cita-previa/index.html`. Repeat for 2 inner pages and 1 collection subpage.

- [ ] **Step 5: Commit**

```bash
git add index.html servicios/index.html colecciones/
git commit -m "Add 'Pedir cita' CTA to Spanish navbars"
```

### 6b. Basque (eu)

- [ ] **Step 1: Update `eu/index.html`**

Find:
```html
      <li><a href="kontaktua/index.html">Kontaktua</a></li>
    </ul>
```
Replace with:
```html
      <li><a href="kontaktua/index.html">Kontaktua</a></li>
      <li><a href="hitzordua/index.html" class="nav-cta">Hitzordua eskatu</a></li>
    </ul>
```

- [ ] **Step 2: Update `eu/zerbitzuak/index.html`, `eu/bildumak/index.html`, `eu/kontaktua/index.html`**

In each, after the Kontaktua `<li>`, insert:
```html
      <li><a href="../hitzordua/index.html" class="nav-cta">Hitzordua eskatu</a></li>
```

- [ ] **Step 3: Update the 6 EU collection subpages**

In `eu/bildumak/carolina-herrera/index.html`, `eu/bildumak/etnia/index.html`, `eu/bildumak/lacoste/index.html`, `eu/bildumak/longchamp/index.html`, `eu/bildumak/oakley/index.html`, `eu/bildumak/silhouette/index.html`:

After the Kontaktua `<li>`, insert:
```html
      <li><a href="../../hitzordua/index.html" class="nav-cta">Hitzordua eskatu</a></li>
```

- [ ] **Step 4: Verify EU pages**

Open `eu/index.html` in browser. Confirm navbar pill appears. Click → opens `eu/hitzordua/index.html`. Repeat in 1 inner page and 1 subpage.

- [ ] **Step 5: Commit**

```bash
git add eu/
git commit -m "Add 'Hitzordua eskatu' CTA to Basque navbars"
```

### 6c. French (fr)

- [ ] **Step 1: Update `fr/index.html`**

Find:
```html
      <li><a href="contact/index.html">Contact</a></li>
    </ul>
```
Replace with:
```html
      <li><a href="contact/index.html">Contact</a></li>
      <li><a href="rendez-vous/index.html" class="nav-cta">Réserver</a></li>
    </ul>
```

- [ ] **Step 2: Update `fr/services/index.html`, `fr/collections/index.html`, `fr/contact/index.html`**

In each, after the Contact `<li>`, insert:
```html
      <li><a href="../rendez-vous/index.html" class="nav-cta">Réserver</a></li>
```

- [ ] **Step 3: Update the 6 FR collection subpages**

In `fr/collections/carolina-herrera/index.html`, etc.:

After the Contact `<li>`, insert:
```html
      <li><a href="../../rendez-vous/index.html" class="nav-cta">Réserver</a></li>
```

- [ ] **Step 4: Verify FR pages**

Open `fr/index.html`. Confirm. Repeat in 1 inner + 1 subpage.

- [ ] **Step 5: Commit**

```bash
git add fr/
git commit -m "Add 'Réserver' CTA to French navbars"
```

---

## Task 7: Update sitemap.xml

**Files:**
- Modify: `sitemap.xml`

- [ ] **Step 1: Insert new URL entries**

Open `sitemap.xml`. After the `<!-- ========== CONTACTO ========== -->` block (around line 139, immediately before the `<!-- ========== PAGINAS DE MARCA ... -->` comment), insert:

```xml
  <!-- ========== CITA PREVIA ========== -->
  <url>
    <loc>https://www.anakaoptica.com/cita-previa/</loc>
    <lastmod>2026-05-02</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
    <xhtml:link rel="alternate" hreflang="es" href="https://www.anakaoptica.com/cita-previa/"/>
    <xhtml:link rel="alternate" hreflang="eu" href="https://www.anakaoptica.com/eu/hitzordua/"/>
    <xhtml:link rel="alternate" hreflang="fr" href="https://www.anakaoptica.com/fr/rendez-vous/"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="https://www.anakaoptica.com/cita-previa/"/>
  </url>

  <url>
    <loc>https://www.anakaoptica.com/eu/hitzordua/</loc>
    <lastmod>2026-05-02</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
    <xhtml:link rel="alternate" hreflang="es" href="https://www.anakaoptica.com/cita-previa/"/>
    <xhtml:link rel="alternate" hreflang="eu" href="https://www.anakaoptica.com/eu/hitzordua/"/>
    <xhtml:link rel="alternate" hreflang="fr" href="https://www.anakaoptica.com/fr/rendez-vous/"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="https://www.anakaoptica.com/cita-previa/"/>
  </url>

  <url>
    <loc>https://www.anakaoptica.com/fr/rendez-vous/</loc>
    <lastmod>2026-05-02</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
    <xhtml:link rel="alternate" hreflang="es" href="https://www.anakaoptica.com/cita-previa/"/>
    <xhtml:link rel="alternate" hreflang="eu" href="https://www.anakaoptica.com/eu/hitzordua/"/>
    <xhtml:link rel="alternate" hreflang="fr" href="https://www.anakaoptica.com/fr/rendez-vous/"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="https://www.anakaoptica.com/cita-previa/"/>
  </url>
```

- [ ] **Step 2: Verify the XML is well-formed**

Open `sitemap.xml` in a browser (or any XML validator). Expected: no parse errors; the new 3 URLs are visible at the right place.

- [ ] **Step 3: Commit**

```bash
git add sitemap.xml
git commit -m "Add cita-previa URLs to sitemap (3 languages)"
```

---

## Task 8: Build the Google Apps Script backend

**Files:**
- Create: `apps-script/Code.gs`
- Create: `apps-script/README.md`

- [ ] **Step 1: Create `apps-script/Code.gs`**

```javascript
/**
 * Óptica Anaka — Appointment booking endpoint
 *
 * Receives a JSON POST from the website's cita form, validates it,
 * generates an .ics calendar attachment, and emails everything to
 * the optician for one-tap import into Apple Calendar.
 *
 * Deploy:
 *   1. Copy this file's contents into a new Google Apps Script project
 *      at script.google.com.
 *   2. Click Deploy → New deployment → type: Web app.
 *   3. Execute as: Me. Who has access: Anyone.
 *   4. Copy the deployment URL into assets/js/cita.js → APPS_SCRIPT_URL.
 */

const RECIPIENT_EMAIL = 'allerunax@gmail.com';
const FROM_NAME = 'Óptica Anaka — Web';
const ORG_NAME = 'Óptica Anaka';
const ORG_ADDRESS = 'C. de Fuenterrabía, 14, 20301 Irún, Gipuzkoa';
const TIMEZONE = 'Europe/Madrid';
const SLOT_MINUTES = 30;

const MOTIVOS = {
  revision:    { es: 'Revisión de la vista',     eu: 'Ikusmen-azterketa',          fr: 'Examen de vue' },
  comprar:     { es: 'Comprar gafas / monturas', eu: 'Betaurrekoak / armazoiak',   fr: 'Acheter des lunettes' },
  lentillas:   { es: 'Lentes de contacto',       eu: 'Kontaktuko lenteak',         fr: 'Lentilles de contact' },
  retinografia:{ es: 'Retinografía',             eu: 'Erretinografia',             fr: 'Rétinographie' },
  reparacion:  { es: 'Reparación o ajuste',      eu: 'Konponketa edo doikuntza',   fr: 'Réparation ou ajustement' },
  otro:        { es: 'Otro',                     eu: 'Bestelakoa',                 fr: 'Autre' }
};

function doPost(e) {
  try {
    const raw = e && e.postData ? e.postData.contents : '';
    const data = JSON.parse(raw || '{}');

    // Honeypot: silently succeed without sending
    if (data.website && String(data.website).trim() !== '') {
      return jsonOk();
    }

    const errs = validate(data);
    if (errs.length) return jsonErr('validation: ' + errs.join('; '));

    const lang = (data.lang || 'es').toString().slice(0, 2);
    const motivoLabel = (MOTIVOS[data.motivo] && MOTIVOS[data.motivo][lang]) || data.motivo;

    const start = parseLocalDate(data.fecha, data.hora);
    const end = new Date(start.getTime() + SLOT_MINUTES * 60_000);

    const fullName = (data.nombre + ' ' + data.apellidos).trim();
    const ics = buildIcs({
      summary: 'Cita: ' + motivoLabel + ' — ' + fullName,
      start: start,
      end: end,
      location: ORG_ADDRESS,
      description: [
        'Cliente: ' + fullName,
        'Tel: ' + data.telefono,
        'Email: ' + data.email,
        'Observaciones: ' + (data.observaciones || '(sin observaciones)')
      ].join('\\n')
    });

    const icsBlob = Utilities.newBlob(ics, 'text/calendar;charset=utf-8', icsFilename(fullName));

    const subject = 'Nueva solicitud de cita — ' + fullName + ' — ' +
      Utilities.formatDate(start, TIMEZONE, 'EEE d MMM, HH:mm');

    const body = [
      'NUEVA SOLICITUD DE CITA',
      '─────────────────────────',
      'Cliente:    ' + fullName,
      'Teléfono:   ' + data.telefono,
      'Email:      ' + data.email,
      '',
      'Motivo:     ' + motivoLabel,
      'Fecha:      ' + Utilities.formatDate(start, TIMEZONE, 'EEEE, d \'de\' MMMM \'de\' yyyy'),
      'Hora:       ' + Utilities.formatDate(start, TIMEZONE, 'HH:mm'),
      'Idioma web: ' + lang.toUpperCase(),
      '',
      'Observaciones:',
      data.observaciones ? ('"' + data.observaciones + '"') : '(sin observaciones)',
      '',
      '─────────────────────────',
      'Adjunto: ' + icsBlob.getName(),
      '(Toca el archivo desde tu iPhone para añadirlo al Apple Calendar)'
    ].join('\n');

    MailApp.sendEmail({
      to: RECIPIENT_EMAIL,
      subject: subject,
      body: body,
      name: FROM_NAME,
      attachments: [icsBlob],
      replyTo: data.email
    });

    return jsonOk();
  } catch (err) {
    return jsonErr(String(err && err.message || err));
  }
}

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: false, error: 'POST only' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function validate(d) {
  const out = [];
  if (!d || typeof d !== 'object') { out.push('payload not object'); return out; }
  if (!d.motivo || !MOTIVOS[d.motivo]) out.push('motivo');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.fecha || '')) out.push('fecha format');
  if (!/^\d{2}:\d{2}$/.test(d.hora || '')) out.push('hora format');
  if (!d.nombre || String(d.nombre).trim().length < 1) out.push('nombre');
  if (!d.apellidos || String(d.apellidos).trim().length < 1) out.push('apellidos');
  if (!d.telefono) out.push('telefono');
  else {
    const digits = String(d.telefono).replace(/\D/g, '');
    if (digits.length < 9 || digits.length > 15) out.push('telefono digits');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email || '')) out.push('email');
  if (!d.rgpd) out.push('rgpd');

  // Date sanity: not in the past, not more than 60 days ahead, not Sunday
  if (out.indexOf('fecha format') === -1 && out.indexOf('hora format') === -1) {
    const dt = parseLocalDate(d.fecha, d.hora);
    const now = new Date();
    if (dt < now) out.push('fecha past');
    const max = new Date(now);
    max.setDate(max.getDate() + 60);
    if (dt > max) out.push('fecha too far');
    if (dt.getDay() === 0) out.push('fecha sunday');
    // Saturday afternoon closed
    if (dt.getDay() === 6) {
      const hh = parseInt(d.hora.slice(0, 2), 10);
      if (hh >= 13) out.push('saturday afternoon closed');
    }
    // Within opening windows
    const hh = parseInt(d.hora.slice(0, 2), 10);
    const mm = parseInt(d.hora.slice(3, 5), 10);
    const minutes = hh * 60 + mm;
    const inMorning = minutes >= 9 * 60 + 30 && minutes <= 12 * 60 + 30;
    const inAfternoon = minutes >= 16 * 60 + 30 && minutes <= 19 * 60;
    if (!inMorning && !inAfternoon) out.push('hora outside opening hours');
  }
  return out;
}

function parseLocalDate(dateStr, timeStr) {
  // dateStr "YYYY-MM-DD", timeStr "HH:MM"
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = timeStr.split(':').map(Number);
  // Build a Date in the script timezone via formatDate trick
  const iso = Utilities.formatString('%04d-%02d-%02dT%02d:%02d:00', y, m, d, hh, mm);
  // Apps Script Date constructor uses script timezone for "YYYY-MM-DDTHH:MM:SS" without offset
  return new Date(iso);
}

function buildIcs(ev) {
  const fmt = d => Utilities.formatDate(d, 'UTC', "yyyyMMdd'T'HHmmss'Z'");
  const uid = Utilities.getUuid() + '@anakaoptica.com';
  const stamp = fmt(new Date());
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Optica Anaka//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    'UID:' + uid,
    'DTSTAMP:' + stamp,
    'DTSTART:' + fmt(ev.start),
    'DTEND:' + fmt(ev.end),
    'SUMMARY:' + escapeIcs(ev.summary),
    'LOCATION:' + escapeIcs(ev.location),
    'DESCRIPTION:' + escapeIcs(ev.description),
    'BEGIN:VALARM',
    'TRIGGER:-PT24H',
    'ACTION:DISPLAY',
    'DESCRIPTION:Recordatorio cita Óptica Anaka',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ];
  return lines.join('\r\n');
}

function escapeIcs(s) {
  return String(s || '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

function icsFilename(fullName) {
  const slug = String(fullName).toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return 'cita-' + (slug || 'cliente') + '.ics';
}

function jsonOk() {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
function jsonErr(msg) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: false, error: msg }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

- [ ] **Step 2: Create `apps-script/README.md`**

```markdown
# Google Apps Script — Cita previa backend

Este script recibe las solicitudes de cita del formulario web, las valida, genera un archivo `.ics` y envía un email a la óptica.

## Despliegue (una sola vez)

1. Ve a https://script.google.com con la cuenta de Google que vaya a recibir los emails (de momento `allerunax@gmail.com`).
2. Pulsa **Nuevo proyecto**.
3. Borra el contenido por defecto de `Code.gs` y pega íntegramente el contenido de `apps-script/Code.gs` de este repositorio.
4. Pulsa el icono del disquete (Guardar). Dale al proyecto un nombre, p.ej. `Anaka — Cita previa`.
5. Pulsa **Implementar → Nueva implementación**.
6. En el icono del engranaje selecciona **Aplicación web**.
7. Configura:
   - Descripción: `Cita previa Anaka v1`
   - Ejecutar como: **Yo (tu cuenta)**
   - Quién tiene acceso: **Cualquier usuario**
8. Pulsa **Implementar**. Acepta los permisos cuando lo pida (necesita "Enviar correo electrónico como tú").
9. Copia la **URL del despliegue** (acaba en `/exec`).
10. Pega esa URL en `assets/js/cita.js`, sustituyendo el valor de la constante `APPS_SCRIPT_URL`.
11. Sube los cambios al hosting.

## Probar

Desde el sitio en producción (no funciona desde `file://` por CORS), abre `cita-previa/`, rellena el formulario y envíalo. Revisa la bandeja de entrada de `allerunax@gmail.com`. Debes recibir un email con el `.ics` adjunto. Al abrirlo desde iPhone/Mac, Apple Calendar te ofrecerá añadirlo al calendario.

## Cambiar el destinatario

Edita la constante `RECIPIENT_EMAIL` en `Code.gs`, guarda, y pulsa **Implementar → Gestionar implementaciones → editar (lápiz) → Versión: Nueva versión → Implementar**. La URL no cambia.

## Cuotas

`MailApp.sendEmail` con cuenta gratuita Gmail: 100 emails/día. Más que suficiente para una óptica.
```

- [ ] **Step 3: Verify `Code.gs` parses (visual review)**

Look at `apps-script/Code.gs` end-to-end. Expected: no obvious syntax issues — every `function` has a matching `}`, every string with backslash escapes is correct (notably the regex `^\d{4}-\d{2}-\d{2}$` and the date-format strings like `'EEEE, d \'de\' MMMM \'de\' yyyy'`). The file is reference-only at this stage; it gets executed when the user pastes it into script.google.com.

- [ ] **Step 4: Commit**

```bash
git add apps-script/
git commit -m "Add Apps Script backend (email + .ics) and deploy README"
```

---

## Task 9: End-to-end manual smoke test

**Files:** none modified — just verification.

- [ ] **Step 1: Visual check on a real device**

Serve the site locally (e.g. `python -m http.server 8000` in the repo root) and open it on a phone (same Wi-Fi, http://[your-ip]:8000/) — or use Chrome DevTools device emulation.

For each viewport (iPhone SE 375px, iPad 768px, Desktop 1280px):
- Home page: navbar shows "Pedir cita" pill on desktop, hidden on mobile (collapsed in hamburger menu) + FAB visible at bottom-right; clicking either goes to the cita page.
- Cita page: layout switches correctly (1 col → 2 col); motivo cards usable with thumb on mobile (≥44px); slot buttons readable; form inputs don't trigger zoom on iOS (16px font).
- EU and FR cita pages: language switcher works; FAB label changes per language.

- [ ] **Step 2: Accessibility quick check**

On the cita page, run Lighthouse in Chrome DevTools (Accessibility category) on the cita page. Expected: score ≥ 95. Tab through the form with the keyboard only — every interactive element (motivo, slots, inputs, submit) is focusable in order, with a visible focus ring.

- [ ] **Step 3: Reduced motion check**

In OS settings, enable "Reduce motion" (macOS: System Settings → Accessibility → Display; Windows: Settings → Accessibility → Visual effects). Reload the cita page; pick a date. Expected: the slots appear immediately, no fade-in/slide-in animation, no spinner pulsing on submit.

- [ ] **Step 4: Verify no console errors anywhere**

Open DevTools Console on each of: home (ES, EU, FR), cita (ES, EU, FR), one collection subpage. Expected: no errors. (Warnings about preload links unused are acceptable.)

- [ ] **Step 5: Commit nothing — verification only**

If anything fails, return to the relevant earlier task and fix.

---

## Self-Review Notes

**Spec coverage check:**
- Section 2 (rutas) → Tasks 2–3, 6, 7 ✓
- Section 3 (estructura visual) → Tasks 1, 2 ✓
- Section 4 (responsive) → Task 1 (CSS) + Task 2 (markup) ✓
- Section 5 (accesibilidad) → Task 2 (markup with `fieldset`/`legend`/`aria-*`) + Task 4 (`aria-invalid`) ✓
- Section 6 (microinteracciones) → Task 4 (slot reveal + submit states) ✓
- Section 7 (arquitectura técnica) → Task 4 (frontend) + Task 8 (backend) ✓
- Section 8 (SEO) → Task 2 (JSON-LD + canonical + hreflang) + Task 7 (sitemap) ✓
- Section 9 (archivos afectados) → covered across all tasks ✓
- Section 10 (configuración usuario) → Task 8 README ✓
- FAB on every page → Task 5 ✓

**Type/name consistency:** form id `citaForm`, fields `motivo|fecha|hora|nombre|apellidos|telefono|email|observaciones|rgpd|website|lang` consistent between Task 4 (JS) and Task 8 (Apps Script). Slot containers `citaSlotsMorning`, `citaSlotsAfternoon`, hidden input `citaHoraHidden`, wrap `citaSlotsWrap` consistent between Task 2 (HTML) and Task 4 (JS). Submit button id `citaSubmit` consistent between Task 2 and Task 4. Form msg `citaFormMsg` consistent.

**No placeholders:** every step contains the exact code or exact instruction needed.
