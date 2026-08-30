const express = require('express');
const router = express.Router();
const consultationController = require('../controller/consultationController');
const { auth } = require('../../../authMiddleware');

router.use(auth);

// Get available slots for a teacher on a specific date
router.get('/available-slots', consultationController.getAvailableSlots);

// Book a consultation (Parents)
router.post('/book', consultationController.bookConsultation);

// Get logged-in user's consultations (Educator, Parent, Admin)
router.get('/my-consultations', consultationController.getMyConsultations);

// Update consultation status or add educator notes
router.put('/:id', consultationController.updateConsultation);

module.exports = router;
