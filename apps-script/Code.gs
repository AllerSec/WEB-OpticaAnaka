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

    // Publish the .ics through this script's own doGet endpoint, which
    // serves it with the correct text/calendar MIME type. Apple Calendar
    // can then open the event picker directly (Drive's shared-file URL
    // returns a Drive HTML page in 2026, breaking the webcal flow).
    const icsLinks = publishIcs(ics);

    const subject = 'Nueva solicitud de cita — ' + fullName + ' — ' +
      formatFechaCorta(start, 'es') + ', ' + Utilities.formatDate(start, TIMEZONE, 'HH:mm');

    const fechaHumana = formatFechaHumana(start, lang);
    const fechaHumanaEs = formatFechaHumana(start, 'es');
    const horaHumana = Utilities.formatDate(start, TIMEZONE, 'HH:mm');

    const plain = [
      'NUEVA SOLICITUD DE CITA',
      '─────────────────────────',
      'Cliente:    ' + fullName,
      'Teléfono:   ' + data.telefono,
      'Email:      ' + data.email,
      '',
      'Motivo:     ' + motivoLabel,
      'Fecha:      ' + fechaHumanaEs,
      'Hora:       ' + horaHumana,
      'Idioma web: ' + lang.toUpperCase(),
      '',
      'Observaciones:',
      data.observaciones ? ('"' + data.observaciones + '"') : '(sin observaciones)',
      '',
      '─────────────────────────',
      'Descargar archivo de calendario (.ics):',
      icsLinks.https,
      '',
      '(Abre el archivo descargado y se añadirá automáticamente a tu calendario.)'
    ].join('\n');

    const html = buildHtmlEmail({
      fullName: fullName,
      telefono: data.telefono,
      email: data.email,
      motivoLabel: motivoLabel,
      fechaHumana: fechaHumanaEs,
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

    // Confirmation email to the client. We use the customer's language so
    // they receive a friendly, professional acknowledgment in ES/EU/FR.
    try {
      const clientSubject = clientSubjectFor(lang, fechaHumana, horaHumana);
      const clientPlain = buildClientPlainEmail({
        lang: lang,
        firstName: data.nombre,
        motivoLabel: motivoLabel,
        fechaHumana: fechaHumana,
        horaHumana: horaHumana,
        observaciones: data.observaciones
      });
      const clientHtml = buildClientHtmlEmail({
        lang: lang,
        firstName: data.nombre,
        fullName: fullName,
        motivoLabel: motivoLabel,
        fechaHumana: fechaHumana,
        horaHumana: horaHumana,
        observaciones: data.observaciones,
        icsWebcal: icsLinks.webcal,
        icsHttps: icsLinks.https,
        icsName: icsBlob.getName()
      });
      MailApp.sendEmail({
        to: data.email,
        subject: clientSubject,
        body: clientPlain,
        htmlBody: clientHtml,
        name: ORG_NAME,
        attachments: [icsBlob],
        replyTo: RECIPIENT_EMAIL
      });
    } catch (clientErr) {
      // Failing to email the client must not fail the whole request —
      // the optician already has the request and will call regardless.
      Logger.log('Client email failed: ' + clientErr);
    }

    return jsonOk();
  } catch (err) {
    return jsonErr(String(err && err.message || err));
  }
}

