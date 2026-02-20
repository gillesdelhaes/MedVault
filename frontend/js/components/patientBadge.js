/**
 * Renders a colored patient badge.
 * Usage: patientBadge({ name: 'Alice', color: '#4A6FA5' })
 * Returns an HTML string.
 */
function patientBadge(patient) {
  if (!patient) return '<span class="patient-badge"><span class="patient-badge__dot" style="background:#ccc"></span>—</span>';
  return `<span class="patient-badge">
    <span class="patient-badge__dot" style="background:${patient.color || '#4A6FA5'}"></span>
    ${escapeHtml(patient.name)}
  </span>`;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

window.patientBadge = patientBadge;
window.escapeHtml = escapeHtml;
