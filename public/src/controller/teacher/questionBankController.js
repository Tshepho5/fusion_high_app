const questionBankService = require('../../services/questionBankService');

/**
 * Controller for QuestionBank integration
 */
exports.getStats = async (req, res) => {
    try {
        const stats = await questionBankService.getStats();
        res.json({ success: true, ...stats });
    } catch (err) {
        console.error('[QuestionBank Controller Stats Error]', err);
        res.status(500).json({ success: false, error: 'Failed to retrieve question bank statistics.' });
    }
};

exports.getQuestions = async (req, res) => {
    try {
        const { grade, subject, topic, qtype, limit } = req.query;
        const result = await questionBankService.getQuestions({
            grade,
            subject,
            topic,
            qtype,
            limit: limit || 50
        });
        res.json({ success: true, ...result });
    } catch (err) {
        console.error('[QuestionBank Controller Questions Error]', err);
        res.status(500).json({ success: false, error: 'Failed to query question bank.' });
    }
};

exports.generateAssessment = async (req, res) => {
    try {
        const { marks, grade, subject, topic, title, qtype } = req.body;
        if (!grade || !subject) {
            return res.status(400).json({ success: false, error: 'Choose a grade and a subject before assembling a paper.' });
        }
        const result = await questionBankService.buildTest({
            marks,
            grade,
            subject,
            topic,
            title,
            qtype
        });

        if (!result.ok) {
            return res.status(400).json({ success: false, error: result.message || result.error || 'Could not assemble a draft from the question bank.' });
        }

        res.json({ success: true, status: 'draft', official: false, ...result });
    } catch (err) {
        console.error('[QuestionBank Controller Generate Error]', err);
        res.status(500).json({ success: false, error: 'Failed to generate assessment paper from question bank.' });
    }
};
