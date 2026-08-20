/**
 * Parent Dashboard - Attendance Module
 */
import { safeParentApiCall } from './parentOverview.js';

export async function loadParentAttendance() {
    try {
        const childrenData = await safeParentApiCall('/api/parent/children-detailed').catch(() => null);
        const children = childrenData?.children || [];
        
        if (children.length > 0 && !window.activeParentChildId) {
            window.activeParentChildId = children[0].child_id;
        }

        const selectorContainer = document.getElementById('parent-attendance-child-selector-container');
        if (selectorContainer && children.length > 0) {
            selectorContainer.innerHTML = `
                <div style="display:flex; align-items:center; gap:0.75rem; margin-bottom:1.5rem; background:#1E293B; padding:0.75rem 1rem; border-radius:10px; border:1px solid #334155;">
                    <label style="color:#cbd5e1; font-weight:600; font-size:0.9rem;"><i class="fas fa-user-graduate me-2" style="color:#38bdf8;"></i> Select Learner:</label>
                    <select class="form-control" style="max-width:280px; background:#0F172A; color:#FFF; border:1px solid #475569; border-radius:6px; padding:0.45rem 0.75rem; font-size:0.9rem;" onchange="window.selectActiveChild(this.value); window.loadParentAttendance();">
                        ${children.map(c => `
                            <option value="${c.child_id}" ${String(c.child_id) === String(window.activeParentChildId) ? 'selected' : ''}>
                                ${c.name} (Grade ${c.grade})
                            </option>
                        `).join('')}
                    </select>
                </div>
            `;
        }

        const childId = window.activeParentChildId || '';
        const data = await safeParentApiCall(`/api/parent/child-attendance?childId=${childId}`);
        if (!data) return;

        const overallEl = document.getElementById('parent-att-overall');
        if (overallEl) overallEl.textContent = `${data.overall_attendance || 0}%`;
        const presEl = document.getElementById('parent-att-present');
        if (presEl) presEl.textContent = data.days_present || 0;
        const absEl = document.getElementById('parent-att-absent');
        if (absEl) absEl.textContent = data.days_absent || 0;
        const puncEl = document.getElementById('parent-att-punctuality');
        if (puncEl) puncEl.textContent = `${data.punctuality_rate || 0}%`;

        const tbody = document.getElementById('parent-att-records-tbody');
        if (tbody && data.recent_attendance_records) {
            if (data.recent_attendance_records.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:1.5rem; color:#94a3b8;">No attendance records logged yet for this learner.</td></tr>`;
            } else {
                tbody.innerHTML = data.recent_attendance_records.map(r => `
                    <tr>
                        <td style="padding:0.75rem 1rem; color:#cbd5e1;">${r.date}</td>
                        <td style="padding:0.75rem 1rem; color:#94a3b8;">${r.day}</td>
                        <td style="padding:0.75rem 1rem;"><span class="badge-status badge-${(r.status || '').toLowerCase()}">${r.status}</span></td>
                        <td style="padding:0.75rem 1rem; color:#cbd5e1;">${r.time_in}</td>
                        <td style="padding:0.75rem 1rem; color:#cbd5e1;">${r.time_out}</td>
                        <td style="padding:0.75rem 1rem; color:#94a3b8;">${r.notes || '—'}</td>
                    </tr>
                `).join('');
            }
        }
    } catch (err) {
        console.error('Error loading parent attendance:', err);
    }
}
