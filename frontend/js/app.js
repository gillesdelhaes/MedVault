/**
 * Hash-based SPA router with setup-guard + auth-guard.
 *
 * Boot sequence:
 *   1. Check /api/setup/status — if not configured → show setup wizard
 *   2. Auth guard — verify JWT; if invalid → show login
 *   3. Render the requested route
 *
 * Routes:
 *   #/login        → login page (unauthenticated)
 *   #/calendar     → calendar view
 *   #/patients     → patients list
 *   #/appointments → appointments list
 *   #/symptoms     → symptom logs list
 *   #/medications  → medications list
 *   #/search       → search view
 */

const ROUTES = {
  '/calendar':     renderCalendarView,
  '/patients':     renderPatientsView,
  '/appointments': renderAppointmentsView,
  '/symptoms':     renderSymptomsView,
  '/medications':  renderMedicationsView,
  '/search':       renderSearchView,
};

const setupPage = document.getElementById('setup-page');
const loginPage = document.getElementById('login-page');
const shell = document.getElementById('shell');
const app = document.getElementById('app');
const navLinks = document.getElementById('nav-links');

function getRoute() {
  const hash = window.location.hash.replace('#', '') || '/calendar';
  return hash;
}

async function checkSetup() {
  try {
    const res = await fetch('/api/setup/status');
    const data = await res.json();
    return data.configured;
  } catch {
    return true; // Assume configured on network error to avoid boot loop
  }
}

async function authGuard() {
  const token = api.getToken();
  if (!token) return false;
  try {
    await api.verify();
    return true;
  } catch {
    api.clearToken();
    return false;
  }
}

async function navigate() {
  // Step 1: First-run check
  const configured = await checkSetup();
  if (!configured) {
    showSetup();
    return;
  }

  const route = getRoute();

  if (route === '/login') {
    showLogin();
    return;
  }

  // Step 2: Auth check
  const authed = await authGuard();
  if (!authed) {
    showLogin();
    return;
  }

  // Step 3: Render view
  showShell();
  updateNavActive(route);

  const handler = ROUTES[route] || ROUTES['/calendar'];
  app.innerHTML = '<div class="loading"><div class="spinner"></div> Loading…</div>';
  try {
    await handler();
  } catch (err) {
    app.innerHTML = `<div class="empty-state"><p>Error: ${escapeHtml(err.message)}</p></div>`;
  }

  navLinks.classList.remove('open');
}

function showSetup() {
  setupPage.style.display = '';
  loginPage.style.display = 'none';
  shell.style.display = 'none';
  renderSetupPage();
}

function showLogin() {
  setupPage.style.display = 'none';
  loginPage.style.display = '';
  shell.style.display = 'none';
  initLogin();
}

function showShell() {
  setupPage.style.display = 'none';
  loginPage.style.display = 'none';
  shell.style.display = '';
}

function updateNavActive(route) {
  navLinks.querySelectorAll('a[data-route]').forEach(a => {
    a.classList.toggle('active', a.dataset.route === route);
  });
}

// Logout
document.getElementById('logout-btn').addEventListener('click', async () => {
  try { await api.logout(); } catch {}
  api.clearToken();
  window.location.hash = '#/login';
  navigate();
});

// Mobile nav toggle
document.getElementById('nav-toggle').addEventListener('click', () => {
  navLinks.classList.toggle('open');
});

// Router
window.addEventListener('hashchange', navigate);
window.addEventListener('load', navigate);
