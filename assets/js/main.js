/* ══════════════════════════════════════════════════
   ÓPTICA ANAKA — Main JavaScript
   GSAP 3 + ScrollTrigger Animations
   Copyright © 2026 Unax Aller
══════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  gsap.registerPlugin(ScrollTrigger);
  gsap.defaults({ ease: 'power2.out', duration: 0.7 });

  initNav();
  initScrollProgress();
  initCursor();
  initReveal();
  initHero();
  initBrandsCarousel();
  initGlassesAnim();
  initHighlightAnim();
  initCounters();
  initGallery();
  initLightbox();
  initCookieBanner();
  initMicroInteractions();
});

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
      const open = links.classList.toggle('open');
      toggle.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', String(open));
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
  }

  // Nav entrance
  gsap.from('.site-header', { autoAlpha: 0, y: -16, duration: 0.65, delay: 0.1 });
}

/* ── Scroll Progress ── */
function initScrollProgress() {
  const bar = document.querySelector('.scroll-progress');
  if (!bar) return;
  ScrollTrigger.create({
    start: 'top top', end: 'bottom bottom',
    onUpdate: s => { bar.style.width = (s.progress * 100) + '%'; },
  });
}

/* ── Custom Cursor ── */
function initCursor() {
  if (window.matchMedia('(pointer: coarse)').matches) return;
  const dot  = Object.assign(document.createElement('div'), { className: 'cursor' });
  const ring = Object.assign(document.createElement('div'), { className: 'cursor-ring' });
  document.body.append(dot, ring);

  let mx = 0, my = 0, rx = 0, ry = 0;
  document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });
  gsap.ticker.add(() => {
    gsap.set(dot, { x: mx, y: my });
    rx += (mx - rx) * 0.13;
    ry += (my - ry) * 0.13;
    gsap.set(ring, { x: rx, y: ry });
  });

  document.querySelectorAll('a, button, .gallery-item, .collection-card, .btn, .service-card').forEach(el => {
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

  // Asegurar botones visibles desde el inicio por si falla el timeline
  gsap.set('.hero-btns > *', { autoAlpha: 1, y: 0 });

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

  // Mouse parallax
  if (!window.matchMedia('(pointer: coarse)').matches) {
    const orbs = hero.querySelectorAll('.hero-orb');
    hero.addEventListener('mousemove', e => {
      const r = hero.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width  - 0.5;
      const y = (e.clientY - r.top)  / r.height - 0.5;
      if (orbs[0]) gsap.to(orbs[0], { x: x * 45, y: y * 28, duration: 1.4, ease: 'power1.out' });
      if (orbs[1]) gsap.to(orbs[1], { x: x * -28, y: y * -18, duration: 1.6, ease: 'power1.out' });
    });
  }

  // Parallax on scroll
  const lens = hero.querySelector('.hero-lens-deco');
  if (lens) {
    gsap.to(lens, {
      y: 100, scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: 1.5 }
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

  gsap.ticker.add((_, dt) => {
    xCurrent -= speed * (dt / 1000);
    // wrap: cuando hemos avanzado un set entero, volvemos 0 sin salto visual
    if (xCurrent <= -setW) xCurrent += setW;
    gsap.set(track, { x: xCurrent });
  });
}

/* ── Hero glasses — DOM SVGs animados con GSAP ── */
function initGlassesAnim() {
  const frames = gsap.utils.toArray('.hf');
  if (!frames.length) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Config por elemento: parallax depth, float, rotación, opacidad final
  const CFG = [
    { depth:.40, fAmp:20, fSpd:0.38, ph:0.0, rMax: 6, rSpd:.0006, entryX:-80, entryY:  0, delay:.20 },
    { depth:1.10, fAmp:26, fSpd:0.32, ph:1.2, rMax:-8, rSpd:.0005, entryX: 80, entryY:  0, delay:.45 },
    { depth:.60, fAmp:18, fSpd:0.44, ph:2.4, rMax: 5, rSpd:.0007, entryX: 60, entryY:-40, delay:.70 },
    { depth:.90, fAmp:22, fSpd:0.30, ph:0.8, rMax:-6, rSpd:.0006, entryX:-60, entryY: 40, delay:.10 },
    { depth:.50, fAmp:16, fSpd:0.50, ph:3.5, rMax: 7, rSpd:.0008, entryX:  0, entryY: 60, delay:.90 },
    { depth:.75, fAmp:20, fSpd:0.40, ph:1.8, rMax:-5, rSpd:.0005, entryX:  0, entryY:-50, delay:.55 },
    { depth:.25, fAmp:12, fSpd:0.25, ph:4.8, rMax: 4, rSpd:.0004, entryX:-40, entryY: 20, delay:1.1 },
  ];

  // Estado de rotación acumulada por elemento
  const ROT = CFG.map(c => ({ z: (Math.random() - .5) * c.rMax }));

  // Mouse parallax target (normalizado -0.5 a 0.5)
  let mx = 0, my = 0;
  if (!window.matchMedia('(pointer: coarse)').matches) {
    document.addEventListener('mousemove', e => {
      mx = e.clientX / window.innerWidth  - .5;
      my = e.clientY / window.innerHeight - .5;
    });
  }

  // ── Entrada dramática: cada gafa vuela desde un borde distinto
  frames.forEach((el, i) => {
    const c = CFG[i] || CFG[0];
    gsap.fromTo(el,
      { autoAlpha: 0, x: c.entryX, y: c.entryY, scale: .7, rotation: c.rMax * 2.5 },
      { autoAlpha: 1, x: 0, y: 0, scale: 1, rotation: 0,
        duration: 1.6, delay: c.delay, ease: 'power3.out' }
    );
  });

  if (reduced) return;

  // ── Float continuo con GSAP timeline repeat
  frames.forEach((el, i) => {
    const c  = CFG[i] || CFG[0];
    const tl = gsap.timeline({ repeat: -1, yoyo: true, delay: c.delay + 1.6 });
    tl.to(el, {
      y:        c.fAmp,
      x:        c.fAmp * .35,
      rotation: c.rMax,
      duration: (1 / c.fSpd),
      ease:     'sine.inOut'
    });
  });

  // ── Pulso de opacidad — cada gafa "respira" independiente
  frames.forEach((el, i) => {
    const c = CFG[i] || CFG[0];
    gsap.to(el, {
      opacity: '+=0.12',
      duration: 3.2 + i * .4,
      repeat:  -1,
      yoyo:    true,
      ease:    'sine.inOut',
      delay:   c.delay + 2
    });
  });

  // ── Parallax de ratón via GSAP ticker
  const hero = document.querySelector('.hero');
  if (hero) {
    gsap.ticker.add(() => {
      frames.forEach((el, i) => {
        const c = CFG[i] || CFG[0];
        gsap.to(el, {
          x: mx * c.depth * 55,
          y: my * c.depth * 35,
          duration: 2.0,
          ease: 'power1.out',
          overwrite: 'auto'
        });
      });
    });
  }

  // ── Destello dorado periódico en hf2 y hf4 (gold)
  ['.hf2', '.hf4'].forEach((sel, n) => {
    const el = document.querySelector(sel);
    if (!el) return;
    function flash() {
      gsap.timeline({ delay: 8 + n * 5 + Math.random() * 10 })
        .to(el, { filter: 'drop-shadow(0 0 32px rgba(212,98,14,.95)) brightness(1.3)', duration: .5, ease: 'power2.out' })
        .to(el, { filter: '', duration: 1.2, ease: 'power2.in', onComplete: flash });
    }
    setTimeout(flash, 2500 + n * 1800);
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
    const img = item.querySelector('img');
    if (!img) return;
    item.addEventListener('mouseenter', () => gsap.to(img, { scale: 1.09, duration: 0.5 }));
    item.addEventListener('mouseleave', () => gsap.to(img, { scale: 1,    duration: 0.5 }));
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

function openLB(i) {
  _lbIdx = i;
  const img = document.getElementById('lightboxImg');
  const cnt = document.getElementById('lbCounter');
  const box = document.getElementById('lightbox');
  img.src = _lbImgs[i];
  if (cnt) cnt.textContent = (i + 1) + ' / ' + _lbImgs.length;
  box.classList.add('open');
  document.body.style.overflow = 'hidden';
  gsap.fromTo(img, { scale: 0.85, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.38, ease: 'back.out(1.5)' });
}

function closeLB() {
  const img = document.getElementById('lightboxImg');
  const box = document.getElementById('lightbox');
  gsap.to(img, { scale: 0.88, autoAlpha: 0, duration: 0.24, onComplete: () => {
    box.classList.remove('open');
    document.body.style.overflow = '';
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
  setTimeout(() => banner.classList.add('show'), 2000);
  banner.querySelector('.cookie-accept')?.addEventListener('click', () => {
    localStorage.setItem('anaka-cookies', '1');
    gsap.to(banner, { y: '130%', duration: 0.4, ease: 'power2.in', onComplete: () => banner.remove() });
  });
  banner.querySelector('.cookie-decline')?.addEventListener('click', () => {
    localStorage.setItem('anaka-cookies', '0');
    gsap.to(banner, { y: '130%', duration: 0.4, ease: 'power2.in', onComplete: () => banner.remove() });
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
  const btn = document.getElementById('submitBtn');
  const msg = document.getElementById('formMsg');
  const URL = 'https://script.google.com/macros/s/AKfycbwEPaoKU95uNRT_CT2MKLvs6uiSnQOTc97PSB4VzdWeLihMrUcTraxfvMFTuLo-_lCxSA/exec';

  const data = {
    nombre:    document.getElementById('nombre')?.value.trim(),
    apellidos: document.getElementById('apellidos')?.value.trim(),
    email:     document.getElementById('email')?.value.trim(),
    telefono:  document.getElementById('telefono')?.value.trim(),
    mensaje:   document.getElementById('mensaje')?.value.trim(),
  };
  btn.disabled = true; btn.textContent = 'Enviando...';

  try {
    await fetch(URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(data) });
    msg.className = 'form-msg success'; msg.textContent = 'Mensaje enviado correctamente. Nos pondremos en contacto contigo pronto.';
    msg.style.display = 'block'; e.target.reset();
    gsap.from(msg, { autoAlpha: 0, y: 8, duration: 0.4 });
  } catch {
    msg.className = 'form-msg error'; msg.textContent = 'Error al enviar. Por favor, llámanos al 943 24 84 90.';
    msg.style.display = 'block';
  } finally {
    btn.disabled = false; btn.textContent = 'Enviar mensaje';
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
window.addEventListener('load', init404);
