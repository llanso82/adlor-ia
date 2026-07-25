/* =====================================================================
   ADLOR · IA — Formulario de contacto (js/contact.js)
   ---------------------------------------------------------------------
   Envía los mensajes DIRECTO a contacto@adlor-ia.com sin backend,
   usando el servicio gratuito FormSubmit en modo AJAX:
     POST https://formsubmit.co/ajax/contacto@adlor-ia.com

   ⚠ IMPORTANTE — FormSubmit: la PRIMERA vez que alguien envíe el
   formulario, FormSubmit manda un correo de activación a
   contacto@adlor-ia.com — hay que hacer clic en ese enlace UNA vez
   para activar los envíos. Hasta entonces, los mensajes no llegan.

   Incluye: validación en español, honeypot anti-bots, estados del
   botón, timeout defensivo y mensajes accesibles vía #cf-status
   (role="status" + aria-live="polite"; nunca usamos alert()).
   Sin dependencias externas. No toca index.html ni css/styles.css.
   ===================================================================== */
(function () {
  'use strict';

  /* ---------- referencias al DOM (contrato con index.html) ---------- */
  var form = document.getElementById('contact-form');
  if (!form) return; // si no existe el formulario, salir en silencio

  var inNombre  = document.getElementById('cf-nombre');
  var inEmail   = document.getElementById('cf-email');
  var inInteres = document.getElementById('cf-interes');
  var inMensaje = document.getElementById('cf-mensaje');
  var btnSend   = document.getElementById('cf-send');
  var elStatus  = document.getElementById('cf-status');
  var honeypot  = form.querySelector('input[name="_honey"]');

  /* ---------- configuración ---------- */
  var ENDPOINT   = 'https://formsubmit.co/ajax/contacto@adlor-ia.com';
  var TIMEOUT_MS = 15000; // aborta el envío si tarda más de ~15 s
  var EMAIL_RE   = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/; // regex razonable, no RFC completo

  // Mensaje de respaldo si falla la red o el servicio (elStatus acepta innerHTML)
  var ERR_HTML = 'No se pudo enviar. Escríbeme directo a ' +
    '<a href="mailto:contacto@adlor-ia.com">contacto@adlor-ia.com</a>.';

  /* ---------- helpers de estado visual ---------- */

  // Pinta el mensaje de estado. type: 'ok' | 'err' | '' (limpio)
  // Solo el mensaje de error usa HTML (enlace mailto estático);
  // todo lo demás va como texto plano para evitar inyección.
  function setStatus(type, msg, isHtml) {
    if (!elStatus) return;
    elStatus.classList.remove('ok', 'err');
    if (type) elStatus.classList.add(type);
    if (isHtml) elStatus.innerHTML = msg || '';
    else elStatus.textContent = msg || '';
  }

  // Marca/desmarca el contenedor .cf-field de un campo como inválido
  function markInvalid(input, invalid) {
    if (!input) return;
    var field = input.closest ? input.closest('.cf-field') : null;
    if (!field) return;
    if (invalid) field.classList.add('invalid');
    else field.classList.remove('invalid');
  }

  // Al escribir/corregir un campo, se quita su marca de inválido
  function clearOnInput(input) {
    if (!input) return;
    input.addEventListener('input', function () { markInvalid(input, false); });
  }
  clearOnInput(inNombre);
  clearOnInput(inEmail);
  clearOnInput(inMensaje);

  /* ---------- validación en español ---------- */
  // Devuelve null si todo está bien; si no, { input, msg } del primer error
  function validate() {
    var nombre  = inNombre  ? inNombre.value.trim()  : '';
    var email   = inEmail   ? inEmail.value.trim()   : '';
    var mensaje = inMensaje ? inMensaje.value.trim() : '';
    var first = null;

    // limpiar marcas de intentos anteriores
    markInvalid(inNombre, false);
    markInvalid(inEmail, false);
    markInvalid(inMensaje, false);

    if (!nombre) {
      markInvalid(inNombre, true);
      first = first || { input: inNombre, msg: 'Escribe tu nombre para poder responderte.' };
    }
    if (!EMAIL_RE.test(email)) {
      markInvalid(inEmail, true);
      first = first || { input: inEmail, msg: 'Revisa tu correo: parece incompleto (ej. tu@correo.com).' };
    }
    if (mensaje.length < 10) {
      markInvalid(inMensaje, true);
      first = first || { input: inMensaje, msg: 'Cuéntame un poco más: el mensaje necesita al menos 10 caracteres.' };
    }
    return first;
  }

  /* ---------- estados del botón de envío ---------- */
  var btnTextoOriginal = btnSend ? btnSend.textContent : '';

  function botonEnviando() {
    if (!btnSend) return;
    btnSend.disabled = true;
    btnSend.classList.add('sending');
    btnSend.textContent = 'Enviando…';
  }
  function botonNormal() {
    if (!btnSend) return;
    btnSend.disabled = false;
    btnSend.classList.remove('sending');
    btnSend.textContent = btnTextoOriginal;
  }

  /* ---------- envío ---------- */
  form.addEventListener('submit', function (ev) {
    ev.preventDefault();

    // Evitar doble envío si ya hay uno en curso
    if (btnSend && btnSend.disabled) return;

    // 1) Validación local
    var error = validate();
    if (error) {
      setStatus('err', error.msg);
      if (error.input && error.input.focus) error.input.focus();
      return;
    }

    var nombre  = inNombre.value.trim();
    var email   = inEmail.value.trim();
    var mensaje = inMensaje.value.trim();
    var interes = inInteres ? inInteres.value : '';
    var honey   = honeypot ? honeypot.value : '';

    // 2) Honeypot: si un bot lo llenó, simulamos éxito SIN enviar nada
    if (honey) {
      setStatus('ok', '✓ Mensaje enviado. Te respondo pronto a ' + email + '.');
      form.reset();
      return;
    }

    // 3) Envío real vía FormSubmit (AJAX, JSON)
    setStatus('', '');           // status limpio durante el envío
    botonEnviando();

    // Timeout defensivo (~15 s). Si el navegador no tiene AbortController,
    // simplemente se omite el timeout sin romper nada.
    var controller = null, timeoutId = null;
    if (typeof AbortController !== 'undefined') {
      controller = new AbortController();
      timeoutId = setTimeout(function () { controller.abort(); }, TIMEOUT_MS);
    }

    var payload = {
      name: nombre,
      email: email,
      mensaje: mensaje,
      interes: interes,
      _subject: 'Nuevo mensaje desde adlor-ia.com — ' + nombre,
      _template: 'table',
      _captcha: 'false',
      _honey: honey
    };

    var opts = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    };
    if (controller) opts.signal = controller.signal;

    // Navegadores sin fetch (muy antiguos): mensaje de respaldo con mailto
    if (typeof fetch !== 'function') {
      botonNormal();
      setStatus('err', ERR_HTML, true);
      return;
    }

    fetch(ENDPOINT, opts)
      .then(function (res) {
        // FormSubmit responde JSON con { success: "true"/"false", message }
        return res.json()
          .catch(function () { return {}; })
          .then(function (data) {
            var ok = res.ok && (data.success === true || data.success === 'true' || typeof data.success === 'undefined');
            if (!ok) throw new Error(data.message || ('HTTP ' + res.status));
            return data;
          });
      })
      .then(function () {
        // 4) Éxito: confirmar (texto plano — el correo lo escribe el usuario)
        setStatus('ok', '✓ Mensaje enviado. Te respondo pronto a ' + email + '.');
        form.reset();
      })
      .catch(function () {
        // 5) Error de red / timeout / respuesta no-ok: respaldo con mailto
        setStatus('err', ERR_HTML, true);
      })
      // 6) Pase lo que pase: restaurar botón y limpiar el timeout.
      //    (Un .then tras el .catch equivale a .finally, pero también funciona
      //     en navegadores con fetch que no soportan Promise.prototype.finally)
      .then(function () {
        if (timeoutId) clearTimeout(timeoutId);
        botonNormal();
      });
  });
})();
