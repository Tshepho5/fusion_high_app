import { apiCall } from '../api.js';

export async function loadMyTextbooks() {
    const modalList = document.getElementById('tb-modal-list');
    if (!modalList) return;

    try {
        const textbooks = await apiCall('/teacher/my-textbooks');
        if (!textbooks || !Array.isArray(textbooks) || textbooks.length === 0) {
            modalList.innerHTML = `<p style="color:#94a3b8; font-size:0.85rem;">No textbooks uploaded yet.</p>`;
            return;
        }

        modalList.innerHTML = textbooks.map(t => `
            <div style="background:#1e293b; padding:0.5rem 0.75rem; border-radius:6px; margin-bottom:0.5rem; display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <strong style="color:#f8fafc; font-size:0.9rem;">${t.subject} (Grade ${t.grade})</strong>
                    <div style="color:#94a3b8; font-size:0.75rem;">${t.file_path ? t.file_path.split(/[\/\\]/).pop() : 'PDF File'}</div>
                </div>
                <a href="/${t.file_path}" target="_blank" class="btn btn-sm btn-outline-primary" style="font-size:0.75rem;">
                    <i class="fas fa-file-pdf me-1"></i> View PDF
                </a>
            </div>
        `).join('');
    } catch (err) {
        console.error('Error loading my textbooks:', err);
    }
}

export function openTextbookManager(subject, grade) {
    const modal = document.getElementById('textbookManagerModal');
    const titleEl = document.getElementById('textbook-modal-title');
    const subjInput = document.getElementById('tb-modal-subject');
    const gradeInput = document.getElementById('tb-modal-grade');
    if (!modal) return;

    if (titleEl) titleEl.innerHTML = `<i class="fas fa-book-open"></i> Manage CAPS Textbooks - ${subject} Grade ${grade}`;
    if (subjInput) subjInput.value = subject;
    if (gradeInput) gradeInput.value = grade;

    modal.style.display = 'flex';
    loadMyTextbooks();
}

export async function handleTextbookModalUpload(e) {
    e.preventDefault();
    const subjectInput = document.getElementById('tb-modal-subject');
    const gradeInput = document.getElementById('tb-modal-grade');
    const fileInput = document.getElementById('tb-modal-file');

    if (!fileInput || !fileInput.files[0]) {
        alert('Please select a PDF textbook file.');
        return;
    }

    const formData = new FormData();
    formData.append('subject', subjectInput ? subjectInput.value : 'General');
    formData.append('grade', gradeInput ? gradeInput.value : '10');
    formData.append('textbook', fileInput.files[0]);

    try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/teacher/upload-textbook', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        const data = await res.json();
        if (res.ok) {
            alert('Textbook uploaded and indexed successfully!');
            fileInput.value = '';
            loadMyTextbooks();
        } else {
            alert('Upload failed: ' + (data.error || 'Unknown error'));
        }
    } catch (err) {
        alert('Failed to upload textbook: ' + err.message);
    }
}
