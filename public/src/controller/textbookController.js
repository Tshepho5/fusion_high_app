const db = require('../../../db/db');
const NotificationService = require('../services/notificationService');
const emailService = require('../services/emailService');

let schemaVerified = false;

/**
 * Self-healing schema helper: guarantees all columns exist in textbook_inventory & textbook_allocations
 */
async function ensureTextbookSchema() {
  if (schemaVerified) return;
  try {
    // 1. Ensure tables exist
    await db.query(`
      CREATE TABLE IF NOT EXISTS textbook_inventory (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        subject VARCHAR(150) NOT NULL,
        grade INTEGER NOT NULL,
        publisher VARCHAR(150) DEFAULT 'CAPS Approved Publisher',
        isbn VARCHAR(50),
        barcode VARCHAR(50),
        total_copies INTEGER DEFAULT 50,
        available_copies INTEGER DEFAULT 50,
        unit_cost_zar NUMERIC(10, 2) DEFAULT 250.00,
        school_id INTEGER DEFAULT 1,
        stream VARCHAR(50) DEFAULT 'General',
        barcode_prefix VARCHAR(50),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS textbook_allocations (
        id SERIAL PRIMARY KEY,
        inventory_id INTEGER NOT NULL REFERENCES textbook_inventory(id) ON DELETE CASCADE,
        child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
        issued_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        copy_barcode VARCHAR(100),
        issued_date DATE DEFAULT CURRENT_DATE,
        expected_return_date DATE DEFAULT (CURRENT_DATE + INTERVAL '120 days'),
        returned_date DATE,
        condition_on_issue VARCHAR(30) DEFAULT 'Good',
        condition_on_return VARCHAR(30),
        replacement_fee NUMERIC(10, 2) DEFAULT 0.00,
        status VARCHAR(30) DEFAULT 'issued',
        school_id INTEGER DEFAULT 1,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Safely add any missing columns to existing tables
    await db.query(`
      ALTER TABLE textbook_inventory ADD COLUMN IF NOT EXISTS publisher VARCHAR(150) DEFAULT 'CAPS Approved Publisher';
      ALTER TABLE textbook_inventory ADD COLUMN IF NOT EXISTS barcode VARCHAR(50);
      ALTER TABLE textbook_inventory ADD COLUMN IF NOT EXISTS unit_cost_zar NUMERIC(10, 2) DEFAULT 250.00;
      ALTER TABLE textbook_inventory ADD COLUMN IF NOT EXISTS total_copies INTEGER DEFAULT 50;
      ALTER TABLE textbook_inventory ADD COLUMN IF NOT EXISTS available_copies INTEGER DEFAULT 50;
      ALTER TABLE textbook_inventory ADD COLUMN IF NOT EXISTS school_id INTEGER DEFAULT 1;
      ALTER TABLE textbook_inventory ADD COLUMN IF NOT EXISTS stream VARCHAR(50) DEFAULT 'General';
      ALTER TABLE textbook_inventory ADD COLUMN IF NOT EXISTS isbn VARCHAR(50);
      ALTER TABLE textbook_inventory ADD COLUMN IF NOT EXISTS barcode_prefix VARCHAR(50);

      ALTER TABLE textbook_allocations ADD COLUMN IF NOT EXISTS issued_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
      ALTER TABLE textbook_allocations ADD COLUMN IF NOT EXISTS issued_date DATE DEFAULT CURRENT_DATE;
      ALTER TABLE textbook_allocations ADD COLUMN IF NOT EXISTS expected_return_date DATE DEFAULT (CURRENT_DATE + INTERVAL '120 days');
      ALTER TABLE textbook_allocations ADD COLUMN IF NOT EXISTS returned_date DATE;
      ALTER TABLE textbook_allocations ADD COLUMN IF NOT EXISTS condition_on_issue VARCHAR(30) DEFAULT 'Good';
      ALTER TABLE textbook_allocations ADD COLUMN IF NOT EXISTS condition_on_return VARCHAR(30);
      ALTER TABLE textbook_allocations ADD COLUMN IF NOT EXISTS replacement_fee NUMERIC(10, 2) DEFAULT 0.00;
      ALTER TABLE textbook_allocations ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'issued';
      ALTER TABLE textbook_allocations ADD COLUMN IF NOT EXISTS school_id INTEGER DEFAULT 1;
      ALTER TABLE textbook_allocations ADD COLUMN IF NOT EXISTS copy_barcode VARCHAR(100);
    `);

    try {
      await db.query(`ALTER TABLE textbook_allocations ALTER COLUMN copy_barcode DROP NOT NULL;`);
    } catch (_) {}

    try {
      await db.query(`
        UPDATE textbook_allocations SET issued_date = issue_date WHERE issued_date IS NULL AND issue_date IS NOT NULL;
        UPDATE textbook_allocations SET expected_return_date = return_due_date WHERE expected_return_date IS NULL AND return_due_date IS NOT NULL;
      `);
    } catch (_) {}

    schemaVerified = true;
  } catch (err) {
    console.warn('[TEXTBOOK SCHEMA VERIFICATION]', err.message);
  }
}

// Auto-run schema check in background
ensureTextbookSchema().catch(() => {});

/**
 * Get All Textbook Inventory
 */
exports.getInventory = async (req, res) => {
  try {
    const { grade, subject } = req.query;

    await ensureTextbookSchema();

    let query = `
      SELECT 
        t.id,
        t.title,
        t.subject,
        t.grade,
        COALESCE(t.publisher, 'CAPS Approved Publisher') as publisher,
        COALESCE(t.isbn, '') as isbn,
        COALESCE(t.barcode, t.barcode_prefix, 'TB-' || t.grade || '-' || t.id) as barcode,
        COALESCE(t.total_copies, 50) as total_copies,
        COALESCE(t.available_copies, 50) as available_copies,
        COALESCE(t.unit_cost_zar, 250.00) as unit_cost_zar,
        COALESCE(t.created_at, NOW()) as created_at,
        COALESCE((SELECT COUNT(*) FROM textbook_allocations a WHERE a.inventory_id = t.id AND a.status = 'issued'), 0) AS currently_issued_count,
        NULL as file_path
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
      query += ` AND t.subject ILIKE $${params.length}`;
    }

    // Also include any textbooks uploaded directly by educators
    query += `
      UNION ALL
      SELECT 
        (100000 + tb.id) as id,
        tb.title,
        tb.subject,
        tb.grade,
        COALESCE(u.full_name || ' (Educator Upload)', 'Teacher Resource') as publisher,
        '' as isbn,
        CONCAT('TB-DIG-', tb.id) as barcode,
        50 as total_copies,
        50 as available_copies,
        250.00 as unit_cost_zar,
        COALESCE(tb.upload_date, tb.uploaded_at, NOW()) as created_at,
        0 as currently_issued_count,
        tb.file_path
      FROM textbooks tb
      LEFT JOIN users u ON tb.teacher_id::text = u.id::text
      WHERE tb.resource_type = 'textbook'
        AND NOT EXISTS (
          SELECT 1 FROM textbook_inventory ti 
          WHERE LOWER(ti.title) = LOWER(tb.title) AND ti.grade = tb.grade
        )
    `;
    if (grade) {
      query += ` AND tb.grade = $1`;
    }
    if (subject) {
      query += ` AND tb.subject ILIKE $${grade ? '2' : '1'}`;
    }

    query += ` ORDER BY grade ASC, subject ASC;`;

    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching textbook inventory:', err);
    res.status(500).json({ error: 'Failed to retrieve textbook inventory: ' + err.message });
  }
};

