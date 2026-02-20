async function renderMedicationsView() {
  const [patients, medications] = await Promise.all([
    api.getPatients(),
    api.getMedications(),
  ]);
  const patientMap = Object.fromEntries(patients.map(p => [p.id, p]));

  app.innerHTML = `
    <div class="page-header">
      <h1>Medications</h1>
      <button class="btn btn--primary" id="add-med-btn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Add Medication
      </button>
    </div>
    <div class="filter-bar">
      <select id="med-patient-filter">
        <option value="">All patients</option>
        ${patients.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('')}
      </select>
      <select id="med-status-filter">
        <option value="">All statuses</option>
        <option value="active">Active / Ongoing</option>
        <option value="ended">Ended</option>
      </select>
    </div>
    <div id="med-list"></div>`;

  document.getElementById('add-med-btn').addEventListener('click', () => openMedModal(null, patients));
  document.getElementById('med-patient-filter').addEventListener('change', applyFilters);
  document.getElementById('med-status-filter').addEventListener('change', applyFilters);

  let allMeds = medications;

  function applyFilters() {
    const pid = document.getElementById('med-patient-filter')?.value;
    const status = document.getElementById('med-status-filter')?.value;
    const today = new Date().toISOString().slice(0, 10);
    const filtered = allMeds.filter(m => {
      if (pid && m.patient_id !== pid) return false;
      if (status === 'active') {
        if (!m.is_ongoing && m.end_date && m.end_date < today) return false;
      }
      if (status === 'ended') {
        if (m.is_ongoing) return false;
        if (!m.end_date || m.end_date >= today) return false;
      }
      return true;
    });
    renderList(filtered);
  }

  async function reloadList() {
    allMeds = await api.getMedications();
    applyFilters();
  }

  function renderList(list) {
    const el = document.getElementById('med-list');
    if (!list.length) { el.innerHTML = emptyState('No medications found.'); return; }
    el.innerHTML = `<div class="card-grid">${list.map(m => {
      const p = patientMap[m.patient_id];
      const today = new Date().toISOString().slice(0, 10);
      const isActive = m.is_ongoing || !m.end_date || m.end_date >= today;
      return `<div class="card">
        <div class="card-header">
          <div>
            <div style="font-weight:600;margin-bottom:4px">${escapeHtml(m.name)}</div>
            ${patientBadge(p)}
          </div>
          <div style="display:flex;gap:4px;align-items:flex-start">
            ${isActive ? '<span class="badge badge--success">Active</span>' : '<span class="badge badge--muted">Ended</span>'}
            <button class="btn--icon log-dose-btn" data-id="${m.id}" data-name="${escapeHtml(m.name)}" title="Log Dose">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
              </svg>
            </button>
            <button class="btn--icon edit-med" data-id="${m.id}" title="Edit">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button class="btn--icon delete-med" data-id="${m.id}" title="Delete">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
              </svg>
            </button>
          </div>
        </div>
        <div class="detail-grid" style="margin-top:8px">
          <div class="detail-item"><label>Dosage</label><p>${escapeHtml(m.dosage)}</p></div>
          <div class="detail-item"><label>Frequency</label><p>${m.frequency_per_day}× per day</p></div>
          <div class="detail-item"><label>Start</label><p>${formatDate(m.start_date)}</p></div>
          <div class="detail-item"><label>End</label><p>${m.is_ongoing ? 'Ongoing' : (m.end_date ? formatDate(m.end_date) : '—')}</p></div>
        </div>
        ${m.schedule_notes ? `<p style="margin-top:8px;font-size:0.875rem;color:var(--color-text-muted)">${escapeHtml(m.schedule_notes)}</p>` : ''}
        <button class="btn btn--ghost btn--sm view-doses-btn" data-id="${m.id}" style="margin-top:12px">View dose log</button>
      </div>`;
    }).join('')}</div>`;

    el.querySelectorAll('.edit-med').forEach(btn => {
      btn.addEventListener('click', async () => {
        const med = await api.getMedication(btn.dataset.id);
        openMedModal(med, patients, reloadList);
      });
    });

    el.querySelectorAll('.delete-med').forEach(btn => {
      btn.addEventListener('click', async () => {
        const ok = await modal.confirm('Delete this medication and all its dose logs?');
        if (!ok) return;
        try {
          await api.deleteMedication(btn.dataset.id);
          toast.success('Medication deleted');
          reloadList();
        } catch (err) { toast.error(err.message); }
      });
    });

    el.querySelectorAll('.log-dose-btn').forEach(btn => {
      btn.addEventListener('click', () => openDoseModal(btn.dataset.id, btn.dataset.name));
    });

    el.querySelectorAll('.view-doses-btn').forEach(btn => {
      btn.addEventListener('click', () => openDoseHistoryModal(btn.dataset.id, allMeds));
    });
  }

  applyFilters();
}

