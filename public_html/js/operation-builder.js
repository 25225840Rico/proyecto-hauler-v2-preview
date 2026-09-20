/* Hauler · Operation Builder (prototipo frontend, sin envío de datos)
 *
 * Este módulo hace tres cosas:
 *   1. Mantiene un resumen en vivo de la operación mientras se escribe.
 *   2. Expone un esquema estable (hauler.operation/v1) que otros sistemas
 *      pueden leer o reconstruir sin depender del DOM.
 *   3. Valida en cliente y muestra el resultado en pantalla. NUNCA envía nada:
 *      el prototipo no puede aparentar que una solicitud fue recibida.
 */
(function (global) {
  'use strict';

  var SCHEMA = 'hauler.operation/v1';
  var EMPTY = 'Sin indicar';
  var LIVE_FORM_URL = 'https://hauler.cl/#cotizar';
  var WHATSAPP_URL = 'https://wa.link/te8k8u';

  var FREQ_LABELS = {
    'unico': 'Único', 'diario': 'Diario', '5x2': '5x2', '4x3': '4x3',
    '7x7': '7x7', '14x14': '14x14', 'otro': 'Otro'
  };
  var SERVICE_LABELS = {
    'recurrente': 'Transporte recurrente', 'faena-mineria': 'Faena minera',
    'corporativo': 'Corporativo', 'aeropuerto': 'Aeropuerto',
    'especial': 'Especial', 'otro': 'Otro'
  };

  /* ============================================================
     ESQUEMA ESTABLE — sin DOM, sin efectos secundarios.
     Permite que un agente conversacional arme o lea una operación
     con el mismo contrato que usa la interfaz.
  ============================================================ */
  function normalizeDate(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || '').trim());
    if (!m) return '';
    var d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    if (isNaN(d.getTime())) return '';
    return m[1] + '-' + m[2] + '-' + m[3];
  }

  function shortDate(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    return m ? m[3] + '/' + m[2] : '';
  }

  function longDate(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    if (!m) return EMPTY;
    var d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function text(value) { return typeof value === 'string' ? value.trim() : ''; }

  var HaulerOperation = {
    schema: SCHEMA,

    /** Construye una operación normalizada a partir de datos sueltos. */
    build: function (input) {
      var data = input || {};
      var pasajeros = parseInt(data.pasajeros, 10);
      var frecuencia = text(data.frecuencia);
      var servicio = text(data.tipo_servicio);
      return {
        schema: SCHEMA,
        ruta: {
          origen: text(data.origen),
          destino: text(data.destino)
        },
        demanda: {
          pasajeros: pasajeros >= 1 ? pasajeros : null,
          frecuencia: FREQ_LABELS[frecuencia] ? frecuencia : '',
          frecuenciaDetalle: frecuencia === 'otro' ? text(data.frecuencia_otro) : '',
          inicio: normalizeDate(data.fecha_inicio)
        },
        servicio: {
          tipo: SERVICE_LABELS[servicio] ? servicio : '',
          detalle: servicio === 'otro' ? text(data.tipo_servicio_otro) : ''
        },
        contexto: text(data.informacion_adicional)
      };
    },

    /**
     * Lee una línea compacta y devuelve la operación equivalente.
     * Formato: "Origen -> Destino | 14 pasajeros | 7x7 | Inicio 05/10"
     * Función pura: sirve para pruebas y para reconstruir estado.
     */
    parse: function (line) {
      var parts = String(line || '').split('|');
      var ruta = (parts[0] || '').split(/->|→/);
      var out = { origen: '', destino: '', pasajeros: '', frecuencia: '', fecha_inicio: '' };
      out.origen = text(ruta[0]);
      out.destino = text(ruta[1]);
      for (var i = 1; i < parts.length; i++) {
        var chunk = text(parts[i]);
        var pax = /^(\d+)\s*pasajer/i.exec(chunk);
        var inicio = /^inicio\s+(\d{2})\/(\d{2})$/i.exec(chunk);
        if (pax) {
          out.pasajeros = pax[1];
        } else if (inicio) {
          out.fecha_inicio = new Date().getFullYear() + '-' + inicio[2] + '-' + inicio[1];
        } else {
          var key = chunk.toLowerCase();
          Object.keys(FREQ_LABELS).forEach(function (code) {
            if (key === code || key === FREQ_LABELS[code].toLowerCase()) out.frecuencia = code;
          });
        }
      }
      return HaulerOperation.build(out);
    },

    /** Línea compacta de una operación, como la muestra el resumen. */
    toLine: function (operation) {
      var op = operation || {};
      var ruta = op.ruta || {};
      var dem = op.demanda || {};
      var bits = [];
      if (ruta.origen || ruta.destino) {
        bits.push((ruta.origen || EMPTY) + ' → ' + (ruta.destino || EMPTY));
      }
      if (dem.pasajeros) {
        bits.push(dem.pasajeros + (dem.pasajeros === 1 ? ' pasajero' : ' pasajeros'));
      }
      if (dem.frecuencia) {
        bits.push(dem.frecuencia === 'otro' && dem.frecuenciaDetalle
          ? dem.frecuenciaDetalle
          : FREQ_LABELS[dem.frecuencia]);
      }
      if (dem.inicio) bits.push('Inicio ' + shortDate(dem.inicio));
      return bits.join(' | ');
    }
  };

  global.HaulerOperation = HaulerOperation;

  /* ============================================================
     INTERFAZ
  ============================================================ */
  var form = document.getElementById('ob-form');
  if (!form) return;

  var btn = document.getElementById('ob-preview-btn');
  var btnText = btn ? btn.querySelector('.ob-boton-texto') : null;
  var msg = document.getElementById('ob-mensaje');
  var liveSr = document.getElementById('ob-resumen-sr');
  var lineOut = document.getElementById('ob-resumen-linea');
  var out = {
    origen: document.getElementById('ob-res-origen'),
    destino: document.getElementById('ob-res-destino'),
    pasajeros: document.getElementById('ob-res-pasajeros'),
    frecuencia: document.getElementById('ob-res-frecuencia'),
    fecha: document.getElementById('ob-res-fecha')
  };
  var BTN_LABEL = btnText ? btnText.textContent : 'Revisar operación';

  function val(name) {
    var el = form.elements[name];
    if (!el) return '';
    return typeof el.value === 'string' ? el.value.trim() : '';
  }

  function currentOperation() {
    return HaulerOperation.build({
      origen: val('origen'),
      destino: val('destino'),
      pasajeros: val('pasajeros'),
      frecuencia: val('frecuencia'),
      frecuencia_otro: val('frecuencia_otro'),
      fecha_inicio: val('fecha_inicio'),
      tipo_servicio: val('tipo_servicio'),
      tipo_servicio_otro: val('tipo_servicio_otro'),
      informacion_adicional: val('informacion_adicional')
    });
  }

  function renderSummary() {
    var op = currentOperation();
    var dem = op.demanda;
    out.origen.textContent = op.ruta.origen || EMPTY;
    out.destino.textContent = op.ruta.destino || EMPTY;
    out.pasajeros.textContent = dem.pasajeros
      ? dem.pasajeros + (dem.pasajeros === 1 ? ' pasajero' : ' pasajeros')
      : EMPTY;
    out.frecuencia.textContent = dem.frecuencia
      ? (dem.frecuencia === 'otro' && dem.frecuenciaDetalle ? dem.frecuenciaDetalle : FREQ_LABELS[dem.frecuencia])
      : EMPTY;
    out.fecha.textContent = dem.inicio ? longDate(dem.inicio) : EMPTY;
    if (lineOut) {
      var line = HaulerOperation.toLine(op);
      lineOut.textContent = line || 'Completa los campos para ver el resumen.';
      lineOut.dataset.vacio = line ? 'false' : 'true';
    }
    return op;
  }

  var srTimer;
  function announceSummary() {
    if (!liveSr) return;
    clearTimeout(srTimer);
    srTimer = setTimeout(function () {
      var line = HaulerOperation.toLine(currentOperation());
      liveSr.textContent = line ? 'Resumen actualizado: ' + line + '.' : '';
    }, 1200);
  }

  /* ---------- Campos condicionales ---------- */
  function syncConditional(groupName, condId) {
    var wrap = document.getElementById(condId);
    if (!wrap) return;
    var show = val(groupName) === 'otro';
    wrap.hidden = !show;
  }

  function syncConditionals() {
    syncConditional('frecuencia', 'ob-cond-frecuencia');
    syncConditional('tipo_servicio', 'ob-cond-tipo');
  }

  /* ---------- Validación ---------- */
  var rules = [
    { name: 'origen', error: 'Indica el origen del traslado.', ok: function (v) { return v !== ''; } },
    { name: 'destino', error: 'Indica el destino del traslado.', ok: function (v) { return v !== ''; } },
    { name: 'pasajeros', error: 'Ingresa un número de pasajeros de 1 o más.', ok: function (v) { return /^\d+$/.test(v) && parseInt(v, 10) >= 1; } },
    { name: 'frecuencia', group: true, error: 'Elige la frecuencia del servicio.', ok: function (v) { return v !== ''; } },
    { name: 'empresa', error: 'Indica el nombre de la empresa.', ok: function (v) { return v !== ''; } },
    { name: 'nombre_contacto', error: 'Indica el nombre de la persona de contacto.', ok: function (v) { return v !== ''; } },
    { name: 'telefono', error: 'Ingresa un teléfono con al menos 8 dígitos.', ok: function (v) { return v.replace(/\D/g, '').length >= 8; } },
    { name: 'correo', error: 'El correo no parece válido. Puedes dejarlo vacío.', ok: function (v) { return v === '' || form.elements.correo.checkValidity(); } }
  ];

  function fieldEl(rule) {
    return rule.group ? document.getElementById('ob-grupo-' + rule.name) : form.elements[rule.name];
  }

  function setError(rule, text) {
    var el = fieldEl(rule);
    var err = document.getElementById('ob-err-' + rule.name);
    if (!el || !err) return;
    err.textContent = text || '';
    err.hidden = !text;
    if (!rule.group) {
      if (text) el.setAttribute('aria-invalid', 'true'); else el.removeAttribute('aria-invalid');
    }
  }

  function checkRule(rule) {
    var good = rule.ok(val(rule.name));
    setError(rule, good ? '' : rule.error);
    return good;
  }

  function validate() {
    var first = null;
    var count = 0;
    rules.forEach(function (rule) {
      if (!checkRule(rule)) {
        count++;
        if (!first) first = rule;
      }
    });
    return { count: count, first: first };
  }

  /* ---------- Estados del botón (default / loading / success / error) ---------- */
  var resetTimer;
  function setButtonState(state, label) {
    if (!btn) return;
    clearTimeout(resetTimer);
    btn.dataset.estado = state;
    btn.disabled = state === 'cargando';
    btn.setAttribute('aria-busy', state === 'cargando' ? 'true' : 'false');
    if (btnText) btnText.textContent = label || BTN_LABEL;
    if (state === 'ok' || state === 'error') {
      resetTimer = setTimeout(function () { setButtonState('default'); }, 4000);
    }
  }

  /* ---------- Mensaje inline ---------- */
  function showMessage(html, tipo, focus) {
    if (!msg) return;
    msg.dataset.tipo = tipo;
    msg.innerHTML = html;
    if (focus) msg.focus();
  }

  function track(name, payload) {
    if (typeof global.haulerTrack === 'function') global.haulerTrack(name, payload);
  }

  function preview() {
    var result = validate();
    if (result.count) {
      setButtonState('error', 'Revisa los campos');
      showMessage('<p class="ob-mensaje-titulo">Faltan datos por revisar</p>' +
        '<p>Corrige ' + result.count + (result.count === 1 ? ' campo marcado' : ' campos marcados') + ' antes de continuar.</p>',
        'error', false);
      var target = result.first.group
        ? form.querySelector('input[name="' + result.first.name + '"]')
        : form.elements[result.first.name];
      if (target) target.focus();
      track('form_error', { campos_con_error: result.count, primer_campo: result.first.name });
      return;
    }

    setButtonState('cargando', 'Revisando…');
    track('form_submit_attempt', { modo: 'prototipo_sin_envio' });

    // Pausa breve y deliberada: deja ver el estado de carga sin simular
    // en ningún momento que la solicitud viajó a un servidor.
    window.setTimeout(function () {
      var op = renderSummary();
      setButtonState('ok', 'Resumen listo');
      showMessage(
        '<p class="ob-mensaje-titulo">Vista previa: no se envió ninguna solicitud</p>' +
        '<p>Este formulario es un prototipo y no envía datos. Tu operación quedó descrita así:</p>' +
        '<p class="ob-mensaje-linea">' + escapeHtml(HaulerOperation.toLine(op)) + '</p>' +
        '<p>Para cotizar de verdad, usa el formulario vigente de Hauler o escríbenos por WhatsApp si es urgente.</p>' +
        '<p class="ob-mensaje-links">' +
        '<a class="ob-link ob-link--primary" href="' + LIVE_FORM_URL + '" target="_blank" rel="noopener">Ir al formulario de cotización vigente</a>' +
        '<a class="ob-link" href="' + WHATSAPP_URL + '" target="_blank" rel="noopener">Escribir por WhatsApp</a>' +
        '</p>', 'ok', true);
    }, 420);
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---------- Eventos ---------- */
  var started = false;
  function onChange(e) {
    if (!started) {
      started = true;
      track('form_start', { formulario: 'operation_builder' });
    }
    syncConditionals();
    renderSummary();
    announceSummary();
    var name = e.target && e.target.name;
    rules.forEach(function (rule) {
      var err = document.getElementById('ob-err-' + rule.name);
      if (rule.name === name && err && !err.hidden) checkRule(rule);
    });
  }

  form.addEventListener('input', onChange);
  form.addEventListener('change', onChange);
  form.addEventListener('submit', function (e) { e.preventDefault(); preview(); });
  if (btn) btn.addEventListener('click', preview);

  syncConditionals();
  renderSummary();
})(window);
