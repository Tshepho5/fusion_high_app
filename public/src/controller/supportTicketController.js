const db = require('../../../db/db');
const { resolveSchoolId } = require('../services/schoolScope');
const emailService = require('../services/emailService');

const TICKET_CATEGORIES = [
    'wrong_email',
    'wrong_phone',
    'wrong_id_number',
    'wrong_learner_details',
    'wrong_parent_details',
    'application_correction',
    'login_access',
    'account_profile',
    'fees_payments',
    'technical',
    'other'
];

const CATEGORY_LABELS = {
    wrong_email: 'Wrong email address',
    wrong_phone: 'Wrong phone number',
    wrong_id_number: 'Wrong ID number',
    wrong_learner_details: 'Wrong learner / child details',
    wrong_parent_details: 'Wrong parent / guardian details',
    application_correction: 'Application form correction',
    login_access: 'Login or account access',
    account_profile: 'Profile / personal details',
    fees_payments: 'Fees or payments',
    technical: 'Technical / app issue',
    other: 'Other support request'
};

let schemaReady = false;

async function ensureSupportSchema() {
    if (schemaReady) return;
    await db.query(`
        CREATE TABLE IF NOT EXISTS support_tickets (
            id SERIAL PRIMARY KEY,
            ticket_number VARCHAR(40) UNIQUE NOT NULL,
            school_id INTEGER,
            requester_user_id INTEGER,
            requester_role VARCHAR(50),
            requester_name VARCHAR(255) NOT NULL,
            requester_email VARCHAR(255) NOT NULL,
            requester_phone VARCHAR(50),
            category VARCHAR(80) NOT NULL DEFAULT 'other',
            subject VARCHAR(255) NOT NULL,
            description TEXT NOT NULL,
            related_application_number VARCHAR(50),
            related_application_type VARCHAR(50),
            status VARCHAR(40) NOT NULL DEFAULT 'open',
            priority VARCHAR(20) NOT NULL DEFAULT 'normal',
            assigned_to INTEGER,
            admin_notes TEXT,
            resolution_notes TEXT,
            corrected_fields JSONB DEFAULT '{}'::jsonb,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            resolved_at TIMESTAMP,
            resolved_by INTEGER
        );

        CREATE INDEX IF NOT EXISTS idx_support_tickets_school_status
            ON support_tickets(school_id, status);
        CREATE INDEX IF NOT EXISTS idx_support_tickets_email
            ON support_tickets(LOWER(requester_email));
        CREATE INDEX IF NOT EXISTS idx_support_tickets_created
            ON support_tickets(created_at DESC);
    `);
    schemaReady = true;
}

function generateTicketNumber() {
    const year = new Date().getFullYear();
    const rand = Math.floor(100000 + Math.random() * 900000);
    return `GSA-SUP-${year}-${rand}`;
}

function normalizeCategory(raw) {
    const c = String(raw || 'other').trim().toLowerCase().replace(/\s+/g, '_');
    return TICKET_CATEGORIES.includes(c) ? c : 'other';
}

/**
 * Public or authenticated: submit a support request (application mistakes, login, profile, etc.)
 */
