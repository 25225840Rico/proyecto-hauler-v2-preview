/* Keep the fleet video available without playing through reduced-motion or offscreen views. */
(() => {
  const videos = [...document.querySelectorAll('.service-hero__video')];
  if (!videos.length) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const visible = new WeakMap();
  const sync = (video) => {
    if (reduced.matches || !visible.get(video)) {
      video.pause();
      return;
    }
    video.play().catch(() => { /* Native controls remain available. */ });
  };
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        visible.set(entry.target, entry.isIntersecting);
        sync(entry.target);
      });
    }, { threshold: 0.1 });
    videos.forEach((video) => observer.observe(video));
  } else {
    videos.forEach((video) => {
      visible.set(video, true);
      sync(video);
    });
  }
  const resync = () => videos.forEach(sync);
  if (reduced.addEventListener) reduced.addEventListener('change', resync);
  else reduced.addListener(resync);
})();
