/**
 * Admin Dashboard - Reports & Analytics Module
 */
import { apiRequest } from './adminUsers.js';

export async function loadRecentReportsTable() {
    const container = document.getElementById('reports-table-container');
    if (!container) return;

    try {
        const reports = await apiRequest('/api/admin/reports').catch(() => []);
        if (!reports || reports.length === 0) {
            container.innerHTML = '<p class="text-muted">No recent generated reports found.</p>';
            return;
        }

        container.innerHTML = `
            <table style="width:100%; border-collapse:collapse; color:#f8fafc;">
                <thead>
                    <tr style="border-bottom:1px solid #334155; text-align:left; color:#94a3b8;">
                        <th style="padding:0.75rem;">Report Title</th>
                        <th style="padding:0.75rem;">Category</th>
                        <th style="padding:0.75rem;">Generated On</th>
                        <th style="padding:0.75rem;">Action</th>
                    </tr>
                </thead>
                <tbody>
                    ${reports.map(r => `
                        <tr style="border-bottom:1px solid #1e293b;">
                            <td style="padding:0.75rem; font-weight:600;">${r.title}</td>
                            <td style="padding:0.75rem;">${r.category || 'General'}</td>
                            <td style="padding:0.75rem; color:#94a3b8;">${new Date(r.created_at).toLocaleDateString()}</td>
                            <td style="padding:0.75rem;"><button class="btn btn-sm btn-outline" onclick="window.downloadAdminReport('${r.id}')">Download</button></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (err) {
        console.error('Error loading reports table:', err);
    }
}

export function downloadAdminReport(reportId) {
    alert(`Downloading report #${reportId}...`);
}
