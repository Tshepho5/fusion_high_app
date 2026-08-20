/**
 * Parent Dashboard - Overview Module
 */
import { switchTab } from '../../ui.js';
import { getProgress } from '../../api.js';

export async function safeParentApiCall(url) {
    const token = localStorage.getItem('token');
    const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const text = await res.text();
    try {
        return JSON.parse(text);
    } catch (e) {
        console.warn(`[PARENT API WARN] Non-JSON response for ${url}:`, text.substring(0, 100));
        return {};
    }
}

export async function loadParentOverview(term) {
    const termQuery = term ? `?term=${encodeURIComponent(term)}` : '';
    try {
        // Fetch and update unread messages badge
        safeParentApiCall('/api/messages/unread-count').then(msgData => {
            const count = msgData?.count || 0;
            const headerBadge = document.getElementById('header-unread-badge');
            const navBadge = document.getElementById('unread-messages-badge');
            if (headerBadge) {
                if (count > 0) {
                    headerBadge.textContent = count;
                    headerBadge.style.display = 'flex';
                } else {
                    headerBadge.style.display = 'none';
                }
            }
            if (navBadge) {
                if (count > 0) {
                    navBadge.textContent = count;
                    navBadge.classList.remove('hidden');
                } else {
                    navBadge.classList.add('hidden');
                }
            }
        }).catch(err => console.error("Error fetching unread message count:", err));

        const data = await safeParentApiCall(`/api/parent/overview${termQuery}`);
        if (!data || !data.children) return;

        // 1. Render Multi-Child Cards Row
        const container = document.getElementById('parent-overview-children-cards');
        if (container) {
            container.innerHTML = data.children.map((c, idx) => `
                <div class="multi-child-card ${c.child_id === window.activeParentChildId || (idx === 0 && !window.activeParentChildId) ? 'active' : ''}" onclick="window.viewSingleChildProfile(${c.child_id});">
                    <div class="multi-child-header">
                        <img src="${c.profile_picture || '/assets/default-pfp.png'}" class="parent-child-avatar" alt="${c.name}">
                        <div>
                            <h4 style="margin:0; font-size:1rem; color:#f8fafc;">${c.name}</h4>
                            <p style="margin:2px 0 0 0; font-size:0.8rem; color:#94a3b8;">Grade ${c.grade} • Fusion High</p>
                        </div>
                    </div>
                    <div class="multi-child-pills">
                        <div class="child-pill pill-primary">
                            <label>Avg. Mark</label>
                            <span>${c.average_mark}%</span>
                        </div>
                        <div class="child-pill pill-success">
                            <label>Attendance</label>
                            <span>${c.attendance_pct}%</span>
                        </div>
                        <div class="child-pill pill-warning">
                            <label>Assignments</label>
                            <span>${c.assignments_due} Due</span>
                        </div>
                        <div class="child-pill pill-danger">
                            <label>Alerts</label>
                            <span>${c.alerts_count}</span>
                        </div>
                    </div>
                </div>
            `).join('');
        }

        if (data.children.length > 0 && !window.activeParentChildId) {
            window.activeParentChildId = data.children[0].child_id;
        }

        const childNames = data.children.map(c => c.first_name || c.name).join(' and ');

        // 2. Render Middle & Bottom Grid Content in #overview Section
        const overviewSection = document.getElementById('overview');
        if (overviewSection) {
            overviewSection.innerHTML = `
                <div id="parent-overview-children-cards" class="multi-child-cards-container">
                    ${container ? container.innerHTML : ''}
                </div>

                <!-- Middle Grid Row -->
                <div class="parent-grid-2col" style="margin-top:1.5rem; display:grid; grid-template-columns: 1.2fr 0.8fr; gap:1.25rem;">
                    <!-- Performance Overview -->
                    <div class="parent-card">
                        <div class="parent-card-header">
                            <h3 class="parent-card-title"><i class="fas fa-chart-line"></i> Performance Overview</h3>
                            <a href="#" onclick="switchTab('performance'); return false;" class="parent-card-link">View Details</a>
                        </div>
                        <div style="display:grid; grid-template-columns: repeat(${Math.min(2, data.children.length)}, 1fr); gap:1.5rem; margin-top:1rem;">
                            ${data.children.map(c => `
                                <div>
                                    <h4 style="margin:0 0 0.5rem 0; font-size:0.9rem; color:#f8fafc;">${c.name} <span style="color:#94a3b8;">(Grade ${c.grade})</span></h4>
                                    <div style="height:120px; background:#0F172A; border-radius:8px; display:flex; align-items:flex-end; justify-content:space-around; padding:0.75rem;">
                                        ${(c.performance_trend || []).map(t => `
                                            <div style="display:flex; flex-direction:column; align-items:center;">
                                                <span style="font-size:0.65rem; color:#38bdf8;">${t.avg}%</span>
                                                <div style="width:12px; height:${Math.max(10, (t.avg / 100) * 80)}px; background:linear-gradient(180deg, #4ADE80, #38BDF8); border-radius:3px; margin:4px 0;"></div>
                                                <span style="font-size:0.65rem; color:#94a3b8;">${t.month}</span>
                                            </div>
                                        `).join('')}
                                    </div>
                                    <div style="margin-top:0.75rem; display:flex; justify-content:space-between; align-items:center;">
                                        <div>
                                            <span style="font-size:0.75rem; color:#94a3b8; display:block;">Average Mark</span>
                                            <strong style="font-size:1.25rem; color:#f8fafc;">${c.average_mark}%</strong>
                                        </div>
                                        <span class="parent-stat-subtext sub-success"><i class="fas fa-arrow-up"></i> Improved</span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <!-- Recent Announcements -->
                    <div class="parent-card">
                        <div class="parent-card-header">
                            <h3 class="parent-card-title"><i class="fas fa-bullhorn"></i> Recent Announcements</h3>
                            <a href="#" onclick="switchTab('announcements'); return false;" class="parent-card-link">View All</a>
                        </div>
                        <div style="display:flex; flex-direction:column; gap:0.75rem; margin-top:1rem;">
                            ${(data.announcements && data.announcements.length > 0) ? data.announcements.map(a => `
                                <div style="display:flex; align-items:center; gap:0.75rem; background:#1E293B; padding:0.75rem; border-radius:8px; border:1px solid #334155;">
                                    <div style="width:36px; height:36px; border-radius:8px; background:rgba(239,68,68,0.15); display:flex; align-items:center; justify-content:center; color:#ef4444;">
                                        <i class="fas fa-bullhorn"></i>
                                    </div>
                                    <div style="flex:1;">
                                        <h4 style="margin:0; font-size:0.85rem; color:#f8fafc;">${a.title}</h4>
                                        <p style="margin:2px 0 0 0; font-size:0.75rem; color:#94a3b8;">Fusion High • ${new Date(a.created_at).toLocaleDateString()}</p>
                                    </div>
                                    <i class="fas fa-chevron-right" style="color:#64748b; font-size:0.8rem;"></i>
                                </div>
                            `).join('') : '<p class="text-muted" style="padding:0.5rem; color:#94a3b8; font-size:0.85rem;">No announcements for your children at the moment.</p>'}
                        </div>
                    </div>
                </div>

                <!-- Bottom Grid Row -->
                <div class="parent-grid-2col" style="margin-top:1.25rem; display:grid; grid-template-columns: 1fr 1fr 0.8fr; gap:1.25rem;">
                    <!-- Attendance Overview -->
                    <div class="parent-card">
                        <div class="parent-card-header">
                            <h3 class="parent-card-title"><i class="fas fa-calendar-check"></i> Attendance Overview</h3>
                            <a href="#" onclick="switchTab('attendance'); return false;" class="parent-card-link">View Details</a>
                        </div>
                        <div style="display:grid; grid-template-columns: repeat(${Math.min(2, data.children.length)}, 1fr); gap:1rem; margin-top:1rem;">
                            ${data.children.map(c => `
                                <div>
                                    <h4 style="margin:0 0 0.5rem 0; font-size:0.85rem; color:#f8fafc;">${c.name}</h4>
                                    <div style="display:flex; align-items:center; gap:0.75rem;">
                                        <div style="width:70px; height:70px; border-radius:50%; border:5px solid #4ADE80; display:flex; flex-direction:column; align-items:center; justify-content:center;">
                                            <span style="font-size:0.9rem; font-weight:800; color:#f8fafc;">${c.attendance_pct}%</span>
                                        </div>
                                        <div style="font-size:0.75rem; display:flex; flex-direction:column; gap:2px;">
                                            <div><span style="color:#4ade80;">● Present:</span> <strong>${c.attendance_donut?.days_present || 136}</strong></div>
                                            <div><span style="color:#ef4444;">● Absent:</span> <strong>${c.attendance_donut?.days_absent || 10}</strong></div>
                                            <div><span style="color:#f59e0b;">● Late:</span> <strong>${c.attendance_donut?.days_late || 4}</strong></div>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <!-- Upcoming Timetable -->
                    <div class="parent-card">
                        <div class="parent-card-header">
                            <h3 class="parent-card-title"><i class="fas fa-clock"></i> Upcoming Timetable</h3>
                            <a href="#" onclick="switchTab('timetable'); return false;" class="parent-card-link">Full Schedule</a>
                        </div>
                        <div style="display:flex; flex-direction:column; gap:0.6rem; margin-top:0.75rem;">
                            ${(data.upcoming_timetable || []).map(u => `
                                <div style="display:flex; align-items:center; gap:0.75rem;">
                                    <div style="background:#0F172A; padding:0.4rem 0.5rem; border-radius:6px; text-align:center; min-width:50px;">
                                        <span style="font-size:0.7rem; font-weight:700; color:#38bdf8; display:block;">${u.date}</span>
                                    </div>
                                    <div style="flex:1;">
                                        <h5 style="margin:0; font-size:0.85rem; color:#f8fafc;">${u.title}</h5>
                                        <p style="margin:2px 0 0 0; font-size:0.75rem; color:#94a3b8;">${u.time}</p>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <!-- Quick Links -->
                    <div class="parent-card">
                        <div class="parent-card-header">
                            <h3 class="parent-card-title"><i class="fas fa-link"></i> Quick Links</h3>
                        </div>
                        <div style="display:flex; flex-direction:column; gap:0.5rem; margin-top:0.75rem;">
                            <button class="btn btn-secondary" onclick="switchTab('children')" style="text-align:left; justify-content:flex-start;"><i class="fas fa-users"></i> View My Children</button>
                            <button class="btn btn-secondary" onclick="switchTab('resources')" style="text-align:left; justify-content:flex-start;"><i class="fas fa-book-open"></i> School Resources</button>
                            <button class="btn btn-secondary" onclick="switchTab('performance')" style="text-align:left; justify-content:flex-start;"><i class="fas fa-chart-line"></i> Performance Reports</button>
                            <button class="btn btn-secondary" onclick="switchTab('messages')" style="text-align:left; justify-content:flex-start;"><i class="fas fa-envelope"></i> Messages</button>
                            <button class="btn btn-secondary" onclick="switchTab('settings')" style="text-align:left; justify-content:flex-start;"><i class="fas fa-cog"></i> Help & Support</button>
                        </div>
                    </div>
                </div>

                <!-- Realtime Banner -->
                <div style="margin-top:1.25rem; background:#1E293B; border-radius:8px; padding:0.75rem 1rem; border:1px solid #334155; display:flex; align-items:center; gap:0.75rem;">
                    <i class="fas fa-shield-alt" style="color:#38bdf8; font-size:1.1rem;"></i>
                    <span style="font-size:0.8rem; color:#94a3b8;">You are viewing information for <strong>${childNames}</strong>. All data is updated in real-time from the school database.</span>
                </div>
            `;
        }

    } catch (err) {
        console.error('Error loading parent overview:', err);
    }
}

export function displayAtAGlance(children) {
    const container = document.getElementById('at-a-glance-children');
    if (!container) return;

    if (children.length === 0) {
        container.innerHTML = '<p class="text-muted">Once you activate a learner, their summary will appear here.</p>';
        return;
    }

    container.innerHTML = children.map(child => {
        const avgGrade = child.recent_marks && child.recent_marks.length > 0
            ? (child.recent_marks.reduce((sum, mark) => sum + parseFloat(mark.mark), 0) / child.recent_marks.length).toFixed(0)
            : '--';

        return `
        <div class="at-a-glance-card">
            <div class="glance-child-info">
                <img src="${child.profile_picture_path ? `/${child.profile_picture_path}` : '/assets/default-pfp.png'}" alt="Profile Picture">
                <div>
                    <h4>${child.full_name} ${child.surname}</h4>
                    <p>Grade ${child.grade}</p>
                </div>
            </div>
            <div class="glance-stats">
                <div class="glance-stat-item">
                    <span>Avg. Mark</span>
                    <strong>${avgGrade}%</strong>
                </div>
            </div>
        </div>
        `;
    }).join('');
}

export function displayOverviewFeeds(assignments, news) {
    const assignmentsContainer = document.getElementById('overview-pending-assignments');
    const newsContainer = document.getElementById('overview-school-news');

    if (assignmentsContainer) {
        assignmentsContainer.innerHTML = assignments.length > 0 ? assignments.map(a => `
            <div class="feed-item">
                <div class="feed-item-title"><strong>${a.child_name}:</strong> ${a.title}</div>
                <div class="feed-item-meta">${a.subject_target} &bull; Due Soon</div>
            </div>
        `).join('') : '<p class="text-muted">No pending assignments for any of your children. Great job!</p>';
    }

    if (newsContainer) {
        newsContainer.innerHTML = news.length > 0 ? news.map(n => `
            <div class="feed-item">
                <div class="feed-item-title">${n.title}</div>
                <div class="feed-item-meta">Posted on ${new Date(n.created_at).toLocaleDateString()}</div>
            </div>
        `).join('') : '<p class="text-muted">No school news at the moment.</p>';
    }
}

export function renderTrendChart(canvasId, progressData) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const subjectsData = progressData.reduce((acc, item) => {
        if (!acc[item.subject]) {
            acc[item.subject] = [];
        }
        acc[item.subject].push({
            x: new Date(item.date),
            y: item.grade
        });
        return acc;
    }, {});

    for (const subject in subjectsData) {
        subjectsData[subject].sort((a, b) => a.x - b.x);
    }

    const subjectColors = [
        '#ef4444', '#3b82f6', '#22c55e', '#f97316', '#8b5cf6', '#eab308', '#ec4899'
    ];

    const datasets = Object.keys(subjectsData).map((subject, index) => {
        const color = subjectColors[index % subjectColors.length];
        return {
            label: subject,
            data: subjectsData[subject],
            borderColor: color,
            backgroundColor: `${color}33`,
            tension: 0.3,
            fill: true,
            pointBackgroundColor: '#fff',
            pointBorderColor: color,
            pointRadius: 4,
            pointHoverRadius: 6
        };
    });

    if (typeof Chart !== 'undefined') {
        new Chart(ctx.getContext('2d'), {
            type: 'line',
            data: { datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top', labels: { color: 'var(--text-muted)' } }
                },
                scales: {
                    y: { min: 0, max: 100, ticks: { color: 'var(--text-muted)', stepSize: 20 } },
                    x: { type: 'time', time: { unit: 'day', tooltipFormat: 'MMM dd, yyyy' }, ticks: { color: 'var(--text-muted)' } }
                }
            }
        });
    }
}
