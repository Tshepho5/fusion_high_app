/**
 * Parent Dashboard - Children Module
 */
import { safeParentApiCall, renderTrendChart } from './parentOverview.js';
import { getChildOverview, getProgress, deactivateChild as deactivateChildAPI } from '../../api.js';

export async function loadParentChildrenDetailed() {
    try {
        const data = await safeParentApiCall('/api/parent/children-detailed');
        if (!data || !data.children || data.children.length === 0) {
            const container = document.getElementById('children-list');
            if (container) {
                container.innerHTML = `
                    <div class="parent-card" style="text-align:center; padding:3rem 1.5rem;">
                        <i class="fas fa-user-graduate" style="font-size:3rem; color:#38BDF8; margin-bottom:1rem;"></i>
                        <h3 style="margin:0 0 0.5rem 0; color:#F8FAFC;">No Linked Children Found</h3>
                        <p style="color:#94A3B8; margin-bottom:1.5rem;">Click 'Activate Child' from the sidebar or activate button below to link your child using their Learner Number.</p>
                        <button class="btn btn-primary" onclick="window.openAddChildModal()"><i class="fas fa-user-plus"></i> Activate Child Account</button>
                    </div>
                `;
            }
            return;
        }

        const container = document.getElementById('children-list');
        if (!container) return;

        const activeChild = data.children.find(c => c.child_id === window.activeParentChildId) || data.children[0];
        const isSingleChildView = window.singleParentChildMode === true;

        // Top Back Tracking Button for single child profile view
        let backButtonHtml = isSingleChildView ? `
            <div style="margin-bottom:1.25rem;">
                <button class="btn btn-secondary" onclick="window.showAllChildrenProfiles()" style="display:inline-flex; align-items:center; gap:0.5rem; background:#1E293B; border:1px solid #334155; color:#38BDF8; font-weight:600; padding:0.6rem 1.2rem; border-radius:8px; cursor:pointer;">
                    <i class="fas fa-arrow-left"></i> Back to All Children
                </button>
            </div>
        ` : '';

        // 1. Top Horizontal Child Cards + Add Child (Only rendered when viewing all children)
        let childCardsHtml = !isSingleChildView ? `
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap:1.25rem; margin-bottom:1.5rem;">
                ${data.children.map(c => `
                    <div class="multi-child-card ${c.child_id === activeChild.child_id ? 'active' : ''}" onclick="window.selectActiveChild(${c.child_id}); window.loadParentChildrenDetailed();">
                        <div class="multi-child-header">
                            <img src="${c.profile_picture || '/assets/default-pfp.png'}" class="parent-child-avatar">
                            <div style="flex:1;">
                                <div style="display:flex; justify-content:space-between; align-items:center;">
                                    <h4 style="margin:0; font-size:1rem; color:#f8fafc;">${c.name}</h4>
                                    <span class="badge-status badge-present">Active</span>
                                </div>
                                <p style="margin:2px 0 0 0; font-size:0.8rem; color:#94a3b8;">Grade ${c.grade}</p>
                            </div>
                        </div>
                        <div style="display:flex; justify-content:space-around; background:rgba(30,41,59,0.7); padding:0.5rem; border-radius:8px; font-size:0.75rem;">
                            <div><span style="color:#94a3b8;">Avg Mark:</span> <strong style="color:#38bdf8;">${c.average_mark}%</strong></div>
                            <div><span style="color:#94a3b8;">Attendance:</span> <strong style="color:#4ade80;">${c.attendance_pct}%</strong></div>
                            <div><span style="color:#94a3b8;">Alerts:</span> <strong style="color:#f59e0b;">${c.alerts_count}</strong></div>
                        </div>
                    </div>
                `).join('')}
                <div class="multi-child-card" onclick="window.openAddChildModal()" style="display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; border:2px dashed #334155; background:transparent; cursor:pointer;">
                    <i class="fas fa-plus-circle" style="font-size:2rem; color:#38bdf8; margin-bottom:0.5rem;"></i>
                    <h4 style="margin:0; color:#f8fafc; font-size:0.95rem;">Add Child</h4>
                    <p style="margin:2px 0 0 0; font-size:0.75rem; color:#94a3b8;">Link another child to account</p>
                </div>
            </div>
        ` : '';

        // 2. Active Child Full Detailed Grid
        let mainGridHtml = `
            <div class="parent-card" style="margin-bottom:1.5rem;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.25rem;">
                    <div style="display:flex; align-items:center; gap:1rem;">
                        <img src="${activeChild.profile_picture || '/assets/default-pfp.png'}" style="width:60px; height:60px; border-radius:50%; object-fit:cover; border:2px solid #38bdf8;">
                        <div>
                            <h3 style="margin:0; color:#f8fafc;">${activeChild.name} <span style="font-size:0.9rem; color:#94a3b8;">(Grade ${activeChild.grade})</span></h3>
                            <p style="margin:2px 0 0 0; font-size:0.85rem; color:#94a3b8;">Overview of ${activeChild.first_name}'s performance this term.</p>
                        </div>
                    </div>
                    <button class="btn btn-secondary" onclick="window.loadParentChildrenDetailed()"><i class="fas fa-sync-alt"></i> Refresh Data</button>
                </div>

                <div class="parent-grid-2col" style="grid-template-columns: repeat(3, 1fr); gap:1.25rem;">
                    <!-- Card 1: Overview Donut & Stats -->
                    <div style="background:#1E293B; border-radius:12px; padding:1.25rem; border:1px solid #334155;">
                        <h4 style="margin:0 0 1rem 0; color:#f8fafc;">Average & Rank</h4>
                        <div style="text-align:center; margin-bottom:1rem;">
                            <div style="width:120px; height:120px; border-radius:50%; border:8px solid #4ADE80; display:flex; flex-direction:column; align-items:center; justify-content:center; margin:0 auto;">
                                <span style="font-size:1.5rem; font-weight:800; color:#f8fafc;">${activeChild.average_mark}%</span>
                                <span style="font-size:0.7rem; color:#4ade80;">Average Mark</span>
                            </div>
                        </div>
                        <div style="display:flex; flex-direction:column; gap:0.5rem; font-size:0.85rem;">
                            <div style="display:flex; justify-content:space-between;"><span style="color:#94a3b8;">Highest Mark:</span> <strong style="color:#4ade80;">${activeChild.highest_mark}%</strong></div>
                            <div style="display:flex; justify-content:space-between;"><span style="color:#94a3b8;">Lowest Mark:</span> <strong style="color:#f59e0b;">${activeChild.lowest_mark}%</strong></div>
                            <div style="display:flex; justify-content:space-between;"><span style="color:#94a3b8;">Class Rank:</span> <strong style="color:#38bdf8;">${activeChild.class_rank}</strong></div>
                            <div style="display:flex; justify-content:space-between;"><span style="color:#94a3b8;">Total Subjects:</span> <strong style="color:#f8fafc;">${activeChild.total_subjects}</strong></div>
                        </div>
                    </div>

                    <!-- Card 2: Subject Performance Bars -->
                    <div style="background:#1E293B; border-radius:12px; padding:1.25rem; border:1px solid #334155;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                            <h4 style="margin:0; color:#f8fafc;">Subject Performance</h4>
                            <a href="#" onclick="switchTab('performance'); return false;" style="font-size:0.75rem; color:#ef4444;">View All</a>
                        </div>
                        ${(activeChild.subject_performance || []).slice(0, 5).map(s => `
                            <div class="dow-row">
                                <div class="dow-meta">
                                    <span>${s.subject}</span>
                                    <strong style="color:#38bdf8;">${s.mark}%</strong>
                                </div>
                                <div class="dow-bar-bg">
                                    <div class="dow-bar-fill" style="width: ${s.mark}%;"></div>
                                </div>
                            </div>
                        `).join('')}
                    </div>

                    <!-- Card 3: Recent Alerts -->
                    <div style="background:#1E293B; border-radius:12px; padding:1.25rem; border:1px solid #334155;">
                        <h4 style="margin:0 0 1rem 0; color:#f8fafc;">Recent Alerts</h4>
                        ${(activeChild.recent_alerts || []).map(a => `
                            <div style="background:rgba(239,68,68,0.1); border-left:3px solid ${a.type === 'danger' ? '#ef4444' : '#f59e0b'}; padding:0.75rem; border-radius:6px; margin-bottom:0.75rem;">
                                <h5 style="margin:0; color:#f8fafc; font-size:0.85rem;">${a.title}</h5>
                                <p style="margin:2px 0 0 0; font-size:0.75rem; color:#cbd5e1;">${a.desc}</p>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Bottom 3 Cards Row -->
                <div class="parent-grid-2col" style="grid-template-columns: repeat(3, 1fr); gap:1.25rem; margin-top:1.25rem;">
                    <!-- Card 4: Attendance Summary -->
                    <div style="background:#1E293B; border-radius:12px; padding:1.25rem; border:1px solid #334155;">
                        <h4 style="margin:0 0 1rem 0; color:#f8fafc;">Attendance Summary</h4>
                        <div style="text-align:center; margin-bottom:1rem;">
                            <div style="width:100px; height:100px; border-radius:50%; border:6px solid #38BDF8; display:flex; flex-direction:column; align-items:center; justify-content:center; margin:0 auto;">
                                <span style="font-size:1.25rem; font-weight:800; color:#f8fafc;">${activeChild.attendance_pct}%</span>
                                <span style="font-size:0.65rem; color:#38bdf8;">Present</span>
                            </div>
                        </div>
                        <div style="display:flex; flex-direction:column; gap:0.5rem; font-size:0.85rem;">
                            <div style="display:flex; justify-content:space-between;"><span style="color:#94a3b8;">Present:</span> <strong style="color:#4ade80;">${activeChild.days_present} days</strong></div>
                            <div style="display:flex; justify-content:space-between;"><span style="color:#94a3b8;">Absent:</span> <strong style="color:#ef4444;">${activeChild.days_absent} days</strong></div>
                            <div style="display:flex; justify-content:space-between;"><span style="color:#94a3b8;">Late:</span> <strong style="color:#f59e0b;">${activeChild.days_late} days</strong></div>
                        </div>
                    </div>

                    <!-- Card 5: Upcoming Events -->
                    <div style="background:#1E293B; border-radius:12px; padding:1.25rem; border:1px solid #334155;">
                        <h4 style="margin:0 0 1rem 0; color:#f8fafc;">Upcoming Events</h4>
                        ${(activeChild.upcoming_events || []).map(e => `
                            <div style="display:flex; gap:0.75rem; align-items:center; margin-bottom:0.75rem;">
                                <div style="background:#0F172A; border-radius:8px; padding:0.4rem 0.6rem; text-align:center; min-width:55px;">
                                    <span style="font-size:0.75rem; font-weight:700; color:#38bdf8; display:block;">${e.date}</span>
                                </div>
                                <div>
                                    <h5 style="margin:0; font-size:0.85rem; color:#f8fafc;">${e.title}</h5>
                                    <p style="margin:2px 0 0 0; font-size:0.75rem; color:#94a3b8;">${e.time}</p>
                                </div>
                            </div>
                        `).join('')}
                    </div>

                    <!-- Card 6: Quick Actions -->
                    <div style="background:#1E293B; border-radius:12px; padding:1.25rem; border:1px solid #334155;">
                        <h4 style="margin:0 0 1rem 0; color:#f8fafc;">Quick Actions</h4>
                        <div style="display:flex; flex-direction:column; gap:0.6rem;">
                            <button class="btn btn-secondary" onclick="switchTab('performance')" style="text-align:left; justify-content:flex-start;"><i class="fas fa-file-alt"></i> View Academic Report</button>
                            <button class="btn btn-secondary" onclick="switchTab('attendance')" style="text-align:left; justify-content:flex-start;"><i class="fas fa-calendar-check"></i> View Attendance Records</button>
                            <button class="btn btn-secondary" onclick="switchTab('messages')" style="text-align:left; justify-content:flex-start;"><i class="fas fa-envelope"></i> Message Class Teacher</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = backButtonHtml + childCardsHtml + mainGridHtml;

    } catch (err) {
        console.error('Error loading children detailed:', err);
    }
}

