async function renderSymptomsView() {
  const [patients, symptoms] = await Promise.all([
    api.getPatients(),
    api.getSymptoms(),
  ]);
  const patientMap = Object.fromEntries(patients.map(p => [p.id, p]));

  app.innerHTML = `
    <div class="page-header">
      <h1>Symptom Logs</h1>
      <button class="btn btn--primary" id="add-sym-btn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Log Symptom
      </button>
    </div>
    <div class="filter-bar">
      <select id="sym-patient-filter">
        <option value="">All patients</option>
        ${patients.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('')}
      </select>
      <select id="sym-severity-filter">
        <option value="">Any severity</option>
        ${[1,2,3,4,5].map(n => `<option value="${n}">Severity ${n}</option>`).join('')}
      </select>
      <input type="date" id="sym-from" />
      <input type="date" id="sym-to" />
    </div>
    <div id="sym-list"></div>`;

  document.getElementById('add-sym-btn').addEventListener('click', () => openSymptomModal(null, patients));
  document.getElementById('sym-patient-filter').addEventListener('change', reloadList);
  document.getElementById('sym-severity-filter').addEventListener('change', reloadList);
  document.getElementById('sym-from').addEventListener('change', reloadList);
  document.getElementById('sym-to').addEventListener('change', reloadList);

  function getFiltered(list) {
    const pid = document.getElementById('sym-patient-filter')?.value;
    const sev = document.getElementById('sym-severity-filter')?.value;
    const from = document.getElementById('sym-from')?.value;
    const to = document.getElementById('sym-to')?.value;
    return list.filter(s => {
      if (pid && s.patient_id !== pid) return false;
      if (sev && String(s.severity) !== sev) return false;
      const dt = new Date(s.logged_at);
      if (from && dt < new Date(from)) return false;
      if (to && dt > new Date(to + 'T23:59:59')) return false;
      return true;
    });
  }

  async function reloadList() {
    const all = await api.getSymptoms();
    renderList(getFiltered(all));
  }

  function renderList(list) {
    const el = document.getElementById('sym-list');
    if (!list.length) { el.innerHTML = emptyState('No symptom logs found.'); return; }
    el.innerHTML = `<div class="table-wrapper"><table>
      <thead><tr>
        <th>Date</th><th>Patient</th><th>Severity</th><th>Description</th><th>Resolved</th><th></th>
      </tr></thead>
      <tbody>${list.map(s => {
        const p = patientMap[s.patient_id];
        return `<tr>
          <td style="white-space:nowrap">${formatDateTime(s.logged_at)}</td>
          <td>${patientBadge(p)}</td>
          <td><span class="severity severity--${s.severity}">${s.severity}</span></td>
          <td>${escapeHtml(s.description || '—')}</td>
          <td>${s.resolved_at ? `<span class="badge badge--success">Yes</span>` : '<span class="badge badge--muted">No</span>'}</td>
          <td class="td-actions">
            <button class="btn--icon edit-sym" data-id="${s.id}" title="Edit">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button class="btn--icon delete-sym" data-id="${s.id}" title="Delete">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
              </svg>
            </button>
          </td>
        </tr>`;
      }).join('')}</tbody>
    </table></div>`;

    el.querySelectorAll('.edit-sym').forEach(btn => {
      btn.addEventListener('click', async () => {
        const sym = await api.getSymptom(btn.dataset.id);
        openSymptomModal(sym, patients, reloadList);
      });
    });

    el.querySelectorAll('.delete-sym').forEach(btn => {
      btn.addEventListener('click', async () => {
        const ok = await modal.confirm('Delete this symptom log?');
        if (!ok) return;
        try {
          await api.deleteSymptom(btn.dataset.id);
          toast.success('Symptom log deleted');
          reloadList();
        } catch (err) { toast.error(err.message); }
      });
    });
  }

  renderList(getFiltered(symptoms));
}

function openSymptomModal(sym, patients, onSave) {
  const isEdit = Boolean(sym);
  const dtLocal = sym?.logged_at
    ? new Date(sym.logged_at).toISOString().slice(0, 16)
    : new Date().toISOString().slice(0, 16);
  const resolvedLocal = sym?.resolved_at
    ? new Date(sym.resolved_at).toISOString().slice(0, 16)
    : '';

  const m = modal.open({
    title: isEdit ? 'Edit Symptom Log' : 'Log Symptom',
    body: `<form id="sym-form">
      <div class="form-group">
        <label class="form-label required">Patient</label>
        <select id="s-patient" class="form-select" required>
          ${patients.map(p => `<option value="${p.id}" ${sym?.patient_id === p.id ? 'selected' : ''}>${escapeHtml(p.name)}</option>`).join('')}
        </select>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label required">Date & Time</label>
          <input type="datetime-local" id="s-logged-at" class="form-input" value="${dtLocal}" required />
        </div>
        <div class="form-group">
          <label class="form-label required">Severity (1–5)</label>
          <select id="s-severity" class="form-select" required>
            ${[1,2,3,4,5].map(n => `<option value="${n}" ${sym?.severity === n ? 'selected' : ''}>${n} — ${['Mild','Low','Moderate','High','Severe'][n-1]}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Description</label>
        <textarea id="s-description" class="form-textarea">${escapeHtml(sym?.description || '')}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label">Resolved At</label>
        <input type="datetime-local" id="s-resolved" class="form-input" value="${resolvedLocal}" />
        <span class="form-hint">Leave blank if still ongoing</span>
      </div>
      <div class="form-group">
        <label class="form-label">Notes</label>
        <textarea id="s-notes" class="form-textarea">${escapeHtml(sym?.notes || '')}</textarea>
      </div>
    </form>`,
    footer: `<button class="btn btn--ghost" id="sm-cancel">Cancel</button>
             <button class="btn btn--primary" id="sm-save">${isEdit ? 'Save Changes' : 'Log Symptom'}</button>`,
  });

  m.el.querySelector('#sm-cancel').addEventListener('click', m.close);
  m.el.querySelector('#sm-save').addEventListener('click', async () => {
    const loggedAt = document.getElementById('s-logged-at').value;
    const severity = parseInt(document.getElementById('s-severity').value);
    if (!loggedAt) { toast.error('Date is required'); return; }
    const resolvedVal = document.getElementById('s-resolved').value;
    const data = {
      patient_id: document.getElementById('s-patient').value,
      logged_at: new Date(loggedAt).toISOString(),
      severity,
      description: document.getElementById('s-description').value.trim() || null,
      resolved_at: resolvedVal ? new Date(resolvedVal).toISOString() : null,
      notes: document.getElementById('s-notes').value.trim() || null,
    };
    try {
      if (isEdit) {
        await api.updateSymptom(sym.id, data);
        toast.success('Symptom log updated');
      } else {
        await api.createSymptom(data);
        toast.success('Symptom logged');
      }
      m.close();
      if (onSave) onSave(); else renderSymptomsView();
    } catch (err) { toast.error(err.message); }
  });
}
