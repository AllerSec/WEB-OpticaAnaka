# Reserva de Citas Online — Diseño

**Fecha:** 2026-05-02
**Proyecto:** Óptica Anaka (sitio estático trilingüe ES/EU/FR)
**Autor:** Brainstorming colaborativo

---

## 1. Objetivo

Añadir una página de reserva de citas online en los 3 idiomas del sitio. El cliente rellena un formulario; la solicitud llega por email a la óptica con un archivo `.ics` adjunto que, abierto desde iPhone/Mac, añade la cita al Apple Calendar del propietario con un toque.

El sitio sigue siendo 100% estático. La integración usa Google Apps Script como endpoint sin servidor.

## 2. Rutas y navegación

Tres páginas nuevas, una por idioma:

- **ES:** `/cita-previa/index.html`
- **EU:** `/eu/hitzordua/index.html`
- **FR:** `/fr/rendez-vous/index.html`

Cada idioma añade un enlace al navbar entre **Colecciones** y **Contacto**, con etiquetas: "Pedir cita" / "Hitzordua eskatu" / "Réserver".

El enlace lleva un estilo destacado tipo botón (fondo `--primary` con texto blanco) — es la conversión principal del sitio. En el resto del navbar mantiene el estilo de enlace plano actual.

Se actualizan los 3 navbars en TODAS las páginas existentes (`index.html`, `servicios/`, `colecciones/` con sus subpáginas, `contacto/`, `eu/`, `fr/` y todas sus subpáginas) para incluir el nuevo enlace.

Se añaden las 3 nuevas URLs al `sitemap.xml`.

## 3. Estructura visual de la página

```
[Header / Navbar]
[Breadcrumb: Inicio > Pedir cita]

[Page Hero]
  Etiqueta: "Reserva tu cita"
  H1: "Pide tu cita en Óptica Anaka"
  Subtítulo

[Sección principal — grid 2 columnas en desktop, apilado en móvil]

  ┌─ Columna izquierda: Tarjeta info (sticky en desktop)
  │  · Pasos del proceso (1-2-3 visual)
  │     1. Rellena el formulario
  │     2. Recibimos tu solicitud
  │     3. Te confirmamos por teléfono o email
  │  · Recordatorio de horarios (tabla)
  │  · CTA teléfono directo
  │
  └─ Columna derecha: Formulario en pasos visuales
     Paso 1: Motivo de la cita (tarjetas seleccionables con icono)
     Paso 2: Fecha y hora (calendario + grid de huecos)
     Paso 3: Datos personales
     [Botón enviar]

[Footer]
```

### 3.1. Motivos de cita (Paso 1)

6 tarjetas con icono SVG (estilo `service-card` que ya existe). Selección única.

| Motivo (ES) | EU | FR |
|---|---|---|
| Revisión de la vista | Ikusmen-azterketa | Examen de vue |
| Comprar gafas / monturas | Betaurrekoak / armazoiak erostea | Acheter des lunettes |
| Lentes de contacto | Kontaktuko lenteak | Lentilles de contact |
| Retinografía | Erretinografia | Rétinographie |
| Reparación o ajuste | Konponketa edo doikuntza | Réparation ou ajustement |
| Otro | Bestelakoa | Autre |

### 3.2. Fecha y hora (Paso 2)

- Input `<input type="date">` nativo. Validaciones: `min` = hoy, `max` = hoy + 60 días, no domingos.
- Al elegir fecha válida, aparece grid de horas filtradas según el día.

**Lógica de horas (cada 30 min, último hueco 1h antes del cierre):**
- **Lun–Vie mañana:** 9:30, 10:00, 10:30, 11:00, 11:30, 12:00, 12:30
- **Lun–Vie tarde:** 16:30, 17:00, 17:30, 18:00, 18:30, 19:00
- **Sábado mañana:** 9:30, 10:00, 10:30, 11:00, 11:30, 12:00, 12:30
- **Sábado tarde:** cerrado (no aparece sección)
- **Domingo:** cerrado (la fecha no se puede seleccionar)

### 3.3. Datos personales (Paso 3)

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| Nombre | text | Sí | `autocomplete="given-name"` |
| Apellidos | text | Sí | `autocomplete="family-name"` |
| Teléfono | tel | Sí | `autocomplete="tel"`, `inputmode="tel"`, validación E.164 simplificada |
| Email | email | Sí | `autocomplete="email"`, `inputmode="email"` |
| Observaciones | textarea | No | Máx 500 caracteres |
| RGPD | checkbox | Sí | Enlaza al aviso legal |
| Honeypot `website` | text oculto | — | Antispam, debe ir vacío |

