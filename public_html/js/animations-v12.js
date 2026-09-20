/* ============================================================
   HAULER · MOTION ENGINE v12 (2026)
   Cambios vs v10:
   - Navbar: se eliminó el auto-hide al hacer scroll (se percibía
     desfasado); queda solo el estado glass "scrolled".
   - Resto igual: scroll reveal, smooth scroll, scrollspy, cierre
     del menú móvil.
============================================================ */

(function () {
  'use strict';

  // ----------------------------------------------------------
  // 1. NAVBAR — Glass al scroll (sin auto-hide)
  // ----------------------------------------------------------
  const navbar = document.querySelector('.navbar');
  if (navbar) {
    let ticking = false;
    const SCROLL_THRESHOLD = 30;

    function updateNavbar() {
      navbar.classList.toggle('scrolled', window.pageYOffset > SCROLL_THRESHOLD);
      ticking = false;
    }

    window.addEventListener('scroll', function () {
      if (!ticking) {
        window.requestAnimationFrame(updateNavbar);
        ticking = true;
      }
    }, { passive: true });

    updateNavbar();
  }

  // ----------------------------------------------------------
  // 2. SCROLL REVEAL — Aparición sutil al hacer scroll
  // ----------------------------------------------------------
  function setupScrollReveal() {
    const revealSelectors = [
      '#quienes-somos .texto-quienes',
      '#quienes-somos .carrusel-wrapper',
      '.mision',
      '.vision',
      '.servicios-detallados .col-md-6',
      '.servicios-detallados .col-12',
      '#preguntas-frecuentes .accordion-item',
      '.seccion-faq .accordion-item',
      '.form-container',
      '.vehiculo-form',
      '.seccion-agenda-cita form',
      '.beneficios-proveedores .card-beneficio',
      '.seccion-evaluacion .card',
      '.seccion-banner .row'
    ];

    revealSelectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => el.classList.add('reveal'));
    });

    document.querySelectorAll('.valores-section .row.g-4, .beneficios-proveedores .row.g-4').forEach(el => {
      el.classList.add('reveal-stagger');
    });

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -40px 0px'
    });

    document.querySelectorAll('.reveal, .reveal-stagger').forEach(el => observer.observe(el));
  }

  // ----------------------------------------------------------
  // 3. SMOOTH SCROLL para anchors internos
  // ----------------------------------------------------------
  function setupSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function (e) {
        const targetId = this.getAttribute('href');
        if (targetId === '#' || targetId.length < 2) return;
        const target = document.querySelector(targetId);
        if (target) {
          e.preventDefault();
          const top = target.getBoundingClientRect().top + window.pageYOffset - 80;
          window.scrollTo({ top, behavior: 'smooth' });
        }
      });
    });
  }

  // ----------------------------------------------------------
  // 4. MOBILE MENU — Cierra al hacer clic en cualquier link
  // ----------------------------------------------------------
  function setupMobileMenuClose() {
    const navbarCollapse = document.getElementById('navbarNav');
    if (!navbarCollapse) return;

    document.querySelectorAll('.navbar-nav .nav-link').forEach(link => {
      link.addEventListener('click', function () {
        if (navbarCollapse.classList.contains('show')) {
          if (typeof bootstrap !== 'undefined' && bootstrap.Collapse) {
            const collapseInstance = bootstrap.Collapse.getInstance(navbarCollapse)
              || new bootstrap.Collapse(navbarCollapse, { toggle: false });
            collapseInstance.hide();
          } else {
            navbarCollapse.classList.remove('show');
          }
        }
      });
    });
  }

  // ----------------------------------------------------------
  // 5. NAVBAR ACTIVE STATE — Detección de sección visible (scrollspy)
  // ----------------------------------------------------------
  function setupNavbarActiveState() {
    const navLinks = Array.from(document.querySelectorAll('.navbar-nav .nav-link'));
    if (!navLinks.length) return;

    const sectionMap = new Map();
    navLinks.forEach(link => {
      const href = link.getAttribute('href') || '';
      const hashIdx = href.indexOf('#');
      if (hashIdx !== -1) {
        const id = href.substring(hashIdx + 1);
        if (id) {
          const section = document.getElementById(id);
          if (section) sectionMap.set(link, section);
        }
      }
    });

    navLinks.forEach(link => {
      link.addEventListener('click', function () {
        navLinks.forEach(el => el.classList.remove('active'));
        this.classList.add('active');
      });
    });

    if (sectionMap.size === 0) return;

    const scrollSpy = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          for (const [link, section] of sectionMap.entries()) {
            if (section === entry.target) {
              navLinks.forEach(el => el.classList.remove('active'));
              link.classList.add('active');
              break;
            }
          }
        }
      });
    }, {
      rootMargin: '-30% 0px -60% 0px',
      threshold: 0
    });

    sectionMap.forEach((section) => scrollSpy.observe(section));
  }

  // ----------------------------------------------------------
  // INIT
  // ----------------------------------------------------------
  function init() {
    setupScrollReveal();
    setupSmoothScroll();
    setupMobileMenuClose();
    setupNavbarActiveState();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

/* ── Typewriter v12: escribe el texto al entrar en viewport (elementos .typewrite) ── */
(function () {
  var els = document.querySelectorAll('.typewrite');
  if (!els.length) return;
  /* Respeto a reduced-motion y fallback sin IO: el texto queda estático tal como vino del servidor */
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;

  function type(el) {
    var full = el.textContent;
    el.setAttribute('aria-label', full);          /* lectores de pantalla leen el texto completo */
    el.style.minHeight = el.offsetHeight + 'px';  /* evita salto de layout al vaciar */
    el.textContent = '';
    el.classList.add('typewrite--typing');
    var i = 0;
    (function tick() {
      i++;
      el.textContent = full.slice(0, i);
      if (i < full.length) {
        setTimeout(tick, 26);
      } else {
        el.classList.remove('typewrite--typing');
        el.removeAttribute('aria-label');
      }
    })();
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        io.unobserve(entry.target);
        type(entry.target);
      }
    });
  }, { threshold: 0.4 });

  els.forEach(function (el) { io.observe(el); });
})();
