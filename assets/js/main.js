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
  initFloatingCitaCTA();
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
  initCitaForm();
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
  const setDotX  = gsap.quickSetter(dot,  'x', 'px');
  const setDotY  = gsap.quickSetter(dot,  'y', 'px');
  const setRingX = gsap.quickSetter(ring, 'x', 'px');
  const setRingY = gsap.quickSetter(ring, 'y', 'px');
  document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });
  gsap.ticker.add(() => {
    setDotX(mx); setDotY(my);
    rx += (mx - rx) * 0.13; ry += (my - ry) * 0.13;
    setRingX(rx); setRingY(ry);
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
    let heroRect = hero.getBoundingClientRect();
    window.addEventListener('resize', () => { heroRect = hero.getBoundingClientRect(); }, { passive: true });
    hero.addEventListener('mousemove', e => {
      hx = (e.clientX - heroRect.left) / heroRect.width  - 0.5;
      hy = (e.clientY - heroRect.top)  / heroRect.height - 0.5;
    }, { passive: true });
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
  let _carouselResizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(_carouselResizeTimer);
    _carouselResizeTimer = setTimeout(() => fill(), 150);
  });

  // 3. Ancho de un set original (px) — usado como unidad de loop
  const setW = origTiles.reduce((sum, t) => {
    const s = getComputedStyle(t);
    return sum + t.offsetWidth + parseFloat(s.marginRight || 0);
  }, 0);

  // 4. GSAP scroll continuo: mueve X de 0 a -setW en bucle
  //    modifiers wrappea el valor para que nunca baje de -setW
  track.style.willChange = 'transform';

  let xCurrent = 0;
  const speed = 40;   // px/s — dt viene en ms, se convierte a s dividiendo /1000
  let _carouselPaused = false;

  addPageTicker((_, dt) => {
    if (_carouselPaused) return;
    xCurrent -= speed * (dt / 1000);
    // wrap: cuando hemos avanzado un set entero, volvemos 0 sin salto visual
    if (xCurrent <= -setW) xCurrent += setW;
    gsap.set(track, { x: xCurrent });
  });

  // Pause on hover/focus (WCAG 2.1 AA 2.2.2 — Pause, Stop, Hide)
  const carousel = track.closest('.brands-carousel');
  if (carousel) {
    carousel.addEventListener('mouseenter', () => { _carouselPaused = true; });
    carousel.addEventListener('mouseleave', () => { _carouselPaused = false; });
    carousel.addEventListener('focusin',    () => { _carouselPaused = true; });
    carousel.addEventListener('focusout',   () => { _carouselPaused = false; });
  }
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
  banner.setAttribute('aria-modal','true');
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

  // Fetch all pages in the background with low priority, batched sequentially
  const urlArr = [...urls].filter(url => !_pageCache.has(url));
  let i = 0;
  const next = () => {
    if (i >= urlArr.length) return;
    fetchAndCache(urlArr[i++]).then(() => setTimeout(next, 200));
  };
  next();
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

