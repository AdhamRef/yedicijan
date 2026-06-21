document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-menu-button]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = document.querySelector(btn.dataset.menuButton);
      if (target) target.classList.toggle('open');
    });
  });
  document.querySelectorAll('[data-amount-group]').forEach((group) => {
    group.querySelectorAll('[data-amount]').forEach((chip) => {
      chip.addEventListener('click', () => {
        group.querySelectorAll('[data-amount]').forEach((c) => {
          c.classList.remove('bg-burgundy','text-white','border-burgundy');
          c.classList.add('bg-white','text-textdark','border-gray-200');
        });
        chip.classList.add('bg-burgundy','text-white','border-burgundy');
        chip.classList.remove('bg-white','text-textdark','border-gray-200');
      });
    });
  });
});