function openMedModal(med, patients, onSave) {
  const isEdit = Boolean(med);
  const m = modal.open({
    title: isEdit ? 'Edit Medication' : 'Add Medication',
    body: `<form id="med-form">
      <div class="form-group">
        <label class="form-label required">Patient</label>
        <select id="m-patient" class="form-select" required>
          ${patients.map(p => `<option value="${p.id}" ${med?.patient_id === p.id ? 'selected' : ''}>${escapeHtml(p.name)}</option>`).join('')}
        </select>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label required">Medication Name</label>
          <input type="text" id="m-name" class="form-input" value="${escapeHtml(med?.name || '')}" required />
        </div>
        <div class="form-group">
          <label class="form-label required">Dosage</label>
          <input type="text" id="m-dosage" class="form-input" value="${escapeHtml(med?.dosage || '')}" placeholder="e.g. 10mg" required />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label required">Frequency (per day)</label>
          <input type="number" id="m-freq" class="form-input" value="${med?.frequency_per_day || 1}" min="1" required />
        </div>
        <div class="form-group">
          <label class="form-label required">Start Date</label>
          <input type="date" id="m-start" class="form-input" value="${med?.start_date || ''}" required />
        </div>
      </div>
      <div class="form-group">
        <label class="form-check">
          <input type="checkbox" id="m-ongoing" ${med?.is_ongoing ? 'checked' : ''} />
          Ongoing (no end date)
        </label>
      </div>
      <div class="form-group" id="end-date-group" style="${med?.is_ongoing ? 'display:none' : ''}">
        <label class="form-label">End Date</label>
        <input type="date" id="m-end" class="form-input" value="${med?.end_date || ''}" />
      </div>
      <div class="form-group">
        <label class="form-label">Schedule Notes</label>
        <input type="text" id="m-schedule" class="form-input" value="${escapeHtml(med?.schedule_notes || '')}" placeholder="e.g. Take with food" />
      </div>
      <div class="form-group">
        <label class="form-label">Notes</label>
        <textarea id="m-notes" class="form-textarea">${escapeHtml(med?.notes || '')}</textarea>
      </div>
    </form>`,
    footer: `<button class="btn btn--ghost" id="mm-cancel">Cancel</button>
             <button class="btn btn--primary" id="mm-save">${isEdit ? 'Save Changes' : 'Add Medication'}</button>`,
  });

  const ongoingCb = m.el.querySelector('#m-ongoing');
  const endGroup = m.el.querySelector('#end-date-group');
  ongoingCb.addEventListener('change', () => {
    endGroup.style.display = ongoingCb.checked ? 'none' : '';
  });

  m.el.querySelector('#mm-cancel').addEventListener('click', m.close);
  m.el.querySelector('#mm-save').addEventListener('click', async () => {
    const name = document.getElementById('m-name').value.trim();
    const dosage = document.getElementById('m-dosage').value.trim();
    const start = document.getElementById('m-start').value;
    if (!name || !dosage || !start) { toast.error('Name, dosage, and start date are required'); return; }
    const ongoing = document.getElementById('m-ongoing').checked;
    const data = {
      patient_id: document.getElementById('m-patient').value,
      name, dosage,
      frequency_per_day: parseInt(document.getElementById('m-freq').value) || 1,
      start_date: start,
      end_date: ongoing ? null : (document.getElementById('m-end').value || null),
      is_ongoing: ongoing,
      schedule_notes: document.getElementById('m-schedule').value.trim() || null,
      notes: document.getElementById('m-notes').value.trim() || null,
    };
    try {
      if (isEdit) {
        await api.updateMedication(med.id, data);
        toast.success('Medication updated');
      } else {
        await api.createMedication(data);
        toast.success('Medication added');
      }
      m.close();
      if (onSave) onSave(); else renderMedicationsView();
    } catch (err) { toast.error(err.message); }
  });
}

function openDoseModal(medicationId, medName) {
  const now = new Date().toISOString().slice(0, 16);
  const m = modal.open({
    title: `Log Dose — ${medName}`,
    body: `<form id="dose-form">
      <div class="form-row">
        <div class="form-group">
          <label class="form-label required">Taken At</label>
          <input type="datetime-local" id="d-taken" class="form-input" value="${now}" required />
        </div>
        <div class="form-group">
          <label class="form-label">Quantity</label>
          <input type="number" id="d-qty" class="form-input" value="1" min="0.1" step="0.1" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Notes</label>
        <textarea id="d-notes" class="form-textarea" style="min-height:60px"></textarea>
      </div>
    </form>`,
    footer: `<button class="btn btn--ghost" id="dm-cancel">Cancel</button>
             <button class="btn btn--primary" id="dm-save">Log Dose</button>`,
  });

  m.el.querySelector('#dm-cancel').addEventListener('click', m.close);
  m.el.querySelector('#dm-save').addEventListener('click', async () => {
    const takenAt = document.getElementById('d-taken').value;
    if (!takenAt) { toast.error('Date is required'); return; }
    const data = {
      taken_at: new Date(takenAt).toISOString(),
      quantity: parseFloat(document.getElementById('d-qty').value) || 1,
      notes: document.getElementById('d-notes').value.trim() || null,
    };
    try {
      await api.logDose(medicationId, data);
      toast.success('Dose logged');
      m.close();
    } catch (err) { toast.error(err.message); }
  });
}

async function openDoseHistoryModal(medicationId, allMeds) {
  const med = allMeds.find(m => m.id === medicationId);
  let doses;
  try { doses = await api.getDoses(medicationId); } catch (err) { toast.error(err.message); return; }

  const m = modal.open({
    title: `Dose History — ${med?.name || ''}`,
    body: doses.length === 0
      ? '<p style="color:var(--color-text-muted)">No doses logged yet.</p>'
      : `<div class="table-wrapper"><table>
          <thead><tr><th>Taken At</th><th>Quantity</th><th>Notes</th></tr></thead>
          <tbody>${doses.map(d => `<tr>
            <td style="white-space:nowrap">${formatDateTime(d.taken_at)}</td>
            <td>${d.quantity}</td>
            <td>${escapeHtml(d.notes || '—')}</td>
          </tr>`).join('')}</tbody>
        </table></div>`,
  });
}
