const db = require('../../../db/db');
const NotificationService = require('../services/notificationService');
const emailService = require('../services/emailService');

/**
 * Get All Textbook Inventory
 */
exports.getInventory = async (req, res) => {
  try {
    const { grade, subject } = req.query;
    let query = `
      SELECT t.*,
        (SELECT COUNT(*) FROM textbook_allocations a WHERE a.inventory_id = t.id AND a.status = 'issued') AS currently_issued_count
      FROM textbook_inventory t
      WHERE 1=1
    `;
    const params = [];
    if (grade) {
      params.push(parseInt(grade, 10));
      query += ` AND t.grade = $${params.length}`;
    }
    if (subject) {
      params.push(subject);
      query += ` AND t.subject = $${params.length}`;
    }
    query += ` ORDER BY t.grade ASC, t.subject ASC;`;

    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching textbook inventory:', err);
    res.status(500).json({ error: 'Failed to retrieve textbook inventory.' });
  }
};

/**
 * Add / Update Textbook Inventory
 */
exports.addInventory = async (req, res) => {
  try {
    const { title, subject, grade, publisher, isbn, barcode, total_copies = 50, unit_cost_zar = 250.00 } = req.body;

    if (!title || !subject || !grade) {
      return res.status(400).json({ error: 'Title, subject, and grade are required.' });
    }

    const result = await db.query(`
      INSERT INTO textbook_inventory (title, subject, grade, publisher, isbn, barcode, total_copies, available_copies, unit_cost_zar)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $7, $8)
      RETURNING *;
    `, [title, subject, parseInt(grade, 10), publisher || 'CAPS Approved Publisher', isbn || null, barcode || null, parseInt(total_copies, 10), parseFloat(unit_cost_zar)]);

    res.status(201).json({
      success: true,
      message: 'Textbook cataloged into inventory.',
      item: result.rows[0]
    });
  } catch (err) {
    console.error('Error adding textbook inventory:', err);
    res.status(500).json({ error: 'Failed to add textbook inventory: ' + err.message });
  }
};

/**
 * Issue Textbook to a Learner
 */
exports.issueTextbook = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { inventory_id, child_id, condition_on_issue = 'Good' } = req.body;

    if (!inventory_id || !child_id) {
      return res.status(400).json({ error: 'Inventory ID and Child ID are required.' });
    }

    // Check available copies
    const invRes = await db.query('SELECT * FROM textbook_inventory WHERE id = $1', [inventory_id]);
    if (invRes.rows.length === 0) return res.status(404).json({ error: 'Textbook not found.' });

    const inv = invRes.rows[0];
    if (inv.available_copies <= 0) {
      return res.status(400).json({ error: 'No available copies left in stock for this textbook.' });
    }

    // Check if child already has an issued copy of this book
    const existing = await db.query(`
      SELECT id FROM textbook_allocations 
      WHERE inventory_id = $1 AND child_id = $2 AND status = 'issued'
    `, [inventory_id, child_id]);

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'This learner already has an issued copy of this textbook.' });
    }

    const allocRes = await db.query(`
      INSERT INTO textbook_allocations (inventory_id, child_id, issued_by_user_id, condition_on_issue, status)
      VALUES ($1, $2, $3, $4, 'issued')
      RETURNING *;
    `, [inventory_id, child_id, teacherId, condition_on_issue]);

    // Decrement available copies
    await db.query('UPDATE textbook_inventory SET available_copies = available_copies - 1 WHERE id = $1', [inventory_id]);

    // Notify learner & parents
    const childRes = await db.query('SELECT full_name, surname, learner_user_id, parent_id FROM children WHERE id = $1', [child_id]);
    if (childRes.rows.length > 0) {
      const child = childRes.rows[0];
      const userIds = [child.learner_user_id, child.parent_id].filter(Boolean);
      if (userIds.length > 0) {
        NotificationService.sendToUsers({
          userIds,
          title: '📚 Textbook Issued',
          message: `"${inv.title}" has been issued to ${child.full_name} ${child.surname}. Please ensure safe custody throughout the term.`,
          type: 'textbook',
          targetTab: 'textbooks'
        }).catch(e => console.error('Textbook issue notification error:', e));
      }
    }

    res.status(201).json({
      success: true,
      message: `Textbook "${inv.title}" issued successfully.`,
      allocation: allocRes.rows[0]
    });
  } catch (err) {
    console.error('Error issuing textbook:', err);
    res.status(500).json({ error: 'Failed to issue textbook: ' + err.message });
  }
};

/**
 * Return Textbook from a Learner
 */
