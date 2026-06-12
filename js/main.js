/* SHINING LIGHT ACADEMY — Apple-style interactions */

// ============================================================
// NAV
// ============================================================
(function () {
  const nav = document.querySelector('.nav');
  const navToggle = document.querySelector('.nav-toggle');
  const navLinks = document.querySelector('.nav-links');
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => navLinks.classList.toggle('open'));
    navLinks.querySelectorAll('a').forEach(a => a.addEventListener('click', () => navLinks.classList.remove('open')));
  }
  if (nav) {
    const updateNav = () => {
      if (window.scrollY > 10) nav.classList.add('scrolled');
      else nav.classList.remove('scrolled');
    };
    updateNav();
    window.addEventListener('scroll', updateNav, { passive: true });
  }
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPath || (currentPath === '' && href === 'index.html')) link.classList.add('active');
  });
})();

// ============================================================
// SCROLL REVEAL
// ============================================================
(function () {
  const REVEAL_SELECTOR = '.reveal, .reveal-stagger, .reveal-up, .reveal-left, .reveal-right, .reveal-scale';
  if (!('IntersectionObserver' in window)) {
    document.querySelectorAll(REVEAL_SELECTOR).forEach(el => el.classList.add('in'));
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -50px 0px' });
  document.querySelectorAll(REVEAL_SELECTOR).forEach(el => observer.observe(el));
})();

// ============================================================
// HERO PARALLAX — subtle bg shift on scroll
// ============================================================
(function () {
  const heroBg = document.querySelector('.hero-bg img');
  if (!heroBg) return;
  let ticking = false;
  const update = () => {
    const scrolled = window.scrollY;
    if (scrolled < window.innerHeight * 1.5) {
      heroBg.style.transform = `translateY(${scrolled * 0.3}px) scale(${1 + scrolled * 0.0002})`;
    }
    ticking = false;
  };
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
  }, { passive: true });
})();

// ============================================================
// CARD SHUFFLE
// ============================================================
(function () {
  const stage = document.querySelector('[data-shuffle-stage]');
  if (!stage) return;
  const cards = Array.from(stage.querySelectorAll('.shuffle-card'));
  const counter = document.querySelector('[data-shuffle-counter]');
  const prevBtn = document.querySelector('[data-shuffle-prev]');
  const nextBtn = document.querySelector('[data-shuffle-next]');
  if (cards.length === 0) return;
  let current = 0;
  function update() {
    cards.forEach((card, i) => {
      const offset = (i - current + cards.length) % cards.length;
      if (offset === 0) {
        card.style.transform = 'translateZ(0) translateY(0) rotate(0deg)';
        card.style.opacity = '1'; card.style.zIndex = '5';
      } else if (offset === 1) {
        card.style.transform = 'translateZ(-60px) translateY(20px) rotate(3deg)';
        card.style.opacity = '0.75'; card.style.zIndex = '4';
      } else if (offset === 2) {
        card.style.transform = 'translateZ(-120px) translateY(40px) rotate(-4deg)';
        card.style.opacity = '0.5'; card.style.zIndex = '3';
      } else {
        card.style.transform = 'translateZ(-200px) translateY(60px)';
        card.style.opacity = '0'; card.style.zIndex = '0';
      }
    });
    if (counter) counter.textContent = String(current + 1).padStart(2, '0') + ' / ' + String(cards.length).padStart(2, '0');
  }
  function next() { current = (current + 1) % cards.length; update(); }
  function prev() { current = (current - 1 + cards.length) % cards.length; update(); }
  if (nextBtn) nextBtn.addEventListener('click', next);
  if (prevBtn) prevBtn.addEventListener('click', prev);
  cards.forEach((card, i) => {
    card.addEventListener('click', () => { if (i !== current) { current = i; update(); } else next(); });
  });
  let autoTimer = setInterval(next, 5000);
  stage.addEventListener('mouseenter', () => clearInterval(autoTimer));
  stage.addEventListener('mouseleave', () => { autoTimer = setInterval(next, 5000); });
  update();
})();

// ============================================================
// GALLERY CAROUSELS
// ============================================================
(function () {
  document.querySelectorAll('[data-gallery-carousel]').forEach(carousel => {
    const track = carousel.querySelector('.gallery-carousel-track');
    const slides = Array.from(track.children);
    const dots = Array.from(carousel.querySelectorAll('.gallery-carousel-dot'));
    const prevBtn = carousel.querySelector('.gallery-carousel-nav.prev');
    const nextBtn = carousel.querySelector('.gallery-carousel-nav.next');
    let current = 0;
    function goTo(i) {
      current = (i + slides.length) % slides.length;
      track.style.transform = `translateX(-${current * 100}%)`;
      dots.forEach((d, di) => d.classList.toggle('active', di === current));
    }
    if (prevBtn) prevBtn.addEventListener('click', () => goTo(current - 1));
    if (nextBtn) nextBtn.addEventListener('click', () => goTo(current + 1));
    dots.forEach((d, di) => d.addEventListener('click', () => goTo(di)));
    let autoTimer = setInterval(() => goTo(current + 1), 6000);
    carousel.addEventListener('mouseenter', () => clearInterval(autoTimer));
    carousel.addEventListener('mouseleave', () => { autoTimer = setInterval(() => goTo(current + 1), 6000); });
    goTo(0);
  });
})();

