/**
 * Teacher Dashboard - Attendance Register Module
 */
import { apiCall } from '../../api.js';

export async function markClassAttendance(classId, attendanceDate, records) {
    try {
        const response = await apiCall('/api/teacher/attendance', {
            method: 'POST',
            body: JSON.stringify({ class_id: classId, date: attendanceDate, records })
        });
        alert('Attendance register submitted successfully!');
        return response;
    } catch (err) {
        alert('Failed to submit attendance: ' + err.message);
        throw err;
    }
}
