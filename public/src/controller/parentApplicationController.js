const db = require('../../../db/db');
const bcrypt = require('bcryptjs');
const emailService = require('../services/emailService');
const { validateSAID } = require('./saIDvalidations');

/**
 * Generate Unique Parent Application Reference
 * Format: PAR-YYYY-XXXXX (e.g. PAR-2026-48192)
 */
function generateParentAppNumber(year = new Date().getFullYear()) {
    const randomDigits = Math.floor(10000 + Math.random() * 90000);
    return `PAR-${year}-${randomDigits}`;
}

/**
 * 1. Submit Parent Portal Access Application (Public)
 */
exports.submitParentApplication = async (req, res) => {
    const {
        parent_name,
        parent_surname,
        parent_id_number,
        parent_email,
        parent_phone,
        physical_address,
        parent_type,
        password,
        confirm_password,
        school_id,
        child_first_name,
        child_surname,
        child_id_number,
        child_grade,
        child_stream
    } = req.body;

    // 1. Basic parent validation
    if (!parent_name || !parent_surname || !parent_email || !parent_phone || !password) {
        return res.status(400).json({ error: 'All parent personal details and password are required.' });
    }

    if (password !== confirm_password) {
        return res.status(400).json({ error: 'Passwords do not match.' });
    }

    if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const cleanParentId = (parent_id_number || '').replace(/\D/g, '').trim();
    if (cleanParentId) {
        const idCheck = validateSAID(cleanParentId);
        if (!idCheck.isValid) {
            return res.status(400).json({ error: `Parent South African ID is invalid: ${idCheck.error}` });
        }
    }

    // 2. Process Children / Twins (Optional or Multiple)
    let rawChildren = [];
    if (Array.isArray(req.body.children)) {
        rawChildren = req.body.children;
    } else if (req.body.children_details) {
        try {
            rawChildren = typeof req.body.children_details === 'string' ? JSON.parse(req.body.children_details) : req.body.children_details;
        } catch (_) {
            rawChildren = [];
        }
    } else if (child_first_name && child_surname) {
        rawChildren = [{
            firstName: child_first_name,
            surname: child_surname,
            idNumber: child_id_number,
            grade: child_grade || '10',
            stream: child_stream || 'General',
            isTwin: !!req.body.is_twin
        }];
    }

    const validatedChildren = [];
    for (const c of rawChildren) {
        if (c && ((c.firstName || c.first_name) || (c.surname || c.last_name))) {
            const first = (c.firstName || c.first_name || '').trim();
            const sur = (c.surname || c.last_name || '').trim();
            const cleanChildId = (c.idNumber || c.id_number || '').replace(/\D/g, '').trim();

            if (cleanChildId) {
                const childIdCheck = validateSAID(cleanChildId);
                if (!childIdCheck.isValid) {
                    return res.status(400).json({ error: `Child ID for ${first} ${sur} is invalid: ${childIdCheck.error}` });
                }
            }

            validatedChildren.push({
                firstName: first,
                surname: sur,
                idNumber: cleanChildId,
                grade: c.grade ? parseInt(c.grade, 10) : 10,
                stream: c.stream || 'General',
                isTwin: !!(c.isTwin || c.is_twin)
            });
        }
    }

    const numChildren = validatedChildren.length;
    const isTwinsOrMultiple = validatedChildren.some(c => c.isTwin) || numChildren >= 2;
    const primaryChild = validatedChildren[0] || {};

    const normalizedEmail = parent_email.trim().toLowerCase();
    const targetSchoolId = parseInt(school_id || 1, 10);

    try {
        // Check if parent is already registered in users table
        const existingUser = await db.query('SELECT id, email FROM users WHERE LOWER(email) = LOWER($1)', [normalizedEmail]);
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ 
                error: 'An account with this email already exists in the school portal. Please sign in directly or use Forgot Password.' 
            });
        }

        // Check if parent already has a pending application
        const existingApp = await db.query(
            'SELECT id, application_number, status FROM parent_portal_applications WHERE LOWER(parent_email) = LOWER($1) AND status = \'pending\'',
            [normalizedEmail]
        );
        if (existingApp.rows.length > 0) {
            return res.status(400).json({
                error: `You already have a pending Parent Portal application (${existingApp.rows[0].application_number}) currently under administrator review.`
            });
        }

        const appNumber = generateParentAppNumber();
        const passwordHash = await bcrypt.hash(password, 10);

        // Decode parent DOB & gender from ID if available
        let dob = null;
        let gender = 'Female';
        if (cleanParentId.length === 13) {
            const parsed = validateSAID(cleanParentId);
            if (parsed.isValid) {
                dob = parsed.dob;
                gender = parsed.gender;
            }
        }

        // Insert Parent Application with multiple children / twins JSONB payload
        const insertQuery = `
            INSERT INTO parent_portal_applications (
                application_number, school_id, parent_name, parent_surname, parent_id_number,
                parent_email, parent_phone, physical_address, parent_type, password_hash,
                dob, gender, country, race,
                child_first_name, child_surname, child_id_number, child_grade, child_stream,
                children_details, is_twins_or_multiple, num_children,
                status, created_at
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'South Africa', 'Black',
                $13, $14, $15, $16, $17,
                $18, $19, $20,
                'pending', NOW()
            ) RETURNING id, application_number, created_at
        `;

        const appResult = await db.query(insertQuery, [
            appNumber,
            targetSchoolId,
            parent_name.trim(),
            parent_surname.trim(),
            cleanParentId || parent_id_number.trim(),
            normalizedEmail,
            parent_phone.trim(),
            (physical_address || '').trim(),
            parent_type || 'Parent',
            passwordHash,
            dob,
            gender,
            primaryChild.firstName || null,
            primaryChild.surname || null,
            primaryChild.idNumber || null,
            primaryChild.grade || null,
            primaryChild.stream || null,
            JSON.stringify(validatedChildren),
            isTwinsOrMultiple,
            numChildren
        ]);

        const savedApp = appResult.rows[0];

        // Fetch School name
        let schoolName = 'Fusion High School';
        try {
            const sRes = await db.query('SELECT name FROM schools WHERE id = $1', [targetSchoolId]);
            if (sRes.rows.length > 0) schoolName = sRes.rows[0].name;
        } catch (_) {}

        // Send Email Confirmation to Parent (non-blocking)
        try {
            const childFullName = `${child_first_name.trim()} ${child_surname.trim()}`;
            const tpl = emailService.templates.parentApplicationReceived(
                `${parent_name.trim()} ${parent_surname.trim()}`,
                appNumber,
                schoolName,
                childFullName
            );
            emailService.send(normalizedEmail, tpl.subject, tpl.body).catch(e => console.warn('Parent app email dispatch warning:', e.message));
        } catch (mailErr) {
            console.warn('Parent app receipt email error:', mailErr.message);
        }

        res.json({
            success: true,
            message: 'Parent Portal Access Application submitted successfully. It is now awaiting school administrator review.',
            application: {
                id: savedApp.id,
                application_number: savedApp.application_number,
                parent_email: normalizedEmail,
                status: 'pending',
                school_name: schoolName,
                created_at: savedApp.created_at
            }
        });
    } catch (err) {
        console.error('Error in submitParentApplication:', err);
        res.status(500).json({ error: 'Failed to submit Parent Portal application. Please try again.' });
    }
};

