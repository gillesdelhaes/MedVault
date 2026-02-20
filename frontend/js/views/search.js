async function renderSearchView() {
  const patients = await api.getPatients();

  app.innerHTML = `
    <div class="page-header">
      <h1>Search</h1>
    </div>
    <div class="filter-bar" style="margin-bottom:var(--space-4)">
      <input type="search" id="search-q" class="form-input" placeholder="Search appointments, symptoms, medications…" style="max-width:360px;flex:1" autofocus />
      <select id="search-type">
        <option value="">All types</option>
        <option value="appointment">Appointments</option>
        <option value="symptom">Symptoms</option>
        <option value="medication">Medications</option>
      </select>
      <select id="search-patient">
        <option value="">All patients</option>
        ${patients.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('')}
      </select>
    </div>
    <div id="search-results">
      <div class="empty-state" style="padding:var(--space-8)">
        <p>Start typing to search across all your records.</p>
      </div>
    </div>`;

  let searchTimeout = null;
  const qEl = document.getElementById('search-q');
  const typeEl = document.getElementById('search-type');
  const patientEl = document.getElementById('search-patient');

  function scheduleSearch() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(doSearch, 350);
  }

  async function doSearch() {
    const q = qEl.value.trim();
    const resultsEl = document.getElementById('search-results');
    if (!q) {
      resultsEl.innerHTML = '<div class="empty-state" style="padding:var(--space-8)"><p>Start typing to search across all your records.</p></div>';
      return;
    }
    resultsEl.innerHTML = '<div class="loading"><div class="spinner"></div> Searching…</div>';
    try {
      const params = { q };
      if (typeEl.value) params.type = typeEl.value;
      if (patientEl.value) params.patient_id = patientEl.value;
      const data = await api.search(params);
      renderResults(data.results, data.count);
    } catch (err) {
      resultsEl.innerHTML = `<div class="empty-state"><p>Error: ${escapeHtml(err.message)}</p></div>`;
    }
  }

  function renderResults(results, count) {
    const el = document.getElementById('search-results');
    if (!count) {
      el.innerHTML = '<div class="empty-state"><p>No results found.</p></div>';
      return;
    }

    const typeIcon = {
      appointment: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
      symptom: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
      medication: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/>
        <line x1="8.5" y1="8.5" x2="15.5" y2="15.5"/></svg>`,
    };

    el.innerHTML = `
      <div style="color:var(--color-text-muted);font-size:0.875rem;margin-bottom:var(--space-4)">
        ${count} result${count !== 1 ? 's' : ''} found
      </div>
      ${results.map(r => `
        <div class="search-result">
          <div class="search-result__type search-result__type--${r.type}">
            ${typeIcon[r.type] || ''}
          </div>
          <div class="search-result__body">
            <div class="search-result__title">${escapeHtml(r.title)}</div>
            <div class="search-result__meta">
              ${r.patient_name ? `<span>${escapeHtml(r.patient_name)}</span>` : ''}
              ${r.datetime ? ` · <span>${formatDateTime(r.datetime)}</span>` : ''}
              ${r.detail ? ` · <span>${escapeHtml(r.detail)}</span>` : ''}
            </div>
          </div>
          <span class="badge badge--muted">${r.type}</span>
        </div>`).join('')}`;
  }

  qEl.addEventListener('input', scheduleSearch);
  typeEl.addEventListener('change', scheduleSearch);
  patientEl.addEventListener('change', scheduleSearch);
}
