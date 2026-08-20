const express = require('express');
const router = express.Router();
const ptcController = require('../controller/ptcController');
const { auth: authenticateToken, requireRole } = require('../../../authMiddleware');

// All PTC routes require authentication
router.use(authenticateToken);

// Teacher slot management
router.post('/slots', requireRole(['teacher', 'admin']), ptcController.createSlots);
router.get('/teacher-slots', requireRole(['teacher', 'admin']), ptcController.getTeacherSlots);
router.delete('/slots/:id', requireRole(['teacher', 'admin']), ptcController.deleteSlot);

// Parent booking management
router.get('/available-slots', requireRole(['parent', 'admin']), ptcController.getAvailableSlots);
router.post('/book', requireRole(['parent', 'admin']), ptcController.bookSlot);
router.get('/parent-bookings', requireRole(['parent', 'admin']), ptcController.getParentBookings);
router.patch('/cancel/:id', ptcController.cancelBooking);

module.exports = router;