/* ── Citas (appointment booking form) ── */
function initCitaForm() {
  const form = document.getElementById('citaForm');
  if (!form) return;
  if (form.dataset.citaInited === '1') return;
  form.dataset.citaInited = '1';

  const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxUM95Wuedd_XKPtLMcYPbmeA38q_I-y_CcT1FEDUxVpHYZzNV0Yk6FY7ArRQCxxR6e/exec';
  const RATE_LIMIT_KEY = 'cita_last_submit_ts';
  const RATE_LIMIT_MS = 60000;
  const MAX_DAYS_AHEAD = 60;

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
      errorNetwork: 'No hemos podido enviar tu solicitud. Llámanos al 943 24 84 90.',
      modalTitle: '¡Tu cita ha sido solicitada!',
      modalSubtitle: 'Te enviaremos una confirmación al correo y te llamaremos para validar tu cita.',
      modalMotivo: 'Motivo',
      modalFecha: 'Fecha',
      modalHora: 'Hora',
      modalCliente: 'Cliente',
      modalFoot: 'Recibirás un correo en breves momentos.',
      modalClose: 'Cerrar',
      motivoLabels: {
        revision: 'Revisión de la vista',
        comprar: 'Comprar gafas / monturas',
        lentillas: 'Lentes de contacto',
        retinografia: 'Retinografía',
        reparacion: 'Reparación o ajuste',
        otro: 'Otro'
      },
      weekdays: ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'],
      months: ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'],
      formatDate: (wd, d, mo, y) => `${wd}, ${d} de ${mo} de ${y}`
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
      errorNetwork: 'Ezin izan dugu zure eskaera bidali. Deitu 943 24 84 90 zenbakira.',
      modalTitle: '¡Zure hitzordua eskatuta dago!',
      modalSubtitle: 'Berrespen bat bidaliko dizugu emailez eta deituko dizugu hitzordua baieztatzeko.',
      modalMotivo: 'Arrazoia',
      modalFecha: 'Data',
      modalHora: 'Ordua',
      modalCliente: 'Bezeroa',
      modalFoot: 'Email bat jasoko duzu une batzuetan.',
      modalClose: 'Itxi',
      motivoLabels: {
        revision: 'Ikusmen-azterketa',
        comprar: 'Betaurrekoak / armazoiak erostea',
        lentillas: 'Kontaktuko lenteak',
        retinografia: 'Erretinografia',
        reparacion: 'Konponketa edo doikuntza',
        otro: 'Bestelakoa'
      },
      weekdays: ['igandea','astelehena','asteartea','asteazkena','osteguna','ostirala','larunbata'],
      months: ['urtarrila','otsaila','martxoa','apirila','maiatza','ekaina','uztaila','abuztua','iraila','urria','azaroa','abendua'],
      formatDate: (wd, d, mo, y) => `${y}ko ${mo}ren ${d}a, ${wd}`
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
      errorNetwork: 'Nous n’avons pas pu envoyer votre demande. Appelez-nous au 943 24 84 90.',
      modalTitle: 'Votre rendez-vous est demandé !',
      modalSubtitle: 'Nous vous enverrons une confirmation par email et nous vous appellerons pour valider.',
      modalMotivo: 'Motif',
      modalFecha: 'Date',
      modalHora: 'Heure',
      modalCliente: 'Client',
      modalFoot: 'Vous recevrez un email d’ici quelques instants.',
      modalClose: 'Fermer',
      motivoLabels: {
        revision: 'Examen de vue',
        comprar: 'Acheter des lunettes',
        lentillas: 'Lentilles de contact',
        retinografia: 'Rétinographie',
        reparacion: 'Réparation ou ajustement',
        otro: 'Autre'
      },
      weekdays: ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'],
      months: ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'],
      formatDate: (wd, d, mo, y) => `${wd} ${d} ${mo} ${y}`
    }
  };

  const MORNING_SLOTS = ['09:30','10:00','10:30','11:00','11:30','12:00','12:30'];
  const AFTERNOON_SLOTS = ['16:30','17:00','17:30','18:00','18:30','19:00'];

  function slotsForDate(dateStr) {
    if (!dateStr) return { morning: [], afternoon: [], closed: true };
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    const dow = dt.getDay();
    if (dow === 0) return { morning: [], afternoon: [], closed: true };
    if (dow === 6) return { morning: MORNING_SLOTS.slice(), afternoon: [], closed: false };
    return { morning: MORNING_SLOTS.slice(), afternoon: AFTERNOON_SLOTS.slice(), closed: false };
  }

  function isValidEmail(s) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(s || '').trim());
  }
  function isValidPhone(s) {
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

  function setError(fieldId, msg) {
    const errEl = document.getElementById(fieldId + '-error');
    const inputEl = document.getElementById('cita-' + fieldId) || document.querySelector('[name="' + fieldId + '"]');
    if (errEl) errEl.textContent = msg || '';
    if (inputEl) {
      if (msg) inputEl.setAttribute('aria-invalid', 'true');
      else inputEl.removeAttribute('aria-invalid');
    }
  }

  function clearAllErrors(f) {
    f.querySelectorAll('.cita-field-error').forEach(el => { el.textContent = ''; });
    f.querySelectorAll('[aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));
  }

  function showFormMsg(state, text) {
    const el = document.getElementById('citaFormMsg');
    if (!el) return;
    el.classList.remove('is-success', 'is-error');
    if (state) el.classList.add('is-' + state);
    el.textContent = text || '';
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

    if (window.gsap && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.fromTo(wrap, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' });
    }
  }

  function isRateLimited() {
    try {
      const last = parseInt(localStorage.getItem(RATE_LIMIT_KEY) || '0', 10);
      return Date.now() - last < RATE_LIMIT_MS;
    } catch (e) { return false; }
  }
  function markSubmitted() {
    try { localStorage.setItem(RATE_LIMIT_KEY, String(Date.now())); } catch (e) {}
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const f = e.currentTarget;
    const lang = f.dataset.lang || 'es';
    const t = I18N[lang] || I18N.es;
    clearAllErrors(f);
    showFormMsg(null, '');

    const fd = new FormData(f);
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
      website: (fd.get('website') || '').toString(),
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

    if (data.website) {
      markSubmitted();
      showFormMsg('success', t.success);
      f.reset();
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
      markSubmitted();
      openSuccessModal(data, t);
      f.reset();
      submitBtn.dataset.state = '';
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

  function formatHumanDate(dateStr, t) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    return t.formatDate(t.weekdays[dt.getDay()], d, t.months[m - 1], y);
  }

  function openSuccessModal(data, t) {
    closeSuccessModal();

    const fullName = (data.nombre + ' ' + data.apellidos).trim();
    const motivoLabel = (t.motivoLabels && t.motivoLabels[data.motivo]) || data.motivo;
    const fechaLabel = formatHumanDate(data.fecha, t);

    const overlay = document.createElement('div');
    overlay.className = 'cita-success-modal';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'citaSuccessTitle');
    overlay.innerHTML = `
      <div class="cita-success-card" role="document">
        <button type="button" class="cita-success-close" aria-label="${t.modalClose}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <div class="cita-success-check" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <path class="check-path" d="M5 12.5l4.5 4.5L19 7.5"/>
          </svg>
        </div>
        <h2 class="cita-success-title" id="citaSuccessTitle">${t.modalTitle}</h2>
        <p class="cita-success-subtitle">${t.modalSubtitle}</p>
        <dl class="cita-success-summary">
          <dt>${t.modalCliente}</dt><dd>${escapeHtml(fullName)}</dd>
          <dt>${t.modalMotivo}</dt><dd>${escapeHtml(motivoLabel)}</dd>
          <dt>${t.modalFecha}</dt><dd>${escapeHtml(fechaLabel)}</dd>
          <dt>${t.modalHora}</dt><dd>${escapeHtml(data.hora)}</dd>
        </dl>
        <p class="cita-success-foot">${t.modalFoot}</p>
        <div class="cita-success-actions">
          <button type="button" class="btn btn-primary cita-success-ok">${t.modalClose}</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    const card = overlay.querySelector('.cita-success-card');
    const checkPath = overlay.querySelector('.check-path');
    const closeBtn = overlay.querySelector('.cita-success-close');
    const okBtn = overlay.querySelector('.cita-success-ok');

    closeBtn.addEventListener('click', closeSuccessModal);
    okBtn.addEventListener('click', closeSuccessModal);
    overlay.addEventListener('click', (ev) => { if (ev.target === overlay) closeSuccessModal(); });
    document.addEventListener('keydown', escClose);

    document.body.style.overflow = 'hidden';
    overlay.classList.add('is-open');

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (window.gsap && !reduce) {
      gsap.fromTo(overlay, { backgroundColor: 'rgba(26,14,5,0)' }, { backgroundColor: 'rgba(26,14,5,0.55)', duration: 0.35, ease: 'power2.out' });
      gsap.fromTo(card, { opacity: 0, scale: 0.88, y: 16 }, { opacity: 1, scale: 1, y: 0, duration: 0.55, ease: 'back.out(1.6)', delay: 0.05 });
      gsap.to(checkPath, { strokeDashoffset: 0, duration: 0.5, ease: 'power2.out', delay: 0.35 });
    } else {
      overlay.style.backgroundColor = 'rgba(26,14,5,0.55)';
      card.style.opacity = '1';
      card.style.transform = 'none';
      if (checkPath) checkPath.style.strokeDashoffset = '0';
    }

    setTimeout(() => okBtn.focus(), 60);
  }

  function closeSuccessModal() {
    const overlay = document.querySelector('.cita-success-modal');
    if (!overlay) return;
    document.removeEventListener('keydown', escClose);
    document.body.style.overflow = '';

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const remove = () => overlay.remove();
    if (window.gsap && !reduce) {
      gsap.to(overlay, { opacity: 0, duration: 0.25, ease: 'power2.in', onComplete: remove });
    } else {
      remove();
    }
  }

  function escClose(ev) { if (ev.key === 'Escape') closeSuccessModal(); }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

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

  form.querySelectorAll('input[name="motivo"]').forEach(r => {
    r.addEventListener('change', () => setError('motivo', ''));
  });

  form.addEventListener('submit', handleSubmit);
}
