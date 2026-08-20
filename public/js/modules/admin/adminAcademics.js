/**
 * Admin Dashboard - Academics Module
 */
import { apiRequest } from './adminUsers.js';

export async function loadAcademicsSection() {
    const container = document.getElementById('academics-content');
    if (!container) return;

    try {
        const classes = await apiRequest('/api/admin/classes').catch(() => []);
        const subjects = await apiRequest('/api/admin/subjects').catch(() => []);

        container.innerHTML = `
            <div class="parent-grid-2col" style="display:grid; grid-template-columns: 1fr 1fr; gap:1.25rem;">
                <div class="parent-card">
                    <h3 class="parent-card-title"><i class="fas fa-school"></i> School Classes (${classes.length})</h3>
                    <ul style="list-style:none; padding:0; margin-top:1rem;">
                        ${classes.map(c => `<li style="padding:0.5rem 0; border-bottom:1px solid #334155; color:#f8fafc;">${c.class_name || c.name} - Grade ${c.grade}</li>`).join('')}
                    </ul>
                </div>
                <div class="parent-card">
                    <h3 class="parent-card-title"><i class="fas fa-book"></i> Enrolled Subjects (${subjects.length})</h3>
                    <ul style="list-style:none; padding:0; margin-top:1rem;">
                        ${subjects.map(s => `<li style="padding:0.5rem 0; border-bottom:1px solid #334155; color:#f8fafc;">${s.subject_name || s.name} (${s.code || 'CORE'})</li>`).join('')}
                    </ul>
                </div>
            </div>
        `;
    } catch (err) {
        console.error('Error loading academics section:', err);
    }
}