// ============================================================
// TEACHER ACCORDIONS
// ============================================================
(function () {
  document.querySelectorAll('.teacher-toggle').forEach(toggle => {
    toggle.addEventListener('click', () => {
      const card = toggle.closest('.teacher-card');
      if (card) card.classList.toggle('open');
    });
  });
})();

// ============================================================
// FOOTER YEAR
// ============================================================
(function () {
  const y = document.getElementById('current-year');
  if (y) y.textContent = new Date().getFullYear();
})();

// ============================================================
// SECTION INDICATOR — chapter dots on right side
// ============================================================
(function () {
  const sections = document.querySelectorAll('main > section, body > section, .hero, .page-head');
  if (sections.length < 2) return;

  const indicator = document.createElement('nav');
  indicator.className = 'section-indicator';
  indicator.setAttribute('aria-label', 'Page sections');

  sections.forEach((section, i) => {
    const dot = document.createElement('button');
    dot.className = 'section-indicator-dot';
    dot.setAttribute('aria-label', `Section ${i + 1}`);
    dot.dataset.idx = i;
    dot.addEventListener('click', () => {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    indicator.appendChild(dot);
  });

  document.body.appendChild(indicator);

  const dots = Array.from(indicator.querySelectorAll('.section-indicator-dot'));

  let ticking = false;
  const update = () => {
    const viewportMiddle = window.scrollY + window.innerHeight * 0.4;
    let activeIdx = 0;
    sections.forEach((section, i) => {
      const top = section.offsetTop;
      if (top <= viewportMiddle) activeIdx = i;
    });
    dots.forEach((d, i) => d.classList.toggle('active', i === activeIdx));

    // Show/hide based on scroll position — hide near top and bottom
    const scrollPct = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight);
    if (scrollPct < 0.02) indicator.classList.remove('visible');
    else indicator.classList.add('visible');

    ticking = false;
  };

  window.addEventListener('scroll', () => {
    if (!ticking) { requestAnimationFrame(update); ticking = true; }
  }, { passive: true });
  update();
})();

// ============================================================
// SPLIT TEXT — letter-by-letter reveal for big titles
// ============================================================
(function () {
  document.querySelectorAll('.split-text').forEach(el => {
    if (el.dataset.splitDone) return;
    const text = el.textContent.trim();
    const words = text.split(' ');
    el.innerHTML = words.map(w => `<span class="word"><span>${w}</span></span>`).join(' ');
    el.dataset.splitDone = '1';
  });
  if ('IntersectionObserver' in window) {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });
    document.querySelectorAll('.split-text').forEach(el => obs.observe(el));
  } else {
    document.querySelectorAll('.split-text').forEach(el => el.classList.add('in'));
  }
})();

// ============================================================
// PORTFOLIO ACCORDION — toggle each grade
// ============================================================
(function () {
  document.querySelectorAll('.portfolio-header').forEach(header => {
    header.addEventListener('click', () => {
      const item = header.closest('.portfolio-item');
      if (item) item.classList.toggle('open');
    });
  });
})();

// ============================================================
// SUB-PAGE SCROLL EFFECTS — gentle scale on cards as they enter
// ============================================================
(function () {
  if (!('IntersectionObserver' in window)) return;
  const cards = document.querySelectorAll('.level-block, .teacher-card, .gallery-set, .portfolio-item');
  if (cards.length === 0) return;
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -10% 0px' });
  cards.forEach(c => obs.observe(c));
})();

// ============================================================
// COLLAGE CELL CAROUSELS — each photo cell auto-rotates + nav
// ============================================================
(function () {
  document.querySelectorAll('.collage-cell-carousel').forEach(carousel => {
    const track = carousel.querySelector('.collage-cell-track');
    if (!track) return;
    const slides = Array.from(track.children);
    if (slides.length <= 1) return;
    const dots = Array.from(carousel.querySelectorAll('.collage-cell-dot'));
    const prevBtn = carousel.querySelector('.collage-cell-nav.prev');
    const nextBtn = carousel.querySelector('.collage-cell-nav.next');
    let current = 0;

    function goTo(i) {
      current = (i + slides.length) % slides.length;
      track.style.transform = `translateX(-${current * 100}%)`;
      dots.forEach((d, di) => d.classList.toggle('active', di === current));
    }

    if (prevBtn) prevBtn.addEventListener('click', (e) => { e.stopPropagation(); goTo(current - 1); });
    if (nextBtn) nextBtn.addEventListener('click', (e) => { e.stopPropagation(); goTo(current + 1); });
    dots.forEach((d, di) => d.addEventListener('click', (e) => { e.stopPropagation(); goTo(di); }));

    // Slow auto-advance, staggered slightly per cell so they don't all sync
    const delay = 4500 + Math.random() * 2500;
    let timer = setInterval(() => goTo(current + 1), delay);
    const cell = carousel.closest('.collage-cell');
    if (cell) {
      cell.addEventListener('mouseenter', () => clearInterval(timer));
      cell.addEventListener('mouseleave', () => { timer = setInterval(() => goTo(current + 1), delay); });
    }
    goTo(0);
  });
})();

