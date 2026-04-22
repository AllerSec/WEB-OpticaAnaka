/* ══════════════════════════════════════════════════
   ÓPTICA ANAKA — Main JavaScript
   GSAP 3 + ScrollTrigger Animations
   Copyright © 2026 Unax Aller
══════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  document.documentElement.classList.add('js-loaded');
  gsap.registerPlugin(ScrollTrigger);
  gsap.defaults({ ease: 'power2.out', duration: 0.7 });

  // Idioma detectado para strings del formulario
  window.__lang = (document.documentElement.lang || 'es').slice(0,2);

  initNav();
  initScrollProgress();
  initCursor();
  initPageAnimations();
  initCookieBanner();
  initSpaRouter();
});

/* Track GSAP ticker callbacks added by page animations so we can clean them up */
let _pageTickerCallbacks = [];

function addPageTicker(fn) {
  _pageTickerCallbacks.push(fn);
  gsap.ticker.add(fn);
}

function cleanupPageTickers() {
  _pageTickerCallbacks.forEach(fn => gsap.ticker.remove(fn));
  _pageTickerCallbacks = [];
}

/* ── Init all page-content animations (re-run on SPA navigate) ── */
function initPageAnimations() {
  initReveal();
  initHero();
  initBrandsCarousel();
  initHighlightAnim();
  initCounters();
  initGallery();
  initLightbox();
  initMicroInteractions();
  initCompromisoParallax();
  init404();
  // Re-apply nav scrolled state for inner pages without hero
  const header = document.querySelector('.site-header');
  if (header) {
    if (!document.querySelector('.hero')) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  }
}

/* ── Navigation ── */
function initNav() {
  const header = document.querySelector('.site-header');
  const toggle = document.getElementById('navToggle');
  const links  = document.getElementById('navLinks');
  if (!header) return;

  // On pages without a dark hero, nav must always be opaque from load
  if (!document.querySelector('.hero')) {
    header.classList.add('scrolled');
  } else {
    ScrollTrigger.create({
      start: '80px top',
      onEnter: () => header.classList.add('scrolled'),
      onLeaveBack: () => header.classList.remove('scrolled'),
    });
  }

  if (toggle && links) {
    toggle.addEventListener('click', () => {
      const currentLabel = toggle.getAttribute('aria-label') || 'Abrir menú';
      if (!toggle.dataset.labelOpen) toggle.dataset.labelOpen = currentLabel;
      const open = links.classList.toggle('open');
      toggle.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open
        ? (toggle.dataset.labelClose || (currentLabel.includes('ireki') ? 'Menua itxi' : currentLabel.includes('ouvrir') ? 'Fermer le menu' : 'Cerrar menú'))
        : (toggle.dataset.labelOpen));
      document.body.style.overflow = open ? 'hidden' : '';
    });
    document.addEventListener('click', e => {
      if (!header.contains(e.target) && links.classList.contains('open')) {
        links.classList.remove('open');
        toggle.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      }
    });
    links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      links.classList.remove('open');
      toggle.classList.remove('open');
      document.body.style.overflow = '';
    }));
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && links.classList.contains('open')) {
        links.classList.remove('open');
        toggle.classList.remove('open');
        toggle.setAttribute('aria-expanded','false');
        toggle.setAttribute('aria-label', toggle.dataset.labelOpen || 'Abrir menú');
        document.body.style.overflow = '';
        toggle.focus();
      }
    });
  }

  // Nav entrance
  gsap.from('.site-header', { autoAlpha: 0, y: -16, duration: 0.65, delay: 0.1 });
}

/* ── Scroll Progress ── */
function initScrollProgress() {
  const bar = document.querySelector('.scroll-progress');
  if (!bar) return;
  // Animar transform (compositor-only) en vez de width (fuerza layout + paint)
  const setScale = gsap.quickSetter(bar, 'scaleX');
  ScrollTrigger.create({
    start: 'top top', end: 'bottom bottom',
    onUpdate: s => setScale(s.progress),
  });
}