/**
 * Add / Update Textbook Inventory
 */
exports.addInventory = async (req, res) => {
  try {
    await ensureTextbookSchema();
    const { title, subject, grade, publisher, isbn, barcode, total_copies = 50, unit_cost_zar = 250.00 } = req.body;

    if (!title || !subject || !grade) {
      return res.status(400).json({ error: 'Title, subject, and grade are required.' });
    }

    const copies = parseInt(total_copies, 10) || 50;
    const cost = parseFloat(unit_cost_zar) || 250.00;
    const cleanBarcode = barcode ? barcode.trim() : `TB-${grade}-${Date.now().toString().slice(-6)}`;

    const result = await db.query(`
      INSERT INTO textbook_inventory (title, subject, grade, publisher, isbn, barcode, total_copies, available_copies, unit_cost_zar)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $7, $8)
      RETURNING *;
    `, [title.trim(), subject.trim(), parseInt(grade, 10), (publisher || 'CAPS Approved Publisher').trim(), isbn ? isbn.trim() : null, cleanBarcode, copies, cost]);

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
    await ensureTextbookSchema();
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

    const copyBarcode = `${inv.barcode || 'TB'}-${Date.now().toString().slice(-4)}`;
    const allocRes = await db.query(`
      INSERT INTO textbook_allocations (inventory_id, child_id, issued_by_user_id, copy_barcode, condition_on_issue, status)
      VALUES ($1, $2, $3, $4, $5, 'issued')
      RETURNING *;
    `, [inventory_id, child_id, teacherId, copyBarcode, condition_on_issue]);

    // Decrement available copies
    await db.query('UPDATE textbook_inventory SET available_copies = available_copies - 1 WHERE id = $1', [inventory_id]);

    // Notify learner & parents
    const childRes = await db.query('SELECT full_name, surname, learner_user_id, parent_id FROM children WHERE id = $1', [child_id]);
    if (childRes.rows.length > 0) {
      const child = childRes.rows[0];
      const userIds = [child.learner_user_id, child.parent_id].filter(Boolean);
      if (userIds.length > 0) {
        const sanitizedTitle = (inv.title || 'Textbook').replace(/[^a-zA-Z0-9_-]/g, '_');
        const textbookFileName = `${sanitizedTitle}_Grade_${inv.grade || 10}.pdf`;
        NotificationService.sendToUsers({
          userIds,
          title: '📚 Textbook Issued',
          message: `"${inv.title}" has been issued to ${child.full_name} ${child.surname}. You can view, read, and download the full textbook directly from this notification.`,
          type: 'textbook',
          targetTab: 'textbooks',
          metadata: {
            inventory_id: inv.id,
            title: inv.title,
            subject: inv.subject,
            grade: inv.grade,
            file_name: textbookFileName,
            file_path: `/api/resources/download?file=${encodeURIComponent(textbookFileName)}`,
            download_url: `/api/resources/download?file=${encodeURIComponent(textbookFileName)}`,
            view_url: `/api/resources/download?file=${encodeURIComponent(textbookFileName)}&view=true`,
            resource_type: 'textbook'
          }
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
    await ensureTextbookSchema();
    const { id } = req.params;
    const { condition_on_return = 'Good', replacement_fee = 0 } = req.body;

    const allocRes = await db.query(`
      SELECT a.*, t.title, COALESCE(t.unit_cost_zar, 250.00) as unit_cost_zar, c.full_name AS learner_name, c.surname AS learner_surname, c.parent_id, c.learner_user_id
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
      message: `Textbook return recorded (${condition_on_return}).${finalFee > 0 ? ` Replacement fee: R${finalFee.toFixed(2)}` : ''}`
    });
  } catch (err) {
    console.error('Error returning textbook:', err);
    res.status(500).json({ error: 'Failed to record textbook return: ' + err.message });
  }
};

/**
 * Learner: Get My Issued Textbooks
 */
exports.getLearnerAllocations = async (req, res) => {
  try {
    await ensureTextbookSchema();
    const userId = req.user.id;

    const childRes = await db.query('SELECT id, full_name, surname, grade FROM children WHERE learner_user_id = $1', [userId]);
    if (childRes.rows.length === 0) return res.status(404).json({ error: 'Learner profile not found.' });

    const childId = childRes.rows[0].id;

    const query = `
      SELECT 
        a.id, 
        COALESCE(a.issued_date, a.created_at::date, CURRENT_DATE) as issued_date, 
        COALESCE(a.expected_return_date, CURRENT_DATE + INTERVAL '120 days') as expected_return_date, 
        a.returned_date, 
        COALESCE(a.condition_on_issue, 'Good') as condition_on_issue, 
        a.condition_on_return, 
        COALESCE(a.replacement_fee, 0.00) as replacement_fee, 
        COALESCE(a.status, 'issued') as status,
        t.title, 
        t.subject, 
        t.grade, 
        COALESCE(t.publisher, 'CAPS Approved Publisher') as publisher, 
        COALESCE(t.isbn, '') as isbn, 
        COALESCE(t.barcode, t.barcode_prefix, 'N/A') as barcode, 
        COALESCE(t.unit_cost_zar, 250.00) as unit_cost_zar
      FROM textbook_allocations a
      JOIN textbook_inventory t ON a.inventory_id = t.id
      WHERE a.child_id = $1
      ORDER BY a.status = 'issued' DESC, a.id DESC;
    `;

    const { rows } = await db.query(query, [childId]);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching learner textbooks:', err);
    res.status(500).json({ error: 'Failed to retrieve issued textbooks: ' + err.message });
  }
};

/**
 * 1-Click Action: Auto-Scan Overdue Textbooks, Generate Replacement Fee Invoices & Send Parent Notices
 */
exports.autoBillOverdue = async (req, res) => {
  try {
    await ensureTextbookSchema();
    const overdueRes = await db.query(`
      SELECT a.id as allocation_id, a.child_id, a.status, 
             COALESCE(a.issued_date, a.created_at::date, CURRENT_DATE) as issued_date,
             t.id as inventory_id, t.title as textbook_title, 
             COALESCE(t.unit_cost_zar, 250.00) as unit_cost_zar,
             c.full_name as learner_name, c.surname as learner_surname, c.grade, c.parent_id,
             u_p.email as parent_email, CONCAT(u_p.full_name, ' ', u_p.surname) as parent_name
      FROM textbook_allocations a
      JOIN textbook_inventory t ON a.inventory_id = t.id
      JOIN children c ON a.child_id = c.id
      LEFT JOIN users u_p ON c.parent_id = u_p.id
      WHERE a.status = 'issued' OR (a.status IN ('lost', 'damaged') AND COALESCE(a.replacement_fee, 0) > 0);
    `);

    let billedCount = 0;
    const billedItems = [];

    for (const item of overdueRes.rows) {
      const unitCost = parseFloat(item.unit_cost_zar) || 250.00;
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