## 4. Responsive

Mobile-first siguiendo el patrón existente del sitio (`@media(max-width:900px)`).

### 4.1. Móvil (< 768px)

- Layout una sola columna; info colapsable arriba, formulario debajo.
- Tarjetas de motivo: grid 2 columnas, área táctil mínima 44×44 px.
- Selector de hora: grid 3 columnas, botones ≥ 44px alto.
- Inputs `font-size: 16px` mínimo (evita zoom auto en iOS).
- `inputmode` apropiado en cada campo para teclados nativos.
- Tipografía fluida con `clamp()`.
- Padding respeta `env(safe-area-inset-*)`.
- Botón flotante naranja "Pedir cita" en bottom-right (FAB) en TODAS las páginas del sitio, no solo esta. Respeta `env(safe-area-inset-bottom)`.

### 4.2. Tablet (768–1023px)

- 2 columnas con ratio 60/40 (form más ancha).
- Motivos en 3 columnas; horas en 4 columnas.

### 4.3. Desktop (≥ 1024px)

- Grid 2 columnas estilo `contact-grid`.
- Columna izquierda sticky al hacer scroll.
- Motivos en 3 columnas.
- Animaciones GSAP de entrada con stagger (igual patrón `data-stagger` actual).
- Cursor personalizado activo (ya existe).

## 5. Accesibilidad

- Cada paso en `<fieldset>` con `<legend>` semántico.
- Validación inline con `aria-invalid` y `aria-describedby` apuntando al mensaje de error correspondiente.
- `aria-live="polite"` en el contenedor del mensaje de éxito/error post-envío.
- Iconos decorativos con `aria-hidden="true"`.
- Contraste AA mínimo — uso `--primary-accessible: #B05210` para texto sobre fondos claros.
- `prefers-reduced-motion`: animaciones GSAP gestionadas con `gsap.matchMedia()`, se desactivan o reducen a `duration: 0`.
- Skip link `Saltar al contenido` (consistente con resto del sitio).
- Todos los `<button>` y `<a>` con foco visible (`:focus-visible` ya definido).

## 6. Microinteracciones (GSAP)

Todas envueltas en `gsap.matchMedia()` para respetar `prefers-reduced-motion`.

- Reveal escalonado al cargar (igual `.reveal` y `data-stagger` actuales).
- Selección de motivo: tarjeta seleccionada con `scale: 1.02` + sombra naranja, las no seleccionadas a `opacity: 0.5`.
- Aparición del grid de horas tras elegir fecha: `opacity 0→1`, `y: 10→0`, 300ms, `power2.out`.
- Botón enviar con 3 estados visuales: idle / loading (spinner inline) / success (check verde).

## 7. Arquitectura técnica

### 7.1. Stack

- Frontend: HTML/CSS/JS vanilla (mismo stack que el resto).
- Backend: Google Apps Script desplegado como Web App pública (URL endpoint).
- Email destino (pruebas): `allerunax@gmail.com`. Configurable en una sola constante en el script.

### 7.2. Flujo

1. Usuario rellena el formulario.
2. JS valida en cliente. Si pasa, hace `fetch(URL_APPS_SCRIPT, { method: 'POST', body: JSON.stringify(data), headers: { 'Content-Type': 'text/plain;charset=utf-8' } })`. (El `Content-Type: text/plain` evita el preflight CORS que Apps Script no soporta.)
3. Apps Script:
   - Re-valida campos.
   - Verifica honeypot (si `website` viene rellenado, devuelve `{ ok: true }` falso pero NO envía nada).
   - Genera el `.ics`.
   - Envía email a `allerunax@gmail.com` con datos formateados + `.ics` adjunto.
   - Devuelve `{ ok: true }` o `{ ok: false, error: '...' }`.
4. Cliente muestra mensaje según respuesta.

### 7.3. Antispam y protección

- Honeypot `website` invisible (oculto con CSS, no `display:none`, para que los bots lo rellenen).
- Rate limiting cliente: max 1 envío por minuto desde el mismo navegador (localStorage timestamp).
- Validación servidor de TODOS los campos (no fiarse del cliente).

### 7.4. Email a la óptica

**Asunto:** `Nueva solicitud de cita — [Nombre Apellidos] — [Día abreviado] [DD] [Mes], [HH:MM]`

**Cuerpo (texto plano):**