/* ── Custom Cursor ── */
function initCursor() {
  if (window.matchMedia('(pointer: coarse)').matches) return;
  // Reuse existing elements on SPA re-init so we don't leak nodes
  let dot  = document.querySelector('.cursor');
  let ring = document.querySelector('.cursor-ring');
  if (!dot)  { dot  = Object.assign(document.createElement('div'), { className: 'cursor' });      document.body.appendChild(dot); }
  if (!ring) { ring = Object.assign(document.createElement('div'), { className: 'cursor-ring' }); document.body.appendChild(ring); }
  if (initCursor.__tickerBound) {
    // On SPA re-init, skip re-adding the ticker handler — it's already running
    return rebindCursorTargets();
  }
  initCursor.__tickerBound = true;

  let mx = 0, my = 0, rx = 0, ry = 0;
  document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });
  gsap.ticker.add(() => {
    gsap.set(dot, { x: mx, y: my });
    rx += (mx - rx) * 0.13;
    ry += (my - ry) * 0.13;
    gsap.set(ring, { x: rx, y: ry });
  });

  document.querySelectorAll('a, button, .gallery-item, .collection-card, .btn, .service-card').forEach(el => {
    if (el.__cursorBound) return;
    el.__cursorBound = true;
    el.addEventListener('mouseenter', () => { gsap.to(ring, { scale: 2.2, duration: 0.3 }); gsap.to(dot, { scale: 0.3, duration: 0.3 }); });
    el.addEventListener('mouseleave', () => { gsap.to(ring, { scale: 1, duration: 0.3 }); gsap.to(dot, { scale: 1, duration: 0.3 }); });
  });
}

/* ── Scroll Reveal ── */
function initReveal() {
  const vh = window.innerHeight;

  function revealEl(el, fromVars, toVars) {
    const top = el.getBoundingClientRect().top;
    if (top < vh * 0.98) {
      // Already visible at load — animate directly without waiting for scroll
      gsap.fromTo(el, fromVars, { ...toVars, scrollTrigger: undefined, delay: (toVars.delay || 0) + 0.05 });
    } else {
      gsap.fromTo(el, fromVars, toVars);
    }
  }

  gsap.utils.toArray('.reveal').forEach(el => {
    revealEl(el,
      { autoAlpha: 0, y: 38 },
      { autoAlpha: 1, y: 0, duration: 0.9,
        scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none none' } }
    );
  });

  document.querySelectorAll('[data-stagger]').forEach(wrap => {
    const items = [...wrap.children];
    const top   = wrap.getBoundingClientRect().top;
    if (top < vh * 0.98) {
      gsap.fromTo(items, { autoAlpha: 0, y: 32 }, { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.1, delay: 0.1 });
    } else {
      gsap.fromTo(items, { autoAlpha: 0, y: 32 }, { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.1,
        scrollTrigger: { trigger: wrap, start: 'top 86%', toggleActions: 'play none none none' } });
    }
  });

  document.querySelectorAll('.section-title').forEach(el => {
    revealEl(el,
      { autoAlpha: 0, y: 22 },
      { autoAlpha: 1, y: 0, duration: 0.8,
        scrollTrigger: { trigger: el, start: 'top 90%', toggleActions: 'play none none none' } }
    );
  });
}

/* ── Hero ── */
function initHero() {
  const hero = document.querySelector('.hero');
  if (!hero) return;

  // Asegurar que todo el contenido clave del hero sea visible desde el inicio
  // por si falla el timeline de GSAP o hay un error en una animación previa.
  gsap.set('.hero h1, .hero-desc, .hero-eyebrow, .hero-logo-wrap img, .hero-btns > *, .hero-scroll-indicator',
    { autoAlpha: 1, x: 0, y: 0, scale: 1, clearProps: 'visibility' });

  const tl = gsap.timeline({ delay: 0.25 });
  const eyebrow = document.querySelector('.hero-eyebrow');
  const scrollInd = document.querySelector('.hero-scroll-indicator');
  if (eyebrow) tl.from('.hero-eyebrow', { autoAlpha: 0, x: -22, duration: 0.7 });
  tl.from('.hero h1',      { autoAlpha: 0, y: 38, duration: 0.9 }, eyebrow ? '-=0.45' : 0)
    .from('.hero-desc',    { autoAlpha: 0, y: 22, duration: 0.7 }, '-=0.5')
    .from('.hero-logo-wrap img', { autoAlpha: 0, x: 40, scale: 0.88, duration: 1.0, ease: 'power3.out' }, '-=0.5');
  if (scrollInd) tl.from('.hero-scroll-indicator', { autoAlpha: 0, duration: 0.5 }, '-=0.2');

  // Botones animados por separado para garantizar visibilidad
  gsap.fromTo('.hero-btns > *',
    { autoAlpha: 0, y: 16 },
    { autoAlpha: 1, y: 0, stagger: 0.12, duration: 0.6, delay: 1.1, ease: 'power2.out' }
  );

  // Mouse parallax (throttled via ticker)
  if (!window.matchMedia('(pointer: coarse)').matches) {
    const orbs = hero.querySelectorAll('.hero-orb');
    let hx = 0, hy = 0;
    hero.addEventListener('mousemove', e => {
      const r = hero.getBoundingClientRect();
      hx = (e.clientX - r.left) / r.width  - 0.5;
      hy = (e.clientY - r.top)  / r.height - 0.5;
    });
    addPageTicker(() => {
      if (orbs[0]) gsap.to(orbs[0], { x: hx * 45, y: hy * 28, duration: 1.4, ease: 'power1.out', overwrite: 'auto' });
      if (orbs[1]) gsap.to(orbs[1], { x: hx * -28, y: hy * -18, duration: 1.6, ease: 'power1.out', overwrite: 'auto' });
    });
  }

  // Hero content parallax
  gsap.to('.hero-content', {
    y: 60, scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: 1 }
  });

  // Logo parallax — ligeramente más lento que el texto para efecto de profundidad
  gsap.to('.hero-logo-wrap', {
    y: 45, scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: 1.2 }
  });
}

