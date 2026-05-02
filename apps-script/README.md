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