```
NUEVA SOLICITUD DE CITA
─────────────────────────
Cliente:    Juan García López
Teléfono:   +34 612 345 678
Email:      juan@ejemplo.com

Motivo:     Revisión de la vista
Fecha:      Lunes, 4 de mayo de 2026
Hora:       10:30
Idioma web: ES

Observaciones:
"Llevo gafas desde hace 5 años y noto vista cansada."

─────────────────────────
Adjunto: cita-juan-garcia.ics
(Toca el archivo desde tu iPhone para añadirlo al Apple Calendar)
```

### 7.5. Formato del .ics

Estándar iCalendar (RFC 5545):

```
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Optica Anaka//ES
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:[uuid]@anakaoptica.com
DTSTAMP:[YYYYMMDDTHHMMSSZ]
DTSTART;TZID=Europe/Madrid:[YYYYMMDDTHHMMSS]
DTEND;TZID=Europe/Madrid:[YYYYMMDDTHHMMSS]
SUMMARY:Cita: [Motivo] — [Nombre completo]
LOCATION:C. de Fuenterrabía, 14, 20301 Irún, Gipuzkoa
DESCRIPTION:Cliente: [Nombre]\nTel: [tel]\nEmail: [email]\nObservaciones: [obs]
BEGIN:VALARM
TRIGGER:-PT24H
ACTION:DISPLAY
DESCRIPTION:Recordatorio cita Óptica Anaka
END:VALARM
END:VEVENT
END:VCALENDAR
```

Duración del evento: 30 min (mismo intervalo que el slot reservado).

### 7.6. Mensajes al usuario

| Estado | ES | EU | FR |
|---|---|---|---|
| Éxito | Solicitud enviada. Te contactaremos pronto para confirmar tu cita. | Eskaera bidalia. Laster jarriko gara zurekin harremanetan zure hitzordua baieztatzeko. | Demande envoyée. Nous vous contacterons bientôt pour confirmer votre rendez-vous. |
| Error red | No hemos podido enviar tu solicitud. Llámanos al 943 24 84 90. | Ezin izan dugu zure eskaera bidali. Deitu 943 24 84 90 zenbakira. | Nous n'avons pas pu envoyer votre demande. Appelez-nous au 943 24 84 90. |

## 8. SEO

- Meta title: `Pedir cita online — Óptica Anaka Irún` (y traducciones).
- Meta description con palabras clave locales.
- Canonical correcto en cada idioma.
- `hreflang` cruzados entre las 3 versiones.
- JSON-LD `Service` schema en cada página.
- Las 3 nuevas URLs añadidas al `sitemap.xml` con `priority` 0.9 (alta, es la conversión principal).

## 9. Archivos afectados

**Nuevos:**
- `cita-previa/index.html`
- `eu/hitzordua/index.html`
- `fr/rendez-vous/index.html`
- `assets/js/cita.js` (lógica formulario, validaciones, fetch)
- `apps-script/Code.gs` (no se sube al hosting, se despliega aparte; se versiona en repo como referencia)

**Modificados:**
- Todas las páginas existentes que tienen navbar (añadir enlace + traducciones cruzadas):
  - `index.html`
  - `servicios/index.html`
  - `colecciones/index.html` y subcolecciones (6)
  - `contacto/index.html`
  - `eu/index.html`, `eu/zerbitzuak/`, `eu/bildumak/` y subcolecciones, `eu/kontaktua/`
  - `fr/index.html`, `fr/services/`, `fr/collections/` y subcolecciones, `fr/contact/`
- `assets/css/main.css` — estilos nuevos para tarjetas de motivo, grid de horas, FAB, estados del botón
- `assets/js/main.js` — inyección del FAB en todas las páginas (si no estamos ya en la página de cita)
- `sitemap.xml` — añadir 3 URLs

## 10. Configuración pendiente del usuario (no del implementador)

- Crear el Apps Script en Google, copiar el código generado, desplegar como Web App con permiso "Cualquiera".
- Pegar la URL del despliegue en una constante `APPS_SCRIPT_URL` en `assets/js/cita.js`.
- Probar enviando una solicitud de prueba.

## 11. Fuera de alcance (YAGNI)

- No hay panel de administración.
- No hay base de datos de citas (todo va por email).
- No hay sincronización bidireccional con Apple Calendar (solo `.ics` de un solo sentido).
- No hay confirmación automática al cliente por email (se valorará en futuras iteraciones; por ahora la óptica llama).
- No hay sistema de cancelación online.
- No hay verificación de disponibilidad real (todos los huecos del horario aparecen como disponibles; la óptica gestiona conflictos al confirmar).