/* ── Brands Carousel — infinite, any screen width ── */
function initBrandsCarousel() {
  const track = document.querySelector('.brands-track');
  if (!track) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // 1. Keep only the original 8 tiles, remove HTML duplicates
  const allTiles  = [...track.children];
  const origCount = allTiles.length / 2;          // HTML tiene 2 copias
  const origTiles = allTiles.slice(0, origCount);
  allTiles.slice(origCount).forEach(t => t.remove());

  // 2. Clona hasta que el track tenga > 3× el ancho de ventana
  //    garantiza que nunca se vea el final en ninguna pantalla
  const fill = () => {
    while (track.scrollWidth < window.innerWidth * 3) {
      origTiles.forEach(t => track.appendChild(t.cloneNode(true)));
    }
    // Una copia extra de seguridad
    origTiles.forEach(t => track.appendChild(t.cloneNode(true)));
  };
  fill();
  window.addEventListener('resize', () => { fill(); });

  // 3. Ancho de un set original (px) — usado como unidad de loop
  const setW = origTiles.reduce((sum, t) => {
    const s = getComputedStyle(t);
    return sum + t.offsetWidth + parseFloat(s.marginRight || 0);
  }, 0);

  // 4. GSAP scroll continuo: mueve X de 0 a -setW en bucle
  //    modifiers wrappea el valor para que nunca baje de -setW
  let xCurrent = 0;
  const speed = 40;   // px/s — dt viene en ms, se convierte a s dividiendo /1000

  addPageTicker((_, dt) => {
    xCurrent -= speed * (dt / 1000);
    // wrap: cuando hemos avanzado un set entero, volvemos 0 sin salto visual
    if (xCurrent <= -setW) xCurrent += setW;
    gsap.set(track, { x: xCurrent });
  });
}

/* ── Keyword highlight on load ── */
function initHighlightAnim() {
  const els = gsap.utils.toArray('.hl');
  if (!els.length) return;

  els.forEach((el, i) => {
    gsap.to(el, {
      backgroundSize: '100% 100%',
      duration: 0.55,
      delay: 1.0 + i * 0.18,
      ease: 'power2.inOut',
      onStart() { el.classList.add('hl--lit'); }
    });
  });
}

