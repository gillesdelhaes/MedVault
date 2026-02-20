/**
 * Login view — handles the login form submission.
 */
function initLogin() {
  const form = document.getElementById('login-form');
  const errorEl = document.getElementById('login-error');
  const btn = document.getElementById('login-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = document.getElementById('password').value;
    errorEl.style.display = 'none';
    btn.disabled = true;
    btn.textContent = 'Signing in…';

    try {
      const data = await api.login(password);
      api.setToken(data.access_token);
      window.location.hash = '#/calendar';
    } catch (err) {
      errorEl.textContent = 'Invalid password. Try again.';
      errorEl.style.display = '';
      document.getElementById('password').value = '';
      document.getElementById('password').focus();
    } finally {
      btn.disabled = false;
      btn.textContent = 'Sign in';
    }
  });
}