// ============================================================
// INTRO ANIMATION — Logo emergence + light burst
// Plays once per browser tab session.
// ============================================================
(function () {
  // Skip on admin/login pages, or if already shown this session
  const path = window.location.pathname;
  if (path.endsWith('/admin.html') || path.endsWith('/login.html')) return;
  if (sessionStorage.getItem('sla-intro-shown')) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  sessionStorage.setItem('sla-intro-shown', '1');

  // Build the overlay
  const overlay = document.createElement('div');
  overlay.className = 'sla-intro';
  overlay.setAttribute('aria-hidden', 'true');
  overlay.innerHTML = `
    <div class="sla-intro-content">
      <div class="sla-intro-rays"></div>
      <div class="sla-intro-particles"></div>
      <img src="images/sla-logo.svg" alt="" class="sla-intro-logo" />
    </div>
  `;
  // Insert at top of body
  if (document.body) {
    document.body.insertBefore(overlay, document.body.firstChild);
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      document.body.insertBefore(overlay, document.body.firstChild);
    }, { once: true });
  }

  // Generate particles bursting outward
  const particles = overlay.querySelector('.sla-intro-particles');
  const colors = [
    'rgba(255, 220, 100, 0.95)',  // gold
    'rgba(255, 240, 180, 0.95)',  // bright cream
    'rgba(255, 200, 80, 0.9)',    // amber
    'rgba(255, 255, 255, 0.85)',  // white
  ];
  const COUNT = 36;
  for (let i = 0; i < COUNT; i++) {
    const p = document.createElement('div');
    p.className = 'sla-intro-particle';
    const angle = (i / COUNT) * Math.PI * 2 + (Math.random() * 0.3);
    const distance = 200 + Math.random() * 400;
    const size = 3 + Math.random() * 10;
    const delay = 0.55 + Math.random() * 0.35;
    p.style.setProperty('--tx', `${Math.cos(angle) * distance}px`);
    p.style.setProperty('--ty', `${Math.sin(angle) * distance}px`);
    p.style.setProperty('--size', `${size}px`);
    p.style.setProperty('--delay', `${delay}s`);
    p.style.setProperty('--p-color', colors[i % colors.length]);
    particles.appendChild(p);
  }

  // Remove after animation completes (total ~2.4s)
  setTimeout(() => {
    overlay.classList.add('done');
    setTimeout(() => overlay.remove(), 900);
  }, 2300);
})();

// ============================================================
// SUBTLE CURSOR FOLLOWER (gold glow that trails the mouse)
// Only on devices with a fine pointer (desktop).
// ============================================================
(function () {
  if (!window.matchMedia('(pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const cursor = document.createElement('div');
  cursor.className = 'sla-cursor';
  document.body.appendChild(cursor);

  let mouseX = -100, mouseY = -100;
  let currX = -100, currY = -100;
  let ticking = false;

  function animate() {
    // Smooth lerp toward target
    currX += (mouseX - currX) * 0.22;
    currY += (mouseY - currY) * 0.22;
    cursor.style.left = currX + 'px';
    cursor.style.top = currY + 'px';
    ticking = false;
    if (Math.abs(mouseX - currX) > 0.5 || Math.abs(mouseY - currY) > 0.5) {
      requestAnimationFrame(animate);
      ticking = true;
    }
  }

  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    cursor.classList.add('visible');
    if (!ticking) {
      requestAnimationFrame(animate);
      ticking = true;
    }
  });

  document.addEventListener('mouseleave', () => {
    cursor.classList.remove('visible');
  });

  // Scale up when hovering interactive elements
  document.addEventListener('mouseover', (e) => {
    const t = e.target;
    if (t.closest && t.closest('a, button, .grade-btn, .teacher-card, .shuffle-card, .gallery-collage-cell, .tool-card')) {
      cursor.classList.add('hovering');
    }
  });
  document.addEventListener('mouseout', (e) => {
    const t = e.target;
    if (t.closest && t.closest('a, button, .grade-btn, .teacher-card, .shuffle-card, .gallery-collage-cell, .tool-card')) {
      cursor.classList.remove('hovering');
    }
  });
})();