/* ── Counters ── */
function initCounters() {
  document.querySelectorAll('[data-count]').forEach(el => {
    const end    = parseFloat(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    const prefix = el.dataset.prefix || '';
    const dec    = String(end).includes('.') ? 1 : 0;
    let started  = false;

    ScrollTrigger.create({
      trigger: el, start: 'top 85%', once: true,
      onEnter: () => {
        if (started) return; started = true;
        const obj = { val: 0 };
        gsap.to(obj, {
          val: end, duration: 2.2, ease: 'power2.out',
          onUpdate() { el.textContent = prefix + obj.val.toFixed(dec) + suffix; }
        });
      }
    });
  });
}

/* ── Gallery hover ── */
function initGallery() {
  document.querySelectorAll('.gallery-item').forEach(item => {
    if (!item.hasAttribute('role')) item.setAttribute('role','button');
    if (!item.hasAttribute('tabindex')) item.setAttribute('tabindex','0');
    const img = item.querySelector('img');
    if (img) {
      item.addEventListener('mouseenter', () => gsap.to(img, { scale: 1.09, duration: 0.5 }));
      item.addEventListener('mouseleave', () => gsap.to(img, { scale: 1,    duration: 0.5 }));
    }
    item.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); item.click(); }
    });
  });
}

/* ── Lightbox ── */
let _lbImgs = [], _lbIdx = 0;

window.initLightboxImgs = function(imgs) { _lbImgs = imgs; };

function initLightbox() {
  const box = document.getElementById('lightbox');
  if (!box) return;

  // Collect from gallery items
  const items = document.querySelectorAll('.gallery-item[data-src]');
  if (items.length) {
    _lbImgs = [...items].map(i => i.dataset.src);
    items.forEach((item, i) => item.addEventListener('click', () => openLB(i)));
  }

  box.querySelector('.lb-close')?.addEventListener('click', closeLB);
  box.querySelector('.lb-prev')?.addEventListener('click', () => moveLB(-1));
  box.querySelector('.lb-next')?.addEventListener('click', () => moveLB(1));
  box.addEventListener('click', e => { if (e.target === box) closeLB(); });
  document.addEventListener('keydown', e => {
    if (!box.classList.contains('open')) return;
    if (e.key === 'Escape') closeLB();
    if (e.key === 'ArrowRight') moveLB(1);
    if (e.key === 'ArrowLeft') moveLB(-1);
  });

  // Touch swipe
  let tx = 0;
  box.addEventListener('touchstart', e => { tx = e.touches[0].clientX; }, { passive: true });
  box.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - tx;
    if (Math.abs(dx) > 50) moveLB(dx < 0 ? 1 : -1);
  });
}

let _lbLastFocus = null;
function openLB(i) {
  _lbIdx = i;
  _lbLastFocus = document.activeElement;
  const img = document.getElementById('lightboxImg');
  const cnt = document.getElementById('lbCounter');
  const box = document.getElementById('lightbox');
  img.src = _lbImgs[i];
  if (cnt) cnt.textContent = (i + 1) + ' / ' + _lbImgs.length;
  box.classList.add('open');
  box.setAttribute('aria-hidden','false');
  document.body.style.overflow = 'hidden';
  gsap.fromTo(img, { scale: 0.85, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.38, ease: 'back.out(1.5)' });
  // Mover foco al botón de cerrar
  box.querySelector('.lb-close')?.focus();
}

function closeLB() {
  const img = document.getElementById('lightboxImg');
  const box = document.getElementById('lightbox');
  gsap.to(img, { scale: 0.88, autoAlpha: 0, duration: 0.24, onComplete: () => {
    box.classList.remove('open');
    box.setAttribute('aria-hidden','true');
    document.body.style.overflow = '';
    if (_lbLastFocus && typeof _lbLastFocus.focus === 'function') _lbLastFocus.focus();
  }});
}

function moveLB(dir) {
  _lbIdx = (_lbIdx + dir + _lbImgs.length) % _lbImgs.length;
  const img = document.getElementById('lightboxImg');
  const cnt = document.getElementById('lbCounter');
  gsap.to(img, { x: dir > 0 ? -28 : 28, autoAlpha: 0, duration: 0.18, onComplete: () => {
    img.src = _lbImgs[_lbIdx];
    if (cnt) cnt.textContent = (_lbIdx + 1) + ' / ' + _lbImgs.length;
    gsap.fromTo(img, { x: dir > 0 ? 28 : -28, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.22 });
  }});
}

