/**
 * Request Input Normalization Middleware
 * Seamlessly normalizes incoming JSON bodies and query parameters so backend handlers
 * support both camelCase and snake_case property variations interchangeably.
 */

function normalizeObject(obj) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return;

    // Common alias mappings (bidirectional where helpful)
    const aliases = {
        learnerNumber: 'learner_number',
        learner_number: 'learnerNumber',
        
        newPassword: 'new_password',
        new_password: 'newPassword',
        
        currentPassword: 'current_password',
        current_password: 'currentPassword',
        
        confirmPassword: 'confirm_password',
        confirm_password: 'confirmPassword',
        
        receiver_id: 'recipient_id',
        recipientId: 'recipient_id',
        
        message: 'body',
        content: 'body',
        
        childId: 'child_id',
        learnerId: 'child_id',
        studentId: 'child_id',
        
        classId: 'class_id',
        className: 'class_name',
        
        idNumber: 'id_number',
        firstName: 'first_name',
        
        totalMarks: 'total_mark',
        total_marks: 'total_mark',
        
        assessmentName: 'assessment_name',
        assessmentTitle: 'assessment_name',
        
        attendanceData: 'records',
        roster: 'records'
    };

    for (const [key, value] of Object.entries(obj)) {
        if (aliases[key] && obj[aliases[key]] === undefined) {
            obj[aliases[key]] = value;
        }
    }
}

module.exports = function normalizePayload(req, res, next) {
    if (req.body && typeof req.body === 'object') {
        normalizeObject(req.body);
    }
    if (req.query && typeof req.query === 'object') {
        normalizeObject(req.query);
    }
    next();
};
