async function renderAppointmentsView() {
  const [patients, appointments] = await Promise.all([
    api.getPatients(),
    api.getAppointments(),
  ]);

  const patientMap = Object.fromEntries(patients.map(p => [p.id, p]));

  app.innerHTML = `
    <div class="page-header">
      <h1>Appointments</h1>
      <button class="btn btn--primary" id="add-appt-btn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Add Appointment
      </button>
    </div>
    <div class="filter-bar">
      <select id="appt-patient-filter">
        <option value="">All patients</option>
        ${patients.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('')}
      </select>
      <input type="date" id="appt-from" placeholder="From" />
      <input type="date" id="appt-to" placeholder="To" />
    </div>
    <div id="appt-list"></div>`;

  document.getElementById('add-appt-btn').addEventListener('click', () => openApptModal(null, patients));
  document.getElementById('appt-patient-filter').addEventListener('change', reloadList);
  document.getElementById('appt-from').addEventListener('change', reloadList);
  document.getElementById('appt-to').addEventListener('change', reloadList);

  function getFilteredList(list) {
    const pid = document.getElementById('appt-patient-filter')?.value;
    const from = document.getElementById('appt-from')?.value;
    const to = document.getElementById('appt-to')?.value;
    return list.filter(a => {
      if (pid && a.patient_id !== pid) return false;
      const dt = new Date(a.datetime);
      if (from && dt < new Date(from)) return false;
      if (to && dt > new Date(to + 'T23:59:59')) return false;
      return true;
    });
  }

  async function reloadList() {
    const all = await api.getAppointments();
    renderList(getFilteredList(all));
  }

  function renderList(list) {
    const el = document.getElementById('appt-list');
    if (!list.length) { el.innerHTML = emptyState('No appointments found.'); return; }
    el.innerHTML = `<div class="table-wrapper"><table>
      <thead><tr>
        <th>Date & Time</th><th>Patient</th><th>Provider</th><th>Reason</th><th>Follow-up</th><th></th>
      </tr></thead>
      <tbody>${list.map(a => {
        const p = patientMap[a.patient_id];
        return `<tr>
          <td style="white-space:nowrap">${formatDateTime(a.datetime)}</td>
          <td>${patientBadge(p)}</td>
          <td>${escapeHtml(a.provider_name)}</td>
          <td>${escapeHtml(a.reason || '—')}</td>
          <td>${a.follow_up_required ? '<span class="badge badge--warning">Yes</span>' : '<span class="badge badge--muted">No</span>'}</td>
          <td class="td-actions">
            <button class="btn--icon edit-appt" data-id="${a.id}" title="Edit">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button class="btn--icon delete-appt" data-id="${a.id}" title="Delete">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
              </svg>
            </button>
          </td>
        </tr>`;
      }).join('')}</tbody>
    </table></div>`;

    el.querySelectorAll('.edit-appt').forEach(btn => {
      btn.addEventListener('click', async () => {
        const appt = await api.getAppointment(btn.dataset.id);
        openApptModal(appt, patients, reloadList);
      });
    });

    el.querySelectorAll('.delete-appt').forEach(btn => {
      btn.addEventListener('click', async () => {
        const ok = await modal.confirm('Delete this appointment?');
        if (!ok) return;
        try {
          await api.deleteAppointment(btn.dataset.id);
          toast.success('Appointment deleted');
          reloadList();
        } catch (err) { toast.error(err.message); }
      });
    });
  }

  renderList(getFilteredList(appointments));
}

function openApptModal(appt, patients, onSave) {
  const isEdit = Boolean(appt);
  const dtLocal = appt?.datetime
    ? new Date(appt.datetime).toISOString().slice(0, 16)
    : new Date().toISOString().slice(0, 16);

  const m = modal.open({
    title: isEdit ? 'Edit Appointment' : 'Add Appointment',
    body: `<form id="appt-form">
      <div class="form-group">
        <label class="form-label required">Patient</label>
        <select id="a-patient" class="form-select" required>
          ${patients.map(p => `<option value="${p.id}" ${appt?.patient_id === p.id ? 'selected' : ''}>${escapeHtml(p.name)}</option>`).join('')}
        </select>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label required">Date & Time</label>
          <input type="datetime-local" id="a-datetime" class="form-input" value="${dtLocal}" required />
        </div>
        <div class="form-group">
          <label class="form-label required">Provider Name</label>
          <input type="text" id="a-provider" class="form-input" value="${escapeHtml(appt?.provider_name || '')}" required />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Location</label>
        <input type="text" id="a-location" class="form-input" value="${escapeHtml(appt?.location || '')}" />
      </div>
      <div class="form-group">
        <label class="form-label">Reason</label>
        <input type="text" id="a-reason" class="form-input" value="${escapeHtml(appt?.reason || '')}" />
      </div>
      <div class="form-group">
        <label class="form-check">
          <input type="checkbox" id="a-followup" ${appt?.follow_up_required ? 'checked' : ''} />
          Follow-up required
        </label>
      </div>
      <div class="form-group">
        <label class="form-label">Notes</label>
        <textarea id="a-notes" class="form-textarea">${escapeHtml(appt?.notes || '')}</textarea>
      </div>
    </form>`,
    footer: `<button class="btn btn--ghost" id="am-cancel">Cancel</button>
             <button class="btn btn--primary" id="am-save">${isEdit ? 'Save Changes' : 'Add Appointment'}</button>`,
  });

  m.el.querySelector('#am-cancel').addEventListener('click', m.close);
  m.el.querySelector('#am-save').addEventListener('click', async () => {
    const provider = document.getElementById('a-provider').value.trim();
    const dt = document.getElementById('a-datetime').value;
    if (!provider || !dt) { toast.error('Provider and date are required'); return; }
    const data = {
      patient_id: document.getElementById('a-patient').value,
      datetime: new Date(dt).toISOString(),
      provider_name: provider,
      location: document.getElementById('a-location').value.trim() || null,
      reason: document.getElementById('a-reason').value.trim() || null,
      follow_up_required: document.getElementById('a-followup').checked,
      notes: document.getElementById('a-notes').value.trim() || null,
    };
    try {
      if (isEdit) {
        await api.updateAppointment(appt.id, data);
        toast.success('Appointment updated');
      } else {
        await api.createAppointment(data);
        toast.success('Appointment added');
      }
      m.close();
      if (onSave) onSave(); else renderAppointmentsView();
    } catch (err) { toast.error(err.message); }
  });
}