/**
 * 2. Get Parent Applications for Admin Review (Protected - Admin)
 */
exports.getSchoolParentApplications = async (req, res) => {
    const adminSchoolId = parseInt(req.user?.school_id || req.headers['x-school-id'] || 1, 10);
    const isSuperAdmin = Boolean(req.user?.is_superadmin);

    try {
        let query = `
            SELECT pa.*, s.name as school_name,
                   c.id as matched_child_id, c.learner_number as matched_learner_number, 
                   c.grade as matched_grade, c.stream as matched_stream, c.parent_id as current_child_parent_id,
                   u.id_number as matched_child_id_number
            FROM parent_portal_applications pa
            LEFT JOIN schools s ON pa.school_id = s.id
            LEFT JOIN users u ON (u.id_number = pa.child_id_number OR LOWER(u.full_name) = LOWER(pa.child_first_name) AND LOWER(u.surname) = LOWER(pa.child_surname))
            LEFT JOIN children c ON (c.learner_user_id = u.id OR c.learner_number = pa.child_id_number OR (LOWER(c.full_name) = LOWER(pa.child_first_name) AND LOWER(c.surname) = LOWER(pa.child_surname)))
        `;

        const params = [];
        if (!isSuperAdmin) {
            params.push(adminSchoolId);
            query += ` WHERE pa.school_id = $1`;
        }

        query += ` ORDER BY pa.created_at DESC`;

        const result = await db.query(query, params);

        res.json({
            success: true,
            total: result.rows.length,
            applications: result.rows.map(r => {
                let parsedChildren = [];
                if (r.children_details) {
                    parsedChildren = typeof r.children_details === 'string' ? JSON.parse(r.children_details) : r.children_details;
                }
                if (parsedChildren.length === 0 && r.child_first_name) {
                    parsedChildren = [{
                        firstName: r.child_first_name,
                        surname: r.child_surname,
                        idNumber: r.child_id_number,
                        grade: r.child_grade,
                        stream: r.child_stream,
                        isTwin: false
                    }];
                }

                return {
                    id: r.id,
                    application_number: r.application_number,
                    school_id: r.school_id,
                    school_name: r.school_name || 'Fusion High School',
                    parent_name: r.parent_name,
                    parent_surname: r.parent_surname,
                    parent_id_number: r.parent_id_number,
                    parent_email: r.parent_email,
                    parent_phone: r.parent_phone,
                    physical_address: r.physical_address,
                    parent_type: r.parent_type,
                    child_first_name: r.child_first_name,
                    child_surname: r.child_surname,
                    child_id_number: r.child_id_number,
                    child_grade: r.child_grade,
                    child_stream: r.child_stream,
                    children_details: parsedChildren,
                    is_twins_or_multiple: !!r.is_twins_or_multiple || parsedChildren.length >= 2,
                    num_children: r.num_children || parsedChildren.length,
                    status: r.status,
                    admin_notes: r.admin_notes,
                    created_at: r.created_at,
                    reviewed_at: r.reviewed_at,
                    matched_learner: r.matched_child_id ? {
                        child_id: r.matched_child_id,
                        learner_number: r.matched_learner_number,
                        grade: r.matched_grade,
                        stream: r.matched_stream,
                        already_has_parent: !!r.current_child_parent_id
                    } : null
                };
            })
        });
    } catch (err) {
        console.error('Error fetching parent applications:', err);
        res.status(500).json({ error: 'Failed to retrieve parent applications.' });
    }
};

