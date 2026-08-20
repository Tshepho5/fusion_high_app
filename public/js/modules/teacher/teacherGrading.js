/**
 * Teacher Dashboard - Grading & Assessment Module
 */
import { apiCall } from '../../api.js';

export async function submitStudentMarks(assessmentId, markData) {
    try {
        const response = await apiCall(`/api/teacher/assessments/${assessmentId}/marks`, {
            method: 'POST',
            body: JSON.stringify(markData)
        });
        alert('Marks saved successfully!');
        return response;
    } catch (err) {
        alert('Failed to save marks: ' + err.message);
        throw err;
    }
}
