/* =====================================================================
   ADLOR · IA — Agente del sitio (js/agente.js)
   ---------------------------------------------------------------------
   El widget de la esquina. Habla con /api/chat, que a su vez habla con
   Claude. La respuesta llega en fragmentos (SSE) y se escribe en
   pantalla conforme va llegando: por eso se siente en tiempo real.

   Contrato con index.html (IDs fijos, no los cambies sin tocar aquí):
     #ag-launcher  botón flotante que abre y cierra
     #ag-panel     la ventana del agente
     #ag-close     botón de cerrar
     #ag-log       lista de mensajes
     #ag-form      formulario de envío
     #ag-input     campo de texto
     #ag-send      botón de enviar
     #ag-sugerencias  chips de preguntas iniciales

   Sin dependencias. Todo el texto se inserta con textContent: nada de
   innerHTML con contenido del visitante ni del modelo.
   ===================================================================== */
(function () {
  "use strict";

  var panel = document.getElementById("ag-panel");
  var launcher = document.getElementById("ag-launcher");
  if (!panel || !launcher) return; // si no está el markup, salir en silencio

  var log = document.getElementById("ag-log");
  var form = document.getElementById("ag-form");
  var input = document.getElementById("ag-input");
  var send = document.getElementById("ag-send");
  var close = document.getElementById("ag-close");
  var chips = document.getElementById("ag-sugerencias");

  var ENDPOINT = "/api/chat";
  var MAX_CARACTERES = 2000;

  var historia = []; // [{role, content}] — lo que se manda al servidor
  var ocupado = false;
  var abierto = false;

  /* ---------- identificador de conversación (no identifica a nadie) ---------- */
  var sesion;
  try {
    sesion = sessionStorage.getItem("adlor-ag-sesion");
    if (!sesion) {
      sesion =
        Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
      sessionStorage.setItem("adlor-ag-sesion", sesion);
    }
  } catch (e) {
    sesion = Date.now().toString(36) + "0000";
  }

  /* ---------- pintar mensajes ---------- */

  // Devuelve el <div> del cuerpo, para poder seguir escribiendo dentro
  function burbuja(quien, texto) {
    var fila = document.createElement("div");
    fila.className = "ag-msg ag-" + quien;

    var etiqueta = document.createElement("div");
    etiqueta.className = "ag-quien";
    etiqueta.textContent = quien === "user" ? "Tú" : "Adlor";

    var cuerpo = document.createElement("div");
    cuerpo.className = "ag-texto";
    cuerpo.textContent = texto || "";

    fila.appendChild(etiqueta);
    fila.appendChild(cuerpo);
    log.appendChild(fila);
    alFinal();
    return cuerpo;
  }

  function alFinal() {
    log.scrollTop = log.scrollHeight;
  }

  function escribiendo() {
    var fila = document.createElement("div");
    fila.className = "ag-msg ag-assistant ag-pensando";
    fila.innerHTML =
      '<div class="ag-quien">Adlor</div><div class="ag-texto"><span class="ag-dots"><i></i><i></i><i></i></span></div>';
    log.appendChild(fila);
    alFinal();
    return fila;
  }

  function botonOcupado(si) {
    ocupado = si;
    if (send) send.disabled = si;
    if (input) input.disabled = si;
  }

  /* ---------- abrir y cerrar ---------- */

  function abrir() {
    abierto = true;
    panel.hidden = false;
    launcher.setAttribute("aria-expanded", "true");
    // El saludo se escribe una sola vez, al primer abrir
    if (!log.children.length) {
      burbuja(
        "assistant",
        "Hola. Soy el agente de Adlor y contesto en tiempo real. " +
          "Pregúntame qué construimos, cómo trabajamos o si algo de lo que " +
          "necesitas se parece a un proyecto que ya hicimos.",
      );
      if (chips) chips.hidden = false;
    }
    setTimeout(function () {
      if (input) input.focus();
    }, 120);
  }

  function cerrar() {
    abierto = false;
    panel.hidden = true;
    launcher.setAttribute("aria-expanded", "false");
    launcher.focus();
  }

  launcher.addEventListener("click", function () {
    if (abierto) cerrar();
    else abrir();
  });
  if (close) close.addEventListener("click", cerrar);

  document.addEventListener("keydown", function (ev) {
    if (ev.key === "Escape" && abierto) cerrar();
  });

  // Chips de preguntas sugeridas
  if (chips) {
    chips.addEventListener("click", function (ev) {
      var b = ev.target.closest ? ev.target.closest(".ag-chip") : null;
      if (!b || ocupado) return;
      chips.hidden = true;
      preguntar(b.textContent.trim());
    });
  }

  /* ---------- enviar ---------- */

  if (form) {
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      if (ocupado) return;
      var texto = (input.value || "").trim();
      if (!texto) return;
      if (chips) chips.hidden = true;
      input.value = "";
      preguntar(texto);
    });
  }

  // Enter envía, Shift+Enter hace salto de línea
  if (input) {
    input.addEventListener("keydown", function (ev) {
      if (ev.key === "Enter" && !ev.shiftKey) {
        ev.preventDefault();
        if (form)
          form.dispatchEvent(new Event("submit", { cancelable: true }));
      }
    });
  }

  function preguntar(texto) {
    texto = texto.slice(0, MAX_CARACTERES);
    burbuja("user", texto);
    historia.push({ role: "user", content: texto });
    botonOcupado(true);

    var esperando = escribiendo();
    var cuerpo = null; // se crea al llegar el primer fragmento
    var acumulado = "";

    function fallo(msg) {
      if (esperando && esperando.parentNode) esperando.remove();
      if (cuerpo) cuerpo.textContent = acumulado + "\n\n" + msg;
      else burbuja("assistant", msg);
      botonOcupado(false);
      alFinal();
    }

    fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: sesion,
        page: location.href.slice(0, 500),
        messages: historia,
      }),
    })
      .then(function (res) {
        if (!res.ok || !res.body) {
          // Errores con cuerpo JSON (no llegaron a stream)
          return res
            .json()
            .catch(function () {
              return {};
            })
            .then(function (d) {
              if (d.error === "sin_llave")
                throw new Error(
                  "El agente todavía no está conectado. Déjanos tus datos en el formulario de abajo y te respondemos personalmente.",
                );
              if (d.error === "demasiadas")
                throw new Error(
                  "Vamos muy rápido. Espera un minuto y seguimos, o escríbenos a contacto@adlor-ia.com.",
                );
              throw new Error(
                "No pude contestar en este momento. Escríbenos a contacto@adlor-ia.com y lo vemos.",
              );
            });
        }

        var lector = res.body.getReader();
        var dec = new TextDecoder();
        var buffer = "";

        function leer() {
          return lector.read().then(function (r) {
            if (r.done) {
              terminar();
              return;
            }
            buffer += dec.decode(r.value, { stream: true });

            // Los eventos SSE se separan con una línea en blanco
            var partes = buffer.split("\n\n");
            buffer = partes.pop();

            partes.forEach(function (bloque) {
              var linea = bloque.split("\n").find(function (l) {
                return l.indexOf("data:") === 0;
              });
              if (!linea) return;
              var dato;
              try {
                dato = JSON.parse(linea.slice(5).trim());
              } catch (e) {
                return;
              }

              if (dato.t === "delta") {
                if (!cuerpo) {
                  if (esperando && esperando.parentNode) esperando.remove();
                  cuerpo = burbuja("assistant", "");
                }
                acumulado += dato.text;
                cuerpo.textContent = acumulado;
                alFinal();
              } else if (dato.t === "error") {
                fallo(dato.msg);
              }
            });

            return leer();
          });
        }

        function terminar() {
          if (esperando && esperando.parentNode) esperando.remove();
          if (acumulado) historia.push({ role: "assistant", content: acumulado });
          botonOcupado(false);
          if (input) input.focus();
          alFinal();
        }

        return leer();
      })
      .catch(function (err) {
        // Si falló, ese turno no cuenta: se saca para no ensuciar el contexto
        historia.pop();
        fallo(
          err && err.message
            ? err.message
            : "No pude contestar. Escríbenos a contacto@adlor-ia.com.",
        );
      });
  }
})();
