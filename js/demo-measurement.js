(function () {
  'use strict';
  var sources = ['prospectos', 'usem', 'bni', 'directo'];
  var ids = ['D-02','B-04','B-05','B-06','D-04','D-05','D-06','B-07','B-08','B-09','D-07','D-08','D-09'];
  var params = new URLSearchParams(location.search);
  var source = sources.includes(params.get('utm_source')) ? params.get('utm_source') : 'directo';
  var contact = source === 'prospectos' && ids.includes(params.get('utm_content')) ? params.get('utm_content') : null;
  var test = params.get('qa') === '1';
  var key = 'adlor-demo:' + source + ':' + (contact || '') + ':' + test;
  var state;
  try { state = JSON.parse(sessionStorage.getItem(key)); } catch (_) {}
  if (!state || !Number.isFinite(state.started) || !state.events || typeof state.events !== 'object' || Date.now() - state.started > 1800000) state = { started: Date.now(), events: {} };
  function save() { try { sessionStorage.setItem(key, JSON.stringify(state)); } catch (_) {} }
  function uuid() { return crypto.randomUUID(); }
  var base = 'https://bciiywoszpssauxvbkar.supabase.co/rest/v1/';
  // Existing public insert-only key; never use a service-role credential in browser code.
  var publicKey = 'sb_publishable_CyW-I-BcQFgIo2Tz4chW-A_zV6K_Pae';
  async function insert(table, row) {
    var controller = new AbortController();
    var timeout = setTimeout(function () { controller.abort(); }, 12000);
    try {
      var response = await fetch(base + table + '?on_conflict=id', {
        method: 'POST', headers: { 'Content-Type': 'application/json', apikey: publicKey,
          Authorization: 'Bearer ' + publicKey, Prefer: 'resolution=ignore-duplicates,return=minimal' },
        body: JSON.stringify(row), signal: controller.signal, keepalive: true
      });
      return { ok: response.ok, retryable: response.status >= 500 || response.status === 429 };
    } catch (_) { return { ok: false, retryable: true }; }
    finally { clearTimeout(timeout); }
  }
  function event(kind, channel) {
    if (navigator.globalPrivacyControl || navigator.doNotTrack === '1') return;
    var name = kind + ':' + (channel || '');
    if (!state.events[name]) state.events[name] = { id: uuid(), saved: false };
    var pending = state.events[name]; save();
    if (pending.saved) return;
    insert('demo_events', { id: pending.id, source: source, contact_id: contact,
      kind: kind, channel: channel || null, is_test: test }).then(function (result) {
      if (result.ok) { pending.saved = true; save(); }
    });
  }
  event('visit');
  var marker = '[ADLOR-' + source.toUpperCase() + (contact ? '-' + contact : '') + (test ? '-QA' : '') + ']';
  document.querySelectorAll('#contacto a[href^="mailto:"], #contacto a[href^="https://wa.me/"]').forEach(function (link) {
    var email = link.getAttribute('href').startsWith('mailto:');
    var url = new URL(link.href);
    if (email) url.searchParams.set('subject', 'Demo ADLOR ' + marker);
    else url.searchParams.set('text', (url.searchParams.get('text') || '') + ' ' + marker);
    link.href = url.toString();
    link.addEventListener('click', function () { event('contact_click', email ? 'email' : 'whatsapp'); });
  });
  var form = document.getElementById('demo-request');
  if (!form) return;
  var status = document.getElementById('demo-status');
  var button = form.querySelector('button[type="submit"]');
  // ponytail: idempotent retries keep this page open; reload loses the pending
  // request. A future resumable flow needs a server receipt, not stored PII.
  var attempt = null, busy = false;
  function fieldsDisabled(value) { form.querySelectorAll('input,textarea').forEach(function (field) { field.disabled = value; }); }
  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    if (busy) return;
    if (!attempt) {
      if (!form.reportValidity()) return;
      var data = new FormData(form);
      if (data.get('website')) { status.textContent = 'No se pudo registrar. Puedes escribirnos por correo.'; return; }
      var name = String(data.get('name') || '').trim(), email = String(data.get('email') || '').trim();
      var company = String(data.get('company') || '').trim(), process = String(data.get('process') || '').trim();
      if (!name || !email || !company || !process) { status.textContent = 'Completa los campos con tus datos.'; return; }
      attempt = { id: uuid(), name: name, email: email, interest: 'Demo de ventas y operaciones',
        message: 'Empresa: ' + company + '\nProceso: ' + process + '\nConsentimiento: responder esta solicitud; sin alta a publicidad. Aviso demo-2026-10-22.',
        source: (test ? 'demo-qa:' : 'demo:') + source,
        page: '/demo/' + (contact ? '?contact_id=' + contact : ''), referrer: null };
    }
    busy = true; button.disabled = true; fieldsDisabled(true); status.textContent = 'Registrando tu solicitud…';
    var result = await insert('visitors', attempt);
    busy = false; button.disabled = false;
    if (result.ok) {
      status.textContent = 'Solicitud registrada. Escríbenos por correo si quieres agregar información. Acordaremos fecha y participantes; todavía no hay un horario reservado.';
      form.reset(); fieldsDisabled(false); attempt = null; button.textContent = 'Enviar otra solicitud';
    } else if (result.retryable) {
      status.textContent = 'No pudimos confirmar el registro. Reintenta: conservamos los mismos datos y código para evitar duplicados. También puedes escribirnos por correo.';
      button.textContent = 'Reintentar la misma solicitud';
    } else {
      status.textContent = 'No se pudo registrar. Conservamos tus datos en el formulario para que los revises o nos escribas por correo.';
      fieldsDisabled(false); attempt = null; button.textContent = 'Solicitar una reunión';
    }
  });
})();
