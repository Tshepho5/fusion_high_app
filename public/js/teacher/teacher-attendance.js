import { apiCall } from '../api.js';

export async function openSubjectAttendance(subject, grade) {
    const modal = document.getElementById('subjectAttendanceModal');
    const titleEl = document.getElementById('subj-attendance-modal-title');
    const subtitleEl = document.getElementById('subj-attendance-modal-subtitle');
    const tbody = document.getElementById('subj-attendance-tbody');
    const dateInput = document.getElementById('subj-att-date');

    if (!modal || !tbody) return;

    const today = new Date().toISOString().split('T')[0];
    if (dateInput) dateInput.value = today;

    if (titleEl) {
        titleEl.innerHTML = `<i class="fas fa-user-check" style="color: #22c55e;"></i> ${subject} (Grade ${grade}) - Daily Attendance Register`;
    }
    if (subtitleEl) {
        subtitleEl.textContent = `Record attendance status for learners in Grade ${grade} ${subject}.`;
    }

    modal.setAttribute('data-subject', subject);
    modal.setAttribute('data-grade', grade);

    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:2rem; color:#94a3b8;"><i class="fas fa-spinner fa-spin fa-2x" style="color:#22c55e;"></i><p style="margin-top:8px;">Loading attendance roster...</p></td></tr>`;
    modal.style.display = 'flex';

    await loadSubjectAttendanceData(subject, grade, dateInput?.value || today);
}

export async function loadSubjectAttendanceData(subject, grade, date) {
    const tbody = document.getElementById('subj-attendance-tbody');
    if (!tbody) return;

    try {
        const res = await apiCall(`/teacher/attendance-roster?class_id=${encodeURIComponent(grade)}&date=${encodeURIComponent(date)}&subject=${encodeURIComponent(subject)}`);
        const roster = res.roster || [];

        if (roster.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:2rem; color:#94a3b8;">No learners enrolled in Grade ${grade} ${subject}.</td></tr>`;
            return;
        }

        tbody.innerHTML = roster.map((r) => {
            const st = r.status || 'present';

            return `
                <tr style="border-bottom:1px solid #1e293b;" data-child-id="${r.id}">
                    <td style="padding:10px; font-weight:600; color:#f8fafc;">${r.full_name || (r.learner_name + ' ' + r.learner_surname)}</td>
                    <td style="padding:10px; color:#cbd5e1;">${r.learner_number || 'N/A'}</td>
                    <td style="padding:10px; text-align:center; color:#94a3b8;">Grade ${grade}</td>
                    <td style="padding:10px; text-align:center;">
                        <div style="display:flex; justify-content:center; gap:12px; font-size:0.85rem;">
                            <label style="color:#4ade80; cursor:pointer;"><input type="radio" name="subj-att-${r.id}" value="present" ${st === 'present' ? 'checked' : ''} onchange="window.updateSubjectAttendanceCounts()"> Present</label>
                            <label style="color:#f87171; cursor:pointer;"><input type="radio" name="subj-att-${r.id}" value="absent" ${st === 'absent' ? 'checked' : ''} onchange="window.updateSubjectAttendanceCounts()"> Absent</label>
                            <label style="color:#fbbf24; cursor:pointer;"><input type="radio" name="subj-att-${r.id}" value="late" ${st === 'late' ? 'checked' : ''} onchange="window.updateSubjectAttendanceCounts()"> Late</label>
                            <label style="color:#60a5fa; cursor:pointer;"><input type="radio" name="subj-att-${r.id}" value="excused" ${st === 'excused' ? 'checked' : ''} onchange="window.updateSubjectAttendanceCounts()"> Excused</label>
                        </div>
                    </td>
                    <td style="padding:10px;">
                        <input type="text" class="form-control att-note-input" value="${r.notes || ''}" placeholder="Remark..." style="background:#0f172a; color:#fff; font-size:0.8rem; padding:4px 8px;">
                    </td>
                </tr>
            `;
        }).join('');

        updateSubjectAttendanceCounts();

    } catch (err) {
        console.error('Error loading subject attendance:', err);
        tbody.innerHTML = `<tr><td colspan="5" style="color:#ef4444; padding:2rem; text-align:center;">Failed to load attendance roster: ${err.message}</td></tr>`;
    }
}

export function updateSubjectAttendanceCounts() {
    const rows = document.querySelectorAll('#subj-attendance-tbody tr[data-child-id]');
    let countP = 0, countA = 0, countL = 0, countE = 0;

    rows.forEach(tr => {
        const childId = tr.getAttribute('data-child-id');
        const selectedRadio = tr.querySelector(`input[name="subj-att-${childId}"]:checked`);
        const val = selectedRadio ? selectedRadio.value : 'present';
        if (val === 'present') countP++;
        else if (val === 'absent') countA++;
        else if (val === 'late') countL++;
        else if (val === 'excused') countE++;
    });

    if (document.getElementById('subj-att-count-present')) document.getElementById('subj-att-count-present').textContent = countP;
    if (document.getElementById('subj-att-count-absent')) document.getElementById('subj-att-count-absent').textContent = countA;
    if (document.getElementById('subj-att-count-late')) document.getElementById('subj-att-count-late').textContent = countL;
    if (document.getElementById('subj-att-count-excused')) document.getElementById('subj-att-count-excused').textContent = countE;
}

