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
