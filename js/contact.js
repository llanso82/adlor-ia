/* =====================================================================
   ADLOR · IA — Formulario de contacto (js/contact.js)
   ---------------------------------------------------------------------
   Cada envío hace DOS cosas, en paralelo y sin backend propio:

   1) REGISTRA al visitante en la base de datos (Supabase, tabla
      `visitors`): nombre, correo, en qué producto o proyecto está
      interesado o qué quiere construir, y desde qué página escribió.
      Ese registro es la memoria: los correos se pierden, la tabla no.

   2) AVISA por correo a contacto@adlor-ia.com con FormSubmit en modo
      AJAX:  POST https://formsubmit.co/ajax/contacto@adlor-ia.com

   Basta con que UNA de las dos funcione para dar el envío por bueno:
   si el correo falla pero el registro entró, el mensaje no se perdió.

   La clave de Supabase que va aquí es PUBLICABLE a propósito: la tabla
   tiene RLS y esa clave SOLO puede INSERTAR. No puede leer, ni editar,
   ni borrar. Los registros se consultan desde el panel de Supabase.

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

  // Base de datos de visitantes (Supabase · proyecto "adlor-ia").
  // Clave publicable: la tabla `visitors` solo acepta INSERT vía RLS.
  var SUPABASE_URL = 'https://bciiywoszpssauxvbkar.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_CyW-I-BcQFgIo2Tz4chW-A_zV6K_Pae';
  var REGISTRO_URL = SUPABASE_URL + '/rest/v1/visitors';

  var TIMEOUT_MS = 15000; // aborta el envío si tarda más de ~15 s
  var EMAIL_RE   = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/; // regex razonable, no RFC completo

  // Mensaje de respaldo si falla la red o el servicio (elStatus acepta innerHTML)
  var ERR_HTML = 'No se pudo enviar. Escríbenos directo a ' +
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
      first = first || { input: inMensaje, msg: 'Cuéntanos un poco más: el mensaje necesita al menos 10 caracteres.' };
    }
    return first;
  }

  /* ---------- registro en la base de datos ---------- */

  // Corta un texto para respetar los límites de la tabla (evita un 400
  // por un `check` de longitud cuando alguien pega un correo enorme).
  function corta(txt, max) {
    if (!txt) return null;
    txt = String(txt);
    return txt.length > max ? txt.slice(0, max) : txt;
  }

  // Inserta el visitante en Supabase. Devuelve una promesa que resuelve
  // a true/false — nunca rechaza, para no tumbar el envío del correo.
  function registrarVisitante(datos, signal) {
    if (typeof fetch !== 'function') return Promise.resolve(false);

    var fila = {
      name:     corta(datos.nombre, 120),
      email:    corta(datos.email, 200),
      interest: corta(datos.interes, 120),
      message:  corta(datos.mensaje, 4000),
      source:   'adlor-ia.com',
      page:     corta(location.href, 500),
      referrer: corta(document.referrer, 500) || null
    };

    var opts = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY,
        // No pedimos que nos devuelva la fila: la clave pública no puede leerla.
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(fila)
    };
    if (signal) opts.signal = signal;

    return fetch(REGISTRO_URL, opts)
      .then(function (res) { return res.ok; })
      .catch(function () { return false; });
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
      setStatus('ok', '✓ Mensaje recibido. Te contestamos pronto a ' + email + '.');
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

    // 3a) Registro en la base de datos (lo que no se puede perder)
    var registro = registrarVisitante({
      nombre: nombre, email: email, interes: interes, mensaje: mensaje
    }, controller ? controller.signal : null);

    // 3b) Aviso por correo. Nunca rechaza: devuelve true/false como el registro.
    var aviso = fetch(ENDPOINT, opts)
      .then(function (res) {
        // FormSubmit responde JSON con { success: "true"/"false", message }
        return res.json()
          .catch(function () { return {}; })
          .then(function (data) {
            return res.ok && (data.success === true || data.success === 'true' || typeof data.success === 'undefined');
          });
      })
      .catch(function () { return false; });

    Promise.all([registro, aviso])
      .then(function (r) {
        var registrado = r[0], avisado = r[1];

        // 4) Basta con que una de las dos haya entrado: el mensaje ya existe
        //    en algún lado y Adrián lo va a ver.
        if (registrado || avisado) {
          setStatus('ok', '✓ Mensaje recibido. Te contestamos pronto a ' + email + '.');
          form.reset();
        } else {
          // 5) Ni base de datos ni correo: respaldo con mailto
          setStatus('err', ERR_HTML, true);
        }
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