/* ── Cookie Banner ── */
function initCookieBanner() {
  const banner = document.querySelector('.cookie-banner');
  if (!banner || localStorage.getItem('anaka-cookies')) return;
  banner.setAttribute('aria-modal','false'); // No bloquea
  setTimeout(() => {
    banner.classList.add('show');
    banner.querySelector('.cookie-accept')?.focus({ preventScroll: true });
  }, 2000);
  const dismiss = (v) => {
    localStorage.setItem('anaka-cookies', v);
    gsap.to(banner, { y: '130%', duration: 0.4, ease: 'power2.in', onComplete: () => banner.remove() });
  };
  banner.querySelector('.cookie-accept')?.addEventListener('click', () => dismiss('1'));
  banner.querySelector('.cookie-decline')?.addEventListener('click', () => dismiss('0'));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && banner.isConnected && banner.classList.contains('show')) dismiss('0');
  });
}

/* ── Microinteractions ── */
function initMicroInteractions() {
  // Ripple on buttons
  document.querySelectorAll('.btn, .btn-submit, .btn-ghost').forEach(btn => {
    btn.addEventListener('click', function(e) {
      const r = this.getBoundingClientRect();
      const rip = document.createElement('span');
      Object.assign(rip.style, {
        position: 'absolute', width: '4px', height: '4px', borderRadius: '50%',
        background: 'rgba(255,255,255,0.45)', pointerEvents: 'none',
        left: (e.clientX - r.left) + 'px', top: (e.clientY - r.top) + 'px',
        transform: 'translate(-50%,-50%)',
      });
      this.style.position = 'relative'; this.style.overflow = 'hidden';
      this.appendChild(rip);
      gsap.to(rip, { scale: 130, autoAlpha: 0, duration: 0.65, ease: 'power2.out', onComplete: () => rip.remove() });
    });
  });

  // Form focus micro-animation
  document.querySelectorAll('.form-group input, .form-group textarea').forEach(el => {
    el.addEventListener('focus', () => gsap.to(el, { scale: 1.004, duration: 0.2 }));
    el.addEventListener('blur',  () => gsap.to(el, { scale: 1, duration: 0.2 }));
  });

  // Contact form
  const form = document.getElementById('contactForm');
  if (form) form.addEventListener('submit', handleForm);
}

async function handleForm(e) {
  e.preventDefault();
  const form = e.target;
  const btn = document.getElementById('submitBtn');
  const msg = document.getElementById('formMsg');
  const lang = (window.__lang || 'es');
  const i18n = {
    es:{sending:'Enviando…',send:'Enviar mensaje',ok:'Mensaje enviado correctamente. Nos pondremos en contacto contigo pronto.',ko:'Error al enviar. Por favor, llámanos al 943 24 84 90.',required:'Este campo es obligatorio.'},
    eu:{sending:'Bidaltzen…',send:'Mezua bidali',ok:'Mezua behar bezala bidali da. Laster harremanetan jarriko gara zurekin.',ko:'Errorea bidaltzean. Mesedez, deitu 943 24 84 90 zenbakira.',required:'Eremu hau beharrezkoa da.'},
    fr:{sending:'Envoi…',send:'Envoyer le message',ok:'Message envoyé correctement. Nous vous contacterons prochainement.',ko:'Erreur d’envoi. Merci de nous appeler au +34 943 24 84 90.',required:'Ce champ est obligatoire.'}
  }[lang] || {sending:'Sending…',send:'Send',ok:'Message sent.',ko:'Error.',required:'Required.'};

  // Validación nativa
  const required = form.querySelectorAll('[required]');
  let firstInvalid = null;
  required.forEach(el => {
    const ok = el.type === 'checkbox' ? el.checked : !!el.value.trim();
    if (!ok) { el.setAttribute('aria-invalid','true'); if (!firstInvalid) firstInvalid = el; }
    else el.removeAttribute('aria-invalid');
  });
  if (firstInvalid) {
    msg.className = 'form-msg error'; msg.textContent = i18n.required; msg.style.display = 'block';
    firstInvalid.focus();
    return;
  }

  const FORM_ENDPOINT = 'https://script.google.com/macros/s/AKfycbwEPaoKU95uNRT_CT2MKLvs6uiSnQOTc97PSB4VzdWeLihMrUcTraxfvMFTuLo-_lCxSA/exec';
  const data = {
    nombre:    document.getElementById('nombre')?.value.trim(),
    apellidos: document.getElementById('apellidos')?.value.trim(),
    email:     document.getElementById('email')?.value.trim(),
    telefono:  document.getElementById('telefono')?.value.trim(),
    mensaje:   document.getElementById('mensaje')?.value.trim(),
  };
  if (btn) { btn.disabled = true; btn.textContent = i18n.sending; }
  try {
    await fetch(FORM_ENDPOINT, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(data) });
    msg.className = 'form-msg success'; msg.textContent = i18n.ok;
    msg.style.display = 'block'; form.reset();
    gsap.from(msg, { autoAlpha: 0, y: 8, duration: 0.4 });
    msg.focus?.();
  } catch {
    msg.className = 'form-msg error'; msg.textContent = i18n.ko;
    msg.style.display = 'block';
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = i18n.send; }
  }
}