exports.submitSupportTicket = async (req, res) => {
    try {
        await ensureSupportSchema();

        const body = req.body || {};
        const requester_name = String(body.requester_name || body.name || '').trim();
        const requester_email = String(body.requester_email || body.email || '').trim().toLowerCase();
        let requester_phone = String(body.requester_phone || body.phone || '').trim() || null;
        const subject = String(body.subject || '').trim();
        const description = String(body.description || body.message || '').trim();
        const category = normalizeCategory(body.category);
        let related_application_number = String(body.related_application_number || body.application_number || '').trim() || null;
        const related_application_type = String(body.related_application_type || 'parent_portal').trim() || null;
        let school_id = parseInt(body.school_id, 10);
        if (!Number.isInteger(school_id) || school_id <= 0) school_id = null;

        const user = req.user || null;
        if (user?.school_id && !school_id) {
            const own = parseInt(user.school_id, 10);
            if (Number.isInteger(own) && own > 0) school_id = own;
        }

        if (!requester_name || requester_name.length < 2) {
            return res.status(400).json({ error: 'Please provide your full name.' });
        }
        if (!/^[a-zA-ZÀ-ÿ\s'-]+$/.test(requester_name) || /\d/.test(requester_name)) {
            return res.status(400).json({ error: 'Full name may only contain letters (no numbers).' });
        }
        if (!requester_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(requester_email)) {
            return res.status(400).json({ error: 'Please provide a valid contact email so we can reply.' });
        }
        if (requester_phone) {
            const digits = requester_phone.replace(/\D/g, '');
            if (!/^\d{10}$/.test(digits)) {
                return res.status(400).json({ error: 'Phone must be exactly 10 digits if provided.' });
            }
            requester_phone = digits;
        }
        if (related_application_number) {
            related_application_number = related_application_number.toUpperCase();
            if (!/^[A-Z]{2,5}-\d{4}-\d{4,6}$/.test(related_application_number)) {
                return res.status(400).json({ error: 'Application reference format is invalid. Example: PAR-2026-48192.' });
            }
        }
        if (!subject || subject.length < 4) {
            return res.status(400).json({ error: 'Please provide a short subject for your request.' });
        }
        if (!description || description.length < 10) {
            return res.status(400).json({ error: 'Please describe the problem in a bit more detail (at least 10 characters).' });
        }

        // Prefer school from linked application number when provided
        if (related_application_number && !school_id) {
            try {
                const appRes = await db.query(
                    `SELECT school_id FROM parent_portal_applications
                     WHERE UPPER(application_number) = UPPER($1) LIMIT 1`,
                    [related_application_number]
                );
                if (appRes.rows[0]?.school_id) {
                    const sid = parseInt(appRes.rows[0].school_id, 10);
                    if (Number.isInteger(sid) && sid > 0) school_id = sid;
                }
            } catch (_) { /* table may not exist yet */ }
        }

        let ticketNumber = generateTicketNumber();
        for (let i = 0; i < 3; i++) {
            const clash = await db.query(
                'SELECT 1 FROM support_tickets WHERE ticket_number = $1 LIMIT 1',
                [ticketNumber]
            );
            if (clash.rows.length === 0) break;
            ticketNumber = generateTicketNumber();
        }

        const insert = await db.query(
            `INSERT INTO support_tickets (
                ticket_number, school_id, requester_user_id, requester_role,
                requester_name, requester_email, requester_phone,
                category, subject, description,
                related_application_number, related_application_type,
                status, priority
             ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'open', $13
             ) RETURNING *`,
            [
                ticketNumber,
                school_id,
                user?.id || null,
                user?.role || body.requester_role || null,
                requester_name,
                requester_email,
                requester_phone,
                category,
                subject.slice(0, 255),
                description,
                related_application_number,
                related_application_type,
                body.priority === 'high' || body.priority === 'urgent' ? body.priority : 'normal'
            ]
        );

        const ticket = insert.rows[0];

        // Notify school admins + acknowledge requester (best-effort)
        try {
            const ackHtml = `
              <div style="font-family:Segoe UI,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0B1F33">
                <h2 style="margin:0 0 8px;color:#0B1F33">Support request received</h2>
                <p style="margin:0 0 16px;color:#475569">Thank you, ${requester_name}. Geleza SA and your school administration have received your request.</p>
                <p style="margin:0 0 8px"><strong>Ticket:</strong> ${ticketNumber}</p>
                <p style="margin:0 0 8px"><strong>Category:</strong> ${CATEGORY_LABELS[category] || category}</p>
                <p style="margin:0 0 8px"><strong>Subject:</strong> ${subject}</p>
                <p style="margin:16px 0 0;color:#64748b;font-size:13px">Our school admin or Geleza SA support team will review this and correct eligible application or account details where needed.</p>
              </div>`;
            emailService.send(requester_email, `[Geleza SA] Support ticket ${ticketNumber} received`, ackHtml)
                .catch((e) => console.warn('Support ack email:', e.message));

            if (school_id) {
                const admins = await db.query(
                    `SELECT u.email, u.full_name FROM users u
                     LEFT JOIN roles r ON (u.role_id::text = r.id::text OR LOWER(r.name) = LOWER(u.role_id::text))
                     WHERE u.school_id::text = $1::text
                       AND (u.is_superadmin = TRUE OR LOWER(COALESCE(r.name, u.role_id::text, '')) = 'admin')
                       AND u.email IS NOT NULL
                     LIMIT 8`,
                    [String(school_id)]
                );
                const adminHtml = `
                  <div style="font-family:Segoe UI,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0B1F33">
                    <h2 style="margin:0 0 8px">New user support request</h2>
                    <p><strong>Ticket:</strong> ${ticketNumber}</p>
                    <p><strong>From:</strong> ${requester_name} (${requester_email})</p>
                    <p><strong>Category:</strong> ${CATEGORY_LABELS[category] || category}</p>
                    <p><strong>Subject:</strong> ${subject}</p>
                    ${related_application_number ? `<p><strong>Application ref:</strong> ${related_application_number}</p>` : ''}
                    <p style="white-space:pre-wrap;background:#f1f5f9;padding:12px;border-radius:8px">${description.replace(/</g, '&lt;')}</p>
                    <p style="margin-top:16px;font-size:13px;color:#64748b">Open Admin → Support Desk to review and correct details.</p>
                  </div>`;
                for (const a of admins.rows) {
                    if (!a.email) continue;
                    emailService.send(a.email, `[Geleza SA] Support ${ticketNumber}: ${subject}`, adminHtml)
                        .catch((e) => console.warn('Support admin email:', e.message));
                }
            }
        } catch (mailErr) {
            console.warn('Support ticket mail notify failed:', mailErr.message);
        }

        res.status(201).json({
            success: true,
            message: 'Your support request has been submitted. Keep your ticket number for follow-up.',
            ticket: {
                id: ticket.id,
                ticket_number: ticket.ticket_number,
                status: ticket.status,
                category: ticket.category,
                category_label: CATEGORY_LABELS[ticket.category] || ticket.category,
                subject: ticket.subject,
                created_at: ticket.created_at
            }
        });
    } catch (err) {
        console.error('submitSupportTicket error:', err);
        res.status(500).json({ error: 'Failed to submit support request. Please try again.' });
    }
};

/**
 * Authenticated user: list own tickets
 */
exports.getMySupportTickets = async (req, res) => {
    try {
        await ensureSupportSchema();
        if (!req.user?.id) return res.status(401).json({ error: 'Unauthorized' });

        const result = await db.query(
            `SELECT id, ticket_number, category, subject, status, priority,
                    related_application_number, created_at, updated_at, resolved_at, resolution_notes
             FROM support_tickets
             WHERE requester_user_id::text = $1::text
                OR LOWER(requester_email) = LOWER($2)
             ORDER BY created_at DESC
             LIMIT 50`,
            [String(req.user.id), req.user.email || '']
        );

        res.json({
            success: true,
            tickets: result.rows.map((t) => ({
                ...t,
                category_label: CATEGORY_LABELS[t.category] || t.category
            }))
        });
    } catch (err) {
        console.error('getMySupportTickets error:', err);
        res.status(500).json({ error: 'Failed to load your support tickets.' });
    }
};

/**
 * School admin / Geleza SA superadmin: list tickets for their school (or all if superadmin)
 */
exports.getAdminSupportTickets = async (req, res) => {
    try {
        await ensureSupportSchema();
        const isSuper = Boolean(req.user?.is_superadmin);
        const schoolId = resolveSchoolId(req);
        const status = String(req.query.status || '').trim().toLowerCase();

        let query = `
            SELECT st.*, s.name AS school_name
            FROM support_tickets st
            LEFT JOIN schools s ON st.school_id::text = s.id::text
            WHERE 1=1
        `;
        const params = [];

        if (!isSuper) {
            if (!schoolId) {
                return res.status(403).json({ error: 'This account is not attached to a school.' });
            }
            params.push(String(schoolId));
            query += ` AND st.school_id::text = $${params.length}::text`;
        } else if (schoolId) {
            params.push(String(schoolId));
            query += ` AND st.school_id::text = $${params.length}::text`;
        }

        if (status && ['open', 'in_progress', 'resolved', 'closed'].includes(status)) {
            params.push(status);
            query += ` AND st.status = $${params.length}`;
        }

        query += ` ORDER BY
            CASE st.status WHEN 'open' THEN 0 WHEN 'in_progress' THEN 1 ELSE 2 END,
            st.created_at DESC
            LIMIT 200`;

        const result = await db.query(query, params);

        res.json({
            success: true,
            total: result.rows.length,
            categories: CATEGORY_LABELS,
            tickets: result.rows.map((t) => ({
                ...t,
                category_label: CATEGORY_LABELS[t.category] || t.category
            }))
        });
    } catch (err) {
        console.error('getAdminSupportTickets error:', err);
        res.status(500).json({ error: 'Failed to load support tickets.' });
    }
};

/**
 * Admin updates ticket status / resolution notes
 */
exports.updateSupportTicket = async (req, res) => {
    try {
        await ensureSupportSchema();
        const { id } = req.params;
        const { status, admin_notes, resolution_notes, priority } = req.body || {};
        const isSuper = Boolean(req.user?.is_superadmin);
        const schoolId = resolveSchoolId(req);

        const existing = await db.query('SELECT * FROM support_tickets WHERE id = $1 LIMIT 1', [id]);
        if (existing.rows.length === 0) {
            return res.status(404).json({ error: 'Support ticket not found.' });
        }
        const ticket = existing.rows[0];

        if (!isSuper) {
            if (!schoolId || String(ticket.school_id || '') !== String(schoolId)) {
                return res.status(403).json({ error: 'You can only manage tickets for your school.' });
            }
        }

        const nextStatus = status && ['open', 'in_progress', 'resolved', 'closed'].includes(status)
            ? status
            : ticket.status;
        const isResolved = nextStatus === 'resolved' || nextStatus === 'closed';

        const updated = await db.query(
            `UPDATE support_tickets SET
                status = $1,
                admin_notes = COALESCE($2, admin_notes),
                resolution_notes = COALESCE($3, resolution_notes),
                priority = COALESCE($4, priority),
                assigned_to = COALESCE(assigned_to, $5),
                resolved_at = CASE WHEN $6 THEN COALESCE(resolved_at, NOW()) ELSE resolved_at END,
                resolved_by = CASE WHEN $6 THEN COALESCE(resolved_by, $5) ELSE resolved_by END,
                updated_at = NOW()
             WHERE id = $7
             RETURNING *`,
            [
                nextStatus,
                admin_notes !== undefined ? admin_notes : null,
                resolution_notes !== undefined ? resolution_notes : null,
                priority && ['low', 'normal', 'high', 'urgent'].includes(priority) ? priority : null,
                req.user.id,
                isResolved,
                id
            ]
        );

        const row = updated.rows[0];

        if (isResolved && row.requester_email && resolution_notes) {
            try {
                const html = `
                  <div style="font-family:Segoe UI,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0B1F33">
                    <h2 style="margin:0 0 8px">Your support request was updated</h2>
                    <p><strong>Ticket:</strong> ${row.ticket_number}</p>
                    <p><strong>Status:</strong> ${nextStatus}</p>
                    <p style="white-space:pre-wrap;background:#f1f5f9;padding:12px;border-radius:8px">${String(resolution_notes).replace(/</g, '&lt;')}</p>
                  </div>`;
                emailService.send(row.requester_email, `[Geleza SA] Ticket ${row.ticket_number} ${nextStatus}`, html)
                    .catch((e) => console.warn('Ticket resolve email:', e.message));
            } catch (_) {}
        }

        res.json({
            success: true,
            message: `Ticket ${row.ticket_number} updated.`,
            ticket: {
                ...row,
                category_label: CATEGORY_LABELS[row.category] || row.category
            }
        });
    } catch (err) {
        console.error('updateSupportTicket error:', err);
        res.status(500).json({ error: 'Failed to update support ticket.' });
    }
};

exports.TICKET_CATEGORIES = TICKET_CATEGORIES;
exports.CATEGORY_LABELS = CATEGORY_LABELS;
