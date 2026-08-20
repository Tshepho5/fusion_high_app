/**
 * Teacher Dashboard - Classes & Students Module
 */
import { apiCall } from '../../api.js';

export async function loadTeacherClasses() {
    const container = document.getElementById('teacher-classes-container');
    if (!container) return;

    try {
        const classes = await apiCall('/api/teacher/my-classes').catch(() => []);
        if (!classes || classes.length === 0) {
            container.innerHTML = '<p class="text-muted">No classes currently assigned to your account.</p>';
            return;
        }

        container.innerHTML = `
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap:1.25rem;">
                ${classes.map(c => `
                    <div class="parent-card" style="border:1px solid #334155;">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <h4 style="margin:0; color:#f8fafc;">${c.class_name}</h4>
                            <span class="badge badge-purple">Grade ${c.grade}</span>
                        </div>
                        <p style="margin:0.5rem 0; font-size:0.85rem; color:#94a3b8;">${c.subject_name || 'Subject'} • ${c.student_count || 0} Students</p>
                        <button class="btn btn-sm btn-primary" onclick="window.viewClassRoster('${c.class_id}')">View Roster</button>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (err) {
        console.error('Error loading teacher classes:', err);
    }
}

export async function viewClassRoster(classId) {
    alert(`Loading roster for class #${classId}...`);
}
