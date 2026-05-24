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
// SCROLL PROGRESS BAR — visible scroll indicator
// ============================================================
(function () {
  const bar = document.createElement('div');
  bar.className = 'scroll-bar';
  bar.innerHTML = '<div class="scroll-bar-fill"></div>';
  document.body.appendChild(bar);

  const fill = bar.querySelector('.scroll-bar-fill');
  let ticking = false;
  const update = () => {
    const scrolled = window.scrollY;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const percent = Math.min(100, Math.max(0, (scrolled / maxScroll) * 100));
    fill.style.width = percent + '%';

    // Also set the CSS var for page-head progress bar
    const pageHead = document.querySelector('.page-head');
    if (pageHead) {
      const rect = pageHead.getBoundingClientRect();
      const visible = Math.min(1, Math.max(0, 1 - rect.bottom / window.innerHeight));
      pageHead.style.setProperty('--scroll-progress', visible);
    }
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
