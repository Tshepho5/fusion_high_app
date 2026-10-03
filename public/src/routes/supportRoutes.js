const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const supportTicketController = require('../controller/supportTicketController');
const { auth, isAdmin } = require('../../../authMiddleware.js');

// Soft auth: attach user when a valid token is present; never block public submit
const optionalAuth = (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const bearer = authHeader && authHeader.split(' ')[1];
        const token = (bearer && bearer !== 'null' && bearer !== 'undefined') ? bearer : null;
        if (!token || !process.env.JWT_SECRET) return next();
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
    } catch (_) {
        /* guests may still submit */
    }
    return next();
};

// Anyone (guest or signed-in) can submit a support request — critical when wrong email blocks login
router.post('/tickets', optionalAuth, supportTicketController.submitSupportTicket);

// Signed-in users: own tickets
router.get('/tickets/mine', auth, supportTicketController.getMySupportTickets);

// School admin / Geleza SA admin
router.get('/tickets', auth, isAdmin, supportTicketController.getAdminSupportTickets);
router.patch('/tickets/:id', auth, isAdmin, supportTicketController.updateSupportTicket);

module.exports = router;
