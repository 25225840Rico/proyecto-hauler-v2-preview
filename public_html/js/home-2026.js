/* Hauler · Home 2026 — comportamiento de interfaz
 *
 *  1. Video del hero: se conserva siempre, pero con carga diferida.
 *     El póster es el elemento LCP; el archivo mp4 solo se descarga cuando
 *     el hero está visible, no hay prefers-reduced-motion y la conexión no
 *     pide ahorro de datos. Un control visible permite pausarlo o activarlo.
 *  2. Barra inferior móvil: se oculta mientras el teclado virtual está
 *     activo para no tapar el campo enfocado.
 *  3. Revelado al hacer scroll y navegación activa, ambos anulados con
 *     prefers-reduced-motion.
 */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : { matches: false, addEventListener: null };

  function saveData() {
    var c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!c) return false;
    return c.saveData === true || /(^|-)2g$/.test(String(c.effectiveType || ''));
  }

  /* ============================================================
     1. VIDEO DEL HERO
  ============================================================ */
  (function heroVideo() {
    var media = document.getElementById('hero-media');
    var video = document.getElementById('hero-video');
    var toggle = document.getElementById('hero-video-toggle');
    if (!media || !video || !toggle) return;

    var label = toggle.querySelector('.h26-video-toggle-text');
    var loaded = false;
    var wanted = false;      // intención de la persona usuaria
    var inView = true;

    function setLabels(playing) {
      toggle.setAttribute('aria-pressed', playing ? 'false' : 'true');
      toggle.setAttribute('aria-label', playing ? 'Pausar el video de portada' : 'Reproducir el video de portada');
      if (label) label.textContent = playing ? 'Pausar video' : 'Reproducir video';
      media.dataset.video = playing ? 'playing' : 'paused';
    }

    function ensureSource() {
      if (loaded) return;
      loaded = true;
      video.src = video.dataset.src;
      video.load();
    }

    function play() {
      ensureSource();
      var p = video.play();
      if (p && typeof p.catch === 'function') {
        // Si el navegador bloquea la reproducción, el póster queda visible
        // y el control pasa a "Reproducir": nunca se muestra un hueco negro.
        p.then(function () { setLabels(true); }).catch(function () { setLabels(false); });
      } else {
        setLabels(true);
      }
    }

    function pause() {
      if (!video.paused) video.pause();
      setLabels(false);
    }

    toggle.hidden = false;
    setLabels(false);

    toggle.addEventListener('click', function () {
      wanted = video.paused;
      if (wanted) play(); else pause();
    });

    // Arranque automático solo si el contexto lo permite.
    function autoStart() {
      if (reduceMotion.matches || saveData()) return;
      wanted = true;
      play();
    }

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          inView = entry.isIntersecting;
          if (inView) {
            if (wanted || (!loaded && !reduceMotion.matches && !saveData())) autoStart();
          } else if (!video.paused) {
            video.pause();           // fuera de pantalla no gasta CPU ni batería
            media.dataset.video = 'paused';
          }
        });
      }, { threshold: 0.2 });
      io.observe(media);
    } else {
      autoStart();
    }

    video.addEventListener('playing', function () { setLabels(true); });
    video.addEventListener('pause', function () { if (inView) setLabels(false); });

    if (reduceMotion.addEventListener) {
      reduceMotion.addEventListener('change', function (e) {
        if (e.matches) { wanted = false; pause(); }
      });
    }
  })();

  /* ============================================================
     2. BARRA INFERIOR MÓVIL
  ============================================================ */
  (function mobileBar() {
    var bar = document.getElementById('h26-mobilebar');
    if (!bar) return;

    function typing(el) {
      if (!el) return false;
      var tag = el.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
    }

    function hide(state) { bar.dataset.oculta = state ? 'true' : 'false'; }

    document.addEventListener('focusin', function (e) { if (typing(e.target)) hide(true); });
    document.addEventListener('focusout', function () {
      window.setTimeout(function () { hide(typing(document.activeElement)); }, 60);
    });

    // En navegadores con visualViewport el teclado reduce la altura visible.
    if (window.visualViewport) {
      var base = window.visualViewport.height;
      window.visualViewport.addEventListener('resize', function () {
        var vv = window.visualViewport.height;
        if (vv < base * 0.75) hide(true);
        else if (!typing(document.activeElement)) { base = Math.max(base, vv); hide(false); }
      });
    }
  })();

  /* ============================================================
     3. REVELADO Y NAVEGACIÓN ACTIVA
  ============================================================ */
  (function reveal() {
    var targets = document.querySelectorAll('.h26-section, .h26-cta-final');
    if (!targets.length) return;
    if (reduceMotion.matches || !('IntersectionObserver' in window)) {
      Array.prototype.forEach.call(targets, function (el) { el.dataset.revelado = 'true'; });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.dataset.revelado = 'true';
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.05 });
    Array.prototype.forEach.call(targets, function (el) {
      el.dataset.revelado = 'false';
      io.observe(el);
    });
  })();

  (function activeNav() {
    var links = document.querySelectorAll('.navbar-nav .nav-link[href^="#"]');
    if (!links.length || !('IntersectionObserver' in window)) return;
    var byId = {};
    var sections = [];
    Array.prototype.forEach.call(links, function (link) {
      var id = link.getAttribute('href').slice(1);
      var section = id && document.getElementById(id);
      if (!section) return;
      byId[id] = link;
      sections.push(section);
    });
    if (!sections.length) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var link = byId[entry.target.id];
        if (!link) return;
        if (entry.isIntersecting) {
          Array.prototype.forEach.call(links, function (l) { l.removeAttribute('aria-current'); });
          link.setAttribute('aria-current', 'true');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(function (s) { io.observe(s); });
  })();
})();
