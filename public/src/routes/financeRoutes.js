const express = require('express');
const router = express.Router();
const financeController = require('../controller/financeController');
const { auth, isAdmin } = require('../../../authMiddleware');

router.get('/invoices', auth, financeController.getInvoices);
router.get('/invoices/:id', auth, financeController.getInvoiceById);
router.post('/pay', auth, financeController.processPayment);
router.get('/receipts', auth, financeController.getReceipts);
router.get('/overview', auth, isAdmin, financeController.getFinanceOverview);
router.post('/invoices', auth, isAdmin, financeController.createInvoice);

module.exports = router;
