const express = require('express');
const router = express.Router();
const textbookController = require('../controller/textbookController');
const { auth: authenticateToken, requireRole } = require('../../../authMiddleware');

router.use(authenticateToken);

// Inventory list
router.get('/inventory', textbookController.getInventory);
router.get('/my-books', requireRole(['learner']), textbookController.getLearnerAllocations);

// Admin / Teacher operations
router.post('/inventory', requireRole(['teacher', 'admin']), textbookController.addInventory);
router.post('/issue', requireRole(['teacher', 'admin']), textbookController.issueTextbook);
router.patch('/return/:id', requireRole(['teacher', 'admin']), textbookController.returnTextbook);

module.exports = router;
