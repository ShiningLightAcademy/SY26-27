/* SHINING LIGHT ACADEMY — Site Interactions v2 */

// ============================================================
// NAV: toggle, scroll state, active link
// ============================================================
(function () {
  const nav = document.querySelector('.nav');
  const navToggle = document.querySelector('.nav-toggle');
  const navLinks = document.querySelector('.nav-links');

  // Mobile toggle
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      navLinks.classList.toggle('open');
    });
    navLinks.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => navLinks.classList.remove('open'));
    });
  }

  // Scroll state — adds bottom border once you scroll
  if (nav) {
    const updateNav = () => {
      if (window.scrollY > 10) nav.classList.add('scrolled');
      else nav.classList.remove('scrolled');
    };
    updateNav();
    window.addEventListener('scroll', updateNav, { passive: true });
  }

  // Active link
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPath || (currentPath === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });
})();

// ============================================================
// SCROLL REVEAL
// ============================================================
(function () {
  if (!('IntersectionObserver' in window)) {
    document.querySelectorAll('.reveal, .reveal-stagger').forEach(el => el.classList.add('in'));
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
  document.querySelectorAll('.reveal, .reveal-stagger').forEach(el => observer.observe(el));
})();

// ============================================================
// CARD SHUFFLE — homepage carousel
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
        card.style.opacity = '1';
        card.style.zIndex = '5';
      } else if (offset === 1) {
        card.style.transform = 'translateZ(-60px) translateY(20px) rotate(3deg)';
        card.style.opacity = '0.75';
        card.style.zIndex = '4';
      } else if (offset === 2) {
        card.style.transform = 'translateZ(-120px) translateY(40px) rotate(-4deg)';
        card.style.opacity = '0.5';
        card.style.zIndex = '3';
      } else if (offset === cards.length - 1) {
        // about to come back
        card.style.transform = 'translateZ(-180px) translateY(-30px) rotate(-6deg)';
        card.style.opacity = '0';
        card.style.zIndex = '1';
      } else {
        card.style.transform = 'translateZ(-200px) translateY(60px)';
        card.style.opacity = '0';
        card.style.zIndex = '0';
      }
    });
    if (counter) counter.textContent = (current + 1).toString().padStart(2, '0') + ' / ' + cards.length.toString().padStart(2, '0');
  }

  function next() {
    current = (current + 1) % cards.length;
    update();
  }
  function prev() {
    current = (current - 1 + cards.length) % cards.length;
    update();
  }

  if (nextBtn) nextBtn.addEventListener('click', next);
  if (prevBtn) prevBtn.addEventListener('click', prev);

  // Click any card to advance
  cards.forEach((card, i) => {
    card.addEventListener('click', () => {
      if (i !== current) {
        current = i;
        update();
      } else {
        next();
      }
    });
  });

  // Auto-advance
  let autoTimer = setInterval(next, 5000);
  stage.addEventListener('mouseenter', () => clearInterval(autoTimer));
  stage.addEventListener('mouseleave', () => { autoTimer = setInterval(next, 5000); });

  update();
})();

// ============================================================
// GALLERY CAROUSEL — multiple instances per page
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

    // Auto-advance
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