export async function submitSubjectAttendanceModal() {
    const modal = document.getElementById('subjectAttendanceModal');
    const subject = modal?.getAttribute('data-subject');
    const grade = modal?.getAttribute('data-grade');
    const dateInput = document.getElementById('subj-att-date');
    const rows = document.querySelectorAll('#subj-attendance-tbody tr[data-child-id]');

    if (!grade || rows.length === 0) return;

    const attendanceDate = dateInput?.value || new Date().toISOString().split('T')[0];
    const records = [];

    rows.forEach(tr => {
        const childId = tr.getAttribute('data-child-id');
        const selectedRadio = tr.querySelector(`input[name="subj-att-${childId}"]:checked`);
        const noteInput = tr.querySelector('.att-note-input');

        records.push({
            child_id: childId,
            status: selectedRadio ? selectedRadio.value : 'present',
            notes: noteInput ? noteInput.value : ''
        });
    });

    try {
        await apiCall('/teacher/attendance', {
            method: 'POST',
            body: JSON.stringify({
                class_id: grade.toString(),
                subject_name: subject,
                attendance_date: attendanceDate,
                records
            })
        });

        alert(`Attendance register for ${subject} (Grade ${grade}) submitted successfully!`);
        modal.style.display = 'none';

    } catch (err) {
        alert('Failed to submit attendance: ' + err.message);
    }
}

export async function loadAttendanceRegister() {
    const classSelect = document.getElementById('att-class-select');
    const datePicker = document.getElementById('att-date-picker');
    const tbody = document.getElementById('attendance-roster-tbody');

    if (!classSelect || !tbody) return;

    const selectedClass = classSelect.value;
    const selectedDate = datePicker?.value || new Date().toISOString().split('T')[0];

    if (!selectedClass) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:2rem; color:#94a3b8;">Select a class above to take attendance.</td></tr>`;
        return;
    }

    try {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:2rem; color:#94a3b8;"><i class="fas fa-spinner fa-spin"></i> Loading class roster...</td></tr>`;

        const data = await apiCall(`/teacher/attendance-roster?class_id=${encodeURIComponent(selectedClass)}&date=${encodeURIComponent(selectedDate)}`);
        const roster = data.roster || [];

        let countP = 0, countA = 0, countL = 0, countE = 0;

        if (roster.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:2rem; color:#94a3b8;">No learners found for this class.</td></tr>`;
            return;
        }

        tbody.innerHTML = roster.map((r) => {
            const st = r.status || 'present';
            if (st === 'present') countP++;
            else if (st === 'absent') countA++;
            else if (st === 'late') countL++;
            else if (st === 'excused') countE++;

            return `
                <tr style="border-bottom:1px solid #1e293b;" data-child-id="${r.id}">
                    <td style="padding:12px; font-weight:600; color:#f8fafc;">${r.full_name || (r.learner_name + ' ' + r.learner_surname)}</td>
                    <td style="padding:12px; color:#cbd5e1;">${r.learner_number || 'N/A'}</td>
                    <td style="padding:12px; color:#94a3b8;">${r.class_name || selectedClass}</td>
                    <td style="padding:12px; text-align:center;">
                        <div style="display:flex; justify-content:center; gap:12px;">
                            <label style="color:#4ade80; cursor:pointer;"><input type="radio" name="att-${r.id}" value="present" ${st === 'present' ? 'checked' : ''}> Present</label>
                            <label style="color:#f87171; cursor:pointer;"><input type="radio" name="att-${r.id}" value="absent" ${st === 'absent' ? 'checked' : ''}> Absent</label>
                            <label style="color:#fbbf24; cursor:pointer;"><input type="radio" name="att-${r.id}" value="late" ${st === 'late' ? 'checked' : ''}> Late</label>
                            <label style="color:#60a5fa; cursor:pointer;"><input type="radio" name="att-${r.id}" value="excused" ${st === 'excused' ? 'checked' : ''}> Excused</label>
                        </div>
                    </td>
                    <td style="padding:12px;">
                        <input type="text" class="form-control att-note-input" value="${r.notes || ''}" placeholder="Optional remark..." style="background:#0f172a; color:#fff; font-size:0.85rem;">
                    </td>
                </tr>
            `;
        }).join('');

        if (document.getElementById('att-count-present')) document.getElementById('att-count-present').textContent = countP;
        if (document.getElementById('att-count-absent')) document.getElementById('att-count-absent').textContent = countA;
        if (document.getElementById('att-count-late')) document.getElementById('att-count-late').textContent = countL;
        if (document.getElementById('att-count-excused')) document.getElementById('att-count-excused').textContent = countE;

    } catch (err) {
        console.error('Error loading attendance register:', err);
        tbody.innerHTML = `<tr><td colspan="5" style="color:#ef4444; padding:1.5rem; text-align:center;">Failed to load attendance roster.</td></tr>`;
    }
}

export async function submitAttendanceRegister() {
    const classSelect = document.getElementById('att-class-select');
    const datePicker = document.getElementById('att-date-picker');
    const rows = document.querySelectorAll('#attendance-roster-tbody tr[data-child-id]');

    if (!classSelect?.value) { alert('Please select a class first.'); return; }

    const rosterData = [];
    rows.forEach(tr => {
        const childId = tr.getAttribute('data-child-id');
        const selectedRadio = tr.querySelector(`input[name="att-${childId}"]:checked`);
        const noteInput = tr.querySelector('.att-note-input');
        
        rosterData.push({
            child_id: childId,
            status: selectedRadio ? selectedRadio.value : 'present',
            notes: noteInput ? noteInput.value : ''
        });
    });

    try {
        await apiCall('/teacher/attendance', {
            method: 'POST',
            body: JSON.stringify({
                attendance_date: datePicker?.value || new Date().toISOString().split('T')[0],
                class_id: classSelect.value,
                records: rosterData
            })
        });
        alert('Attendance register submitted successfully!');
        loadAttendanceRegister();
    } catch (err) {
        alert('Failed to submit attendance: ' + err.message);
    }
}
