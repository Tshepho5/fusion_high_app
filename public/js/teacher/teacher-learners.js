import { apiCall } from '../api.js';

let cachedAllLearners = [];
let cachedSubjectLearners = [];

export async function loadMyLearnersCards() {
    const grid = document.getElementById('my-learners-cards-grid') || document.getElementById('my-learners-grid');
    if (!grid) return;

    try {
        const learners = await apiCall('/teacher/my-learners');
        if (!learners || !Array.isArray(learners)) return;

        cachedAllLearners = learners;

        // Populate class filter select dropdown dynamically
        const classFilter = document.getElementById('learner-class-filter');
        if (classFilter) {
            const classes = Array.from(new Set(learners.map(l => l.class_name).filter(Boolean))).sort();
            classFilter.innerHTML = '<option value="All">All Classes</option>' + classes.map(c => `<option value="${c}">${c}</option>`).join('');
        }

        if (learners.length === 0) {
            grid.innerHTML = `<p style="color:#94a3b8; text-align:center; grid-column:1/-1; padding:2rem;">No learners currently linked to your assigned classes or subjects.</p>`;
            return;
        }

        renderLearnerCardsGrid(grid, learners);
    } catch (err) {
        console.error('Error loading my learners cards:', err);
    }
}

export function renderLearnerCardsGrid(container, learners) {
    if (!container) return;

    if (!learners || learners.length === 0) {
        container.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:2.5rem; color:#94a3b8;">
            <i class="fas fa-users-slash fa-2x" style="margin-bottom:0.5rem; color:#475569;"></i>
            <p>No matching learner profiles found.</p>
        </div>`;
        return;
    }

    container.innerHTML = learners.map(l => `
        <div class="card" style="background:#1e293b; border-radius:12px; padding:1.25rem; border:1px solid #334155; display:flex; flex-direction:column; justify-content:space-between;">
            <div>
                <div style="display:flex; align-items:center; gap:0.75rem; margin-bottom:0.75rem;">
                    <div style="width:48px; height:48px; border-radius:50%; background:#334155; display:flex; align-items:center; justify-content:center; color:#38bdf8; font-weight:700; font-size:1.1rem; border:2px solid #6366f1;">
                        ${(l.learner_name || 'L').charAt(0)}${(l.learner_surname || '').charAt(0)}
                    </div>
                    <div>
                        <h4 style="color:#f8fafc; margin:0; font-size:1.05rem; font-weight:700;">${l.learner_name} ${l.learner_surname}</h4>
                        <span style="color:#94a3b8; font-size:0.8rem;">ID: ${l.learner_number || 'N/A'} • Grade ${l.grade}</span>
                    </div>
                </div>

                <div style="background:#0f172a; padding:0.75rem; border-radius:8px; display:grid; grid-template-columns:1fr 1fr; gap:0.5rem; font-size:0.85rem; margin-bottom:0.75rem; border:1px solid #1e293b;">
                    <div><span style="color:#94a3b8;">Class:</span> <strong style="color:#f8fafc;">${l.class_name || 'Unassigned'}</strong></div>
                    <div><span style="color:#94a3b8;">Stream:</span> <strong style="color:#38bdf8;">${l.stream || 'General'}</strong></div>
                    <div><span style="color:#94a3b8;">Performance:</span> <strong style="color:${l.performance_avg >= 60 ? '#4ade80' : '#f87171'};">${l.performance_avg}%</strong></div>
                    <div><span style="color:#94a3b8;">Attendance:</span> <strong style="color:${l.attendance_pct >= 80 ? '#60a5fa' : '#fbbf24'};">${l.attendance_pct}%</strong></div>
                </div>

                <div style="font-size:0.8rem; color:#cbd5e1; margin-bottom:0.5rem;">
                    <i class="fas fa-user-shield me-1" style="color:#a855f7;"></i> <strong>Guardian:</strong> ${l.guardian_name || 'Not linked'} ${l.guardian_phone ? `(${l.guardian_phone})` : ''}
                </div>
            </div>

            <div style="display:flex; gap:0.5rem; margin-top:0.75rem; padding-top:0.75rem; border-top:1px solid #334155;">
                <button type="button" class="btn btn-sm btn-outline-primary" onclick="window.viewLearnerProgress(${l.id}, '${l.learner_name} ${l.learner_surname}')" style="flex:1; font-size:0.8rem;">
                    <i class="fas fa-chart-line me-1"></i> Report
                </button>
                <button type="button" class="btn btn-sm btn-outline-secondary" onclick="window.contactParent('${l.guardian_name}', ${l.id})" style="flex:1; font-size:0.8rem;">
                    <i class="fas fa-comment me-1"></i> Parent
                </button>
            </div>
        </div>
    `).join('');
}

export function filterLearnerCards() {
    const grid = document.getElementById('my-learners-cards-grid') || document.getElementById('my-learners-grid');
    const searchVal = (document.getElementById('learner-search-box')?.value || '').toLowerCase().trim();
    const gradeVal = document.getElementById('learner-grade-filter')?.value || 'All';
    const classVal = document.getElementById('learner-class-filter')?.value || 'All';
    const subjVal = document.getElementById('learner-subject-filter')?.value || 'All';

    let filtered = cachedAllLearners.filter(l => {
        const matchesSearch = !searchVal || 
            (l.learner_name && l.learner_name.toLowerCase().includes(searchVal)) ||
            (l.learner_surname && l.learner_surname.toLowerCase().includes(searchVal)) ||
            (l.learner_number && l.learner_number.toLowerCase().includes(searchVal));

        const matchesGrade = gradeVal === 'All' || l.grade.toString() === gradeVal;
        const matchesClass = classVal === 'All' || l.class_name === classVal;
        const matchesSubj = subjVal === 'All' || (!l.subjects || l.subjects.length === 0 || l.subjects.some(s => s.toLowerCase() === subjVal.toLowerCase()));

        return matchesSearch && matchesGrade && matchesClass && matchesSubj;
    });

    renderLearnerCardsGrid(grid, filtered);
}

export async function viewSubjectLearners(subject, grade) {
    const modal = document.getElementById('subjectLearnersModal');
    const titleEl = document.getElementById('subject-learners-modal-title');
    const subtitleEl = document.getElementById('subject-learners-modal-subtitle');
    const cardsContainer = document.getElementById('subject-learners-modal-cards');
    const searchBox = document.getElementById('subj-learner-search');

    if (!modal || !cardsContainer) return;

    if (titleEl) {
        titleEl.innerHTML = `<i class="fas fa-users" style="color: #6366f1;"></i> ${subject} (Grade ${grade}) - Class Learners`;
    }
    if (subtitleEl) {
        subtitleEl.textContent = `Showing learners enrolled in Grade ${grade} ${subject} class roster.`;
    }

    if (searchBox) searchBox.value = '';

    cardsContainer.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 2.5rem; color: #94a3b8;"><i class="fas fa-spinner fa-spin fa-2x" style="color: #6366f1;"></i><p style="margin-top: 12px; font-weight:600;">Loading class learners for ${subject} Grade ${grade}...</p></div>`;

    modal.style.display = 'flex';
    modal.setAttribute('data-active-subject', subject);
    modal.setAttribute('data-active-grade', grade);

    try {
        let learners = await apiCall(`/teacher/my-learners?subject=${encodeURIComponent(subject)}&grade=${encodeURIComponent(grade)}`);
        if (!learners || !Array.isArray(learners) || learners.length === 0) {
            learners = cachedAllLearners.length > 0 ? cachedAllLearners : await apiCall('/teacher/my-learners');
        }

        let filtered = (learners || []).filter(l => 
            parseInt(l.grade, 10) === parseInt(grade, 10) &&
            (!l.subjects || l.subjects.length === 0 || l.subjects.some(s => s.toLowerCase() === subject.toLowerCase()))
        );

        if (filtered.length === 0 && learners && learners.length > 0) {
            filtered = learners.filter(l => parseInt(l.grade, 10) === parseInt(grade, 10));
        }

        cachedSubjectLearners = filtered;
        renderLearnerCardsGrid(cardsContainer, filtered);

    } catch (err) {
        console.error('Error opening subject learners modal:', err);
        cardsContainer.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #ef4444; padding: 2rem;">Failed to load learners for ${subject}.</p>`;
    }
}

export function filterSubjectLearnerCards(query) {
    const cardsContainer = document.getElementById('subject-learners-modal-cards');
    if (!cardsContainer) return;

    if (!query) {
        renderLearnerCardsGrid(cardsContainer, cachedSubjectLearners);
        return;
    }

    const q = query.toLowerCase().trim();
    const filtered = cachedSubjectLearners.filter(l => 
        (l.learner_name && l.learner_name.toLowerCase().includes(q)) ||
        (l.learner_surname && l.learner_surname.toLowerCase().includes(q)) ||
        (l.learner_number && l.learner_number.toLowerCase().includes(q))
    );

    renderLearnerCardsGrid(cardsContainer, filtered);
}

export function openFullLearnersTab() {
    const modal = document.getElementById('subjectLearnersModal');
    const grade = modal?.getAttribute('data-active-grade');
    const subject = modal?.getAttribute('data-active-subject');

    if (modal) modal.style.display = 'none';

    if (window.switchTab) {
        window.switchTab('my-learners');
    }

    if (grade && document.getElementById('learner-grade-filter')) {
        document.getElementById('learner-grade-filter').value = grade;
    }
    if (subject && document.getElementById('learner-subject-filter')) {
        document.getElementById('learner-subject-filter').value = subject;
    }

    filterLearnerCards();
}

export async function openClassMarkSheet(subject, grade) {
    const modal = document.getElementById('classMarkSheetModal');
    const tbody = document.getElementById('marksheet-tbody');
    const titleEl = document.getElementById('marksheet-modal-title');
    const subtitleEl = document.getElementById('marksheet-modal-subtitle');
    const nameInput = document.getElementById('marksheet-name-input');
    const totalInput = document.getElementById('marksheet-total-mark');

    if (!modal || !tbody) return;

    if (nameInput) nameInput.value = `Term 3 ${subject} Assessment`;
    if (totalInput) totalInput.value = '100';

    if (titleEl) titleEl.innerHTML = `<i class="fas fa-file-signature" style="color: #6366f1;"></i> ${subject} (Grade ${grade}) - Official Class Mark Register`;
    if (subtitleEl) subtitleEl.textContent = `Record, update, and export term assessment marks for all enrolled learners in Grade ${grade} ${subject}.`;

    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:2rem; color:#94a3b8;"><i class="fas fa-spinner fa-spin fa-2x" style="color: #6366f1;"></i><p style="margin-top:8px;">Loading class mark register...</p></td></tr>`;
    modal.style.display = 'flex';

    modal.setAttribute('data-subject', subject);
    modal.setAttribute('data-grade', grade);

    try {
        const roster = await apiCall(`/teacher/classlist?subject=${encodeURIComponent(subject)}&grade=${encodeURIComponent(grade)}`);
        if (!roster || !Array.isArray(roster) || roster.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:2rem; color:#94a3b8;">No learners enrolled in Grade ${grade} ${subject}.</td></tr>`;
            return;
        }

        tbody.innerHTML = roster.map(r => {
            const currentScore = (r.current_mark !== undefined && r.current_mark !== null) ? r.current_mark : '';
            const pctVal = currentScore !== '' ? Math.round(parseFloat(currentScore)) : null;
            const statusBadge = pctVal === null ? '<span class="badge bg-slate" style="background:#334155; color:#94a3b8;">Pending</span>' :
                (pctVal >= 50 ? '<span class="badge bg-emerald" style="background:#065f46; color:#34d399;">Pass</span>' : '<span class="badge bg-rose" style="background:#881337; color:#f87171;">At Risk</span>');

            return `
            <tr data-child-id="${r.id}" style="border-bottom: 1px solid #1e293b;">
                <td style="padding:12px; color:#f8fafc; font-weight:600;">${r.learner_name} ${r.learner_surname}</td>
                <td style="padding:12px; color:#cbd5e1;">${r.learner_number || 'N/A'}</td>
                <td style="padding:12px; text-align:center; color:#94a3b8;">Grade ${grade}</td>
                <td style="padding:12px; text-align:center;">
                    <input type="number" class="form-control mark-input" min="0" max="500" placeholder="Score" value="${currentScore}" oninput="window.updateMarkSheetRowStatus(this)" style="width:90px; margin:0 auto; background:#0f172a; color:#fff; text-align:center; font-weight:700; border:1px solid #334155;">
                </td>
                <td style="padding:12px; text-align:center;" class="pct-cell">
                    ${pctVal !== null ? `<strong style="color:${pctVal >= 50 ? '#34d399' : '#f87171'};">${pctVal}%</strong>` : '--%'}
                </td>
                <td style="padding:12px; text-align:center;" class="status-cell">
                    ${statusBadge}
                </td>
                <td style="padding:12px; text-align:center;">
                    <button type="button" class="btn btn-sm btn-outline-info" onclick="window.downloadCapsReportCard(${r.id})" style="font-size:0.75rem; padding:3px 8px; border-radius:4px; border:1px solid #38bdf8; color:#38bdf8; background:transparent; cursor:pointer;" title="Download CAPS Report Card">
                        <i class="fas fa-file-pdf"></i> Report
                    </button>
                </td>
            </tr>
        `;
        }).join('');

        updateMarkSheetStats();

    } catch (err) {
        console.error('Error loading mark sheet:', err);
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:2rem; color:#ef4444;">Failed to load class mark register.</td></tr>`;
    }
}

export function updateMarkSheetRowStatus(input) {
    const tr = input.closest('tr');
    const statusCell = tr?.querySelector('.status-cell');
    const pctCell = tr?.querySelector('.pct-cell');
    const totalInput = document.getElementById('marksheet-total-mark');
    const maxMark = parseFloat(totalInput?.value) || 100;

    const val = input.value;
    if (val === '' || isNaN(parseFloat(val))) {
        if (statusCell) statusCell.innerHTML = '<span class="badge bg-slate" style="background:#334155; color:#94a3b8;">Pending</span>';
        if (pctCell) pctCell.textContent = '--%';
    } else {
        const rawScore = parseFloat(val);
        const pctScore = maxMark > 0 ? Math.round((rawScore / maxMark) * 100) : rawScore;

        if (pctCell) {
            pctCell.innerHTML = `<strong style="color:${pctScore >= 50 ? '#34d399' : '#f87171'};">${pctScore}%</strong>`;
        }

        if (statusCell) {
            if (pctScore >= 50) {
                statusCell.innerHTML = '<span class="badge bg-emerald" style="background:#065f46; color:#34d399;">Pass</span>';
            } else {
                statusCell.innerHTML = '<span class="badge bg-rose" style="background:#881337; color:#f87171;">At Risk</span>';
            }
        }
    }
    updateMarkSheetStats();
}

export function updateMarkSheetStats() {
    const inputs = document.querySelectorAll('#marksheet-tbody .mark-input');
    const totalInput = document.getElementById('marksheet-total-mark');
    const maxMark = parseFloat(totalInput?.value) || 100;

    let totalPct = 0;
    let count = 0;
    let passCount = 0;

    inputs.forEach(i => {
        const tr = i.closest('tr');
        const pctCell = tr?.querySelector('.pct-cell');

        if (i.value !== '') {
            const rawScore = parseFloat(i.value);
            if (!isNaN(rawScore)) {
                const pctScore = maxMark > 0 ? Math.round((rawScore / maxMark) * 100) : rawScore;
                totalPct += pctScore;
                count++;
                if (pctScore >= 50) passCount++;

                if (pctCell) {
                    pctCell.innerHTML = `<strong style="color:${pctScore >= 50 ? '#34d399' : '#f87171'};">${pctScore}%</strong>`;
                }
            }
        }
    });

    const avgEl = document.getElementById('marksheet-stat-avg');
    const passEl = document.getElementById('marksheet-stat-pass');

    if (avgEl) {
        avgEl.textContent = count > 0 ? `${Math.round(totalPct / count)}%` : '--%';
    }
    if (passEl) {
        passEl.textContent = count > 0 ? `${Math.round((passCount / count) * 100)}%` : '--%';
    }
}

export async function saveClassMarkSheet() {
    const modal = document.getElementById('classMarkSheetModal');
    const subject = modal?.getAttribute('data-subject');
    const grade = modal?.getAttribute('data-grade');
    const termSelect = document.getElementById('marksheet-term-select');
    const nameInput = document.getElementById('marksheet-name-input');
    const totalMarkInput = document.getElementById('marksheet-total-mark');
    const rows = document.querySelectorAll('#marksheet-tbody tr[data-child-id]');

    if (!subject || !grade || rows.length === 0) return;

    const term = termSelect ? termSelect.value : 'Term 3 2026';
    const assessment_name = nameInput?.value.trim() || `${subject} Assessment`;
    const total_mark = parseFloat(totalMarkInput?.value) || 100;
    const marks = [];

    rows.forEach(r => {
        const childId = r.getAttribute('data-child-id');
        const input = r.querySelector('.mark-input');
        if (input && input.value !== '') {
            marks.push({ child_id: childId, grade: input.value });
        }
    });

    if (marks.length === 0) {
        alert('Please enter at least one score before saving.');
        return;
    }

    try {
        await apiCall('/teacher/marks/save', {
            method: 'POST',
            body: JSON.stringify({ 
                subject, 
                grade: parseInt(grade, 10), 
                term, 
                assessment_name, 
                total_mark, 
                marks 
            })
        });

        alert(`Mark Register for "${assessment_name}" (${subject} Grade ${grade}) saved successfully!\nUpdated scores are now live across Learner, Parent, and Principal/Admin portals.`);
        modal.style.display = 'none';

        if (window.loadMySubjectsSection) {
            window.loadMySubjectsSection();
        }
    } catch (err) {
        alert('Failed to save mark register: ' + err.message);
    }
}

export function exportClassMarkSheetCSV() {
    const modal = document.getElementById('classMarkSheetModal');
    const subject = modal?.getAttribute('data-subject') || 'Subject';
    const grade = modal?.getAttribute('data-grade') || '10';
    const rows = document.querySelectorAll('#marksheet-tbody tr[data-child-id]');

    const csvLines = ['Learner ID,Learner Name,Admission Number,Score,Percentage,Status'];
    rows.forEach(r => {
        const childId = r.getAttribute('data-child-id');
        const name = r.children[0]?.textContent?.trim() || '';
        const num = r.children[1]?.textContent?.trim() || '';
        const input = r.querySelector('.mark-input');
        const pct = r.querySelector('.pct-cell')?.textContent?.trim() || '';
        const status = r.querySelector('.status-cell')?.textContent?.trim() || '';

        csvLines.push(`"${childId}","${name}","${num}","${input?.value || ''}","${pct}","${status}"`);
    });

    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MarkSheet_${subject.replace(/\s+/g, '_')}_Grade${grade}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

export function importClassMarkSheetCSV(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        const lines = text.split(/\r\n|\n/);
        if (lines.length < 2) {
            alert('The uploaded CSV file is empty or missing headers.');
            return;
        }

        let updatedCount = 0;
        lines.forEach((line, index) => {
            if (index === 0 || !line.trim()) return;
            const parts = line.split(',');
            if (parts.length >= 2) {
                const learnerIdOrNum = parts[0].trim().replace(/"/g, '');
                const scoreVal = parts[parts.length - 1].trim().replace(/"/g, '') || parts[3]?.trim()?.replace(/"/g, '');

                const scoreNum = parseFloat(scoreVal);
                if (!isNaN(scoreNum)) {
                    const row = Array.from(document.querySelectorAll('#marksheet-tbody tr[data-child-id]')).find(r => {
                        const childId = r.getAttribute('data-child-id');
                        const numCell = r.children[1]?.textContent?.trim();
                        return childId === learnerIdOrNum || numCell === learnerIdOrNum;
                    });

                    if (row) {
                        const input = row.querySelector('.mark-input');
                        if (input) {
                            input.value = scoreNum;
                            updateMarkSheetRowStatus(input);
                            updatedCount++;
                        }
                    }
                }
            }
        });

        updateMarkSheetStats();
        alert(`Successfully imported ${updatedCount} scores from CSV into Mark Register! Click 'Save Mark Register' to persist to database.`);
        event.target.value = '';
    };
    reader.readAsText(file);
}

export async function viewLearnerProgress(childId, learnerName) {
    const modal = document.getElementById('learnerProgressModal');
    const titleEl = document.getElementById('learner-progress-modal-title');
    const bodyEl = document.getElementById('learner-progress-modal-body');
    if (!modal || !bodyEl) return;

    if (titleEl) titleEl.textContent = `${learnerName} - Academic Progress History`;
    bodyEl.innerHTML = `<p style="padding:1.5rem; color:#94a3b8; text-align:center;"><i class="fas fa-spinner fa-spin"></i> Loading academic history...</p>`;
    modal.style.display = 'flex';

    try {
        const history = await apiCall(`/teacher/learner-progress/${childId}`);
        if (!history || !Array.isArray(history) || history.length === 0) {
            bodyEl.innerHTML = `<p style="padding:1.5rem; color:#94a3b8; text-align:center;">No recorded academic marks found for this learner yet.</p>`;
            return;
        }

        bodyEl.innerHTML = `
            <table class="table" style="width:100%; color:#fff;">
                <thead>
                    <tr style="border-bottom:1px solid #334155; color:#cbd5e1; font-size:0.85rem;">
                        <th style="padding:10px;">Subject</th>
                        <th style="padding:10px;">Term</th>
                        <th style="padding:10px; text-align:center;">Score (%)</th>
                        <th style="padding:10px;">Notes / Remarks</th>
                    </tr>
                </thead>
                <tbody>
                    ${history.map(h => `
                        <tr style="border-bottom:1px solid #1e293b;">
                            <td style="padding:10px; font-weight:600;">${h.subject}</td>
                            <td style="padding:10px; color:#cbd5e1;">${h.term || 'Term 1'}</td>
                            <td style="padding:10px; text-align:center;">
                                <span class="badge ${h.grade >= 50 ? 'bg-emerald' : 'bg-rose'}">${h.grade}%</span>
                            </td>
                            <td style="padding:10px; color:#94a3b8; font-size:0.85rem;">${h.notes || 'No remarks'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (e) {
        bodyEl.innerHTML = `<p style="padding:1.5rem; color:#ef4444; text-align:center;">Failed to load learner progress history.</p>`;
    }
}
