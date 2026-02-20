/**
 * Toast notification system.
 * Usage: toast.success('Saved!') / toast.error('Something failed') / toast.info('...')
 */
const toast = (() => {
  const container = document.getElementById('toast-container');

  function show(message, type = 'info', duration = 3500) {
    const el = document.createElement('div');
    el.className = `toast toast--${type}`;
    el.textContent = message;
    container.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transition = 'opacity 0.3s';
      setTimeout(() => el.remove(), 300);
    }, duration);
  }

  return {
    success: (msg, dur) => show(msg, 'success', dur),
    error:   (msg, dur) => show(msg, 'error', dur),
    info:    (msg, dur) => show(msg, 'info', dur),
  };
})();

window.toast = toast;