exports.returnTextbook = async (req, res) => {
  try {
    const { id } = req.params;
    const { condition_on_return = 'Good', replacement_fee = 0 } = req.body;

    const allocRes = await db.query(`
      SELECT a.*, t.title, t.unit_cost_zar, c.full_name AS learner_name, c.surname AS learner_surname, c.parent_id, c.learner_user_id
      FROM textbook_allocations a
      JOIN textbook_inventory t ON a.inventory_id = t.id
      JOIN children c ON a.child_id = c.id
      WHERE a.id = $1;
    `, [id]);

    if (allocRes.rows.length === 0) return res.status(404).json({ error: 'Allocation record not found.' });

    const alloc = allocRes.rows[0];
    const isLostOrDamaged = condition_on_return === 'Lost' || condition_on_return === 'Damaged';
    const finalFee = isLostOrDamaged ? (parseFloat(replacement_fee) || parseFloat(alloc.unit_cost_zar)) : 0;
    const status = condition_on_return.toLowerCase();

    await db.query(`
      UPDATE textbook_allocations
      SET returned_date = CURRENT_DATE, condition_on_return = $1, replacement_fee = $2, status = $3
      WHERE id = $4;
    `, [condition_on_return, finalFee, status, id]);

    // If returned in usable condition, restore available copies
    if (condition_on_return === 'Good' || condition_on_return === 'Fair') {
      await db.query('UPDATE textbook_inventory SET available_copies = available_copies + 1 WHERE id = $1', [alloc.inventory_id]);
    }

    // Notify parent if damaged / lost fee applies
    if (isLostOrDamaged && finalFee > 0 && alloc.parent_id) {
      NotificationService.sendToUsers({
        userIds: [alloc.parent_id],
        title: '⚠️ Textbook Replacement Fee Notice',
        message: `The textbook "${alloc.title}" issued to ${alloc.learner_name} was returned as ${condition_on_return}. Replacement fee payable: R${finalFee.toFixed(2)}.`,
        type: 'textbook',
        targetTab: 'children'
      }).catch(e => console.error('Textbook fee notification error:', e));
    }

    res.json({
      success: true,
      message: `Textbook returned recorded (${condition_on_return}).${finalFee > 0 ? ` Replacement fee: R${finalFee.toFixed(2)}` : ''}`
    });
  } catch (err) {
    console.error('Error returning textbook:', err);
    res.status(500).json({ error: 'Failed to record textbook return.' });
  }
};

/**
 * Learner: Get My Issued Textbooks
 */
exports.getLearnerAllocations = async (req, res) => {
  try {
    const userId = req.user.id;

    const childRes = await db.query('SELECT id, full_name, surname, grade FROM children WHERE learner_user_id = $1', [userId]);
    if (childRes.rows.length === 0) return res.status(404).json({ error: 'Learner profile not found.' });

    const childId = childRes.rows[0].id;

    const query = `
      SELECT 
        a.id, a.issued_date, a.expected_return_date, a.returned_date, a.condition_on_issue, a.condition_on_return, a.replacement_fee, a.status,
        t.title, t.subject, t.grade, t.publisher, t.isbn, t.barcode, t.unit_cost_zar
      FROM textbook_allocations a
      JOIN textbook_inventory t ON a.inventory_id = t.id
      WHERE a.child_id = $1
      ORDER BY a.status = 'issued' DESC, a.issued_date DESC;
    `;

    const { rows } = await db.query(query, [childId]);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching learner textbooks:', err);
    res.status(500).json({ error: 'Failed to retrieve issued textbooks.' });
  }
};

/**
 * 1-Click Action: Auto-Scan Overdue Textbooks, Generate Replacement Fee Invoices & Send Parent Notices
 */
exports.autoBillOverdue = async (req, res) => {
  try {
    const overdueRes = await db.query(`
      SELECT a.id as allocation_id, a.child_id, a.status, a.issued_date,
             t.id as inventory_id, t.title as textbook_title, t.unit_cost_zar,
             c.full_name as learner_name, c.surname as learner_surname, c.grade, c.parent_id,
             u_p.email as parent_email, CONCAT(u_p.full_name, ' ', u_p.surname) as parent_name
      FROM textbook_allocations a
      JOIN textbook_inventory t ON a.inventory_id = t.id
      JOIN children c ON a.child_id = c.id
      LEFT JOIN users u_p ON c.parent_id = u_p.id
      WHERE a.status = 'issued' OR (a.status IN ('lost', 'damaged') AND a.replacement_fee > 0);
    `);

    let billedCount = 0;
    const billedItems = [];

    for (const item of overdueRes.rows) {
      const unitCost = parseFloat(item.unit_cost_zar) || 350.00;
      const invoiceNumber = `INV-TBK-${item.allocation_id}-${Date.now().toString().slice(-4)}`;
      const learnerFullName = `${item.learner_name} ${item.learner_surname}`;

      // Check if invoice already exists
      const existingInv = await db.query(
        `SELECT id FROM fee_invoices WHERE learner_id = $1 AND category = 'textbook' AND description LIKE $2`,
        [item.child_id, `%${item.textbook_title}%`]
      );

      if (existingInv.rows.length === 0) {
        await db.query(
          `INSERT INTO fee_invoices 
             (learner_id, parent_id, invoice_number, title, description, category, term, amount, status, due_date, created_at)
           VALUES ($1, $2, $3, $4, $5, 'textbook', 'Term 3 2026', $6, 'unpaid', CURRENT_DATE + INTERVAL '14 days', NOW())`,
          [
            item.child_id,
            item.parent_id,
            invoiceNumber,
            `Textbook Replacement: ${item.textbook_title}`,
            `Replacement fee for unreturned/overdue prescribed textbook "${item.textbook_title}" for ${learnerFullName} (Grade ${item.grade}).`,
            unitCost
          ]
        );
        billedCount++;
        billedItems.push({ learner: learnerFullName, title: item.textbook_title, cost: unitCost });
      }

      // Send email notification to parent
      if (item.parent_email) {
        emailService.sendTextbookOverdueNotice({
          parentName: item.parent_name || 'Parent / Guardian',
          learnerName: learnerFullName,
          textbookTitle: item.textbook_title,
          unitCost: unitCost.toFixed(2),
          dueDate: 'Immediate Return Required'
        }).catch(err => console.warn(`[TEXTBOOK OVERDUE EMAIL ERROR] ${item.parent_email}:`, err.message));
      }
    }

    res.json({
      success: true,
      message: `Overdue scan complete: Automatically generated ${billedCount} replacement fee invoice(s) and dispatched parent email notices.`,
      billed_count: billedCount,
      items: billedItems
    });
  } catch (err) {
    console.error('Error auto-billing overdue textbooks:', err);
    res.status(500).json({ error: 'Failed to auto-bill overdue textbooks: ' + err.message });
  }
};
