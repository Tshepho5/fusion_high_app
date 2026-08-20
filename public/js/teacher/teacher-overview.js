import { apiCall } from '../api.js';

export async function loadTeacherOverviewStats() {
    try {
        const stats = await apiCall('/teacher/overview-stats');
        if (!stats) return;

        const welcomeEl = document.getElementById('teach-welcome-title');
        if (welcomeEl && stats.teacher_name) {
            welcomeEl.textContent = `Welcome, ${stats.teacher_name}`;
        }

        if (document.getElementById('teach-stat-subjects')) {
            document.getElementById('teach-stat-subjects').textContent = stats.subjects_assigned ?? 0;
        }
        if (document.getElementById('teach-stat-learners')) {
            document.getElementById('teach-stat-learners').textContent = (stats.total_learners ?? 0).toLocaleString();
        }
        if (document.getElementById('teach-stat-classes-today')) {
            document.getElementById('teach-stat-classes-today').textContent = stats.classes_today ?? 0;
        }
        if (document.getElementById('teach-stat-att-outstanding')) {
            document.getElementById('teach-stat-att-outstanding').textContent = `${stats.attendance_outstanding ?? 0} Classes`;
        }
        if (document.getElementById('teach-stat-awaiting-marking')) {
            document.getElementById('teach-stat-awaiting-marking').textContent = stats.assessments_awaiting_marking ?? 0;
        }
        if (document.getElementById('teach-stat-upcoming-tests')) {
            document.getElementById('teach-stat-upcoming-tests').textContent = stats.upcoming_tests ?? 0;
        }
        if (document.getElementById('teach-stat-messages')) {
            document.getElementById('teach-stat-messages').textContent = stats.recent_messages ?? 0;
        }
        if (document.getElementById('teach-stat-announcements')) {
            document.getElementById('teach-stat-announcements').textContent = stats.school_announcements ?? 0;
        }
    } catch (err) {
        console.error('Error loading teacher overview stats:', err);
    }
}