window.showAllChildrenProfiles = function() {
    window.singleParentChildMode = false;
    window.loadParentChildrenDetailed();
};

window.viewSingleChildProfile = function(childId) {
    window.activeParentChildId = childId;
    window.singleParentChildMode = true;
    if (window.switchTab) window.switchTab('children');
};

export function switchChildSubTab(subTabId, el) {
    document.querySelectorAll('.child-subtab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.child-subtab-content').forEach(cont => cont.classList.add('hidden'));

    if (el) el.classList.add('active');
    const target = document.getElementById(`child-subtab-${subTabId}`);
    if (target) target.classList.remove('hidden');

    if (subTabId === 'academic') loadChildAcademicSubView();
    if (subTabId === 'attendance') loadChildAttendanceSubView();
    if (subTabId === 'assignments') loadChildAssignmentsSubView();
    if (subTabId === 'timetable') loadChildTimetableSubView();
    if (subTabId === 'alerts') loadChildAlertsSubView();
    if (subTabId === 'reports') loadChildReportsSubView();
}

export async function loadChildAcademicSubView() {
    const container = document.getElementById('child-academic-view');
    if (!container) return;
    container.innerHTML = '<div class="skeleton-box" style="height:200px; margin-bottom:1rem;"></div>';

    try {
        const childId = window.activeParentChildId || '';
        const data = await safeParentApiCall(`/api/parent/child-performance?childId=${childId}`);
        if (!data || !data.subject_performance_table) {
            container.innerHTML = '<div class="parent-card" style="text-align:center;"><p style="color:#94a3b8;">No academic results available for this child.</p></div>';
            return;
        }

        container.innerHTML = `
            <div class="parent-card">
                <div class="parent-card-header">
                    <h3 class="parent-card-title"><i class="fas fa-graduation-cap"></i> Academic Performance & Subject Breakdown</h3>
                </div>
                <div style="overflow-x:auto; margin-top:1rem;">
                    <table style="width:100%; border-collapse:collapse; color:#f8fafc;">
                        <thead>
                            <tr style="border-bottom:1px solid #334155; text-align:left; color:#94a3b8; font-size:0.85rem;">
                                <th style="padding:0.75rem 1rem;">Subject</th>
                                <th style="padding:0.75rem 1rem;">Average Mark</th>
                                <th style="padding:0.75rem 1rem;">Grade Letter</th>
                                <th style="padding:0.75rem 1rem;">Performance Bar</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.subject_performance_table.map(s => `
                                <tr style="border-bottom:1px solid #1e293b;">
                                    <td style="padding:0.75rem 1rem; font-weight:600;">${s.subject}</td>
                                    <td style="padding:0.75rem 1rem; color:#38bdf8; font-weight:700;">${s.average_pct}%</td>
                                    <td style="padding:0.75rem 1rem;"><span class="badge-grade badge-grade-${s.grade_letter.toLowerCase().charAt(0)}">${s.grade_letter}</span></td>
                                    <td style="padding:0.75rem 1rem; min-width:150px;">
                                        <div class="dow-bar-bg"><div class="dow-bar-fill" style="width:${s.average_pct}%;"></div></div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    } catch (err) {
        container.innerHTML = '<div class="parent-card" style="text-align:center;"><p style="color:#ef4444;">Failed to load academic data. Please retry.</p></div>';
    }
}

