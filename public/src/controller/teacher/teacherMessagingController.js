const db = require('../../../../db/db');

exports.getMessages = async (req, res) => {
    try {
        const userId = req.user.id;
        const query = `
            SELECT m.id, m.sender_id, m.recipient_id, m.child_id, m.subject, m.body, m.created_at, m.read_at,
                   sender.full_name as sender_name, sender.surname as sender_surname,
                   recipient.full_name as recipient_name, recipient.surname as recipient_surname
            FROM messages m
            LEFT JOIN users sender ON m.sender_id = sender.id
            LEFT JOIN users recipient ON m.recipient_id = recipient.id
            WHERE m.sender_id = $1 OR m.recipient_id = $1
            ORDER BY m.created_at DESC;
        `;
        const { rows } = await db.query(query, [userId]);
        res.json(rows);
    } catch (err) {
        console.error('Error fetching teacher messages:', err);
        res.status(500).json({ error: 'Failed to retrieve messages.' });
    }
};

exports.replyToParent = async (req, res) => {
    const parentId = req.body.parentId || req.body.recipientId || req.body.receiver_id || req.body.recipient_id;
    const subject = req.body.subject || 'Teacher Message';
    const message = req.body.message || req.body.body || req.body.content;
    const childId = req.body.childId || req.body.child_id || null;
    const teacherId = req.user.id;

    if (!parentId || !message) {
        return res.status(400).json({ error: 'Parent ID and message are required.' });
    }

    try {
        await db.query(
            `INSERT INTO messages (sender_id, recipient_id, child_id, subject, body, created_at) VALUES ($1, $2, $3, $4, $5, NOW())`,
            [teacherId, parentId, childId, subject, message]
        );
        res.json({ message: 'Reply sent successfully.' });
    } catch (err) {
        console.error('Error replying to parent:', err);
        res.status(500).json({ error: 'Failed to send reply: ' + err.message });
    }
};