export async function loadPerformanceOverview() {
    const subjectSelect = document.getElementById('perfSubject');
    const selectedSubject = subjectSelect ? subjectSelect.value : '';

    try {
        const perfData = await apiCall(`/teacher/performance-overview${selectedSubject ? '?subject=' + encodeURIComponent(selectedSubject) : ''}`);
        if (!perfData) return;

        // Populate dropdown options if available
        if (subjectSelect && perfData.options && Array.isArray(perfData.options) && subjectSelect.options.length === 0) {
            subjectSelect.innerHTML = perfData.options.map(o => 
                `<option value="${o.subject}" ${o.subject === perfData.subject ? 'selected' : ''}>${o.label}</option>`
            ).join('');
        }

        if (document.getElementById('perf-stat-class-avg')) document.getElementById('perf-stat-class-avg').textContent = `${perfData.class_average}%`;
        if (document.getElementById('perf-stat-highest')) document.getElementById('perf-stat-highest').textContent = `${perfData.highest_mark}%`;
        if (document.getElementById('perf-stat-lowest')) document.getElementById('perf-stat-lowest').textContent = `${perfData.lowest_mark}%`;
        if (document.getElementById('perf-stat-pass-rate')) document.getElementById('perf-stat-pass-rate').textContent = `${perfData.pass_rate}%`;

        // Render Subject Performance Comparison Bars
        const compContainer = document.getElementById('perf-subject-comparison-bars');
        if (compContainer && perfData.subject_breakdown) {
            compContainer.innerHTML = perfData.subject_breakdown.map(sb => `
                <div>
                    <div style="display:flex; justify-space-between:space-between; font-size:0.85rem; color:#cbd5e1; margin-bottom:3px;">
                        <span><strong style="color:#f8fafc;">${sb.subject}</strong> (${sb.total_assessments} tasks recorded)</span>
                        <span style="color:${sb.avg_mark >= 60 ? '#34d399' : '#f87171'}; font-weight:700;">Avg: ${sb.avg_mark}% • Pass: ${sb.pass_rate}%</span>
                    </div>
                    <div style="background:#1e293b; height:10px; border-radius:5px; overflow:hidden; border:1px solid #334155;">
                        <div style="width:${sb.avg_mark}%; height:100%; background:linear-gradient(90deg, #6366f1, #34d399); border-radius:5px;"></div>
                    </div>
                </div>
            `).join('');
        }

        // Render Grade Symbol Distribution
        const distContainer = document.getElementById('perf-grade-symbol-distribution');
        if (distContainer && perfData.distribution) {
            const d = perfData.distribution;
            const total = (d.level7 || 0) + (d.level6 || 0) + (d.level5 || 0) + (d.level4 || 0) + (d.level1_3 || 0) || 1;

            const levels = [
                { label: 'Level 7 (80-100% Outstanding)', count: d.level7 || 0, color: '#34d399' },
                { label: 'Level 6 (70-79% Meritorious)', count: d.level6 || 0, color: '#60a5fa' },
                { label: 'Level 5 (60-69% Substantial)', count: d.level5 || 0, color: '#a855f7' },
                { label: 'Level 4 (50-59% Adequate)', count: d.level4 || 0, color: '#fbbf24' },
                { label: 'Level 1-3 (<50% At Risk)', count: d.level1_3 || 0, color: '#f87171' }
            ];

            distContainer.innerHTML = levels.map(l => {
                const pct = Math.round((l.count / total) * 100);
                return `
                    <div>
                        <div style="display:flex; justify-content:space-between; font-size:0.8rem; color:#cbd5e1; margin-bottom:2px;">
                            <span>${l.label}</span>
                            <strong style="color:${l.color};">${l.count} Learners (${pct}%)</strong>
                        </div>
                        <div style="background:#1e293b; height:8px; border-radius:4px; overflow:hidden;">
                            <div style="width:${pct}%; height:100%; background:${l.color}; border-radius:4px;"></div>
                        </div>
                    </div>
                `;
            }).join('');
        }

        // Render Leaderboard
        const leaderboardContainer = document.getElementById('teacherLeaderboard');
        if (leaderboardContainer && perfData.top_performers) {
            if (perfData.top_performers.length === 0) {
                leaderboardContainer.innerHTML = `<p style="color:#94a3b8; text-align:center; padding:1rem;">No performance scores recorded yet.</p>`;
            } else {
                leaderboardContainer.innerHTML = perfData.top_performers.map((p, idx) => `
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:0.75rem 0; border-bottom:1px solid #334155;">
                        <div style="display:flex; align-items:center; gap:0.75rem;">
                            <span class="badge" style="background:${idx === 0 ? '#b45309' : '#334155'}; color:${idx === 0 ? '#fbbf24' : '#f8fafc'}; font-size:0.8rem; font-weight:700; width:28px; text-align:center;">#${idx + 1}</span>
                            <div>
                                <h5 style="color:#f8fafc; margin:0; font-size:0.9rem; font-weight:700;">${p.name}</h5>
                                <span style="color:#94a3b8; font-size:0.75rem;">ID: ${p.learner_number || 'N/A'} • Grade ${p.grade}</span>
                            </div>
                        </div>
                        <span class="badge" style="background:#065f46; color:#34d399; font-size:0.9rem; font-weight:700; padding:4px 10px;">${p.score}%</span>
                    </div>
                `).join('');
            }
        }

        // Render At Risk List
        const atRiskContainer = document.getElementById('perf-at-risk-list');
        if (atRiskContainer && perfData.learners_at_risk) {
            if (perfData.learners_at_risk.length === 0) {
                atRiskContainer.innerHTML = `<p style="color: #4ade80; text-align: center; padding: 1.5rem;"><i class="fas fa-check-circle me-1"></i> Excellent! No learners currently at risk in ${perfData.subject}.</p>`;
            } else {
                atRiskContainer.innerHTML = perfData.learners_at_risk.map(p => `
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:0.75rem 0; border-bottom:1px solid #334155;">
                        <div>
                            <h5 style="color:#f87171; margin:0; font-size:0.9rem; font-weight:700;">${p.name}</h5>
                            <span style="color:#94a3b8; font-size:0.75rem;">ID: ${p.learner_number || 'N/A'} • Grade ${p.grade}</span>
                        </div>
                        <div style="display:flex; gap:0.5rem; align-items:center;">
                            <span class="badge" style="background:#881337; color:#f87171; font-size:0.85rem; font-weight:700; padding:4px 8px;">${p.score}%</span>
                            <span class="badge" style="background:#78350f; color:#fbbf24; font-size:0.75rem;">${p.risk_level || 'At Risk'}</span>
                        </div>
                    </div>
                `).join('');
            }
        }

    } catch (err) {
        console.error('Error loading performance overview:', err);
    }
}
