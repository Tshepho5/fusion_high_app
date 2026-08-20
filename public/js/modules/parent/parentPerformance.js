/**
 * Parent Dashboard - Performance Module
 */
import { safeParentApiCall } from './parentOverview.js';

export async function loadParentPerformance() {
    try {
        const childrenData = await safeParentApiCall('/api/parent/children-detailed').catch(() => null);
        const children = childrenData?.children || [];

        if (children.length > 0 && !window.activeParentChildId) {
            window.activeParentChildId = children[0].child_id;
        }

        const selectorContainer = document.getElementById('parent-performance-child-selector-container');
        if (selectorContainer && children.length > 0) {
            selectorContainer.innerHTML = `
                <div style="display:flex; align-items:center; gap:0.75rem; margin-bottom:1.5rem; background:#1E293B; padding:0.75rem 1rem; border-radius:10px; border:1px solid #334155;">
                    <label style="color:#cbd5e1; font-weight:600; font-size:0.9rem;"><i class="fas fa-user-graduate me-2" style="color:#38bdf8;"></i> Select Learner:</label>
                    <select class="form-control" style="max-width:280px; background:#0F172A; color:#FFF; border:1px solid #475569; border-radius:6px; padding:0.45rem 0.75rem; font-size:0.9rem;" onchange="window.selectActiveChild(this.value); window.loadParentPerformance();">
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
        const data = await safeParentApiCall(`/api/parent/child-performance?childId=${childId}`);
        if (!data) return;

        const avgEl = document.getElementById('parent-perf-avg-mark');
        if (avgEl) avgEl.textContent = `${data.average_mark || 0}%`;
        const rankEl = document.getElementById('parent-perf-rank');
        if (rankEl) rankEl.textContent = data.class_rank || '-';
        const subjEl = document.getElementById('parent-perf-subjects');
        if (subjEl) subjEl.textContent = data.total_subjects || 0;
        const assEl = document.getElementById('parent-perf-assessments');
        if (assEl) assEl.textContent = data.completed_assessments || 0;

        const tableBody = document.getElementById('parent-subject-perf-tbody');
        if (tableBody && data.subject_performance_table) {
            if (data.subject_performance_table.length === 0) {
                tableBody.innerHTML = `<tr><td colspan="3" style="text-align:center; padding:1.5rem; color:#94a3b8;">No subject performance grades recorded yet.</td></tr>`;
            } else {
                tableBody.innerHTML = data.subject_performance_table.map(s => `
                    <tr>
                        <td style="padding:0.75rem 1rem; color:#f8fafc; font-weight:600;">${s.subject}</td>
                        <td style="padding:0.75rem 1rem; color:#38bdf8; font-weight:700;">${s.average_pct}%</td>
                        <td style="padding:0.75rem 1rem;"><span class="badge-grade badge-grade-${(s.grade_letter || 'A').toLowerCase().charAt(0)}">${s.grade_letter}</span></td>
                    </tr>
                `).join('');
            }
        }
    } catch (err) {
        console.error('Error loading parent performance:', err);
    }
}
