document.addEventListener('DOMContentLoaded', () => {
  const navButtons = document.querySelectorAll('[data-nav-link]');
  navButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const href = button.getAttribute('data-nav-link');
      if (href) {
        window.location.href = href;
      }
    });
  });
});
