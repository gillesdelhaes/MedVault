/**
 * Modal component.
 *
 * Usage:
 *   const m = modal.open({ title: 'Edit Patient', body: '<form>...</form>' });
 *   m.close();
 *
 * Or with a confirm dialog:
 *   const confirmed = await modal.confirm('Delete this record?');
 */
const modal = (() => {
  function open({ title, body, footer = '' } = {}) {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <div class="modal-header">
          <h2 class="modal-title">${title || ''}</h2>
          <button class="modal-close" aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div class="modal-body">${body || ''}</div>
        ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
      </div>`;

    document.body.appendChild(backdrop);
    backdrop.querySelector('.modal-close').addEventListener('click', close);
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });

    // Trap focus
    const focusable = backdrop.querySelectorAll('input, select, textarea, button, [tabindex]');
    if (focusable.length) focusable[0].focus();

    // Close on Escape
    function onKeydown(e) {
      if (e.key === 'Escape') close();
    }
    document.addEventListener('keydown', onKeydown);

    function close() {
      document.removeEventListener('keydown', onKeydown);
      backdrop.remove();
    }

    return { el: backdrop, close, modalEl: backdrop.querySelector('.modal') };
  }

  function confirm(message, { confirmText = 'Delete', dangerous = true } = {}) {
    return new Promise((resolve) => {
      const m = open({
        title: 'Confirm',
        body: `<p>${message}</p>`,
        footer: `
          <button class="btn btn--ghost" id="modal-cancel">Cancel</button>
          <button class="btn ${dangerous ? 'btn--danger' : 'btn--primary'}" id="modal-confirm">${confirmText}</button>`,
      });
      m.el.querySelector('#modal-cancel').addEventListener('click', () => { m.close(); resolve(false); });
      m.el.querySelector('#modal-confirm').addEventListener('click', () => { m.close(); resolve(true); });
    });
  }

  return { open, confirm };
})();

window.modal = modal;
