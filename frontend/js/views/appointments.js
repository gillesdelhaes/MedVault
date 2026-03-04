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
        <th>Date & Time</th><th>Patient</th><th>Provider</th><th class="col-optional">Reason</th><th class="col-optional">Follow-up</th>
      </tr></thead>
      <tbody>${list.map(a => {
        const p = patientMap[a.patient_id];
        return `<tr class="clickable-row" data-id="${a.id}" style="cursor:pointer">
          <td style="white-space:nowrap">${formatDateTime(a.datetime)}</td>
          <td>${patientBadge(p)}</td>
          <td>${escapeHtml(a.provider_name)}</td>
          <td class="col-optional">${escapeHtml(a.reason || '—')}</td>
          <td class="col-optional">${a.follow_up_required ? '<span class="badge badge--warning">Yes</span>' : '<span class="badge badge--muted">No</span>'}</td>
        </tr>`;
      }).join('')}</tbody>
    </table></div>`;

    el.querySelectorAll('.clickable-row').forEach(row => {
      row.addEventListener('click', async () => {
        const appt = await api.getAppointment(row.dataset.id);
        openApptModal(appt, patients, reloadList);
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
    footer: isEdit
      ? `<button class="btn btn--danger" id="am-delete" style="margin-right:auto">Delete</button>
         <button class="btn btn--ghost" id="am-cancel">Cancel</button>
         <button class="btn btn--primary" id="am-save">Save Changes</button>`
      : `<button class="btn btn--ghost" id="am-cancel">Cancel</button>
         <button class="btn btn--primary" id="am-save">Add Appointment</button>`,
  });

  if (isEdit) {
    m.el.querySelector('#am-delete').addEventListener('click', async () => {
      const ok = await modal.confirm('Delete this appointment?');
      if (!ok) return;
      try {
        await api.deleteAppointment(appt.id);
        toast.success('Appointment deleted');
        m.close();
        if (onSave) onSave(); else renderAppointmentsView();
      } catch (err) { toast.error(err.message); }
    });
  }

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