/* ── 404 Animation ── */
function init404() {
  const num = document.querySelector('.big-404');
  if (!num) return;
  gsap.timeline()
    .from('.big-404', { autoAlpha: 0, scale: 0.7, duration: 0.8, ease: 'back.out(1.7)' })
    .from('.page-404-inner h1, .page-404-inner p, .page-404-inner .btn', { autoAlpha: 0, y: 20, stagger: 0.15, duration: 0.6 }, '-=0.4');
}

/* ── Compromiso — parallax photo background + pausa fuera de viewport ──
   Dos optimizaciones de FPS:
   1) scrub 0.8 en vez de true: menos actualizaciones durante el scroll.
   2) IntersectionObserver pausa el video cuando no está visible; el decoder
      deja de trabajar y el scroll en el resto de la página es más fluido. */
function initCompromisoParallax() {
  const photo = document.querySelector('.compromiso-photo');
  if (!photo) return;

  // Pausar/reanudar el video según visibilidad
  if ('IntersectionObserver' in window && photo.tagName === 'VIDEO') {
    const io = new IntersectionObserver(entries => {
      for (const e of entries) {
        if (e.isIntersecting) photo.play?.().catch(() => {});
        else photo.pause?.();
      }
    }, { rootMargin: '100px' });
    io.observe(photo);
  }

  if (window.matchMedia('(hover: none) and (pointer: coarse)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  gsap.fromTo(photo,
    { yPercent: -6 },
    {
      yPercent: 6,
      ease: 'none',
      scrollTrigger: {
        trigger: '.compromiso-scene',
        start: 'top bottom',
        end: 'bottom top',
        scrub: 0.8,
      }
    }
  );
}

/* ══════════════════════════════════════════════════
   SPA ROUTER — Prefetch & Instant Navigation
   Caches all internal pages on first load, then
   swaps <main> content with GSAP transitions.
══════════════════════════════════════════════════ */
const _pageCache = new Map();
let _isNavigating = false;

function initSpaRouter() {
  // Create the transition overlay element
  if (!document.querySelector('.spa-transition-overlay')) {
    const overlay = document.createElement('div');
    overlay.className = 'spa-transition-overlay';
    document.body.appendChild(overlay);
  }

  // Cache the current page
  _pageCache.set(normalizeUrl(location.href), {
    main: document.getElementById('main').innerHTML,
    title: document.title,
    bodyClass: document.body.className,
  });

  // Prefetch internal pages when idle so they don't compete with LCP
  const idle = window.requestIdleCallback || (cb => setTimeout(cb, 1500));
  idle(() => prefetchAllPages(), { timeout: 3000 });

  // Intercept clicks on internal links
  document.addEventListener('click', handleLinkClick);

  // Handle browser back/forward
  window.addEventListener('popstate', () => {
    navigateTo(location.href, false);
  });
}

function normalizeUrl(url) {
  const u = new URL(url, location.origin);
  // Normalize: remove trailing index.html, ensure trailing slash consistency
  let path = u.pathname;
  if (path.endsWith('/index.html')) path = path.slice(0, -10);
  if (!path.endsWith('/') && !path.includes('.')) path += '/';
  return u.origin + path;
}

function isInternalLink(a) {
  if (!a || !a.href) return false;
  if (a.target === '_blank') return false;
  if (a.hasAttribute('download')) return false;
  const href = a.getAttribute('href') || '';
  if (href.startsWith('#') || href.startsWith('tel:') || href.startsWith('mailto:') || href.startsWith('javascript:')) return false;
  try {
    const url = new URL(a.href);
    if (url.origin !== location.origin) return false;
    if (!url.pathname.endsWith('.html') && !url.pathname.endsWith('/')) return false;
  } catch { return false; }
  return true;
}

function prefetchAllPages() {
  // Collect all unique internal URLs
  const urls = new Set();
  document.querySelectorAll('a[href]').forEach(a => {
    if (isInternalLink(a)) {
      urls.add(normalizeUrl(a.href));
    }
  });

  // Remove already-cached URLs
  urls.delete(normalizeUrl(location.href));

  // Fetch all pages in the background with low priority
  urls.forEach(url => {
    if (_pageCache.has(url)) return;
    // Use a small delay stagger so we don't flood the network
    fetchAndCache(url);
  });
}

function resolveRelativeUrls(doc, baseUrl) {
  const base = baseUrl.substring(0, baseUrl.lastIndexOf('/') + 1);
  // Resolve src attributes (img, video, source)
  doc.querySelectorAll('[src]').forEach(el => {
    const src = el.getAttribute('src');
    if (src && !src.startsWith('http') && !src.startsWith('data:') && !src.startsWith('//')) {
      try { el.setAttribute('src', new URL(src, base).pathname); } catch {}
    }
  });
  // Resolve href attributes on links
  doc.querySelectorAll('a[href]').forEach(el => {
    const href = el.getAttribute('href');
    if (href && !href.startsWith('http') && !href.startsWith('#') && !href.startsWith('tel:') && !href.startsWith('mailto:') && !href.startsWith('javascript:') && !href.startsWith('//')) {
      try { el.setAttribute('href', new URL(href, base).pathname); } catch {}
    }
  });
  // Resolve data-src
  doc.querySelectorAll('[data-src]').forEach(el => {
    const src = el.getAttribute('data-src');
    if (src && !src.startsWith('http') && !src.startsWith('data:')) {
      try { el.setAttribute('data-src', new URL(src, base).pathname); } catch {}
    }
  });
  // Resolve poster attributes on video
  doc.querySelectorAll('[poster]').forEach(el => {
    const poster = el.getAttribute('poster');
    if (poster && !poster.startsWith('http') && !poster.startsWith('data:')) {
      try { el.setAttribute('poster', new URL(poster, base).pathname); } catch {}
    }
  });
}

async function fetchAndCache(url) {
  if (_pageCache.has(url)) return;
  try {
    // Resolve the actual URL to fetch (need full path with index.html)
    let fetchUrl = url;
    if (fetchUrl.endsWith('/')) fetchUrl += 'index.html';

    const resp = await fetch(fetchUrl, { priority: 'low' });
    if (!resp.ok) return;
    const html = await resp.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const main = doc.getElementById('main');
    if (!main) return;

    // Resolve all relative URLs in main content to absolute paths
    resolveRelativeUrls(main, fetchUrl);

    _pageCache.set(url, {
      main: main.innerHTML,
      title: doc.title,
      bodyClass: doc.body.className,
    });
  } catch { /* silently ignore — page will load normally */ }
}

function handleLinkClick(e) {
  // Find the closest <a> tag
  const a = e.target.closest('a');
  if (!a || !isInternalLink(a)) return;
  if (e.ctrlKey || e.metaKey || e.shiftKey) return; // allow new tab

  const targetUrl = normalizeUrl(a.href);
  const currentUrl = normalizeUrl(location.href);
  if (targetUrl === currentUrl) {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  e.preventDefault();
  navigateTo(a.href, true);
}

async function navigateTo(href, pushState) {
  if (_isNavigating) return;
  _isNavigating = true;

  const url = normalizeUrl(href);
  const overlay = document.querySelector('.spa-transition-overlay');

  // If page not cached yet, fetch it now
  if (!_pageCache.has(url)) {
    let fetchUrl = url;
    if (fetchUrl.endsWith('/')) fetchUrl += 'index.html';
    try {
      const resp = await fetch(fetchUrl);
      if (!resp.ok) { _isNavigating = false; location.href = href; return; }
      const html = await resp.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const main = doc.getElementById('main');
      if (!main) { _isNavigating = false; location.href = href; return; }
      resolveRelativeUrls(main, fetchUrl);
      _pageCache.set(url, {
        main: main.innerHTML,
        title: doc.title,
        bodyClass: doc.body.className,
      });
    } catch {
      _isNavigating = false;
      location.href = href;
      return;
    }
  }

  const cached = _pageCache.get(url);

  // Close mobile menu if open
  const navLinks = document.getElementById('navLinks');
  const navToggle = document.getElementById('navToggle');
  if (navLinks && navLinks.classList.contains('open')) {
    navLinks.classList.remove('open');
    if (navToggle) { navToggle.classList.remove('open'); navToggle.setAttribute('aria-expanded', 'false'); }
    document.body.style.overflow = '';
  }

  // ── Transition: fade out ──
  await gsap.to(overlay, { opacity: 1, duration: 0.22, ease: 'power2.in' });

  // ── Kill all ScrollTrigger instances & page ticker callbacks ──
  ScrollTrigger.getAll().forEach(st => st.kill());
  cleanupPageTickers();
  gsap.globalTimeline.clear();

  // ── Swap content ──
  const main = document.getElementById('main');
  main.innerHTML = cached.main;
  document.title = cached.title;
  if (cached.bodyClass) document.body.className = cached.bodyClass;

  // Update URL
  if (pushState) {
    history.pushState({}, cached.title, href);
  }

  // Update active nav link
  updateNavActive(href);

  // Scroll to top instantly
  window.scrollTo(0, 0);

  // A11y: anunciar cambio de página y mover foco
  const newMain = document.getElementById('main');
  const newH1 = newMain.querySelector('h1');
  if (newH1) {
    newH1.setAttribute('tabindex','-1');
    newH1.focus({ preventScroll: true });
  }
  // Live announcement
  let announcer = document.getElementById('spa-announcer');
  if (!announcer) {
    announcer = document.createElement('div');
    announcer.id = 'spa-announcer';
    announcer.className = 'sr-only';
    announcer.setAttribute('aria-live','polite');
    announcer.setAttribute('aria-atomic','true');
    document.body.appendChild(announcer);
  }
  announcer.textContent = cached.title;

  // ── Re-initialize all animations ──
  initScrollProgress();
  initPageAnimations();
  initCookieBanner();

  // Prefetch any new links when idle so they don't compete with the transition
  const _idle = window.requestIdleCallback || (cb => setTimeout(cb, 1500));
  _idle(() => prefetchAllPages(), { timeout: 3000 });

  // Re-bind cursor hover targets
  rebindCursorTargets();

  // ── Transition: fade in ──
  await gsap.to(overlay, { opacity: 0, duration: 0.25, ease: 'power2.out' });

  _isNavigating = false;
}

function updateNavActive(href) {
  const navLinks = document.querySelectorAll('.nav-links a');
  navLinks.forEach(a => {
    if (normalizeUrl(a.href) === normalizeUrl(href)) {
      a.classList.add('active');
      a.setAttribute('aria-current','page');
    } else {
      a.classList.remove('active');
      a.removeAttribute('aria-current');
    }
  });
}

function rebindCursorTargets() {
  if (window.matchMedia('(pointer: coarse)').matches) return;
  const ring = document.querySelector('.cursor-ring');
  const dot = document.querySelector('.cursor');
  if (!ring || !dot) return;
  const enter = () => { gsap.to(ring, { scale: 2.2, duration: 0.3 }); gsap.to(dot, { scale: 0.3, duration: 0.3 }); };
  const leave = () => { gsap.to(ring, { scale: 1, duration: 0.3 }); gsap.to(dot, { scale: 1, duration: 0.3 }); };
  document.querySelectorAll('a, button, .gallery-item, .collection-card, .btn, .service-card').forEach(el => {
    if (el.__cursorBound) return;
    el.__cursorBound = true;
    el.addEventListener('mouseenter', enter);
    el.addEventListener('mouseleave', leave);
  });
}
