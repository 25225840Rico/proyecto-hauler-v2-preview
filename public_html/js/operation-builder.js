/* Hauler · Operation Builder (prototipo frontend, sin envío de datos) */
(function () {
  'use strict';

  var form = document.getElementById('ob-form');
  if (!form) return;

  var LIVE_FORM_URL = 'https://hauler.cl/#cotizar';
  var WHATSAPP_URL = 'https://wa.link/te8k8u';

  var btn = document.getElementById('ob-preview-btn');
  var msg = document.getElementById('ob-mensaje');
  var liveSr = document.getElementById('ob-resumen-sr');
  var out = {
    origen: document.getElementById('ob-res-origen'),
    destino: document.getElementById('ob-res-destino'),
    pasajeros: document.getElementById('ob-res-pasajeros'),
    frecuencia: document.getElementById('ob-res-frecuencia'),
    fecha: document.getElementById('ob-res-fecha')
  };

  var EMPTY = 'Sin indicar';
  var FREQ_LABELS = {
    'unico': 'Único', 'diario': 'Diario', '5x2': '5x2', '4x3': '4x3',
    '7x7': '7x7', '14x14': '14x14', 'otro': 'Otro'
  };

  function val(name) {
    var el = form.elements[name];
    return el && typeof el.value === 'string' ? el.value.trim() : '';
  }

  function formatDate(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    if (!m) return EMPTY;
    var d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    if (isNaN(d.getTime())) return EMPTY;
    return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function summaryData() {
    var n = parseInt(val('pasajeros'), 10);
    var f = val('frecuencia');
    return {
      origen: val('origen') || EMPTY,
      destino: val('destino') || EMPTY,
      pasajeros: n >= 1 ? n + (n === 1 ? ' pasajero' : ' pasajeros') : EMPTY,
      frecuencia: FREQ_LABELS[f] || EMPTY,
      fecha: val('fecha_inicio') ? formatDate(val('fecha_inicio')) : EMPTY
    };
  }

  function renderSummary() {
    var s = summaryData();
    Object.keys(out).forEach(function (k) { out[k].textContent = s[k]; });
    return s;
  }

  var srTimer;
  function announceSummary() {
    clearTimeout(srTimer);
    srTimer = setTimeout(function () {
      var s = summaryData();
      liveSr.textContent = 'Resumen actualizado: de ' + s.origen + ' a ' + s.destino +
        ', ' + s.pasajeros + ', frecuencia ' + s.frecuencia + ', inicio ' + s.fecha + '.';
    }, 1200);
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

  /* ---------- Mensaje inline ---------- */
  function showMessage(html, focus) {
    msg.innerHTML = html;
    if (focus) msg.focus();
  }

  function preview() {
    var result = validate();
    if (result.count) {
      showMessage('<p class="ob-mensaje-titulo">Faltan datos por revisar</p>' +
        '<p>Corrige ' + result.count + (result.count === 1 ? ' campo marcado' : ' campos marcados') + ' antes de continuar.</p>', false);
      var target = result.first.group
        ? form.querySelector('input[name="' + result.first.name + '"]')
        : form.elements[result.first.name];
      if (target) target.focus();
      return;
    }
    showMessage(
      '<p class="ob-mensaje-titulo">Vista previa: no se envió ninguna solicitud</p>' +
      '<p>Este formulario es un prototipo y no envía datos. Para cotizar, usa el formulario vigente de Hauler o escríbenos por WhatsApp si es urgente.</p>' +
      '<p class="ob-mensaje-links">' +
      '<a class="ob-link ob-link--primary" href="' + LIVE_FORM_URL + '" target="_blank" rel="noopener">Ir al formulario de cotización vigente</a>' +
      '<a class="ob-link" href="' + WHATSAPP_URL + '" target="_blank" rel="noopener">Escribir por WhatsApp</a>' +
      '</p>', true);
  }

  /* ---------- Eventos ---------- */
  function onChange(e) {
    renderSummary();
    announceSummary();
    var name = e.target && e.target.name;
    rules.forEach(function (rule) {
      if (rule.name === name && !document.getElementById('ob-err-' + name).hidden) checkRule(rule);
    });
  }

  form.addEventListener('input', onChange);
  form.addEventListener('change', onChange);
  form.addEventListener('submit', function (e) { e.preventDefault(); preview(); });
  btn.addEventListener('click', preview);

  renderSummary();
})();
