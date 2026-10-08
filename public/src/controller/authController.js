const crypto = require('crypto');
const db = require('../../../db/db');
const { db: firestore } = require('../../../db/firebase');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { attachSessionCookie, ensureActiveSessionColumn } = require('../../../authMiddleware');
const emailService = require('../services/emailService');
const { validateSAID } = require('./saIDvalidations');
const curriculumService = require('../services/curriculumService');
const { isControlLocked } = require('./systemController');
const { rejectNameDigits } = require('../services/lettersOnly');

const SESSION_SELECT_COLS = `
            u.id, u.email, u.password_hash, u.id_number::text as id_number, u.phone::text as phone, u.full_name, u.surname,
            u.is_superadmin,
            COALESCE(u.school_id, c.school_id) as school_id,
            COALESCE(r.name, u.role_id::text, 'learner') as role_name,
            c.id as child_id, c.learner_number::text as learner_number, c.grade, c.stream,
            s.name as school_name, s.slug as school_slug, s.domain as school_domain, s.emis_number,
            s.circuit, s.district, s.province, s.physical_address, s.contact_email, s.contact_phone,
            s.principal_name, s.logo_url, s.badge_url, s.primary_color, s.secondary_color, s.accent_color,
            s.motto, s.curriculum_type
        `;

const SESSION_USER_JOINS = `
                 FROM users u
                 LEFT JOIN roles r ON (u.role_id::text = r.id::text OR LOWER(r.name) = LOWER(u.role_id::text))
                 LEFT JOIN children c ON (c.learner_user_id::text = u.id::text)
                 LEFT JOIN schools s ON (s.id::text = COALESCE(u.school_id, c.school_id)::text)
`;

exports.loadSessionUser = async (userId) => {
    const result = await db.query(
        `SELECT ${SESSION_SELECT_COLS} ${SESSION_USER_JOINS} WHERE u.id::text = $1 ORDER BY u.id ASC LIMIT 1`,
        [String(userId)]
    );
    return result.rows[0] || null;
};

exports.issueLoginSession = async (user, res, rawIdentifier) => {
    const isSuperAdmin = Boolean(user.is_superadmin);

    await ensureActiveSessionColumn();

    // Always issue a fresh session — this device takes over and the previous
    // device/tab is signed out on its next API call (active_session_id mismatch).
    const sessionId = crypto.randomUUID();
    await db.query(
        'UPDATE users SET active_session_id = $1, session_seen_at = NOW(), last_seen_at = NOW(), is_online = TRUE WHERE id = $2',
        [sessionId, user.id]
    );

    const signingSecret = process.env.JWT_SECRET;
    if (!signingSecret) {
        return res.status(500).json({ error: 'Server signing secret is not configured.' });
    }

    const token = jwt.sign(
        { id: user.id, role: user.role_name, email: user.email, full_name: user.full_name, school_id: user.school_id, is_superadmin: isSuperAdmin, sid: sessionId },
        signingSecret,
        { expiresIn: '7d' }
    );
    attachSessionCookie(res, token);

    const schoolObj = user.school_id ? {
        id: user.school_id,
        name: user.school_name,
        slug: user.school_slug,
        domain: user.school_domain,
        emis_number: user.emis_number,
        circuit: user.circuit,
        district: user.district,
        province: user.province,
        physical_address: user.physical_address,
        contact_email: user.contact_email,
        contact_phone: user.contact_phone,
        principal_name: user.principal_name,
        logo_url: user.logo_url,
        badge_url: user.badge_url,
        primary_color: user.primary_color || '#4f46e5',
        secondary_color: user.secondary_color || '#06b6d4',
        accent_color: user.accent_color || '#f59e0b',
        motto: user.motto,
        curriculum_type: user.curriculum_type,
        is_active: true
    } : null;

    return res.json({
        token,
        role: user.role_name,
        school_id: user.school_id,
        school: schoolObj,
        user: {
            id: user.id,
            email: user.email,
            full_name: `${user.full_name || ''} ${user.surname || ''}`.trim(),
            role: user.role_name,
            school_id: user.school_id,
            school_name: user.school_name,
            school_slug: user.school_slug,
            is_superadmin: isSuperAdmin,
            learner_number: user.learner_number || (user.role_name === 'learner' ? rawIdentifier : undefined),
            grade: user.grade,
            stream: user.stream
        }
    });
};