export async function loadChildAttendanceSubView() {
    const container = document.getElementById('child-attendance-view');
    if (!container) return;
    container.innerHTML = '<div class="skeleton-box" style="height:200px; margin-bottom:1rem;"></div>';

    try {
        const childId = window.activeParentChildId || '';
        const data = await safeParentApiCall(`/api/parent/child-attendance?childId=${childId}`);
        if (!data) return;

        container.innerHTML = `
            <div class="parent-card">
                <div class="parent-card-header">
                    <h3 class="parent-card-title"><i class="fas fa-calendar-check"></i> Live Attendance Log & Records</h3>
                </div>
                <div style="overflow-x:auto; margin-top:1rem;">
                    <table style="width:100%; border-collapse:collapse; color:#f8fafc;">
                        <thead>
                            <tr style="border-bottom:1px solid #334155; text-align:left; color:#94a3b8; font-size:0.85rem;">
                                <th style="padding:0.75rem 1rem;">Date</th>
                                <th style="padding:0.75rem 1rem;">Day</th>
                                <th style="padding:0.75rem 1rem;">Status</th>
                                <th style="padding:0.75rem 1rem;">Time In</th>
                                <th style="padding:0.75rem 1rem;">Time Out</th>
                                <th style="padding:0.75rem 1rem;">Notes</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${(data.recent_attendance_records || []).map(r => `
                                <tr style="border-bottom:1px solid #1e293b;">
                                    <td style="padding:0.75rem 1rem;">${r.date}</td>
                                    <td style="padding:0.75rem 1rem;">${r.day}</td>
                                    <td style="padding:0.75rem 1rem;"><span class="badge-status badge-${r.status.toLowerCase()}">${r.status}</span></td>
                                    <td style="padding:0.75rem 1rem;">${r.time_in}</td>
                                    <td style="padding:0.75rem 1rem;">${r.time_out}</td>
                                    <td style="padding:0.75rem 1rem; color:#94a3b8;">${r.notes || '—'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    } catch (err) {
        container.innerHTML = '<div class="parent-card" style="text-align:center;"><p style="color:#ef4444;">Failed to load attendance records.</p></div>';
    }
}

export async function loadChildAssignmentsSubView() {
    const container = document.getElementById('child-assignments-view');
    if (!container) return;
    container.innerHTML = '<div class="skeleton-box" style="height:200px;"></div>';

    try {
        const childId = window.activeParentChildId || '';
        const data = await safeParentApiCall(`/api/parent/child-assignments?childId=${childId}`);
        if (!data || !data.assignments || data.assignments.length === 0) {
            container.innerHTML = '<div class="parent-card" style="text-align:center;"><p style="color:#94a3b8;">No assignments available for this child.</p></div>';
            return;
        }

        container.innerHTML = `
            <div class="parent-card">
                <div class="parent-card-header">
                    <h3 class="parent-card-title"><i class="fas fa-tasks"></i> Child Assignments & Submissions</h3>
                </div>
                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:1.25rem; margin-top:1rem;">
                    ${data.assignments.map(a => `
                        <div style="background:#1E293B; border-radius:10px; padding:1.25rem; border:1px solid #334155;">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
                                <span style="font-size:0.75rem; color:#38bdf8; font-weight:700;">${a.subject}</span>
                                <span class="badge-status ${a.status === 'Completed' ? 'badge-present' : 'badge-late'}">${a.status}</span>
                            </div>
                            <h4 style="margin:0 0 0.5rem 0; color:#f8fafc;">${a.title}</h4>
                            <p style="margin:0 0 0.5rem 0; font-size:0.8rem; color:#94a3b8;">Due Date: <strong>${a.due_date}</strong></p>
                            <p style="margin:0 0 0.75rem 0; font-size:0.8rem; color:#cbd5e1;">Grade/Marks: <strong style="color:#4ade80;">${a.marks}</strong></p>
                            <p style="margin:0; font-size:0.75rem; color:#94a3b8; font-style:italic;">Teacher Feedback: "${a.feedback}"</p>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    } catch (err) {
        container.innerHTML = '<div class="parent-card" style="text-align:center;"><p style="color:#ef4444;">Failed to load assignments.</p></div>';
    }
}

export async function loadChildTimetableSubView() {
    const container = document.getElementById('child-timetable-view');
    if (!container) return;
    container.innerHTML = '<div class="skeleton-box" style="height:200px;"></div>';

    try {
        const childId = window.activeParentChildId || '';
        const data = await safeParentApiCall(`/api/parent/child-timetable?childId=${childId}`);
        if (!data || !data.timetable || data.timetable.length === 0) {
            container.innerHTML = `
                <div class="parent-card" style="text-align:center; padding:2.5rem 1.5rem;">
                    <i class="fas fa-calendar-times" style="font-size:2.5rem; color:#64748b; margin-bottom:1rem;"></i>
                    <h4 style="margin:0; color:#f8fafc;">No timetable available at the moment.</h4>
                    <p style="color:#94a3b8; font-size:0.85rem; margin-top:0.5rem;">The class schedule has not been published yet.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="parent-card">
                <div class="parent-card-header">
                    <h3 class="parent-card-title"><i class="fas fa-clock"></i> Weekly Class Timetable</h3>
                </div>
                <div style="overflow-x:auto; margin-top:1rem;">
                    <table style="width:100%; border-collapse:collapse; color:#f8fafc;">
                        <thead>
                            <tr style="border-bottom:1px solid #334155; text-align:left; color:#94a3b8; font-size:0.85rem;">
                                <th style="padding:0.75rem 1rem;">Day</th>
                                <th style="padding:0.75rem 1rem;">Period</th>
                                <th style="padding:0.75rem 1rem;">Subject</th>
                                <th style="padding:0.75rem 1rem;">Teacher</th>
                                <th style="padding:0.75rem 1rem;">Room</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.timetable.map(t => `
                                <tr style="border-bottom:1px solid #1e293b;">
                                    <td style="padding:0.75rem 1rem; color:#38bdf8; font-weight:700;">${t.day}</td>
                                    <td style="padding:0.75rem 1rem;">${t.period}</td>
                                    <td style="padding:0.75rem 1rem; font-weight:600;">${t.subject}</td>
                                    <td style="padding:0.75rem 1rem;">${t.teacher}</td>
                                    <td style="padding:0.75rem 1rem; color:#94a3b8;">${t.room}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    } catch (err) {
        container.innerHTML = `
            <div class="parent-card" style="text-align:center; padding:2rem 1.5rem;">
                <i class="fas fa-calendar-times" style="font-size:2.5rem; color:#64748b; margin-bottom:1rem;"></i>
                <h4 style="margin:0; color:#f8fafc;">No timetable available at the moment.</h4>
            </div>
        `;
    }
}

export async function loadChildAlertsSubView() {
    const container = document.getElementById('child-alerts-view');
    if (!container) return;
    container.innerHTML = '<div class="skeleton-box" style="height:200px;"></div>';

    try {
        const childId = window.activeParentChildId || '';
        const data = await safeParentApiCall(`/api/parent/child-alerts?childId=${childId}`);
        if (!data || !data.alerts || data.alerts.length === 0) {
            container.innerHTML = '<div class="parent-card" style="text-align:center;"><p style="color:#94a3b8;">No alerts available for this child.</p></div>';
            return;
        }

        container.innerHTML = `
            <div class="parent-card">
                <div class="parent-card-header">
                    <h3 class="parent-card-title"><i class="fas fa-bell"></i> Dynamic Student Alerts & Notifications</h3>
                </div>
                <div style="display:flex; flex-direction:column; gap:1rem; margin-top:1rem;">
                    ${data.alerts.map(al => `
                        <div style="background:rgba(239,68,68,0.08); border-left:4px solid ${al.priority === 'High' ? '#ef4444' : '#f59e0b'}; padding:1rem; border-radius:8px;">
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                <h4 style="margin:0; color:#f8fafc;">${al.title}</h4>
                                <span class="badge-status ${al.priority === 'High' ? 'badge-absent' : 'badge-late'}">${al.priority} Priority</span>
                            </div>
                            <p style="margin:4px 0 0 0; font-size:0.85rem; color:#cbd5e1;">${al.description}</p>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    } catch (err) {
        container.innerHTML = '<div class="parent-card" style="text-align:center;"><p style="color:#ef4444;">Failed to load alerts.</p></div>';
    }
}

export function loadChildReportsSubView() {
    const container = document.getElementById('child-reports-view');
    if (!container) return;
    container.innerHTML = `
        <div class="parent-card">
            <div class="parent-card-header">
                <h3 class="parent-card-title"><i class="fas fa-file-pdf"></i> Academic Reports & Progress Exports</h3>
            </div>
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:1.25rem; margin-top:1rem;">
                <div style="background:#1E293B; border-radius:10px; padding:1.25rem; border:1px solid #334155; text-align:center;">
                    <i class="fas fa-file-alt" style="font-size:2.5rem; color:#38bdf8; margin-bottom:0.75rem;"></i>
                    <h4 style="margin:0 0 0.5rem 0; color:#f8fafc;">Term Academic Report</h4>
                    <p style="margin:0 0 1rem 0; font-size:0.8rem; color:#94a3b8;">Complete subject grades and teacher comments.</p>
                    <button class="btn btn-primary" onclick="window.downloadChildReport('Academic')"><i class="fas fa-download"></i> Download PDF</button>
                </div>
                <div style="background:#1E293B; border-radius:10px; padding:1.25rem; border:1px solid #334155; text-align:center;">
                    <i class="fas fa-calendar-check" style="font-size:2.5rem; color:#4ade80; margin-bottom:0.75rem;"></i>
                    <h4 style="margin:0 0 0.5rem 0; color:#f8fafc;">Attendance Summary Report</h4>
                    <p style="margin:0 0 1rem 0; font-size:0.8rem; color:#94a3b8;">Full term daily attendance log and stats.</p>
                    <button class="btn btn-primary" onclick="window.downloadChildReport('Attendance')"><i class="fas fa-download"></i> Download PDF</button>
                </div>
                <div style="background:#1E293B; border-radius:10px; padding:1.25rem; border:1px solid #334155; text-align:center;">
                    <i class="fas fa-chart-line" style="font-size:2.5rem; color:#f59e0b; margin-bottom:0.75rem;"></i>
                    <h4 style="margin:0 0 0.5rem 0; color:#f8fafc;">Full Student Progress Profile</h4>
                    <p style="margin:0 0 1rem 0; font-size:0.8rem; color:#94a3b8;">Combined academic, attendance & alert portfolio.</p>
                    <button class="btn btn-primary" onclick="window.downloadChildReport('Full Progress')"><i class="fas fa-download"></i> Download PDF</button>
                </div>
            </div>
        </div>
    `;
}

export function downloadChildReport(type) {
    const childId = window.activeParentChildId || null;
    if (window.downloadCapsReportCard) {
        window.downloadCapsReportCard(childId);
    } else {
        alert('Report Card generator module loading... Please try again.');
    }
}

export async function toggleChildOverview(childId, element) {
    const overviewBox = document.getElementById(`overview-for-child-${childId}`);
    if (!overviewBox) return;

    const isOpening = overviewBox.classList.contains('hidden');

    document.querySelectorAll('.child-overview-details').forEach(box => box.classList.add('hidden'));
    document.querySelectorAll('.card-link').forEach(link => link.innerHTML = 'Full Overview &darr;');

    if (isOpening) {
        overviewBox.classList.remove('hidden');
        overviewBox.innerHTML = `<div class="loading-placeholder">Loading Overview...</div>`;
        element.innerHTML = 'Hide Overview &uarr;';

        try {
            const data = await getChildOverview(childId);
            const trendChartId = `trend-chart-${childId}`;
            const progress = await getProgress(childId);

            overviewBox.innerHTML = `
                <div class="overview-grid">
                    <div class="overview-stat-item">
                        <span>Attendance</span>
                        <strong>${data.stats.attendance}%</strong>
                    </div>
                    <div class="overview-stat-item">
                        <span>Average Mark</span>
                        <strong>${data.stats.averageGrade || '0'}%</strong>
                    </div>
                    <div class="overview-subject-list">
                        <h4>Enrolled Subjects</h4>
                        <div class="subject-list-items">
                            ${data.subjectPerformance.length > 0 ? data.subjectPerformance.map(sub => `
                                <div class="subject-item">
                                    <div class="subject-item-details">
                                        <span>${sub.subject}</span>
                                        <span class="badge badge-purple">${sub.grade || '--'}%</span>
                                    </div>
                                    ${sub.teacherEmail ? `
                                    <button onclick="openMessageModal('${sub.teacherName}', '${sub.teacherEmail}', '${sub.subject}', '${data.child.fullName}', ${childId})" class="btn btn-contact-teacher">Contact ${sub.teacherName}</button>
                                    ` : ''}
                                </div>
                            `).join('') : '<p class="text-muted">No subject data yet.</p>'}
                        </div>
                    </div>
                    <div class="overview-progress-chart">
                        <h4>Progress Trend</h4>
                        <canvas id="${trendChartId}" height="150"></canvas>
                    </div>
                </div>
            `;

            renderTrendChart(trendChartId, progress);

        } catch (error) {
            overviewBox.innerHTML = `<div class="error-placeholder">Could not load overview: ${error.message}</div>`;
        }
    }
}

export async function deactivateChild(childId) {
    const confirmation = confirm("Are you sure you want to deactivate this child from your profile? This will unlink them from your account.");
    if (!confirmation) return;

    try {
        const result = await deactivateChildAPI(childId);
        alert(result.message);
        if (window.loadParentDashboard) window.loadParentDashboard();
    } catch (error) {
        alert(`Deactivation failed: ${error.message}`);
    }
}

export function displayChildren(children) {
    const container = document.getElementById('children-list');
    if (!container) return;
    if (children.length === 0) {
        container.innerHTML = '<p>No children registered.</p>';
        return;
    }
    container.innerHTML = children.map(child => `
        <div class="child-container">
            <div class="child-card card">
                <img src="${child.profile_picture_path ? `/${child.profile_picture_path}` : '/assets/default-pfp.png'}" alt="Profile Picture" class="child-pfp">
                <div class="child-details">
                    <h3>${child.full_name} ${child.surname}</h3>
                    <div class="child-meta">
                        <span>Grade: <strong>${child.grade}</strong></span>
                        <span>Learner #: <strong>${child.learner_number}</strong></span>
                        <span>Subjects: <strong>${child.subjects ? child.subjects.length : 0}</strong></span>
                    </div>
                    <p class="child-email">Account Email: ${child.learner_email}</p>
                </div>
                <div class="child-actions">
                    <a href="#" onclick="toggleChildOverview(${child.id}, this); return false;" class="card-link">Full Overview &darr;</a>
                </div>
            </div>
            <div id="overview-for-child-${child.id}" class="child-overview-details hidden"></div>
        </div>
    `).join('');
}