/**
 * 3. School Admin Decision: Accept (Approve) or Reject Parent Application
 */
exports.decideParentApplication = async (req, res) => {
    const { id } = req.params;
    const { decision, admin_notes } = req.body; // decision: 'approve' | 'reject'
    const adminUserId = req.user?.id || 1;

    if (!['approve', 'reject'].includes(decision)) {
        return res.status(400).json({ error: "Invalid decision. Must be 'approve' or 'reject'." });
    }

    try {
        const appRes = await db.query('SELECT * FROM parent_portal_applications WHERE id = $1 LIMIT 1', [id]);
        if (appRes.rows.length === 0) {
            return res.status(404).json({ error: 'Parent application record not found.' });
        }

        const app = appRes.rows[0];
        if (app.status !== 'pending') {
            return res.status(400).json({ error: `This application has already been ${app.status}.` });
        }

        // Fetch School Data
        let schoolName = 'Fusion High School';
        try {
            const sRes = await db.query('SELECT name FROM schools WHERE id = $1', [app.school_id]);
            if (sRes.rows.length > 0) schoolName = sRes.rows[0].name;
        } catch (_) {}

        if (decision === 'reject') {
            await db.query(
                `UPDATE parent_portal_applications 
                 SET status = 'rejected', admin_notes = $1, reviewed_by = $2, reviewed_at = NOW() 
                 WHERE id = $3`,
                [admin_notes || 'Learner verification could not be confirmed.', adminUserId, id]
            );

            // Send Rejection Notice Email
            try {
                const tpl = emailService.templates.parentApplicationRejected(
                    `${app.parent_name} ${app.parent_surname}`,
                    app.application_number,
                    schoolName,
                    admin_notes
                );
                emailService.send(app.parent_email, tpl.subject, tpl.body).catch(e => console.warn('Rejection email dispatch warning:', e.message));
            } catch (mailErr) {
                console.warn('Parent app rejection email error:', mailErr.message);
            }

            return res.json({
                success: true,
                message: `Parent application ${app.application_number} has been rejected. Notification sent to parent.`,
                status: 'rejected'
            });
        }

        // --- DECISION: APPROVE ---
        // 1. Resolve Parent Role ID
        const parentRoleRes = await db.query("SELECT id FROM roles WHERE LOWER(name) = 'parent' LIMIT 1");
        const parentRoleId = parentRoleRes.rows[0]?.id || 4;

        await db.query('BEGIN');

        // 2. Create or update Parent user account
        let parentUserId;
        const userCheck = await db.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [app.parent_email]);
        if (userCheck.rows.length > 0) {
            parentUserId = userCheck.rows[0].id;
            await db.query(`
                UPDATE users 
                SET password_hash = $1, full_name = $2, surname = $3, id_number = $4,
                    phone = $5, physical_address = $6, parent_type = $7, school_id = $8,
                    role_id = $9
                WHERE id = $10
            `, [
                app.password_hash, app.parent_name, app.parent_surname, app.parent_id_number,
                app.parent_phone, app.physical_address, app.parent_type, app.school_id,
                parentRoleId, parentUserId
            ]);
        } else {
            const insertUser = await db.query(`
                INSERT INTO users (
                    email, password_hash, role_id, full_name, surname, id_number,
                    phone, physical_address, parent_type, school_id, dob, gender,
                    country, race, created_at
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'South Africa', 'Black', NOW()
                ) RETURNING id
            `, [
                app.parent_email, app.password_hash, parentRoleId, app.parent_name, app.parent_surname,
                app.parent_id_number, app.parent_phone, app.physical_address, app.parent_type,
                app.school_id, app.dob, app.gender
            ]);
            parentUserId = insertUser.rows[0].id;
        }

        // 3. Find and Link Claimed Learner(s) (supports 1, twins, triplets, multiple)
        let childrenToProcess = [];
        if (app.children_details) {
            childrenToProcess = typeof app.children_details === 'string' ? JSON.parse(app.children_details) : app.children_details;
        }
        
        if (childrenToProcess.length === 0 && app.child_first_name && app.child_surname) {
            childrenToProcess = [{
                firstName: app.child_first_name,
                surname: app.child_surname,
                idNumber: app.child_id_number,
                grade: app.child_grade,
                stream: app.child_stream
            }];
        }

        const linkedChildren = [];
        for (const childObj of childrenToProcess) {
            const first = (childObj.firstName || childObj.first_name || '').trim();
            const sur = (childObj.surname || childObj.last_name || '').trim();
            const cleanChildId = (childObj.idNumber || childObj.id_number || '').replace(/\D/g, '').trim();

            const learnerMatchRes = await db.query(`
                SELECT c.id, c.learner_user_id, c.full_name, c.surname, c.learner_number, c.grade, c.stream, c.parent_id
                FROM children c
                LEFT JOIN users u ON c.learner_user_id = u.id
                WHERE (u.id_number = $1 AND $1 != '')
                   OR (c.learner_number = $1 AND $1 != '')
                   OR (LOWER(c.full_name) ILIKE LOWER($2) AND LOWER(c.surname) ILIKE LOWER($3))
                LIMIT 1
            `, [cleanChildId, `%${first}%`, `%${sur}%`]);

            if (learnerMatchRes.rows.length > 0) {
                const child = learnerMatchRes.rows[0];

                if (!child.parent_id) {
                    await db.query('UPDATE children SET parent_id = $1 WHERE id = $2', [parentUserId, child.id]);
                } else if (child.parent_id !== parentUserId) {
                    await db.query('UPDATE children SET secondary_parent_id = $1 WHERE id = $2', [parentUserId, child.id]);
                }

                await db.query(`
                    INSERT INTO parent_children (parent_id, child_id, relationship, is_primary)
                    VALUES ($1, $2, $3, $4)
                    ON CONFLICT (parent_id, child_id) DO NOTHING
                `, [parentUserId, child.id, app.parent_type || 'Parent', !child.parent_id]);

                linkedChildren.push(child);
            }
        }

        // 4. Update Application Status to 'approved'
        await db.query(`
            UPDATE parent_portal_applications 
            SET status = 'approved', admin_notes = $1, reviewed_by = $2, reviewed_at = NOW() 
            WHERE id = $3
        `, [admin_notes || 'Approved by School Administration.', adminUserId, id]);

        await db.query('COMMIT');

        // 5. Send Acceptance & Welcome Email to Parent
        try {
            const tpl = emailService.templates.parentApplicationApproved(
                `${app.parent_name} ${app.parent_surname}`,
                app.parent_email,
                schoolName,
                linkedChildren
            );
            emailService.send(app.parent_email, tpl.subject, tpl.body).catch(e => console.warn('Approval email dispatch warning:', e.message));
        } catch (mailErr) {
            console.warn('Parent app approval email error:', mailErr.message);
        }

        res.json({
            success: true,
            message: `Parent application ${app.application_number} accepted & approved! Parent account activated and welcome credentials emailed.`,
            parent_user_id: parentUserId,
            linked_children: linkedChildren
        });
    } catch (err) {
        await db.query('ROLLBACK');
        console.error('Error approving parent application:', err);
        res.status(500).json({ error: err.message || 'Failed to approve parent application.' });
    }
};
