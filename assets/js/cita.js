/* ══════════════════════════════════════════════════
   ÓPTICA ANAKA — Citas (Appointment booking)
   Validates form, generates time slots, posts to Apps Script
══════════════════════════════════════════════════ */

(function () {
  'use strict';

  // === CONFIG ===
  // Replace this constant with the deployed Apps Script Web App URL after deployment.
  const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwoCyvf63VaqDutpcmAzjgvWPV34HJ94wWTQK-kSfin4pIPHa2AlbRNsij6HgSDY_MN/exec';
  const RATE_LIMIT_KEY = 'cita_last_submit_ts';
  const RATE_LIMIT_MS = 60000;
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
