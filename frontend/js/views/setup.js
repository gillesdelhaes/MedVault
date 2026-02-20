/**
 * First-run setup wizard.
 * Shown only on first boot, before any password has been configured.
 */
function renderSetupPage() {
  const setupPage = document.getElementById('setup-page');
  const loginPage = document.getElementById('login-page');
  const shell = document.getElementById('shell');

  loginPage.style.display = 'none';
  shell.style.display = 'none';
  setupPage.style.display = '';

  const form = document.getElementById('setup-form');
  const errorEl = document.getElementById('setup-error');
  const btn = document.getElementById('setup-btn');
  const pw = document.getElementById('setup-password');
  const pw2 = document.getElementById('setup-password2');

  // Strength indicator
  pw.addEventListener('input', updateStrength);

  function updateStrength() {
    const val = pw.value;
    const meter = document.getElementById('pw-strength-bar');
    const label = document.getElementById('pw-strength-label');
    if (!meter) return;
    let score = 0;
    if (val.length >= 8)  score++;
    if (val.length >= 12) score++;
    if (/[A-Z]/.test(val)) score++;
    if (/[0-9]/.test(val)) score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;
    const levels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very strong'];
    const colors = ['', '#DC3545', '#FD7E14', '#FFC107', '#28A745', '#28A745'];
    meter.style.width = `${score * 20}%`;
    meter.style.background = colors[score] || '#DDE3EC';
    label.textContent = levels[score] || '';
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.style.display = 'none';

    const password = pw.value;
    const confirm = pw2.value;

    if (password.length < 8) {
      errorEl.textContent = 'Password must be at least 8 characters.';
      errorEl.style.display = '';
      return;
    }
    if (password !== confirm) {
      errorEl.textContent = 'Passwords do not match.';
      errorEl.style.display = '';
      pw2.focus();
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Setting up…';

    try {
      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      let data;
      try {
        data = await res.json();
      } catch {
        throw new Error(`Server error (HTTP ${res.status}). Check container logs: docker-compose logs app`);
      }

      if (!res.ok || !data.access_token) {
        throw new Error(data?.detail || `Setup failed (HTTP ${res.status})`);
      }

      api.setToken(data.access_token);
      setupPage.style.display = 'none';
      window.location.hash = '#/calendar';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.style.display = '';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Create password & get started';
    }
  });
}
