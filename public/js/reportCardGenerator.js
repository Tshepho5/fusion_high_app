import { apiCall } from './api.js';

export async function downloadCapsReportCard(childId = null, term = 'Term 3 2026') {
    try {
        let url = `/reports/caps-report-card?term=${encodeURIComponent(term)}`;
        if (childId) {
            url += `&child_id=${childId}`;
        }

        const data = await apiCall(url);
        if (!data || data.error) {
            alert(data?.error || 'Failed to fetch report card data from server.');
            return;
        }

        const printWin = window.open('', '_blank');
        if (!printWin) {
            alert('Please allow popups in your browser to download the report card.');
            return;
        }

        const subjectsHtml = data.subjects.map(s => `
            <tr>
                <td style="font-weight: 700; color: #1e293b;">${s.subject}</td>
                <td style="color: #475569; font-size: 0.9rem;">${s.teacher}</td>
                <td style="text-align: center; font-weight: 700; color: ${s.mark >= 50 ? '#059669' : '#dc2626'};">${s.mark}%</td>
                <td style="text-align: center; font-weight: 800; color: #4338ca; background: #e0e7ff;">Level ${s.level_code}</td>
                <td style="font-size: 0.82rem; color: #334155;">${s.level_descriptor}</td>
                <td style="font-size: 0.82rem; color: #475569; font-style: italic;">${s.comment}</td>
            </tr>
        `).join('');

        printWin.document.write(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <title>CAPS Official Report Card - ${data.learner.full_name}</title>
                <style>
                    @page { size: A4 portrait; margin: 15mm; }
                    body { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #fff; color: #0f172a; margin: 0; padding: 0; line-height: 1.4; }
                    .report-wrapper { padding: 20px; border: 3px double #1e1b4b; margin: 0 auto; max-width: 800px; background: #ffffff; }
                    .gov-header { text-align: center; border-bottom: 2px solid #312e81; padding-bottom: 12px; margin-bottom: 16px; }
                    .gov-header h4 { margin: 0; font-size: 0.8rem; color: #4338ca; letter-spacing: 1px; text-transform: uppercase; }
                    .gov-header h2 { margin: 4px 0 0 0; font-size: 1.5rem; color: #1e1b4b; font-weight: 800; }
                    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: #f8fafc; border: 1px solid #cbd5e1; padding: 12px 16px; border-radius: 6px; margin-bottom: 16px; font-size: 0.9rem; }
                    .info-grid div { display: flex; justify-content: space-between; border-bottom: 1px dashed #e2e8f0; padding-bottom: 4px; }
                    .info-grid strong { color: #334155; }
                    .info-grid span { font-weight: 700; color: #0f172a; }
                    .table-title { font-size: 1.05rem; font-weight: 700; color: #1e1b4b; margin: 16px 0 8px 0; border-left: 4px solid #4338ca; padding-left: 8px; text-transform: uppercase; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 0.88rem; }
                    th { background: #1e1b4b; color: #ffffff; padding: 8px 10px; text-align: left; font-weight: 600; text-transform: uppercase; font-size: 0.78rem; letter-spacing: 0.5px; }
                    td { border: 1px solid #cbd5e1; padding: 8px 10px; }
                    tr:nth-child(even) { background: #f8fafc; }
                    .summary-box { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 16px; text-align: center; }
                    .summary-card { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 10px; border-radius: 6px; }
                    .summary-card .label { font-size: 0.75rem; color: #64748b; font-weight: 600; text-transform: uppercase; }
                    .summary-card .val { font-size: 1.3rem; font-weight: 800; color: #1e1b4b; margin-top: 2px; }
                    .recommendation-banner { background: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46; padding: 10px 16px; border-radius: 6px; font-weight: 700; text-align: center; font-size: 0.95rem; margin-bottom: 24px; }
                    .scale-legend { background: #fffbebf5; border: 1px solid #fef3c7; padding: 10px; border-radius: 6px; font-size: 0.78rem; color: #78350f; margin-bottom: 24px; }
                    .signatures-row { display: flex; justify-content: space-between; margin-top: 30px; padding-top: 20px; border-top: 1px solid #cbd5e1; font-size: 0.85rem; text-align: center; }
                    .sig-line { width: 200px; border-top: 1px solid #0f172a; margin: 40px auto 6px auto; }
                    @media print {
                        .no-print { display: none !important; }
                        body { padding: 0; }
                    }
                </style>
            </head>
            <body>
                <div class="no-print" style="background:#1e1b4b; color:#fff; padding:12px; text-align:center;">
                    <button onclick="window.print()" style="background:#10b981; color:#fff; border:none; padding:8px 20px; font-weight:700; border-radius:4px; cursor:pointer; font-size:0.95rem;">
                        🖨️ Click Here to Save / Print PDF Report Card
                    </button>
                </div>
                <div class="report-wrapper">
                    <div class="gov-header">
                        <h4>${data.department}</h4>
                        <h2>${data.school_name}</h2>
                        <div style="font-size:0.85rem; color:#475569; margin-top:2px;">OFFICIAL CAPS ACADEMIC PROGRESS REPORT CARD • ${data.term}</div>
                    </div>

                    <div class="info-grid">
                        <div><strong>Learner Name:</strong> <span>${data.learner.full_name}</span></div>
                        <div><strong>Admission Number:</strong> <span>${data.learner.learner_number}</span></div>
                        <div><strong>Grade & Stream:</strong> <span>Grade ${data.learner.grade} (${data.learner.stream})</span></div>
                        <div><strong>Date Issued:</strong> <span>${data.date_issued}</span></div>
                        <div><strong>Parent / Guardian:</strong> <span>${data.learner.parent_name}</span></div>
                        <div><strong>Academic Term:</strong> <span>${data.term}</span></div>
                    </div>

                    <div class="table-title">National Curriculum Statement (CAPS) Subject Results</div>
                    <table>
                        <thead>
                            <tr>
                                <th>Subject</th>
                                <th>Educator</th>
                                <th style="text-align:center;">Mark (%)</th>
                                <th style="text-align:center;">CAPS Level</th>
                                <th>Achievement Descriptor</th>
                                <th>Educator Remarks</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${subjectsHtml}
                        </tbody>
                    </table>

                    <div class="summary-box">
                        <div class="summary-card">
                            <div class="label">Overall Aggregate</div>
                            <div class="val" style="color:${data.overall_average >= 50 ? '#059669' : '#dc2626'};">${data.overall_average}%</div>
                        </div>
                        <div class="summary-card">
                            <div class="label">Days Attended</div>
                            <div class="val">${data.attendance.days_attended} / ${data.attendance.total_days}</div>
                        </div>
                        <div class="summary-card">
                            <div class="label">Attendance Rate</div>
                            <div class="val" style="color:#2563eb;">${data.attendance.attendance_percentage}%</div>
                        </div>
                    </div>

                    <div class="recommendation-banner">
                        RESULT DECISION: ${data.recommendation}
                    </div>

                    <div class="scale-legend">
                        <strong>National CAPS Achievement Rating Scale:</strong><br>
                        Level 7: Outstanding (80-100%) | Level 6: Meritorious (70-79%) | Level 5: Substantial (60-69%) | Level 4: Adequate (50-59%) | Level 3: Moderate (40-49%) | Level 2: Elementary (30-39%) | Level 1: Not Achieved (0-29%)
                    </div>

                    <div class="signatures-row">
                        <div>
                            <div class="sig-line"></div>
                            <strong>Class Educator Signature</strong>
                        </div>
                        <div style="border: 2px dashed #94a3b8; padding: 10px; border-radius: 50%; width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; font-size: 0.65rem; color: #475569; text-align: center;">
                            OFFICIAL STAMP
                        </div>
                        <div>
                            <div class="sig-line"></div>
                            <strong>${data.principal_name}</strong>
                        </div>
                    </div>
                </div>

                <script>
                    window.onload = function() {
                        setTimeout(function() { window.print(); }, 800);
                    };
                </script>
            </body>
            </html>
        `);
        printWin.document.close();
    } catch (err) {
        console.error('Error opening report card:', err);
        alert('Failed to generate official CAPS report card: ' + err.message);
    }
}

window.downloadCapsReportCard = downloadCapsReportCard;
