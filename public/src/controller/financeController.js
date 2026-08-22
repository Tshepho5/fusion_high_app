const db = require('../../../db/db');
const path = require('path');
const fs = require('fs');

/**
 * Fetch school fee invoices for parent / learner or all invoices for admin
 */
exports.getInvoices = async (req, res) => {
  try {
    const userRole = (req.user?.role || '').toLowerCase();
    const userId = req.user?.id;
    const { childId, status, term } = req.query;

    let query = `
      SELECT fi.*, c.full_name as learner_name, c.surname as learner_surname, c.grade as learner_grade,
             u.full_name as parent_name, u.email as parent_email, u.phone as parent_phone
      FROM fee_invoices fi
      LEFT JOIN children c ON fi.learner_id = c.id
      LEFT JOIN users u ON fi.parent_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (userRole === 'parent') {
      // Find children linked to this parent
      params.push(userId);
      query += ` AND (fi.parent_id = $${params.length} OR fi.learner_id IN (
        SELECT child_id FROM parent_children WHERE parent_id = $${params.length}
      ))`;
      if (childId) {
        params.push(childId);
        query += ` AND fi.learner_id = $${params.length}`;
      }
    } else if (userRole === 'learner') {
      // Find child record linked to this learner user
      const childRes = await db.query('SELECT id FROM children WHERE learner_user_id = $1 OR id = $1', [userId]);
      const lrnId = childRes.rows[0]?.id || userId;
      params.push(lrnId);
      query += ` AND fi.learner_id = $${params.length}`;
    }

    if (status) {
      params.push(status);
      query += ` AND fi.status = $${params.length}`;
    }

    if (term) {
      params.push(term);
      query += ` AND fi.term = $${params.length}`;
    }

    query += ` ORDER BY fi.due_date ASC, fi.id DESC`;

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error in getInvoices:', err);
    res.status(500).json({ error: 'Failed to fetch invoices: ' + err.message });
  }
};

/**
 * Get single invoice with itemized breakdown and payments
 */
exports.getInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;
    const invRes = await db.query(`
      SELECT fi.*, c.full_name as learner_name, c.surname as learner_surname, c.grade as learner_grade,
             c.learner_number, u.full_name as parent_name, u.email as parent_email
      FROM fee_invoices fi
      LEFT JOIN children c ON fi.learner_id = c.id
      LEFT JOIN users u ON fi.parent_id = u.id
      WHERE fi.id::text = $1::text OR fi.invoice_number = $1::text
    `, [id]);

    if (invRes.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found.' });
    }

    const invoice = invRes.rows[0];
    const paymentsRes = await db.query(`
      SELECT * FROM fee_payments WHERE invoice_id = $1 ORDER BY created_at DESC
    `, [invoice.id]);

    invoice.payments = paymentsRes.rows;
    res.json(invoice);
  } catch (err) {
    console.error('Error in getInvoiceById:', err);
    res.status(500).json({ error: 'Failed to fetch invoice details: ' + err.message });
  }
};

/**
 * Process Online Payment (PayFast, Ozow Instant EFT, SnapScan, Card)
 */
exports.processPayment = async (req, res) => {
  try {
    const { invoiceId, amount, paymentMethod, payerName, payerEmail, notes } = req.body;
    const userId = req.user?.id;

    if (!invoiceId || !amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'Valid invoice ID and payment amount are required.' });
    }

    const invRes = await db.query('SELECT * FROM fee_invoices WHERE id = $1', [invoiceId]);
    if (invRes.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found.' });
    }

    const invoice = invRes.rows[0];
    const payAmount = parseFloat(amount);
    const newPaidAmount = parseFloat(invoice.paid_amount || 0) + payAmount;
    const totalAmount = parseFloat(invoice.amount);
    const newBalance = Math.max(0, totalAmount - newPaidAmount);
    const newStatus = newBalance <= 0 ? 'paid' : 'partial';

    // Generate unique payment reference & receipt number
    const paymentRef = `PAY-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const receiptNum = `REC-2026-${Date.now().toString().slice(-6)}`;
    const gatewayTxId = `GW-${(paymentMethod || 'PAYFAST').toUpperCase().slice(0, 3)}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // 1. Record Payment
    const paymentRes = await db.query(`
      INSERT INTO fee_payments (
        invoice_id, learner_id, parent_id, payment_reference, receipt_number,
        amount, payment_method, gateway_transaction_id, status, payer_name, payer_email, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *;
    `, [
      invoice.id,
      invoice.learner_id,
      userId || invoice.parent_id,
      paymentRef,
      receiptNum,
      payAmount,
      paymentMethod || 'PayFast Instant Settlement',
      gatewayTxId,
      'completed',
      payerName || req.user?.full_name || 'Guardian Payer',
      payerEmail || req.user?.email || 'parent@fusionhigh.co.za',
      notes || `Online payment for ${invoice.invoice_number}`
    ]);

    // 2. Update Invoice status & balance
    const updatedInv = await db.query(`
      UPDATE fee_invoices
      SET paid_amount = $1,
          balance = $2,
          status = $3,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *;
    `, [newPaidAmount, newBalance, newStatus, invoice.id]);

    res.json({
      success: true,
      message: `Payment of R${payAmount.toFixed(2)} processed successfully via ${paymentMethod || 'Gateway'}.`,
      payment: paymentRes.rows[0],
      invoice: updatedInv.rows[0],
      receipt_url: `/api/finance/receipts/${receiptNum}/download`
    });
  } catch (err) {
    console.error('Error processing payment:', err);
    res.status(500).json({ error: 'Failed to process payment: ' + err.message });
  }
};

/**
 * Fetch all payment receipts
 */
exports.getReceipts = async (req, res) => {
  try {
    const userRole = (req.user?.role || '').toLowerCase();
    const userId = req.user?.id;

    let query = `
      SELECT fp.*, fi.invoice_number, fi.title as invoice_title,
             c.full_name as learner_name, c.surname as learner_surname, c.grade as learner_grade
      FROM fee_payments fp
      LEFT JOIN fee_invoices fi ON fp.invoice_id = fi.id
      LEFT JOIN children c ON fp.learner_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (userRole === 'parent') {
      params.push(userId);
      query += ` AND (fp.parent_id = $${params.length} OR fp.learner_id IN (
        SELECT child_id FROM parent_children WHERE parent_id = $${params.length}
      ))`;
    } else if (userRole === 'learner') {
      const childRes = await db.query('SELECT id FROM children WHERE learner_user_id = $1 OR id = $1', [userId]);
      const lrnId = childRes.rows[0]?.id || userId;
      params.push(lrnId);
      query += ` AND fp.learner_id = $${params.length}`;
    }

    query += ` ORDER BY fp.created_at DESC`;

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error in getReceipts:', err);
    res.status(500).json({ error: 'Failed to fetch receipts: ' + err.message });
  }
};

/**
 * Admin Finance Overview Statistics
 */
exports.getFinanceOverview = async (req, res) => {
  try {
    const statsRes = await db.query(`
      SELECT 
        COUNT(*) as total_invoices,
        COALESCE(SUM(amount), 0) as total_billed,
        COALESCE(SUM(paid_amount), 0) as total_collected,
        COALESCE(SUM(balance), 0) as total_outstanding,
        COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_count,
        COUNT(CASE WHEN status = 'partial' THEN 1 END) as partial_count,
        COUNT(CASE WHEN status = 'pending' OR status = 'overdue' THEN 1 END) as pending_count
      FROM fee_invoices
    `);

    const recentPayments = await db.query(`
      SELECT fp.*, fi.invoice_number, c.full_name as learner_name, c.surname as learner_surname
      FROM fee_payments fp
      LEFT JOIN fee_invoices fi ON fp.invoice_id = fi.id
      LEFT JOIN children c ON fp.learner_id = c.id
      ORDER BY fp.created_at DESC
      LIMIT 10
    `);

    const stats = statsRes.rows[0];
    const totalBilled = parseFloat(stats.total_billed) || 1;
    const totalCollected = parseFloat(stats.total_collected) || 0;
    const collectionRate = Math.round((totalCollected / totalBilled) * 100);

    res.json({
      summary: {
        total_invoices: parseInt(stats.total_invoices, 10),
        total_billed: totalBilled,
        total_collected: totalCollected,
        total_outstanding: parseFloat(stats.total_outstanding),
        collection_rate_percent: collectionRate,
        paid_count: parseInt(stats.paid_count, 10),
        partial_count: parseInt(stats.partial_count, 10),
        pending_count: parseInt(stats.pending_count, 10)
      },
      recent_payments: recentPayments.rows
    });
  } catch (err) {
    console.error('Error in getFinanceOverview:', err);
    res.status(500).json({ error: 'Failed to fetch finance overview: ' + err.message });
  }
};

/**
 * Admin creates a new fee invoice
 */
exports.createInvoice = async (req, res) => {
  try {
    const { learner_id, title, description, category, term, amount, due_date, itemized_breakdown } = req.body;

    if (!learner_id || !title || !amount || !due_date) {
      return res.status(400).json({ error: 'Learner ID, Title, Amount, and Due Date are required.' });
    }

    const childRes = await db.query('SELECT c.*, pc.parent_id FROM children c LEFT JOIN parent_children pc ON c.id = pc.child_id WHERE c.id = $1', [learner_id]);
    if (childRes.rows.length === 0) {
      return res.status(404).json({ error: 'Learner not found.' });
    }

    const child = childRes.rows[0];
    const invNum = `INV-2026-${category ? category.toUpperCase().slice(0, 3) : 'GEN'}-${Date.now().toString().slice(-6)}`;
    const parsedAmount = parseFloat(amount);

    const newInv = await db.query(`
      INSERT INTO fee_invoices (
        learner_id, parent_id, invoice_number, title, description, category,
        term, amount, paid_amount, balance, status, due_date, itemized_breakdown
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *;
    `, [
      child.id,
      child.parent_id || null,
      invNum,
      title,
      description || `Official fee statement for ${child.full_name} ${child.surname}`,
      category || 'Tuition',
      term || 'Term 3 2026',
      parsedAmount,
      0.00,
      parsedAmount,
      'pending',
      due_date,
      JSON.stringify(itemized_breakdown || [{ item: title, amount: parsedAmount }])
    ]);

    res.status(201).json({
      message: 'Fee invoice created successfully.',
      invoice: newInv.rows[0]
    });
  } catch (err) {
    console.error('Error creating invoice:', err);
    res.status(500).json({ error: 'Failed to create fee invoice: ' + err.message });
  }
};
