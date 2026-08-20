/**
 * Admin Dashboard - Users Module
 */

export async function apiRequest(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/';
        return;
    }
    const config = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        ...options
    };

    const response = await fetch(endpoint, config);
    if (!response.ok) {
        const errorText = await response.text();
        let errMsg = 'API request failed';
        try {
            const error = JSON.parse(errorText);
            errMsg = error.error || errMsg;
        } catch (e) {
            errMsg = errorText || errMsg;
        }

        if (response.status === 401 || response.status === 403 || errMsg.includes('expired token') || errMsg.includes('Invalid or expired')) {
            alert('Your session has expired. Please log in again.');
            localStorage.clear();
            window.location.href = '/';
            return;
        }

        throw new Error(errMsg);
    }

    const text = await response.text();
    if (!text) {
        if (endpoint.includes('/timetables') || endpoint.includes('/users') || endpoint.includes('/teachers') || endpoint.includes('/reports')) {
            return [];
        }
        return {};
    }
    return JSON.parse(text);
}

export async function loadUsersTable(roleFilter = '') {
    const tbody = document.getElementById('users-tbody');
    if (!tbody) return;

    try {
        const users = await apiRequest(`/api/admin/users${roleFilter ? `?role=${roleFilter}` : ''}`);
        tbody.innerHTML = (users || []).map(u => `
            <tr>
                <td>${u.id}</td>
                <td>${u.full_name} ${u.surname || ''}</td>
                <td>${u.email}</td>
                <td><span class="badge badge-role">${u.role}</span></td>
                <td><span class="badge ${u.status === 'Active' ? 'badge-present' : 'badge-absent'}">${u.status || 'Active'}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline" onclick="window.toggleUserStatus(${u.id}, '${u.status}')">${u.status === 'Active' ? 'Deactivate' : 'Activate'}</button>
                    <button class="btn btn-sm btn-danger" onclick="window.deleteUser(${u.id})">Delete</button>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        console.error('Error loading users table:', err);
    }
}

export async function toggleUserStatus(userId, currentStatus) {
    const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
    if (!confirm(`Are you sure you want to change user status to ${newStatus}?`)) return;

    try {
        await apiRequest(`/api/admin/users/${userId}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status: newStatus })
        });
        loadUsersTable();
    } catch (err) {
        alert('Failed to update status: ' + err.message);
    }
}

export async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;

    try {
        await apiRequest(`/api/admin/users/${userId}`, { method: 'DELETE' });
        loadUsersTable();
    } catch (err) {
        alert('Failed to delete user: ' + err.message);
    }
}
