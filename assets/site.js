document.addEventListener('DOMContentLoaded', () => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const canAnimate = !reduced && fine;
  const hasGsap = typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined';

  // ---------- skeleton loaders ----------
  document.querySelectorAll('.media').forEach((el) => {
    const media = el.querySelector('img, video, iframe');
    if (!media) return;
    const markLoaded = () => el.classList.add('loaded');
    if (media.tagName === 'IMG') {
      if (media.complete && media.naturalWidth > 0) markLoaded();
      else {
        media.addEventListener('load', markLoaded);
        media.addEventListener('error', markLoaded);
      }
    } else if (media.tagName === 'VIDEO') {
      if (media.readyState >= 2) markLoaded();
      else {
        media.addEventListener('loadeddata', markLoaded);
        media.addEventListener('error', markLoaded);
      }
    } else {
      media.addEventListener('load', markLoaded);
    }
  });

  // ---------- hero video respects reduced motion ----------
  const heroVideo = document.querySelector('.hero-video');
  if (heroVideo && reduced) {
    heroVideo.removeAttribute('autoplay');
    heroVideo.pause();
  }

  // ---------- nav active state ----------
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.main-nav a, .footer-nav a, .mobile-nav a').forEach((link) => {
    const linkPage = (link.getAttribute('href') || '').split('#')[0] || 'index.html';
    if (linkPage === currentPage) link.classList.add('active');
  });

  // ---------- hamburger menu ----------
  const menuToggle = document.querySelector('.menu-toggle');
  const mobileNav = document.querySelector('.mobile-nav');
  if (menuToggle && mobileNav) {
    const setMenu = (open) => {
      menuToggle.classList.toggle('is-open', open);
      menuToggle.setAttribute('aria-expanded', String(open));
      mobileNav.classList.toggle('open', open);
      mobileNav.setAttribute('aria-hidden', String(!open));
      document.body.classList.toggle('menu-open', open);
    };
    menuToggle.addEventListener('click', () => {
      setMenu(!mobileNav.classList.contains('open'));
    });
    mobileNav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => setMenu(false));
    });
    window.addEventListener('resize', () => {
      if (window.innerWidth > 760) setMenu(false);
    });
  }

  // ---------- header settles into a solid bar past the intro band ----------
  const header = document.querySelector('.site-header');
  const introBand = document.querySelector('.hero, .page-header');
  const revealEls = Array.from(document.querySelectorAll('.reveal'));

  if (header) {
    const threshold = introBand ? Math.max(introBand.offsetHeight - 80, 80) : 80;
    const onScroll = () => header.classList.toggle('scrolled', window.scrollY > threshold);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  if (reduced || !hasGsap) {
    revealEls.forEach((el) => el.classList.add('in-view'));
  }

  if (!hasGsap) return;

  gsap.registerPlugin(ScrollTrigger);

  let lenis = null;
  if (canAnimate && window.Lenis) {
    lenis = new Lenis({ duration: 0.8, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  // route in-page anchor links through Lenis instead of letting native
  // smooth-scroll fight the Lenis-driven scroll position (this was the
  // cause of the slow/delayed scroll feel)
  document.querySelectorAll('a[href*="#"]').forEach((link) => {
    const href = link.getAttribute('href') || '';
    const [path, hash] = href.split('#');
    if (!hash) return;
    if (path && path !== currentPage) return;
    link.addEventListener('click', (e) => {
      const target = document.getElementById(hash);
      if (!target) return;
      e.preventDefault();
      if (lenis) {
        lenis.scrollTo(target, { offset: -80, duration: 1 });
      } else {
        target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
      }
    });
  });

  const heroSection = document.querySelector('.hero');

  if (!reduced && heroSection) {
    gsap.timeline({ defaults: { ease: 'power2.out', duration: 0.7 } })
      .to('.hero-content .badge', { opacity: 1, y: 0 }, 0)
      .to('.hero-content h1', { opacity: 1, y: 0 }, 0.1)
      .to('.hero-content .lede', { opacity: 1, y: 0 }, 0.2)
      .to('.hero-content .hero-ctas', { opacity: 1, y: 0 }, 0.3)
      .to('.hero-content .trust-row', { opacity: 1, y: 0 }, 0.4);
  }

  if (!reduced) {
    revealEls.forEach((el) => {
      if (el.closest('.hero-content')) return;
      gsap.fromTo(el, { opacity: 0, y: 24 }, {
        opacity: 1,
        y: 0,
        duration: 0.6,
        ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 88%', once: true },
      });
    });
  }

  if (canAnimate && heroSection) {
    gsap.to('.hero-media', {
      yPercent: 12,
      ease: 'none',
      scrollTrigger: { trigger: heroSection, start: 'top top', end: 'bottom top', scrub: true },
    });
  }

  if (canAnimate) {
    document.querySelectorAll('.btn-primary').forEach((btn) => {
      const xTo = gsap.quickTo(btn, 'x', { duration: 0.3, ease: 'power3' });
      const yTo = gsap.quickTo(btn, 'y', { duration: 0.3, ease: 'power3' });
      btn.addEventListener('mousemove', (e) => {
        const rect = btn.getBoundingClientRect();
        xTo((e.clientX - rect.left - rect.width / 2) * 0.3);
        yTo((e.clientY - rect.top - rect.height / 2) * 0.3);
      });
      btn.addEventListener('mouseleave', () => { xTo(0); yTo(0); });
    });
  }

  window.addEventListener('load', () => {
    if (lenis) lenis.resize();
    ScrollTrigger.refresh();
  });
});
