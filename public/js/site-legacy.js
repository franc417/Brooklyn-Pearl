// Nav scroll
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 60);
  });

  // Mobile menu
  function toggleMenu() {
    document.getElementById('mobileMenu').classList.toggle('open');
  }

  // Scroll reveal
  const reveals = document.querySelectorAll('.reveal');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.12 });
  reveals.forEach(el => observer.observe(el));

  // Set default dates
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date(today);
  dayAfter.setDate(dayAfter.getDate() + 3);
  document.getElementById('checkin').value = tomorrow.toISOString().split('T')[0];
  document.getElementById('checkout').value = dayAfter.toISOString().split('T')[0];
