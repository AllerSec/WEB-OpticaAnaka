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
const DRIVE_FOLDER_NAME = 'Citas Anaka (.ics)';

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
    const end = new Date(start.getTime() + SLOT_MINUTES * 60000);

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

    // Save the .ics into Drive and make it publicly readable so we can build
    // a https/webcal link the recipient can tap from Apple Mail to open
    // Apple Calendar directly with the event preloaded.
    const icsLinks = uploadIcsToDrive(icsBlob);

    const subject = 'Nueva solicitud de cita — ' + fullName + ' — ' +
      Utilities.formatDate(start, TIMEZONE, 'EEE d MMM, HH:mm');

    const fechaHumana = Utilities.formatDate(start, TIMEZONE, 'EEEE, d \'de\' MMMM \'de\' yyyy');
    const horaHumana = Utilities.formatDate(start, TIMEZONE, 'HH:mm');

    const plain = [
      'NUEVA SOLICITUD DE CITA',
      '─────────────────────────',
      'Cliente:    ' + fullName,
      'Teléfono:   ' + data.telefono,
      'Email:      ' + data.email,
      '',
      'Motivo:     ' + motivoLabel,
      'Fecha:      ' + fechaHumana,
      'Hora:       ' + horaHumana,
      'Idioma web: ' + lang.toUpperCase(),
      '',
      'Observaciones:',
      data.observaciones ? ('"' + data.observaciones + '"') : '(sin observaciones)',
      '',
      '─────────────────────────',
      'Añadir a Apple Calendar:',
      icsLinks.webcal,
      '',
      '(Pulsa el enlace desde tu iPhone o Mac para abrir Calendario.)'
    ].join('\n');

    const html = buildHtmlEmail({
      fullName: fullName,
      telefono: data.telefono,
      email: data.email,
      motivoLabel: motivoLabel,
      fechaHumana: fechaHumana,
      horaHumana: horaHumana,
      lang: lang,
      observaciones: data.observaciones,
      icsName: icsBlob.getName(),
      icsWebcal: icsLinks.webcal,
      icsHttps: icsLinks.https
    });

    MailApp.sendEmail({
      to: RECIPIENT_EMAIL,
      subject: subject,
      body: plain,
      htmlBody: html,
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

function uploadIcsToDrive(icsBlob) {
  // Find or create a folder dedicated to .ics files for cita requests.
  let folder;
  const it = DriveApp.getFoldersByName(DRIVE_FOLDER_NAME);
  if (it.hasNext()) {
    folder = it.next();
  } else {
    folder = DriveApp.createFolder(DRIVE_FOLDER_NAME);
  }

  const file = folder.createFile(icsBlob);
  // Anyone with the link can read. The link is unguessable, but anyone
  // who has it can download. Acceptable for short-lived appointment files.
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  // The "uc?export=download&id=..." URL serves the file with its native
  // MIME type, which is what we want (text/calendar). Both Apple Mail
  // (Mac/iPhone) and Outlook will treat it as an importable calendar.
  const httpsUrl = 'https://drive.google.com/uc?export=download&id=' + file.getId();
  // webcal://...same path... triggers Apple Calendar's "subscribe / add"
  // flow on iOS and macOS instead of opening a download.
  const webcalUrl = 'webcal://drive.google.com/uc?export=download&id=' + file.getId();

  return { https: httpsUrl, webcal: webcalUrl, fileId: file.getId() };
}

function buildHtmlEmail(p) {
  const orange = '#D4620E';
  const orangeDark = '#A04A0A';
  const cream = '#FEF8F3';
  const text = '#1A0E05';
  const muted = '#5A3E25';
  const border = '#EDD5BE';

  const escape = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  const obsBlock = p.observaciones
    ? '<tr><td style="padding:8px 16px;color:' + muted + ';font-size:12px;text-transform:uppercase;letter-spacing:.06em;font-weight:700;width:120px;vertical-align:top">Observaciones</td>' +
      '<td style="padding:8px 16px;color:' + text + ';font-size:14px;font-style:italic">"' + escape(p.observaciones) + '"</td></tr>'
    : '';

  return [
    '<!DOCTYPE html>',
    '<html lang="es"><head><meta charset="UTF-8"><meta name="color-scheme" content="light"></head>',
    '<body style="margin:0;padding:24px 12px;background:#f5f1ec;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;color:' + text + '">',
    '<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid ' + border + '">',
    // Header
    '<tr><td style="background:' + orange + ';padding:22px 28px;color:#fff">',
    '<div style="font-size:11px;letter-spacing:.18em;text-transform:uppercase;font-weight:700;opacity:.85">Óptica Anaka — Web</div>',
    '<div style="font-size:22px;font-weight:600;margin-top:4px;font-family:Georgia,serif">Nueva solicitud de cita</div>',
    '</td></tr>',
    // Cliente
    '<tr><td style="padding:24px 28px 8px">',
    '<div style="font-size:11px;letter-spacing:.1em;text-transform:uppercase;font-weight:700;color:' + muted + ';margin-bottom:6px">Cliente</div>',
    '<div style="font-size:18px;font-weight:600;color:' + text + '">' + escape(p.fullName) + '</div>',
    '<div style="margin-top:8px;font-size:14px;color:' + text + '">',
    '<a href="tel:' + escape(p.telefono) + '" style="color:' + orange + ';text-decoration:none;font-weight:600">' + escape(p.telefono) + '</a>',
    ' &nbsp;·&nbsp; ',
    '<a href="mailto:' + escape(p.email) + '" style="color:' + orangeDark + ';text-decoration:none">' + escape(p.email) + '</a>',
    '</div>',
    '</td></tr>',
    // Detalles tabla
    '<tr><td style="padding:8px 28px 4px">',
    '<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:' + cream + ';border:1px solid ' + border + ';border-radius:10px;border-collapse:separate">',
    '<tr><td style="padding:14px 16px;color:' + muted + ';font-size:12px;text-transform:uppercase;letter-spacing:.06em;font-weight:700;width:120px;vertical-align:top">Motivo</td>',
    '<td style="padding:14px 16px;color:' + text + ';font-size:15px;font-weight:600">' + escape(p.motivoLabel) + '</td></tr>',
    '<tr><td style="padding:8px 16px;color:' + muted + ';font-size:12px;text-transform:uppercase;letter-spacing:.06em;font-weight:700;width:120px;vertical-align:top">Fecha</td>',
    '<td style="padding:8px 16px;color:' + text + ';font-size:15px">' + escape(p.fechaHumana) + '</td></tr>',
    '<tr><td style="padding:8px 16px;color:' + muted + ';font-size:12px;text-transform:uppercase;letter-spacing:.06em;font-weight:700;width:120px;vertical-align:top">Hora</td>',
    '<td style="padding:8px 16px;color:' + text + ';font-size:18px;font-weight:700;font-variant-numeric:tabular-nums">' + escape(p.horaHumana) + '</td></tr>',
    '<tr><td style="padding:8px 16px;color:' + muted + ';font-size:12px;text-transform:uppercase;letter-spacing:.06em;font-weight:700;width:120px;vertical-align:top">Idioma web</td>',
    '<td style="padding:8px 16px 14px;color:' + text + ';font-size:14px">' + escape(String(p.lang).toUpperCase()) + '</td></tr>',
    obsBlock,
    '</table>',
    '</td></tr>',
    // CTA buttons
    '<tr><td style="padding:18px 28px 8px">',
    '<div style="font-size:13px;color:' + muted + ';margin-bottom:10px">Añade la cita a tu calendario con un solo toque:</div>',
    '<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 0 0">',
    '<tr>',
    '<td><a href="' + p.icsWebcal + '" target="_blank" style="display:inline-block;background:' + orange + ';color:#fff;padding:13px 26px;border-radius:50px;font-weight:600;text-decoration:none;font-size:15px">📅 Añadir a Apple Calendar</a></td>',
    '</tr></table>',
    '<div style="font-size:12px;color:' + muted + ';margin-top:14px;line-height:1.55">',
    'Pulsa el botón desde tu iPhone o Mac. Calendario se abrirá con la cita lista para guardar (recordatorio 24 h antes).',
    '<br><br>',
    '<strong style="color:' + text + '">¿No funciona el botón?</strong> Descarga el archivo: <a href="' + p.icsHttps + '" style="color:' + orange + ';font-weight:600">' + escape(p.icsName) + '</a>',
    '</div>',
    '</td></tr>',
    // Footer
    '<tr><td style="padding:20px 28px 26px;border-top:1px solid ' + border + ';margin-top:16px;font-size:11px;color:' + muted + ';line-height:1.6">',
    'Esta solicitud llega desde el formulario web de Óptica Anaka. Responde directamente a este correo para contactar con el cliente — la dirección de respuesta es la suya.',
    '</td></tr>',
    '</table>',
    '</body></html>'
  ].join('');
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
