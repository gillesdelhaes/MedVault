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
    <div class="card clickable-row" data-id="${p.id}" style="cursor:pointer">
      <div class="card-header">
        ${patientBadge(p)}
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

  list.querySelectorAll('.clickable-row').forEach(card => {
    card.addEventListener('click', () => {
      const patient = patients.find(p => p.id === card.dataset.id);
      openPatientModal(patient);
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
    footer: isEdit
      ? `<button class="btn btn--danger" id="pm-delete" style="margin-right:auto">Delete</button>
         <button class="btn btn--ghost" id="pm-cancel">Cancel</button>
         <button class="btn btn--primary" id="pm-save">Save Changes</button>`
      : `<button class="btn btn--ghost" id="pm-cancel">Cancel</button>
         <button class="btn btn--primary" id="pm-save">Add Patient</button>`,
  });

  if (isEdit) {
    m.el.querySelector('#pm-delete').addEventListener('click', async () => {
      const ok = await modal.confirm(
        `Delete <strong>${escapeHtml(patient.name)}</strong>? All their records will be permanently deleted.`
      );
      if (!ok) return;
      try {
        await api.deletePatient(patient.id);
        toast.success('Patient deleted');
        m.close();
        renderPatientsView();
      } catch (err) {
        toast.error(err.message);
      }
    });
  }

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
