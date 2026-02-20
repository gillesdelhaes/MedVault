const CAL_STATE = {
  view: 'month', // 'month' | 'week'
  year: new Date().getFullYear(),
  month: new Date().getMonth(),     // 0-indexed
  weekStart: null,                  // Date of Monday of current week
  patientId: '',
};

async function renderCalendarView() {
  const patients = await api.getPatients();

  // Init weekStart to current Monday
  if (!CAL_STATE.weekStart) {
    const today = new Date();
    const d = new Date(today);
    const day = d.getDay();
    const diff = (day === 0) ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    CAL_STATE.weekStart = d;
  }

  app.innerHTML = `
    <div class="calendar-toolbar">
      <div class="calendar-nav">
        <button class="btn btn--ghost btn--sm" id="cal-prev">&#8592;</button>
        <span class="calendar-title" id="cal-title"></span>
        <button class="btn btn--ghost btn--sm" id="cal-next">&#8594;</button>
        <button class="btn btn--ghost btn--sm" id="cal-today">Today</button>
      </div>
      <div style="display:flex;gap:var(--space-3);align-items:center;flex-wrap:wrap">
        <div class="calendar-view-toggle">
          <button class="btn btn--sm ${CAL_STATE.view === 'month' ? 'btn--primary' : 'btn--ghost'}" id="cal-month-btn">Month</button>
          <button class="btn btn--sm ${CAL_STATE.view === 'week' ? 'btn--primary' : 'btn--ghost'}" id="cal-week-btn">Week</button>
        </div>
        <div class="calendar-patient-filter">
          <select id="cal-patient">
            <option value="">All patients</option>
            ${patients.map(p => `<option value="${p.id}" ${CAL_STATE.patientId === p.id ? 'selected' : ''}>${escapeHtml(p.name)}</option>`).join('')}
          </select>
        </div>
        <button class="btn btn--primary btn--sm" id="cal-add-appt">+ Appointment</button>
      </div>
    </div>
    <div id="cal-container"></div>
    <div class="cal-legend">
      <div class="cal-legend-item"><div class="cal-legend-dot"></div> Appointment</div>
      <div class="cal-legend-item"><div class="cal-legend-dot cal-legend-dot--symptom"></div> Symptom</div>
      <div class="cal-legend-item"><div class="cal-legend-dot cal-legend-dot--med"></div> Medication</div>
    </div>`;

  document.getElementById('cal-prev').addEventListener('click', () => navigate(-1));
  document.getElementById('cal-next').addEventListener('click', () => navigate(1));
  document.getElementById('cal-today').addEventListener('click', goToday);
  document.getElementById('cal-month-btn').addEventListener('click', () => setView('month'));
  document.getElementById('cal-week-btn').addEventListener('click', () => setView('week'));
  document.getElementById('cal-patient').addEventListener('change', (e) => {
    CAL_STATE.patientId = e.target.value;
    renderCal();
  });
  document.getElementById('cal-add-appt').addEventListener('click', () => {
    openApptModal(null, patients, () => renderCal());
  });

  await renderCal();

  function navigate(dir) {
    if (CAL_STATE.view === 'month') {
      CAL_STATE.month += dir;
      if (CAL_STATE.month > 11) { CAL_STATE.month = 0; CAL_STATE.year++; }
      if (CAL_STATE.month < 0)  { CAL_STATE.month = 11; CAL_STATE.year--; }
    } else {
      const d = new Date(CAL_STATE.weekStart);
      d.setDate(d.getDate() + dir * 7);
      CAL_STATE.weekStart = d;
    }
    renderCal();
  }

  function goToday() {
    const today = new Date();
    CAL_STATE.year = today.getFullYear();
    CAL_STATE.month = today.getMonth();
    const d = new Date(today);
    const day = d.getDay();
    const diff = (day === 0) ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    CAL_STATE.weekStart = d;
    renderCal();
  }

  function setView(v) {
    CAL_STATE.view = v;
    document.getElementById('cal-month-btn')?.classList.toggle('btn--primary', v === 'month');
    document.getElementById('cal-month-btn')?.classList.toggle('btn--ghost', v !== 'month');
    document.getElementById('cal-week-btn')?.classList.toggle('btn--primary', v === 'week');
    document.getElementById('cal-week-btn')?.classList.toggle('btn--ghost', v !== 'week');
    renderCal();
  }
}