const validatePassword = (password) => {
    if (!password) return "Password is required.";
    if (typeof password !== 'string') return "Invalid password format.";
    const minLength = 8;
    if (password.length < minLength) return `Password must be at least ${minLength} characters long.`;
    if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter.";
    if (!/[a-z]/.test(password)) return "Password must contain at least one lowercase letter.";
    if (!/\d/.test(password)) return "Password must contain at least one number.";
    if (!/[!@#$%^&*(),.?":{}|<> ]/.test(password)) return "Password must contain at least one special character.";
    return null;
};

/**
 * Checks immediately if an email is already registered in the system.
 */
exports.checkEmail = async (req, res) => {
    const email = (req.query.email || req.body.email || '').toString().toLowerCase().trim();
    if (!email) {
        return res.status(400).json({ error: 'Email parameter is required.' });
    }

    try {
        const result = await db.query('SELECT id, role_id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1', [email]);
        if (result.rows.length > 0) {
            return res.json({ 
                exists: true, 
                can_link: true,
                message: 'Account profile found. Proceed to link your child or complete parent registration.' 
            });
        }
        res.json({ exists: false, message: 'Email is available for registration.' });
    } catch (err) {
        console.error('Error checking email availability:', err);
        res.status(500).json({ error: 'Failed to verify email availability.' });
    }
};

/**
 * Verifies if a learner exists in the system before parent registration.
 */
exports.verifyLearner = async (req, res) => {
    const firstName = (req.body.first_name || req.body.name || req.query.first_name || '').toString().trim();
    const surname = (req.body.surname || req.query.surname || '').toString().trim();
    const idNumber = (req.body.id_number || req.body.idNumber || req.query.id_number || '').toString().replace(/\D/g, '').trim();
    const learnerNumber = (req.body.learner_number || req.body.learnerNumber || req.query.learner_number || '').toString().trim();

    if (!learnerNumber || idNumber.length !== 13 || !firstName || !surname) {
        return res.status(400).json({
            error: 'The official learner number, a 13-digit ID, the first name, and the surname are all required.'
        });
    }

    try {
        const { rows } = await db.query(`
            SELECT c.id, c.full_name, c.surname, c.learner_number, c.grade, c.stream, c.subjects, c.parent_id, c.secondary_parent_id,
                   u.id_number, u.email as learner_email, cl.name as class_name
            FROM children c
            JOIN users u ON c.learner_user_id = u.id
            LEFT JOIN classes cl ON c.class_id = cl.id
            WHERE LOWER(TRIM(c.learner_number)) = LOWER(TRIM($1))
              AND regexp_replace(COALESCE(u.id_number, ''), '\\D', '', 'g') = $2
              AND LOWER(TRIM(c.full_name)) = LOWER(TRIM($3))
              AND LOWER(TRIM(c.surname)) = LOWER(TRIM($4))
            LIMIT 1
        `, [learnerNumber, idNumber, firstName, surname]);

        if (rows.length === 0) {
            return res.status(404).json({
                error: 'Those four details do not match an enrolled learner. A new learner is not created from this check.'
            });
        }

        const learner = rows[0];
        res.json({
            verified: true,
            learner: {
                id: learner.id,
                full_name: learner.full_name,
                surname: learner.surname,
                id_number: learner.id_number,
                learner_number: learner.learner_number,
                grade: learner.grade,
                stream: learner.stream,
                class_name: learner.class_name || `Grade ${learner.grade}A`,
                subjects: learner.subjects || ['English FAL', 'Mathematics', 'Life Orientation'],
                already_linked: !!learner.parent_id && !!learner.secondary_parent_id
            }
        });
    } catch (err) {
        console.error('Error verifying learner details:', err);
        res.status(500).json({ error: 'Database verification failed.' });
    }
};

async function generateOfficialLearnerNumber(year = new Date().getFullYear()) {
    const currentYear = year || new Date().getFullYear();
    const prefix = `${currentYear}`;
    try {
        const [childRes, appRes, userRes] = await Promise.all([
            db.query("SELECT learner_number FROM children WHERE learner_number LIKE $1 OR learner_number ~ '^[0-9]+$'", [`${prefix}%`]),
            db.query("SELECT provisional_learner_number FROM applications WHERE provisional_learner_number LIKE $1", [`${prefix}%`]),
            db.query("SELECT email FROM users WHERE email LIKE $1", [`${prefix}%@%`])
        ]);
        
        let maxSeq = 0;
        const existingSet = new Set();

        const allRows = [...(childRes.rows || []), ...(appRes.rows || [])];
        for (const row of allRows) {
            const val = row.learner_number || row.provisional_learner_number || '';
            const numStr = val.replace(/\D/g, '');
            if (numStr.startsWith(prefix) && numStr.length === prefix.length + 4) {
                existingSet.add(numStr);
                const seq = parseInt(numStr.slice(prefix.length), 10);
                if (!isNaN(seq) && seq > maxSeq) {
                    maxSeq = seq;
                }
            }
        }

        // Also check users table
        for (const row of (userRes.rows || [])) {
            const emailPrefix = (row.email || '').split('@')[0].replace(/\D/g, '');
            if (emailPrefix.startsWith(prefix) && emailPrefix.length === prefix.length + 4) {
                existingSet.add(emailPrefix);
                const seq = parseInt(emailPrefix.slice(prefix.length), 10);
                if (!isNaN(seq) && seq > maxSeq) {
                    maxSeq = seq;
                }
            }
        }

        let nextSeq = maxSeq + 1;
        let candidate = `${prefix}${nextSeq.toString().padStart(4, '0')}`;
        while (existingSet.has(candidate)) {
            nextSeq++;
            candidate = `${prefix}${nextSeq.toString().padStart(4, '0')}`;
        }
        return candidate;
    } catch (e) {
        return `${currentYear}0001`;
    }
}

/**
 * Returns the school's official ac.za domain for student emails
 */
function getSchoolAcZaDomain(school) {
    if (!school) return 'fusionhigh.ac.za';
    if (typeof school === 'string') {
        const clean = school.toLowerCase().replace(/[^a-z0-9]/g, '');
        return clean ? `${clean}.ac.za` : 'fusionhigh.ac.za';
    }
    const slug = (school.slug || school.domain || school.name || '').toLowerCase();
    let cleanSlug = slug
        .replace(/\.co\.za|\.org\.za|\.gov\.za|\.ac\.za/g, '')
        .replace(/-secondary-lotus/g, 'secondary')
        .replace(/-high|-secondary/g, '')
        .replace(/[^a-z0-9]/g, '');
    if (slug.includes('fusion') && slug.includes('lotus')) cleanSlug = 'fusionsecondary';
    else if (slug.includes('fusion')) cleanSlug = 'fusionhigh';
    return cleanSlug ? `${cleanSlug}.ac.za` : 'fusionhigh.ac.za';
}

/**
 * Generates initial learner password from South African ID Number.
 * Rule: Takes 1st digit (index 0), skips next 2, takes following (index 3),
 * skips next 2, takes following (index 6), and so on systematically (0, 3, 6, 9, 12...).
 * e.g., SA ID '0501014089081' -> '01491'
 */
function generateLearnerPasswordFromID(idNumber) {
    const cleanId = (idNumber || '').toString().replace(/\D/g, '').trim();
    if (!cleanId) return '123456';
    let pwd = '';
    for (let i = 0; i < cleanId.length; i += 3) {
        pwd += cleanId[i];
    }
    return pwd || cleanId;
}

exports.generateOfficialLearnerNumber = generateOfficialLearnerNumber;
exports.generateLearnerPasswordFromID = generateLearnerPasswordFromID;
exports.getSchoolAcZaDomain = getSchoolAcZaDomain;

/**
 * Registers parent user and links their child / children seamlessly.
 */
exports.registerUser = async (req, res) => {
    // 0. Geleza SA Executive & Admin Portal Lock Verification
    const requestedRole = (req.body.role || 'parent').toString().toLowerCase();
    if (requestedRole === 'learner') {
        const learnerLock = await isControlLocked('learner_registration');
        if (learnerLock && learnerLock.is_locked) {
            return res.status(403).json({
                error: learnerLock.locked_reason || 'Learner registration is closed.',
                is_locked: true
            });
        }
    }
    if (requestedRole === 'teacher') {
        const teacherLock = await isControlLocked('teacher_registration');
        if (teacherLock && teacherLock.is_locked) {
            return res.status(403).json({
                error: teacherLock.locked_reason || 'Teacher registration is closed.',
                is_locked: true
            });
        }
    }

    if (requestedRole !== 'learner' && requestedRole !== 'teacher') {
        const parentLock = await isControlLocked('parent_registration');
        const legacyLock = await isControlLocked('user_registration');
        const lockState = (parentLock && parentLock.is_locked) ? parentLock : legacyLock;
        if (lockState && lockState.is_locked) {
            return res.status(403).json({
                error: lockState.locked_reason || 'Parent registration is closed.',
                is_locked: true
            });
        }
    }

    let { 
        email, password, full_name, surname, role, id_number, dob, gender, phone, physical_address, country, race, parent_type, 
        learner_number, children_to_link, school_id 
    } = req.body;

    const targetSchoolId = parseInt(school_id || req.headers['x-school-id'], 10);
    if (!Number.isInteger(targetSchoolId) || targetSchoolId <= 0) {
        return res.status(400).json({ error: 'Choose the school this registration is for.' });
    }
    let schoolData = { id: targetSchoolId, name: 'Fusion High School', slug: 'fusion-high' };
    try {
        const sRes = await db.query('SELECT id, name, slug, domain FROM schools WHERE id = $1', [targetSchoolId]);
        if (sRes.rows.length > 0) schoolData = sRes.rows[0];
    } catch (_) {}
    const schoolDomain = getSchoolAcZaDomain(schoolData);
    
    const normalizedEmail = (email || '').toString().toLowerCase().trim();
    if (!normalizedEmail || !password || !full_name || !surname) {
        return res.status(400).json({ error: 'Full name, surname, email, and password are required.' });
    }
    if (rejectNameDigits(res, full_name, surname)) return;
    if (Array.isArray(children_to_link)) {
        for (const child of children_to_link) {
            if (rejectNameDigits(res, child && child.full_name, child && child.surname)) return;
        }
    }

    const pwError = validatePassword(password);
    if (pwError) return res.status(400).json({ error: pwError });

    if (id_number) {
        const idCheck = validateSAID(id_number);
        if (!idCheck.isValid) {
            return res.status(400).json({ error: idCheck.error });
        }
    }
    role = 'parent';

    if (!parent_type) {
        parent_type = 'Guardian';
    }

    try {
        // Check if user already exists
        const existingUserRes = await db.query(
            'SELECT id, email, id_number, role_id FROM users WHERE LOWER(email) = LOWER($1)',
            [normalizedEmail]
        );

        // Parent validation: Ensure linked children exist before proceeding
        let validatedChildren = [];
        const rawChildren = Array.isArray(children_to_link) ? children_to_link : (learner_number ? [learner_number] : []);
        
        if (rawChildren.length === 0) {
            return res.status(400).json({ error: "Parent registration requires linking at least one enrolled learner using their Name, Surname, ID Number, Grade, and Stream." });
        }

        for (const item of rawChildren) {
            const childObj = typeof item === 'object' ? item : { learner_number: item };
            const learnerNumber = (childObj.learner_number || childObj.learnerNumber || '').toString().trim();
            const childFirstName = (childObj.firstName || childObj.first_name || childObj.name || '').trim();
            const childSurname = (childObj.surname || '').trim();
            const childIdNum = (childObj.idNumber || childObj.id_number || '').toString().replace(/\D/g, '').trim();

            if (!learnerNumber || childIdNum.length !== 13 || !childFirstName || !childSurname) {
                return res.status(400).json({
                    error: 'Each learner must be matched with the official learner number, a 13-digit ID, the first name, and the surname.'
                });
            }

            const cRes = await db.query(
                `SELECT c.id, c.learner_user_id, c.full_name, c.surname, c.grade, c.stream, c.subjects, c.learner_number, c.parent_id,
                        u.id_number as user_id_num, u.email as learner_email
                 FROM children c
                 JOIN users u ON c.learner_user_id = u.id
                 WHERE LOWER(TRIM(c.learner_number)) = LOWER(TRIM($1))
                   AND regexp_replace(COALESCE(u.id_number, ''), '\\D', '', 'g') = $2
                   AND LOWER(TRIM(c.full_name)) = LOWER(TRIM($3))
                   AND LOWER(TRIM(c.surname)) = LOWER(TRIM($4))
                 LIMIT 1`,
                [learnerNumber, childIdNum, childFirstName, childSurname]
            );

            if (cRes.rows.length === 0) {
                return res.status(404).json({
                    error: 'Those four details do not match an enrolled learner. Parent registration does not create a new learner.'
                });
            }

            const found = cRes.rows[0];
            validatedChildren.push({
                ...found,
                learner_number: found.learner_number,
                id_number: childIdNum,
                learner_email: found.learner_email,
                grade: found.grade,
                stream: found.stream
            });
        }

        if (validatedChildren.length === 0) {
            return res.status(400).json({ 
                error: "Could not find or verify any enrolled learner matching your child details (Name, Surname, ID Number, Grade, Stream). Registration cannot proceed." 
            });
        }

        const hash = await bcrypt.hash(password, 10);
        const roleResult = await db.query('SELECT id FROM roles WHERE name = $1', [role]);
        const parentRoleId = roleResult.rows[0]?.id || 4;

        let dobForDb = null;
        if (dob) {
            const parts = dob.split('/');
            if (parts.length === 3) {
                dobForDb = `${parts[2]}-${parts[1]}-${parts[0]}`;
            } else {
                dobForDb = dob;
            }
        }

        await db.query('BEGIN');

        let newUserId;
        if (existingUserRes.rows.length > 0) {
            // Update existing user profile and set password
            newUserId = existingUserRes.rows[0].id;
            await db.query(
                `UPDATE users SET password_hash = $1, full_name = COALESCE($2, full_name), surname = COALESCE($3, surname),
                        id_number = COALESCE($4, id_number), dob = COALESCE($5, dob), gender = COALESCE($6, gender),
                        phone = COALESCE($7, phone), physical_address = COALESCE($8, physical_address), country = COALESCE($9, country),
                        race = COALESCE($10, race), parent_type = COALESCE($11, parent_type)
                 WHERE id = $12`,
                [hash, full_name, surname, id_number, dobForDb, gender, phone, physical_address, country, race, parent_type || null, newUserId]
            );
        } else {
            // Insert new parent user
            const query = `INSERT INTO users (email, password_hash, role_id, full_name, surname, id_number, dob, gender, phone, physical_address, country, race, parent_type, school_id)
                           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING id, email, full_name, surname`;
            const result = await db.query(query, [normalizedEmail, hash, parentRoleId, full_name, surname, id_number, dobForDb, gender, phone, physical_address, country, race, parent_type || null, targetSchoolId]);
            newUserId = result.rows[0].id;
        }

        // Link/create all verified children to the parent
        const finalLinkedChildren = [];
        const learnerRoleRes = await db.query("SELECT id FROM roles WHERE name = 'learner'");
        const learnerRoleId = learnerRoleRes.rows[0]?.id || 3;

        for (const child of validatedChildren) {
            if (child.is_from_application || child.is_new) {
            const childPwHash = await bcrypt.hash(child.generated_password, 10);
                // 1. Create or update user account for child
                let learnerUserId;
                const existingChildUser = await db.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [child.learner_email]);
                if (existingChildUser.rows.length === 0) {
                    const newChildUserRes = await db.query(
                        `INSERT INTO users (email, password_hash, role_id, full_name, surname, id_number, school_id)
                         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
                        [child.learner_email, childPwHash, learnerRoleId, child.full_name, child.surname, child.id_number, targetSchoolId]
                    );
                    learnerUserId = newChildUserRes.rows[0].id;
                } else {
                    learnerUserId = existingChildUser.rows[0].id;
                    await db.query('UPDATE users SET password_hash = $1, school_id = COALESCE(school_id, $2) WHERE id = $3', [childPwHash, targetSchoolId, learnerUserId]);
                }

                let childHomeLang = child.home_language || '';
                if (child.application_number) {
                    const appLangRes = await db.query('SELECT home_language FROM applications WHERE application_number = $1', [child.application_number]);
                    if (appLangRes.rows.length > 0 && appLangRes.rows[0].home_language) {
                        childHomeLang = appLangRes.rows[0].home_language;
                    }
                }
                if (!childHomeLang) {
                    childHomeLang = (targetSchoolId <= 6) ? 'Sepedi' : 'Setswana';
                }
                const officialSubjects = curriculumService.getSubjectsForGradeAndStream(child.grade, child.stream, childHomeLang);

                // 2. Create or update children record
                let childDbId;
                const existingChildInDb = await db.query('SELECT id FROM children WHERE learner_number = $1 OR (full_name ILIKE $2 AND surname ILIKE $3)', [child.learner_number, child.full_name, child.surname]);
                if (existingChildInDb.rows.length === 0) {
                    const newChildRes = await db.query(
                        `INSERT INTO children (learner_user_id, full_name, surname, parent_id, learner_number, grade, stream, subjects, class_id, application_number, home_language, school_id)
                         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id`,
                        [learnerUserId, child.full_name, child.surname, newUserId, child.learner_number, child.grade, child.stream, officialSubjects, child.assigned_class_id || null, child.application_number || null, childHomeLang, targetSchoolId]
                    );
                    childDbId = newChildRes.rows[0].id;
                } else {
                    childDbId = existingChildInDb.rows[0].id;
                    await db.query('UPDATE children SET parent_id = $1, learner_user_id = $2, subjects = $3, grade = $4, stream = $5, home_language = $6, school_id = COALESCE(school_id, $7) WHERE id = $8', [newUserId, learnerUserId, officialSubjects, child.grade, child.stream, childHomeLang, targetSchoolId, childDbId]);
                }

                // 3. Insert into parent_children junction table
                await db.query(
                    `INSERT INTO parent_children (parent_id, child_id, relationship, is_primary)
                     VALUES ($1, $2, $3, TRUE) ON CONFLICT (parent_id, child_id) DO NOTHING`,
                    [newUserId, childDbId, parent_type || 'Parent']
                );

                if (child.application_number) {
                    await db.query(`UPDATE applications SET status = 'enrolled' WHERE application_number = $1`, [child.application_number]);
                }

                finalLinkedChildren.push({ ...child, id: childDbId, subjects: officialSubjects });
            } else {
                // Dual-parent linking: Set primary parent_id if empty, otherwise secondary_parent_id
                const existingChildRes = await db.query('SELECT id, parent_id, secondary_parent_id FROM children WHERE id = $1', [child.id]);
                const existingChild = existingChildRes.rows[0];

                let isPrimary = true;
                if (!existingChild.parent_id) {
                    await db.query('UPDATE children SET parent_id = $1 WHERE id = $2', [newUserId, child.id]);
                } else if (existingChild.parent_id !== newUserId) {
                    await db.query('UPDATE children SET secondary_parent_id = $1 WHERE id = $2', [newUserId, child.id]);
                    isPrimary = false;
                }

                // Insert into parent_children junction table
                await db.query(
                    `INSERT INTO parent_children (parent_id, child_id, relationship, is_primary)
                     VALUES ($1, $2, $3, $4) ON CONFLICT (parent_id, child_id) DO NOTHING`,
                    [newUserId, child.id, parent_type || 'Parent', isPrimary]
                );

                if (child.application_number) {
                    await db.query(`UPDATE applications SET status = 'enrolled' WHERE application_number = $1`, [child.application_number]);
                }

                finalLinkedChildren.push(child);
            }
        }

        await db.query('COMMIT');

        // Dynamically determine baseUrl for email links
        let baseUrl = typeof req.get === 'function' ? req.get('origin') : null;
        if (!baseUrl && typeof req.get === 'function' && req.get('referer')) {
            try {
                const u = new URL(req.get('referer'));
                baseUrl = `${u.protocol}//${u.host}`;
            } catch (e) {}
        }
        if (!baseUrl) {
            const host = (typeof req.get === 'function' && req.get('host')) || `localhost:${process.env.PORT || 4000}`;
            const protocol = req.protocol || 'http';
            baseUrl = `${protocol}://${host}`;
        }

        // Send rich parent confirmation email with Child Learner Number and ID-generated passwords (non-blocking)
        try {
            const tpl = emailService.templates.parentRegistrationSuccessWithLearners(full_name || normalizedEmail, finalLinkedChildren, baseUrl);
            emailService.send(normalizedEmail, tpl.subject, tpl.body).catch(e => console.warn('Registration email dispatch warning:', e.message));
        } catch (e) {
            console.warn('Registration email preparation warning:', e.message);
        }

        // Insert initial in-app welcome notification (Notification Icon)
        try {
            await db.query(`
                INSERT INTO notifications (user_id, title, message, type, target_tab, created_at)
                VALUES ($1, 'Welcome to Fusion High School', 'Your parent account and student linkages have been confirmed. Access academic tracking, timetables, and teacher consultations.', 'announcement', 'overview', NOW())
            `, [newUserId]);

            for (const child of finalLinkedChildren) {
                if (child.learner_user_id) {
                    await db.query(`
                        INSERT INTO notifications (user_id, title, message, type, target_tab, created_at)
                        VALUES ($1, 'Welcome to Fusion High School', 'Your student account is active. Access your daily timetable, AI subject tutor, study guides, and assignments.', 'announcement', 'subjects', NOW())
                    `, [child.learner_user_id]);
                }
            }
        } catch (notifErr) {
            console.warn('Welcome in-app notification insertion warning:', notifErr.message);
        }

        res.json({ 
            message: 'Parent registered successfully. Your linked children credentials have been emailed to you.', 
            user: { id: newUserId, email: normalizedEmail, full_name, surname }, 
            role, 
            linked_children: finalLinkedChildren.map(c => ({
                id: c.id,
                name: `${c.full_name} ${c.surname}`,
                learner_number: c.learner_number,
                grade: c.grade,
                stream: c.stream,
                generated_password: c.generated_password
            }))
        });
    } catch (err) { 
        await db.query('ROLLBACK');
        console.error('Registration error:', err);
        res.status(400).json({ error: err.message }); 
    }
};

exports.login = async (req, res) => {
    const rawIdentifier = (req.body.email || req.body.learnerNumber || req.body.identifier || '').toString().trim();
    const rawPassword = (req.body.password || '').toString();

    if (!rawIdentifier || !rawPassword) {
        return res.status(400).json({ error: 'Please enter your Learner Number / Email and Password.' });
    }

    try {
        // Separate lookup for email vs learner number/ID to prevent accidental regex collision
        let result;
        if (rawIdentifier.includes('@')) {
            result = await db.query(
                `SELECT ${SESSION_SELECT_COLS}
                 ${SESSION_USER_JOINS}
                 WHERE LOWER(u.email::text) = LOWER($1)
                 ORDER BY u.id ASC
                 LIMIT 1`,
                [rawIdentifier]
            );
        } else {
            const cleanId = rawIdentifier.replace(/[^a-zA-Z0-9]/g, '');
            result = await db.query(
                `SELECT ${SESSION_SELECT_COLS}
                 ${SESSION_USER_JOINS}
                 WHERE (c.learner_number IS NOT NULL AND (c.learner_number::text = $1 OR REGEXP_REPLACE(c.learner_number::text, '[^a-zA-Z0-9]', '', 'g') = $2))
                    OR (u.id_number IS NOT NULL AND (TRIM(u.id_number::text) = $1 OR REGEXP_REPLACE(u.id_number::text, '[^0-9]', '', 'g') = $2))
                    OR (u.phone IS NOT NULL AND (TRIM(u.phone::text) = $1 OR REGEXP_REPLACE(u.phone::text, '[^0-9]', '', 'g') = $2))
                 ORDER BY (CASE WHEN (c.learner_number IS NOT NULL AND c.learner_number::text = $1) THEN 0
                                WHEN (u.id_number IS NOT NULL AND TRIM(u.id_number::text) = $1) THEN 1
                                ELSE 2 END), u.id ASC
                 LIMIT 1`,
                [rawIdentifier, cleanId]
            );
        }

        if (result.rows.length === 0) {
            return res.status(401).json({
                error: 'No account uses this email or learner ID. Correct it before entering a password.',
                code: 'account_not_found'
            });
        }

        const user = result.rows[0];
        let isValid = false;

        if (user.password_hash) {
            try {
                isValid = await bcrypt.compare(rawPassword, user.password_hash);
            } catch (e) {}
        }

        if (!isValid) {
            return res.status(401).json({
                error: 'The password is incorrect for this account.',
                code: 'password_incorrect'
            });
        }

        return exports.issueLoginSession(user, res, rawIdentifier);
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Login error: ' + err.message });
    }
};

/**
 * Confirms that a login email or learner ID belongs to an account before a password is accepted.
 */
exports.checkLoginAccount = async (req, res) => {
    const rawIdentifier = (req.body.email || req.body.identifier || req.body.learnerNumber || '').toString().trim();
    if (!rawIdentifier) {
        return res.status(400).json({ exists: false, error: 'Enter your email or learner ID first.' });
    }

    try {
        let result;
        if (rawIdentifier.includes('@')) {
            result = await db.query(
                'SELECT id FROM users WHERE LOWER(email::text) = LOWER($1) LIMIT 1',
                [rawIdentifier]
            );
        } else {
            const cleanId = rawIdentifier.replace(/[^a-zA-Z0-9]/g, '');
            result = await db.query(
                `SELECT u.id
                 FROM users u
                 LEFT JOIN children c ON (c.learner_user_id::text = u.id::text)
                 WHERE (c.learner_number IS NOT NULL AND (c.learner_number::text = $1 OR REGEXP_REPLACE(c.learner_number::text, '[^a-zA-Z0-9]', '', 'g') = $2))
                    OR (u.id_number IS NOT NULL AND (TRIM(u.id_number::text) = $1 OR REGEXP_REPLACE(u.id_number::text, '[^0-9]', '', 'g') = $2))
                    OR (u.phone IS NOT NULL AND (TRIM(u.phone::text) = $1 OR REGEXP_REPLACE(u.phone::text, '[^0-9]', '', 'g') = $2))
                 LIMIT 1`,
                [rawIdentifier, cleanId]
            );
        }

        if (result.rows.length === 0) {
            const label = rawIdentifier.includes('@') ? 'email' : 'learner ID';
            return res.json({
                exists: false,
                error: `No account uses this ${label}. Correct it before entering a password.`
            });
        }
        return res.json({ exists: true });
    } catch (err) {
        console.error('Login account check error:', err);
        return res.status(500).json({ exists: false, error: 'The account check could not be completed. Try again.' });
    }
};

/**
 * Generates password reset OTP code immediately with a strict 2-minute validity window.
 * Supports searching by Email, Learner Number, or South African ID Number.
 * Automatically routes internal learner accounts to their verified parent's email.
 */
exports.forgotPassword = async (req, res) => {
    const { email, identifier } = req.body;
    try {
        const queryInput = (email || identifier || '').toString().trim();
        if (!queryInput) return res.status(400).json({ error: 'Email address, Learner Number, Phone, or ID Number is required.' });
        const cleanInput = queryInput.toLowerCase();
        const numericOnly = queryInput.replace(/\D/g, '');
        let userLookup;
        if (cleanInput.includes('@')) {
            // Strict Email Lookup: Account MUST exist with this exact email in users table
            userLookup = await db.query(`
                SELECT u.id, u.email, u.full_name, u.surname, COALESCE(r.name, u.role_id::text, 'learner') as role_name, 
                       u.id_number::text as id_number, u.phone::text as phone, c.learner_number::text as learner_number,
                       COALESCE(pu.email, pc_u.email) as parent_user_email
                FROM users u
                LEFT JOIN roles r ON (u.role_id::text = r.id::text OR LOWER(r.name) = LOWER(u.role_id::text))
                LEFT JOIN children c ON (c.learner_user_id::text = u.id::text)
                LEFT JOIN users pu ON (c.parent_id::text = pu.id::text)
                LEFT JOIN parent_children pc ON (pc.child_id::text = c.id::text)
                LEFT JOIN users pc_u ON (pc.parent_id::text = pc_u.id::text)
                WHERE LOWER(TRIM(u.email::text)) = $1
                ORDER BY (CASE WHEN LOWER(COALESCE(r.name, u.role_id::text, '')) = 'parent' THEN 1 WHEN LOWER(COALESCE(r.name, u.role_id::text, '')) = 'teacher' THEN 2 WHEN LOWER(COALESCE(r.name, u.role_id::text, '')) = 'admin' THEN 3 ELSE 4 END) ASC
                LIMIT 1
            `, [cleanInput]);

            if (userLookup.rows.length === 0) {
                return res.status(404).json({ 
                    error: 'This account does not exist in the database. Please verify your email address or register a new account.' 
                });
            }
        } else {
            // Non-email identifier lookup: Learner Number, ID Number, or Phone Number
            userLookup = await db.query(`
                SELECT u.id, u.email, u.full_name, u.surname, COALESCE(r.name, u.role_id::text, 'learner') as role_name, 
                       u.id_number::text as id_number, u.phone::text as phone, c.learner_number::text as learner_number,
                       COALESCE(pu.email, pc_u.email) as parent_user_email
                FROM users u
                LEFT JOIN roles r ON (u.role_id::text = r.id::text OR LOWER(r.name) = LOWER(u.role_id::text))
                LEFT JOIN children c ON (c.learner_user_id::text = u.id::text)
                LEFT JOIN users pu ON (c.parent_id::text = pu.id::text)
                LEFT JOIN parent_children pc ON (pc.child_id::text = c.id::text)
                LEFT JOIN users pc_u ON (pc.parent_id::text = pc_u.id::text)
                WHERE (c.learner_number IS NOT NULL AND TRIM(c.learner_number::text) = $1)
                   OR (u.id_number IS NOT NULL AND TRIM(u.id_number::text) = $1)
                   OR ($2 <> '' AND LENGTH($2) >= 6 AND u.id_number IS NOT NULL AND REGEXP_REPLACE(u.id_number::text, '[^0-9]', '', 'g') = $2)
                   OR ($2 <> '' AND LENGTH($2) >= 7 AND u.phone IS NOT NULL AND (TRIM(u.phone::text) = $1 OR REGEXP_REPLACE(u.phone::text, '[^0-9]', '', 'g') = $2))
                   OR EXISTS (
                       SELECT 1 FROM parent_children pc2 
                       JOIN children c2 ON pc2.child_id::text = c2.id::text 
                       WHERE pc2.parent_id::text = u.id::text AND TRIM(c2.learner_number::text) = $1
                   )
                   OR EXISTS (
                       SELECT 1 FROM children c3 
                       WHERE (c3.parent_id::text = u.id::text OR c3.secondary_parent_id::text = u.id::text) AND TRIM(c3.learner_number::text) = $1
                   )
                ORDER BY (CASE WHEN LOWER(COALESCE(r.name, u.role_id::text, '')) = 'parent' THEN 1 WHEN LOWER(COALESCE(r.name, u.role_id::text, '')) = 'teacher' THEN 2 WHEN LOWER(COALESCE(r.name, u.role_id::text, '')) = 'admin' THEN 3 ELSE 4 END) ASC
                LIMIT 1
            `, [queryInput, numericOnly]);

            if (userLookup.rows.length === 0) {
                return res.status(404).json({ 
                    error: `This account does not exist in the database. No user was found matching "${queryInput}". Please check your details or register a new account.` 
                });
            }
        }

        const user = userLookup.rows[0];

        // Resolve real destination email strictly from verified account data in database
        let targetDeliveryEmail = '';
        if (user.email && user.email.includes('@') && !user.email.toLowerCase().endsWith('@fusion.high') && !user.email.toLowerCase().endsWith('@fusionhigh.co.za')) {
            targetDeliveryEmail = user.email.trim();
        } else if (user.parent_user_email && user.parent_user_email.includes('@') && !user.parent_user_email.toLowerCase().endsWith('@fusion.high') && !user.parent_user_email.toLowerCase().endsWith('@fusionhigh.co.za')) {
            targetDeliveryEmail = user.parent_user_email.trim();
        } else if (user.email && user.email.includes('@')) {
            targetDeliveryEmail = user.email.trim();
        }

        if (!targetDeliveryEmail || !targetDeliveryEmail.includes('@')) {
            return res.status(400).json({ 
                error: 'No valid recovery email address is registered on this account in the database. Please contact school administration for password reset assistance.' 
            });
        }

        const otp = crypto.randomInt(0, 10000000000).toString().padStart(10, '0');
        // Set OTP expiry to 5 minutes (300 seconds) so users have sufficient time across all email clients
        await db.query(
            "UPDATE users SET reset_code = $1, reset_expiry = NOW() + INTERVAL '5 minutes' WHERE id = $2",
            [otp, user.id]
        );

        // A forgotten password is delivered by email only.
        // It must not create an announcement or a bell notice.

        // Keep the reset record in Firestore without delaying the inbox send.
        if (firestore) {
            const resetRecord = {
                user_id: user.id,
                email: user.email,
                target_email: targetDeliveryEmail,
                created_at: new Date(),
                expires_at: new Date(Date.now() + 5 * 60 * 1000)
            };
            setImmediate(() => {
                firestore.collection('password_resets').doc(String(user.id)).set(resetRecord).catch((fbErr) => {
                    console.warn('[FIREBASE OTP SYNC NOTICE]:', fbErr.message);
                });
            });
        }

        // Dynamically determine baseUrl safely
        let baseUrl = process.env.APP_URL ? process.env.APP_URL.replace(/\/$/, '') : null;
        if (!baseUrl && typeof req.get === 'function') {
            baseUrl = req.get('origin');
            if (!baseUrl && req.get('referer')) {
                try {
                    const u = new URL(req.get('referer'));
                    baseUrl = `${u.protocol}//${u.host}`;
                } catch (e) {}
            }
            if (!baseUrl) {
                const proto = req.get('x-forwarded-proto') || req.protocol || 'http';
                const host = req.get('x-forwarded-host') || req.get('host') || 'localhost:4000';
                baseUrl = `${proto}://${host}`;
            }
        }
        if (!baseUrl) {
            baseUrl = 'https://fusion-high-app.web.app';
        }

        const tpl = emailService.templates.forgotPassword(otp, targetDeliveryEmail, baseUrl);
        
        // Create a helpful masked email (e.g. ts***@gmail.com)
        const parts = targetDeliveryEmail.split('@');
        const masked = parts[0].length > 2 
            ? `${parts[0].slice(0, 2)}***@${parts[1]}` 
            : `${parts[0].slice(0, 1)}***@${parts[1]}`;

        console.log(`[AUTH] Dispatching secure recovery code to destination email: ${masked} for user ID ${user.id}`);
        let sendResult;
        try {
            sendResult = await emailService.send(targetDeliveryEmail, tpl.subject, tpl.body, null, tpl.text);
        } catch (mailErr) {
            console.error('[AUTH FORGOT PW EMAIL ERROR]:', mailErr.message);
            sendResult = { success: false, error: mailErr.message };
        }
        if (!sendResult?.success || sendResult.skipped) {
            console.warn(`[AUTH FORGOT PW NOTICE] Recovery email was not delivered.`);
            return res.status(503).json({
                error: sendResult?.reason || sendResult?.error || 'The verification code could not be emailed. Try again in a moment.'
            });
        }
        console.log(`[AUTH FORGOT PW SUCCESS] Recovery code delivered to destination email.`);

        res.status(200).json({ 
            message: `A 10-digit reset code has been sent to your registered email (${masked}). Please check your Inbox and Spam/Junk folder (valid for 5 minutes).`,
            email: user.email,
            channel: 'email',
            delivery_email: masked,
            expires_in: 300
        });
    } catch (err) { 
        console.error('[AUTH FORGOT PW ERROR]:', err);
        res.status(500).json({ error: err.message }); 
    }
};

exports.verifyOTP = async (req, res) => {
    const { email, identifier, code, otp } = req.body;
    try {
        const queryInput = (email || identifier || '').toString().trim();
        const rawCode = (code || otp || '').toString().trim();
        if (!queryInput || !rawCode) return res.status(400).json({ error: 'Email/Identifier and OTP code are required.' });
        const cleanInput = queryInput.toLowerCase();
        const numericOnly = queryInput.replace(/\D/g, '');

        let result;
        if (cleanInput.includes('@')) {
            result = await db.query(`
                SELECT u.id, u.email, u.reset_code, u.reset_expiry, COALESCE(r.name, u.role_id::text, 'learner') as role_name
                FROM users u
                LEFT JOIN roles r ON (u.role_id::text = r.id::text OR LOWER(r.name) = LOWER(u.role_id::text))
                WHERE LOWER(TRIM(u.email::text)) = $1
                  AND u.reset_code::text = $2::text
                LIMIT 1
            `, [cleanInput, rawCode]);
        } else {
            result = await db.query(`
                SELECT u.id, u.email, u.reset_code, u.reset_expiry, COALESCE(r.name, u.role_id::text, 'learner') as role_name
                FROM users u
                LEFT JOIN roles r ON (u.role_id::text = r.id::text OR LOWER(r.name) = LOWER(u.role_id::text))
                LEFT JOIN children c ON (c.learner_user_id::text = u.id::text)
                WHERE ((c.learner_number IS NOT NULL AND TRIM(c.learner_number::text) = $1)
                   OR (u.id_number IS NOT NULL AND TRIM(u.id_number::text) = $1)
                   OR ($2 <> '' AND LENGTH($2) >= 6 AND u.id_number IS NOT NULL AND REGEXP_REPLACE(u.id_number::text, '[^0-9]', '', 'g') = $2)
                   OR ($2 <> '' AND LENGTH($2) >= 7 AND u.phone IS NOT NULL AND (TRIM(u.phone::text) = $1 OR REGEXP_REPLACE(u.phone::text, '[^0-9]', '', 'g') = $2))
                   OR EXISTS (
                       SELECT 1 FROM parent_children pc2 
                       JOIN children c2 ON pc2.child_id::text = c2.id::text 
                       WHERE pc2.parent_id::text = u.id::text AND TRIM(c2.learner_number::text) = $1
                   )
                   OR EXISTS (
                       SELECT 1 FROM children c3 
                       WHERE (c3.parent_id::text = u.id::text OR c3.secondary_parent_id::text = u.id::text) AND TRIM(c3.learner_number::text) = $1
                   ))
                  AND u.reset_code::text = $3::text
                ORDER BY u.id DESC
                LIMIT 1
            `, [queryInput, numericOnly, rawCode]);
        }

        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'Invalid reset code or identifier. Please check and try again.' });
        }

        const user = result.rows[0];
        const now = new Date();
        if (user.reset_expiry && new Date(user.reset_expiry) < now) {
            return res.status(400).json({ error: 'OTP code has expired (5-minute limit). Please click Resend Code to receive a new OTP.' });
        }
        
        // Once verified, extend reset_expiry so user has sufficient time (15 mins) to enter new password
        await db.query("UPDATE users SET reset_expiry = NOW() + INTERVAL '15 minutes' WHERE id::text = $1::text", [user.id]);
        res.json({ message: 'Code verified successfully. You can now set your new password.', email: user.email });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

const PASSWORD_ALREADY_USED_ERROR = "the password already exists and has been used before, put a new password";

/**
 * Checks if a candidate password matches the user's current password or any previously stored password in database history.
 */
async function checkPasswordHistoryMatch(userId, candidatePassword, currentPasswordHash, previousPasswordsArray) {
    if (!candidatePassword) return false;

    // 1. Check current password_hash
    if (currentPasswordHash) {
        try {
            const isMatch = currentPasswordHash.startsWith('$2')
                ? await bcrypt.compare(candidatePassword, currentPasswordHash)
                : (candidatePassword === currentPasswordHash);
            if (isMatch) return true;
        } catch (e) {}
    }

    // 2. Check previous_passwords array on users record
    if (previousPasswordsArray && Array.isArray(previousPasswordsArray)) {
        for (const prevHash of previousPasswordsArray) {
            if (prevHash) {
                try {
                    const isMatch = prevHash.startsWith('$2')
                        ? await bcrypt.compare(candidatePassword, prevHash)
                        : (candidatePassword === prevHash);
                    if (isMatch) return true;
                } catch (e) {}
            }
        }
    }

    // 3. Check user_password_history table specifically for this user
    if (userId) {
        try {
            const historyRes = await db.query(
                'SELECT password_hash FROM user_password_history WHERE user_id = $1',
                [userId]
            );
            for (const row of historyRes.rows) {
                const pHash = row.password_hash;
                if (pHash) {
                    try {
                        const isMatch = pHash.startsWith('$2')
                            ? await bcrypt.compare(candidatePassword, pHash)
                            : (candidatePassword === pHash);
                        if (isMatch) return true;
                    } catch (e) {}
                }
            }
        } catch (e) {
            console.warn('user_password_history lookup warning:', e.message);
        }
    }

    return false;
}

/**
 * Records a new password into the database history for this specific user.
 */
async function recordNewPassword(userId, newPasswordHash, oldPasswordHash) {
    await db.query(`
        UPDATE users 
        SET password_hash = $1, 
            previous_passwords = array_append(COALESCE(previous_passwords, '{}'), $2),
            reset_code = NULL, 
            reset_expiry = NULL 
        WHERE id = $3
    `, [newPasswordHash, oldPasswordHash || newPasswordHash, userId]);

    try {
        if (oldPasswordHash) {
            await db.query(`
                INSERT INTO user_password_history (user_id, password_hash)
                VALUES ($1, $2)
            `, [userId, oldPasswordHash]);
        }
        await db.query(`
            INSERT INTO user_password_history (user_id, password_hash)
            VALUES ($1, $2)
        `, [userId, newPasswordHash]);
    } catch (e) {
        // Ignored if table duplicate or transient
    }
}

exports.resetPassword = async (req, res) => {
    const { email, identifier, code, otp, new_password, newPassword } = req.body;
    try {
        const queryInput = (email || identifier || '').toString().trim();
        const rawCode = (code || otp || '').toString().trim();
        const targetPassword = new_password || newPassword || '';

        if (!queryInput || !rawCode || !targetPassword) {
            return res.status(400).json({ error: 'Email/Identifier, OTP code, and new password are required.' });
        }
        const cleanInput = queryInput.toLowerCase();
        const numericOnly = queryInput.replace(/\D/g, '');

        let userRes;
        if (cleanInput.includes('@')) {
            userRes = await db.query(`
                SELECT u.id, u.email, u.password_hash, u.previous_passwords, u.reset_expiry, COALESCE(r.name, u.role_id::text, 'learner') as role_name
                FROM users u
                LEFT JOIN roles r ON (u.role_id::text = r.id::text OR LOWER(r.name) = LOWER(u.role_id::text))
                WHERE LOWER(TRIM(u.email::text)) = $1
                  AND u.reset_code::text = $2::text
                LIMIT 1
            `, [cleanInput, rawCode]);
        } else {
            userRes = await db.query(`
                SELECT u.id, u.email, u.password_hash, u.previous_passwords, u.reset_expiry, COALESCE(r.name, u.role_id::text, 'learner') as role_name
                FROM users u
                LEFT JOIN roles r ON (u.role_id::text = r.id::text OR LOWER(r.name) = LOWER(u.role_id::text))
                LEFT JOIN children c ON (c.learner_user_id::text = u.id::text)
                WHERE ((c.learner_number IS NOT NULL AND TRIM(c.learner_number::text) = $1)
                   OR (u.id_number IS NOT NULL AND TRIM(u.id_number::text) = $1)
                   OR ($2 <> '' AND LENGTH($2) >= 6 AND u.id_number IS NOT NULL AND REGEXP_REPLACE(u.id_number::text, '[^0-9]', '', 'g') = $2)
                   OR ($2 <> '' AND LENGTH($2) >= 7 AND u.phone IS NOT NULL AND (TRIM(u.phone::text) = $1 OR REGEXP_REPLACE(u.phone::text, '[^0-9]', '', 'g') = $2))
                   OR EXISTS (
                       SELECT 1 FROM parent_children pc2 
                       JOIN children c2 ON pc2.child_id::text = c2.id::text 
                       WHERE pc2.parent_id::text = u.id::text AND TRIM(c2.learner_number::text) = $1
                   )
                   OR EXISTS (
                       SELECT 1 FROM children c3 
                       WHERE (c3.parent_id::text = u.id::text OR c3.secondary_parent_id::text = u.id::text) AND TRIM(c3.learner_number::text) = $1
                   ))
                  AND u.reset_code::text = $3::text
                ORDER BY u.id DESC
                LIMIT 1
            `, [queryInput, numericOnly, rawCode]);
        }

        if (userRes.rows.length === 0) {
            return res.status(400).json({ error: 'Invalid or expired OTP code. Please request a new code.' });
        }

        const user = userRes.rows[0];
        const now = new Date();
        if (user.reset_expiry && new Date(user.reset_expiry) < now) {
            return res.status(400).json({ error: 'Reset session has expired. Please request a new code.' });
        }

        // 1. Password Complexity & Format Validation
        const pwError = validatePassword(targetPassword);
        if (pwError) return res.status(400).json({ error: pwError });

        // 2. Exact Match Detection against current and previous passwords in database
        const isAlreadyUsed = await checkPasswordHistoryMatch(
            user.id,
            targetPassword,
            user.password_hash,
            user.previous_passwords
        );
        if (isAlreadyUsed) {
            return res.status(400).json({
                error: PASSWORD_ALREADY_USED_ERROR
            });
        }

        // 3. Save new password and record old hash into previous_passwords & user_password_history
        const hash = await bcrypt.hash(targetPassword, 10);
        const normalizedEmail = (user.email || '').toLowerCase().trim();
        await recordNewPassword(user.id, hash, user.password_hash);

        if (normalizedEmail && !normalizedEmail.endsWith('@fusion.high')) {
            emailService.send(normalizedEmail, emailService.templates.passwordResetSuccess().subject, emailService.templates.passwordResetSuccess().body).catch(() => {});
        }
        res.json({ message: 'Password updated successfully! Your old password has been replaced with your new one.' });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.changePassword = async (req, res) => {
    const current_password = (req.body.current_password || req.body.currentPassword || '').toString().trim();
    const new_password = (req.body.new_password || req.body.newPassword || '').toString().trim();
    const confirm_password = (req.body.confirm_password || req.body.confirmPassword || req.body.confirmationPassword || req.body.newPasswordConfirmation || '').toString().trim();
    const userId = req.user.id;

    if (!current_password) {
        return res.status(400).json({ error: 'Current password is required.' });
    }
    if (!new_password) {
        return res.status(400).json({ error: 'New password is required.' });
    }
    if (!confirm_password) {
        return res.status(400).json({ error: 'Confirmation password is required.' });
    }
    if (new_password !== confirm_password) {
        return res.status(400).json({ error: 'New password and confirmation password do not match.' });
    }

    const pwError = validatePassword(new_password);
    if (pwError) return res.status(400).json({ error: pwError });

    try {
        const userRes = await db.query('SELECT password_hash, previous_passwords FROM users WHERE id = $1', [userId]);
        if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found.' });

        const user = userRes.rows[0];
        const valid = await bcrypt.compare(current_password, user.password_hash);
        if (!valid) return res.status(400).json({ error: 'Current password is incorrect.' });

        // Compare with current password and all previously used passwords in database
        const isAlreadyUsed = await checkPasswordHistoryMatch(
            userId,
            new_password,
            user.password_hash,
            user.previous_passwords
        );
        if (isAlreadyUsed) {
            return res.status(400).json({
                error: PASSWORD_ALREADY_USED_ERROR
            });
        }

        const hash = await bcrypt.hash(new_password, 10);
        await recordNewPassword(userId, hash, user.password_hash);

        res.json({ message: 'Password updated successfully.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.validatePassword = validatePassword;
exports.register = exports.registerUser;