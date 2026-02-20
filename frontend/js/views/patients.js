async function renderPatientsView() {
  const patients = await api.getPatients();

  app.innerHTML = `
    <div class="page-header">
      <h1>Patients</h1>
      <button class="btn btn--primary" id="add-patient-btn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Add Patient
      </button>
    </div>
    <div id="patients-list">
      ${patients.length === 0 ? emptyState('No patients yet. Add your first one!') : ''}
    </div>`;

  if (patients.length > 0) {
    renderPatientCards(patients);
  }

  document.getElementById('add-patient-btn').addEventListener('click', () => openPatientModal());
}

function renderPatientCards(patients) {
  const list = document.getElementById('patients-list');
  list.innerHTML = `<div class="card-grid">${patients.map(p => `
    <div class="card" data-id="${p.id}">
      <div class="card-header">
        ${patientBadge(p)}
        <div style="display:flex;gap:4px">
          <button class="btn--icon edit-patient" data-id="${p.id}" title="Edit">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button class="btn--icon delete-patient" data-id="${p.id}" title="Delete">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
              <path d="M10 11v6"/><path d="M14 11v6"/>
              <path d="M9 6V4h6v2"/>
            </svg>
          </button>
        </div>
      </div>
      <div class="detail-grid" style="margin-top:8px">
        <div class="detail-item">
          <label>Date of Birth</label>
          <p>${p.date_of_birth ? formatDate(p.date_of_birth) : '—'}</p>
        </div>
        <div class="detail-item">
          <label>Color</label>
          <p><span style="display:inline-block;width:16px;height:16px;border-radius:50%;background:${p.color};vertical-align:middle;margin-right:4px"></span>${p.color}</p>
        </div>
      </div>
      ${p.notes ? `<p style="margin-top:12px;font-size:0.875rem;color:var(--color-text-muted)">${escapeHtml(p.notes)}</p>` : ''}
    </div>`).join('')}</div>`;

  list.querySelectorAll('.edit-patient').forEach(btn => {
    btn.addEventListener('click', () => {
      const patient = patients.find(p => p.id === btn.dataset.id);
      openPatientModal(patient);
    });
  });

  list.querySelectorAll('.delete-patient').forEach(btn => {
    btn.addEventListener('click', async () => {
      const patient = patients.find(p => p.id === btn.dataset.id);
      const ok = await modal.confirm(
        `Delete <strong>${escapeHtml(patient.name)}</strong>? All their records will be permanently deleted.`
      );
      if (!ok) return;
      try {
        await api.deletePatient(btn.dataset.id);
        toast.success('Patient deleted');
        renderPatientsView();
      } catch (err) {
        toast.error(err.message);
      }
    });
  });
}

function openPatientModal(patient = null) {
  const isEdit = Boolean(patient);
  const m = modal.open({
    title: isEdit ? 'Edit Patient' : 'Add Patient',
    body: `
      <form id="patient-form">
        <div class="form-group">
          <label class="form-label required" for="p-name">Name</label>
          <input type="text" id="p-name" class="form-input" value="${escapeHtml(patient?.name || '')}" required />
        </div>
        <div class="form-group">
          <label class="form-label" for="p-dob">Date of Birth</label>
          <input type="date" id="p-dob" class="form-input" value="${patient?.date_of_birth || ''}" />
        </div>
        <div class="form-group">
          <label class="form-label" for="p-color">Color</label>
          <div class="color-picker-row">
            <input type="color" id="p-color" value="${patient?.color || '#4A6FA5'}" />
            <span style="font-size:0.875rem;color:var(--color-text-muted)">Identifies this patient on the calendar</span>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label" for="p-notes">Notes</label>
          <textarea id="p-notes" class="form-textarea">${escapeHtml(patient?.notes || '')}</textarea>
        </div>
      </form>`,
    footer: `
      <button class="btn btn--ghost" id="pm-cancel">Cancel</button>
      <button class="btn btn--primary" id="pm-save">${isEdit ? 'Save Changes' : 'Add Patient'}</button>`,
  });

  m.el.querySelector('#pm-cancel').addEventListener('click', m.close);
  m.el.querySelector('#pm-save').addEventListener('click', async () => {
    const name = document.getElementById('p-name').value.trim();
    if (!name) { toast.error('Name is required'); return; }
    const data = {
      name,
      date_of_birth: document.getElementById('p-dob').value || null,
      color: document.getElementById('p-color').value,
      notes: document.getElementById('p-notes').value.trim() || null,
    };
    try {
      if (isEdit) {
        await api.updatePatient(patient.id, data);
        toast.success('Patient updated');
      } else {
        await api.createPatient(data);
        toast.success('Patient added');
      }
      m.close();
      renderPatientsView();
    } catch (err) {
      toast.error(err.message);
    }
  });
}

function emptyState(text) {
  return `<div class="empty-state">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
    <p>${text}</p>
  </div>`;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  } catch { return dateStr; }
}

function formatDateTime(dtStr) {
  if (!dtStr) return '—';
  try {
    return new Date(dtStr).toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  } catch { return dtStr; }
}

window.formatDate = formatDate;
window.formatDateTime = formatDateTime;
window.emptyState = emptyState;