async function renderCal() {
  const container = document.getElementById('cal-container');
  if (!container) return;
  container.innerHTML = '<div class="loading"><div class="spinner"></div> Loading…</div>';

  try {
    const { from, to } = getDateRange();
    const title = document.getElementById('cal-title');
    if (title) title.textContent = getRangeLabel();

    const params = {
      from: from.toISOString(),
      to: to.toISOString(),
    };
    if (CAL_STATE.patientId) params.patient_id = CAL_STATE.patientId;

    const { events } = await api.getCalendar(params);

    // Group events by date key YYYY-MM-DD
    const byDate = {};
    for (const ev of events) {
      const key = ev.datetime.slice(0, 10);
      if (!byDate[key]) byDate[key] = [];
      byDate[key].push(ev);
    }

    if (CAL_STATE.view === 'month') {
      renderMonthView(container, from, to, byDate);
    } else {
      renderWeekView(container, byDate);
    }
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><p>Error loading calendar: ${escapeHtml(err.message)}</p></div>`;
  }
}

function getDateRange() {
  if (CAL_STATE.view === 'month') {
    const from = new Date(CAL_STATE.year, CAL_STATE.month, 1);
    const to = new Date(CAL_STATE.year, CAL_STATE.month + 1, 0, 23, 59, 59);
    return { from, to };
  } else {
    const from = new Date(CAL_STATE.weekStart);
    const to = new Date(CAL_STATE.weekStart);
    to.setDate(to.getDate() + 6);
    to.setHours(23, 59, 59);
    return { from, to };
  }
}

function getRangeLabel() {
  if (CAL_STATE.view === 'month') {
    return new Date(CAL_STATE.year, CAL_STATE.month, 1)
      .toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  } else {
    const end = new Date(CAL_STATE.weekStart);
    end.setDate(end.getDate() + 6);
    const s = CAL_STATE.weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const e = end.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    return `${s} – ${e}`;
  }
}

function renderMonthView(container, from, to, byDate) {
  const today = new Date().toISOString().slice(0, 10);
  const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // First cell = first Sunday on or before the 1st of the month
  const firstDay = new Date(CAL_STATE.year, CAL_STATE.month, 1);
  const startOffset = firstDay.getDay(); // 0=Sun
  const calStart = new Date(firstDay);
  calStart.setDate(calStart.getDate() - startOffset);

  // Last cell = last Saturday on or after the last day of month
  const lastDay = new Date(CAL_STATE.year, CAL_STATE.month + 1, 0);
  const endOffset = 6 - lastDay.getDay();
  const calEnd = new Date(lastDay);
  calEnd.setDate(calEnd.getDate() + endOffset);

  const cells = [];
  const cur = new Date(calStart);
  while (cur <= calEnd) {
    cells.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }

  const headers = DAY_NAMES.map(d => `<div class="cal-day-header">${d}</div>`).join('');
  const cellsHtml = cells.map(d => {
    const key = d.toISOString().slice(0, 10);
    const isCurrentMonth = d.getMonth() === CAL_STATE.month;
    const isToday = key === today;
    const events = byDate[key] || [];
    const dots = events.slice(0, 8).map(ev => dotHtml(ev)).join('');
    return `<div class="cal-cell${!isCurrentMonth ? ' cal-cell--other-month' : ''}${isToday ? ' cal-cell--today' : ''}" data-date="${key}">
      <span class="cal-date-num">${d.getDate()}</span>
      <div class="cal-dots">${dots}</div>
    </div>`;
  }).join('');

  container.innerHTML = `<div class="cal-month">${headers}${cellsHtml}</div>`;

  // Dot click → detail modal
  container.querySelectorAll('.cal-dot[data-event]').forEach(dot => {
    dot.addEventListener('click', (e) => {
      e.stopPropagation();
      const ev = JSON.parse(dot.dataset.event);
      showEventModal(ev);
    });
  });
}

function renderWeekView(container, byDate) {
  const today = new Date().toISOString().slice(0, 10);
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(CAL_STATE.weekStart);
    d.setDate(d.getDate() + i);
    days.push(d);
  }

  const cols = days.map(d => {
    const key = d.toISOString().slice(0, 10);
    const isToday = key === today;
    const events = byDate[key] || [];
    const dayLabel = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    const cards = events.map(ev => `
      <div class="cal-event-card" data-event='${JSON.stringify(ev).replace(/'/g, "&#39;")}' style="--patient-color:${ev.patient_color}">
        <div class="cal-event-card__title">${escapeHtml(ev.title)}</div>
        <div class="cal-event-card__meta">${escapeHtml(ev.patient_name)}${ev.datetime ? ' · ' + new Date(ev.datetime).toLocaleTimeString(undefined, {hour:'2-digit',minute:'2-digit'}) : ''}</div>
      </div>`).join('');

    return `<div class="cal-week-col">
      <div class="cal-week-header${isToday ? ' today' : ''}">${dayLabel}</div>
      ${cards || '<div style="color:var(--color-text-muted);font-size:0.8rem;text-align:center;padding:8px">—</div>'}
    </div>`;
  }).join('');

  container.innerHTML = `<div class="cal-week">${cols}</div>`;

  container.querySelectorAll('.cal-event-card').forEach(card => {
    card.addEventListener('click', () => {
      const ev = JSON.parse(card.dataset.event.replace(/&#39;/g, "'"));
      showEventModal(ev);
    });
  });
}

function dotHtml(ev) {
  const typeClass = ev.type === 'symptom' ? 'cal-dot--symptom' : ev.type === 'medication' ? 'cal-dot--medication' : '';
  const safe = JSON.stringify(ev).replace(/"/g, '&quot;');
  return `<span class="cal-dot ${typeClass}" style="--patient-color:${ev.patient_color}" data-event="${safe}" title="${escapeHtml(ev.title)}"></span>`;
}

function showEventModal(ev) {
  const typeLabel = { appointment: 'Appointment', symptom: 'Symptom Log', medication: 'Medication' }[ev.type] || ev.type;
  const dt = ev.datetime ? new Date(ev.datetime) : null;
  const dtStr = dt ? dt.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—';

  let extraRows = '';
  if (ev.follow_up_required !== undefined && ev.follow_up_required !== null) {
    extraRows += `<div class="detail-item"><label>Follow-up Required</label><p>${ev.follow_up_required ? 'Yes' : 'No'}</p></div>`;
  }
  if (ev.severity) {
    extraRows += `<div class="detail-item"><label>Severity</label><p><span class="severity severity--${ev.severity}">${ev.severity}</span></p></div>`;
  }
  if (ev.is_ongoing !== undefined && ev.type === 'medication') {
    extraRows += `<div class="detail-item"><label>Status</label><p>${ev.is_ongoing ? 'Ongoing' : 'Limited course'}</p></div>`;
  }

  modal.open({
    title: typeLabel,
    body: `<div class="detail-grid">
      <div class="detail-item"><label>Patient</label><p>${patientBadge({ name: ev.patient_name, color: ev.patient_color })}</p></div>
      <div class="detail-item"><label>Date & Time</label><p>${dtStr}</p></div>
      <div class="detail-item" style="grid-column:1/-1"><label>Title</label><p>${escapeHtml(ev.title)}</p></div>
      ${ev.detail ? `<div class="detail-item" style="grid-column:1/-1"><label>Details</label><p>${escapeHtml(ev.detail)}</p></div>` : ''}
      ${extraRows}
    </div>`,
  });
}