function doGet(e) {
  // Serve a stored .ics file when called with ?id=<id>.
  // Apple Calendar (iOS/macOS) requires text/calendar content directly,
  // which Drive's UI no longer provides for shared files.
  const id = e && e.parameter && e.parameter.id;
  if (id) {
    const ics = PropertiesService.getScriptProperties().getProperty('ics_' + id);
    if (!ics) {
      return ContentService.createTextOutput('Not found').setMimeType(ContentService.MimeType.TEXT);
    }
    return ContentService
      .createTextOutput(ics)
      .setMimeType(ContentService.MimeType.ICAL);
  }
  return ContentService
    .createTextOutput(JSON.stringify({ ok: false, error: 'POST only' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function getWebAppUrl() {
  // Returns the deployed web-app URL of this script. The deployment URL is
  // the only stable public URL we can use to serve the .ics back over https
  // with text/calendar content type. ScriptApp.getService().getUrl() returns
  // the /exec URL of the active deployment.
  return ScriptApp.getService().getUrl();
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

function publishIcs(icsContent) {
  // Store the .ics in script properties keyed by a random id, then return
  // an https/webcal pair pointing at this script's doGet endpoint with that
  // id. doGet serves the file with Content-Type: text/calendar, which is
  // what Apple Calendar / iOS / macOS need to open the event picker.
  // PropertiesService is enough for this use case (no Drive permission
  // required, no extra files in the user's account).
  const id = Utilities.getUuid().replace(/-/g, '');
  PropertiesService.getScriptProperties().setProperty('ics_' + id, icsContent);

  const base = getWebAppUrl();
  const httpsUrl = base + '?id=' + id;
  // Strip the protocol so we can prefix webcal:// — Apple devices recognize
  // webcal as "subscribe to calendar" and offer a one-tap add flow.
  const webcalUrl = 'webcal://' + base.replace(/^https?:\/\//, '') + '?id=' + id;

  // Best-effort cleanup: keep at most ~200 .ics entries in script storage.
  pruneOldIcs(200);

  return { https: httpsUrl, webcal: webcalUrl, id: id };
}

function pruneOldIcs(maxEntries) {
  try {
    const props = PropertiesService.getScriptProperties();
    const all = props.getKeys().filter(k => k.indexOf('ics_') === 0);
    if (all.length <= maxEntries) return;
    const excess = all.length - maxEntries;
    // Properties keys aren't ordered, so we just delete the first N we
    // find. Good enough — older citas have already been read by the
    // optician within minutes of arrival.
    for (let i = 0; i < excess; i++) props.deleteProperty(all[i]);
  } catch (err) { /* ignore */ }
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
    '<div style="font-size:13px;color:' + muted + ';margin-bottom:10px">Descarga el archivo y ábrelo para añadir la cita a tu calendario:</div>',
    '<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 0 0">',
    '<tr>',
    '<td><a href="' + p.icsHttps + '" target="_blank" style="display:inline-block;background:' + orange + ';color:#fff;padding:13px 26px;border-radius:50px;font-weight:600;text-decoration:none;font-size:15px">📅 Descargar ' + escape(p.icsName) + '</a></td>',
    '</tr></table>',
    '<div style="font-size:12px;color:' + muted + ';margin-top:14px;line-height:1.55">',
    'Al abrir el archivo descargado, tu app de Calendario añadirá la cita automáticamente (con recordatorio 24 h antes).',
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

function clientSubjectFor(lang, fechaHumana, horaHumana) {
  if (lang === 'eu') return 'Eskaera jaso dugu — Optika Anaka';
  if (lang === 'fr') return 'Demande reçue — Optique Anaka';
  return 'Hemos recibido tu solicitud — Óptica Anaka';
}

function buildClientPlainEmail(p) {
  const lang = p.lang || 'es';
  const T = clientStrings(lang);
  const lines = [
    T.hi + ' ' + p.firstName + ',',
    '',
    T.intro,
    '',
    '─────────────────────────',
    T.motivo + ': ' + p.motivoLabel,
    T.fecha + ': ' + p.fechaHumana,
    T.hora + ': ' + p.horaHumana,
    '─────────────────────────',
    '',
    T.next,
    '',
    T.contact,
    'Óptica Anaka — C. de Fuenterrabía, 14, 20301 Irún, Gipuzkoa',
    '☎ 943 24 84 90',
    '✉ info@anakaoptica.com',
    '',
    T.signoff
  ];
  return lines.join('\n');
}

function buildClientHtmlEmail(p) {
  const lang = p.lang || 'es';
  const T = clientStrings(lang);

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
    ? '<tr><td style="padding:8px 16px;color:' + muted + ';font-size:12px;text-transform:uppercase;letter-spacing:.06em;font-weight:700;width:120px;vertical-align:top">' + T.observaciones + '</td>' +
      '<td style="padding:8px 16px;color:' + text + ';font-size:14px;font-style:italic">"' + escape(p.observaciones) + '"</td></tr>'
    : '';

  return [
    '<!DOCTYPE html>',
    '<html lang="' + lang + '"><head><meta charset="UTF-8"><meta name="color-scheme" content="light"></head>',
    '<body style="margin:0;padding:24px 12px;background:#f5f1ec;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;color:' + text + '">',
    '<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid ' + border + '">',
    // Header
    '<tr><td style="background:' + orange + ';padding:24px 28px;color:#fff">',
    '<div style="font-size:11px;letter-spacing:.18em;text-transform:uppercase;font-weight:700;opacity:.85">Óptica Anaka</div>',
    '<div style="font-size:24px;font-weight:600;margin-top:4px;font-family:Georgia,serif">' + T.heroTitle + '</div>',
    '</td></tr>',
    // Greeting
    '<tr><td style="padding:26px 28px 6px">',
    '<p style="margin:0 0 12px;font-size:16px;color:' + text + '">' + T.hi + ' <strong>' + escape(p.firstName) + '</strong>,</p>',
    '<p style="margin:0 0 4px;font-size:15px;color:' + text + ';line-height:1.55">' + T.intro + '</p>',
    '</td></tr>',
    // Detalles tabla
    '<tr><td style="padding:14px 28px 4px">',
    '<div style="font-size:11px;letter-spacing:.1em;text-transform:uppercase;font-weight:700;color:' + muted + ';margin-bottom:8px">' + T.summaryTitle + '</div>',
    '<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:' + cream + ';border:1px solid ' + border + ';border-radius:10px;border-collapse:separate">',
    '<tr><td style="padding:14px 16px;color:' + muted + ';font-size:12px;text-transform:uppercase;letter-spacing:.06em;font-weight:700;width:120px;vertical-align:top">' + T.motivo + '</td>',
    '<td style="padding:14px 16px;color:' + text + ';font-size:15px;font-weight:600">' + escape(p.motivoLabel) + '</td></tr>',
    '<tr><td style="padding:8px 16px;color:' + muted + ';font-size:12px;text-transform:uppercase;letter-spacing:.06em;font-weight:700;width:120px;vertical-align:top">' + T.fecha + '</td>',
    '<td style="padding:8px 16px;color:' + text + ';font-size:15px">' + escape(p.fechaHumana) + '</td></tr>',
    '<tr><td style="padding:8px 16px 14px;color:' + muted + ';font-size:12px;text-transform:uppercase;letter-spacing:.06em;font-weight:700;width:120px;vertical-align:top">' + T.hora + '</td>',
    '<td style="padding:8px 16px 14px;color:' + text + ';font-size:18px;font-weight:700;font-variant-numeric:tabular-nums">' + escape(p.horaHumana) + '</td></tr>',
    obsBlock,
    '</table>',
    '</td></tr>',
    // Next steps
    '<tr><td style="padding:18px 28px 8px">',
    '<div style="background:#fffaf3;border-left:3px solid ' + orange + ';padding:12px 16px;border-radius:6px">',
    '<p style="margin:0;font-size:14px;color:' + text + ';line-height:1.55"><strong style="color:' + orangeDark + '">' + T.nextTitle + '</strong><br>' + T.next + '</p>',
    '</div>',
    '</td></tr>',
    // Apple Calendar CTA
    '<tr><td style="padding:18px 28px 8px">',
    '<div style="font-size:13px;color:' + muted + ';margin-bottom:10px">' + T.calCta + '</div>',
    '<a href="' + p.icsHttps + '" target="_blank" style="display:inline-block;background:' + orange + ';color:#fff;padding:13px 26px;border-radius:50px;font-weight:600;text-decoration:none;font-size:15px">📅 ' + T.calBtn + ' — ' + escape(p.icsName) + '</a>',
    '<div style="font-size:12px;color:' + muted + ';margin-top:12px;line-height:1.55">' + T.calNote + '</div>',
    '</td></tr>',
    // Contact block
    '<tr><td style="padding:24px 28px 8px">',
    '<div style="font-size:11px;letter-spacing:.1em;text-transform:uppercase;font-weight:700;color:' + muted + ';margin-bottom:6px">' + T.contactTitle + '</div>',
    '<div style="font-size:14px;color:' + text + ';line-height:1.6">',
    'Óptica Anaka<br>',
    'C. de Fuenterrabía, 14 · 20301 Irún, Gipuzkoa<br>',
    '<a href="tel:+34943248490" style="color:' + orange + ';text-decoration:none;font-weight:600">943 24 84 90</a> · ',
    '<a href="mailto:info@anakaoptica.com" style="color:' + orangeDark + ';text-decoration:none">info@anakaoptica.com</a>',
    '</div>',
    '</td></tr>',
    // Signoff + footer
    '<tr><td style="padding:18px 28px 26px">',
    '<p style="margin:0 0 4px;font-size:14px;color:' + text + '">' + T.signoff + '</p>',
    '<p style="margin:0;font-size:13px;color:' + muted + ';font-style:italic">' + T.team + '</p>',
    '</td></tr>',
    '<tr><td style="padding:14px 28px 22px;border-top:1px solid ' + border + ';font-size:11px;color:' + muted + ';line-height:1.6">',
    T.footer,
    '</td></tr>',
    '</table>',
    '</body></html>'
  ].join('');
}

function clientStrings(lang) {
  if (lang === 'eu') {
    return {
      hi: 'Kaixo',
      heroTitle: 'Eskaera jaso dugu',
      intro: 'Eskerrik asko zure hitzordu-eskaeragatik. Datuak ondo jaso ditugu eta laster jarriko gara zurekin harremanetan.',
      summaryTitle: 'Zure eskaeraren laburpena',
      motivo: 'Arrazoia',
      fecha: 'Data',
      hora: 'Ordua',
      observaciones: 'Oharrak',
      nextTitle: 'Hurrengo urratsak',
      next: 'Telefonoz deituko dizugu lan-orduetan zure hitzordua baieztatzeko. Premia baduzu, deitu zuzenean 943 24 84 90 zenbakira.',
      calCta: 'Bitartean, deskargatu fitxategia eta ireki zure egutegian gehitzeko:',
      calBtn: 'Egutegi-fitxategia deskargatu',
      calNote: 'Deskargatutako fitxategia irekitzean, zure Egutegi aplikazioak hitzordua automatikoki gehituko du (24 ordu lehenagoko abisuarekin).',
      contactTitle: 'Kontaktua',
      signoff: 'Eskerrik asko zure konfiantzagatik.',
      team: 'Optika Anakako taldea',
      footer: 'Email hau Optika Anakako webguneko inprimakia bete duzulako jaso duzu. Ez baduzu hitzordua eskatu, mesedez, jakinarazi.'
    };
  }
  if (lang === 'fr') {
    return {
      hi: 'Bonjour',
      heroTitle: 'Demande bien reçue',
      intro: 'Merci pour votre demande de rendez-vous. Nous l’avons bien reçue et vous contacterons sous peu.',
      summaryTitle: 'Récapitulatif de votre demande',
      motivo: 'Motif',
      fecha: 'Date',
      hora: 'Heure',
      observaciones: 'Remarques',
      nextTitle: 'Prochaines étapes',
      next: 'Nous vous appellerons aux heures d’ouverture pour confirmer votre rendez-vous. En cas d’urgence, appelez directement le 943 24 84 90.',
      calCta: 'En attendant, téléchargez le fichier et ouvrez-le pour ajouter le rendez-vous à votre calendrier :',
      calBtn: 'Télécharger le fichier calendrier',
      calNote: 'En ouvrant le fichier téléchargé, votre application Calendrier ajoutera automatiquement le rendez-vous (avec un rappel 24 h avant).',
      contactTitle: 'Contact',
      signoff: 'Merci pour votre confiance.',
      team: 'L’équipe d’Optique Anaka',
      footer: 'Vous recevez cet email parce que vous avez rempli le formulaire de réservation sur le site d’Optique Anaka. Si vous n’êtes pas à l’origine de cette demande, merci de nous prévenir.'
    };
  }
  return {
    hi: 'Hola',
    heroTitle: 'Hemos recibido tu solicitud',
    intro: 'Gracias por solicitar cita en Óptica Anaka. Hemos recibido correctamente tus datos y nos pondremos en contacto contigo en breve.',
    summaryTitle: 'Resumen de tu solicitud',
    motivo: 'Motivo',
    fecha: 'Fecha',
    hora: 'Hora',
    observaciones: 'Observaciones',
    nextTitle: 'Próximos pasos',
    next: 'Te llamaremos por teléfono en horario comercial para confirmar tu cita. Si necesitas algo antes, llámanos directamente al 943 24 84 90.',
    calCta: 'Mientras tanto, descarga el archivo y ábrelo para añadir la cita a tu calendario:',
    calBtn: 'Descargar archivo de calendario',
    calNote: 'Al abrir el archivo descargado, tu app de Calendario añadirá la cita automáticamente (con recordatorio 24 h antes).',
    contactTitle: 'Contacto',
    signoff: 'Gracias por tu confianza.',
    team: 'El equipo de Óptica Anaka',
    footer: 'Recibes este email porque has rellenado el formulario de cita en la web de Óptica Anaka. Si no has sido tú, ignóralo o avísanos.'
  };
}

// Apps Script's Utilities.formatDate ignores locale and uses the script's
// default (English). We format manually with localized arrays so the date
// reads naturally in ES/EU/FR regardless of the script's own locale.
const DATE_NAMES = {
  es: {
    weekdays: ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'],
    months:   ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'],
    monthsShort: ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'],
    weekdaysShort: ['dom','lun','mar','mié','jue','vie','sáb'],
    long:  (wd, d, m, y, names) => names.weekdays[wd] + ', ' + d + ' de ' + names.months[m] + ' de ' + y,
    short: (wd, d, m, y, names) => names.weekdaysShort[wd] + ' ' + d + ' ' + names.monthsShort[m]
  },
  eu: {
    weekdays: ['igandea','astelehena','asteartea','asteazkena','osteguna','ostirala','larunbata'],
    months:   ['urtarrila','otsaila','martxoa','apirila','maiatza','ekaina','uztaila','abuztua','iraila','urria','azaroa','abendua'],
    monthsShort: ['urt','ots','mar','api','mai','eka','uzt','abu','ira','urr','aza','abe'],
    weekdaysShort: ['ig.','al.','ar.','az.','og.','or.','lr.'],
    long:  (wd, d, m, y, names) => names.weekdays[wd] + ', ' + y + 'ko ' + names.months[m] + 'ren ' + d + 'a',
    short: (wd, d, m, y, names) => names.weekdaysShort[wd] + ' ' + d + ' ' + names.monthsShort[m]
  },
  fr: {
    weekdays: ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'],
    months:   ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'],
    monthsShort: ['janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'],
    weekdaysShort: ['dim.','lun.','mar.','mer.','jeu.','ven.','sam.'],
    long:  (wd, d, m, y, names) => names.weekdays[wd] + ' ' + d + ' ' + names.months[m] + ' ' + y,
    short: (wd, d, m, y, names) => names.weekdaysShort[wd] + ' ' + d + ' ' + names.monthsShort[m]
  }
};

function formatFechaHumana(date, lang) {
  const names = DATE_NAMES[lang] || DATE_NAMES.es;
  const wd = parseInt(Utilities.formatDate(date, TIMEZONE, 'u'), 10) % 7; // 1=Mon..7=Sun → 0..6 with Sun=0
  const d  = parseInt(Utilities.formatDate(date, TIMEZONE, 'd'), 10);
  const m  = parseInt(Utilities.formatDate(date, TIMEZONE, 'M'), 10) - 1;
  const y  = parseInt(Utilities.formatDate(date, TIMEZONE, 'yyyy'), 10);
  return names.long(wd, d, m, y, names);
}

function formatFechaCorta(date, lang) {
  const names = DATE_NAMES[lang] || DATE_NAMES.es;
  const wd = parseInt(Utilities.formatDate(date, TIMEZONE, 'u'), 10) % 7;
  const d  = parseInt(Utilities.formatDate(date, TIMEZONE, 'd'), 10);
  const m  = parseInt(Utilities.formatDate(date, TIMEZONE, 'M'), 10) - 1;
  const y  = parseInt(Utilities.formatDate(date, TIMEZONE, 'yyyy'), 10);
  return names.short(wd, d, m, y, names);
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
