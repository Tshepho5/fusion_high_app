const db = require('../../../db/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const emailService = require('../services/emailService');
const { validateSAID } = require('./saIDvalidations');
const curriculumService = require('../services/curriculumService');

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
    const grade = req.body.grade || req.query.grade;
    const stream = (req.body.stream || req.query.stream || '').toString().trim();
    const learnerNumber = (req.body.learner_number || req.body.learnerNumber || req.query.learner_number || '').toString().trim();

    if (!learnerNumber && (!firstName || !surname) && !idNumber) {
        return res.status(400).json({ error: 'Please provide Child Name, Surname, ID Number, Grade, and Stream to verify.' });
    }

    try {
        let query = `
            SELECT c.id, c.full_name, c.surname, c.learner_number, c.grade, c.stream, c.subjects, c.parent_id,
                   u.id_number, u.email as learner_email, cl.name as class_name
            FROM children c
            LEFT JOIN users u ON c.learner_user_id = u.id
            LEFT JOIN classes cl ON c.class_id = cl.id
            WHERE 1=1
        `;
        const params = [];

        if (idNumber && idNumber.length >= 6) {
            params.push(idNumber);
            query += ` AND (u.id_number = $${params.length})`;
        } else if (learnerNumber) {
            params.push(learnerNumber);
            query += ` AND (c.learner_number = $${params.length} OR c.id::text = $${params.length})`;
        } else if (firstName && surname) {
            params.push(`%${firstName}%`);
            params.push(`%${surname}%`);
            query += ` AND c.full_name ILIKE $${params.length - 1} AND c.surname ILIKE $${params.length}`;
        }

        if (grade) {
            params.push(parseInt(grade, 10));
            query += ` AND c.grade = $${params.length}`;
        }

        query += ` LIMIT 1`;

        const { rows } = await db.query(query, params);
        if (rows.length === 0) {
            // Check applications table for approved admissions
            let appQuery = `
                SELECT a.id, a.first_name, a.surname, a.provisional_learner_number, a.application_number,
                       a.grade_applied, a.stream, a.id_number, a.selected_subjects, a.assigned_class_id,
                       c.name as class_name
                FROM applications a
                LEFT JOIN classes c ON a.assigned_class_id = c.id
                WHERE a.status IN ('approved', 'enrolled')
            `;
            const appParams = [];

            if (learnerNumber) {
                appParams.push(learnerNumber);
                appQuery += ` AND (a.provisional_learner_number = $${appParams.length} OR a.application_number = $${appParams.length})`;
            } else if (idNumber && idNumber.length >= 6) {
                appParams.push(idNumber);
                appQuery += ` AND (a.id_number = $${appParams.length})`;
            } else if (firstName && surname) {
                appParams.push(`%${firstName}%`);
                appParams.push(`%${surname}%`);
                appQuery += ` AND a.first_name ILIKE $${appParams.length - 1} AND a.surname ILIKE $${appParams.length}`;
            }

            const appRes = await db.query(appQuery + ` LIMIT 1`, appParams);
            if (appRes.rows.length > 0) {
                const appRow = appRes.rows[0];
                return res.json({
                    verified: true,
                    is_from_application: true,
                    learner: {
                        id: appRow.id,
                        full_name: appRow.first_name,
                        surname: appRow.surname,
                        id_number: appRow.id_number,
                        learner_number: appRow.provisional_learner_number || appRow.application_number,
                        application_number: appRow.application_number,
                        grade: appRow.grade_applied,
                        stream: appRow.stream || stream || 'General',
                        class_name: appRow.class_name || `Grade ${appRow.grade_applied}A`,
                        subjects: appRow.selected_subjects && appRow.selected_subjects.length > 0 
                            ? appRow.selected_subjects 
                            : ['English FAL', 'Mathematics', 'Life Orientation'],
                        already_linked: false
                    }
                });
            }

            // Fallback: Check relaxed match by name + surname in children table
            if (firstName && surname) {
                const fallbackRes = await db.query(
                    `SELECT c.id, c.full_name, c.surname, c.learner_number, c.grade, c.stream, c.subjects, c.parent_id, c.secondary_parent_id, cl.name as class_name 
                     FROM children c 
                     LEFT JOIN classes cl ON c.class_id = cl.id 
                     WHERE c.full_name ILIKE $1 AND c.surname ILIKE $2 LIMIT 1`,
                    [`%${firstName}%`, `%${firstName}%`]
                );
                if (fallbackRes.rows.length > 0) {
                    const lrn = fallbackRes.rows[0];
                    return res.json({
                        verified: true,
                        learner: {
                            id: lrn.id,
                            full_name: lrn.full_name,
                            surname: lrn.surname,
                            id_number: idNumber || null,
                            learner_number: lrn.learner_number || `ID-${lrn.id}`,
                            grade: lrn.grade,
                            stream: lrn.stream || stream || 'General',
                            class_name: lrn.class_name || `Grade ${lrn.grade}A`,
                            subjects: lrn.subjects || ['Mathematics', 'Physical Sciences', 'Life Sciences', 'English FAL'],
                            already_linked: !!lrn.parent_id && !!lrn.secondary_parent_id
                        }
                    });
                }
            }

            return res.status(404).json({ error: 'No enrolled or approved learner found matching these details. Please verify the Name, Surname, ID Number, or Application Reference.' });
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
                already_linked: !!learner.parent_id && !learner.secondary_parent_id ? false : (!!learner.parent_id && !!learner.secondary_parent_id)
            }
        });
    } catch (err) {
        console.error('Error verifying learner details:', err);
        res.status(500).json({ error: 'Database verification failed.' });
    }
};

async function generateOfficialLearnerNumber() {
    const res = await db.query(
        "SELECT MAX(CAST(REGEXP_REPLACE(learner_number, '[^0-9]', '', 'g') AS BIGINT)) as max_num FROM children WHERE learner_number ~ '^[0-9]+$'"
    );
    let nextNum = (res.rows[0]?.max_num) ? parseInt(res.rows[0].max_num, 10) + 1 : 20260001;
    if (nextNum < 20260001) nextNum = 20260001;
    return nextNum.toString();
}
exports.generateOfficialLearnerNumber = generateOfficialLearnerNumber;

/**
 * Registers parent user and links their child / children seamlessly.
 */
exports.registerUser = async (req, res) => {
    let { 
        email, password, full_name, surname, role, id_number, dob, gender, phone, physical_address, country, race, parent_type, 
        learner_number, children_to_link 
    } = req.body;
    
    const normalizedEmail = (email || '').toString().toLowerCase().trim();
    if (!normalizedEmail || !password || !full_name || !surname) {
        return res.status(400).json({ error: 'Full name, surname, email, and password are required.' });
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
            let childObj = typeof item === 'object' ? item : { learner_number: item };
            const childIdOrNum = childObj.id || childObj.learner_number || childObj.learnerNumber;
            const childFirstName = (childObj.firstName || childObj.first_name || childObj.name || '').trim();
            const childSurname = (childObj.surname || '').trim();
            const childIdNum = (childObj.idNumber || childObj.id_number || '').toString().replace(/\D/g, '').trim();
            const childGrade = childObj.grade ? parseInt(childObj.grade, 10) : null;
            const childStream = childObj.stream || 'General';

            let cRes = { rows: [] };

            if (childIdOrNum) {
                cRes = await db.query(
                    `SELECT c.id, c.learner_user_id, c.full_name, c.surname, c.grade, c.stream, c.subjects, c.learner_number, c.parent_id,
                            u.id_number as user_id_num, u.email as learner_email 
                     FROM children c 
                     LEFT JOIN users u ON c.learner_user_id = u.id
                     WHERE c.learner_number = $1 OR c.id::text = $1`,
                    [childIdOrNum.toString().trim()]
                );
            }

            if (cRes.rows.length === 0 && childFirstName && childSurname) {
                cRes = await db.query(
                    `SELECT c.id, c.learner_user_id, c.full_name, c.surname, c.grade, c.stream, c.subjects, c.learner_number, c.parent_id,
                            u.id_number as user_id_num, u.email as learner_email 
                     FROM children c 
                     LEFT JOIN users u ON c.learner_user_id = u.id
                     WHERE c.full_name ILIKE $1 AND c.surname ILIKE $2`,
                    [`%${childFirstName}%`, `%${childSurname}%`]
                );
            }

            // If found in children table
            if (cRes.rows.length > 0) {
                const found = cRes.rows[0];
                const cleanId = found.user_id_num || childIdNum || '202601';
                const generatedPassword = `FH@${cleanId.slice(0, 6)}`;
                const learnerEmail = found.learner_email || `${(found.learner_number || 'learner').toLowerCase().replace(/[\s-]/g, '')}@fusion.high`;

                validatedChildren.push({
                    ...found,
                    id_number: cleanId,
                    learner_email: learnerEmail,
                    generated_password: generatedPassword,
                    grade: found.grade || childGrade || 10,
                    stream: found.stream || childStream
                });
            } else {
                // Check in applications table for approved applicant
                const appChildRes = await db.query(
                    `SELECT a.id, a.first_name, a.surname, a.provisional_learner_number, a.application_number,
                            a.grade_applied, a.stream, a.id_number, a.selected_subjects, a.assigned_class_id,
                            c.name as class_name
                     FROM applications a
                     LEFT JOIN classes c ON a.assigned_class_id = c.id
                     WHERE (a.provisional_learner_number = $1 OR a.application_number = $1 OR a.id_number = $2 OR (a.first_name ILIKE $3 AND a.surname ILIKE $4))
                       AND a.status IN ('approved', 'enrolled')
                     ORDER BY a.id DESC LIMIT 1`,
                    [childIdOrNum ? childIdOrNum.toString().trim() : '', childIdNum || '', `%${childFirstName}%`, `%${childSurname}%`]
                );

                if (appChildRes.rows.length > 0) {
                    const appChild = appChildRes.rows[0];
                    // Generate official unique learner number upon registration if not already issued
                    let lrnNumber = appChild.provisional_learner_number;
                    if (!lrnNumber || lrnNumber.startsWith('FHS-') || lrnNumber.includes('-')) {
                        lrnNumber = await generateOfficialLearnerNumber();
                    }
                    const cleanId = (appChild.id_number || childIdNum || '202601').toString().replace(/\D/g, '');
                    const generatedPassword = `FH@${cleanId.slice(0, 6)}`;
                    const learnerEmail = `${lrnNumber.toLowerCase().replace(/[\s-]/g, '')}@fusion.high`;

                    validatedChildren.push({
                        is_from_application: true,
                        application_id: appChild.id,
                        application_number: appChild.application_number,
                        full_name: appChild.first_name || childFirstName,
                        surname: appChild.surname || childSurname,
                        id_number: cleanId,
                        learner_number: lrnNumber,
                        learner_email: learnerEmail,
                        generated_password: generatedPassword,
                        grade: appChild.grade_applied || childGrade || 8,
                        stream: appChild.stream || childStream || 'General',
                        assigned_class_id: appChild.assigned_class_id,
                        subjects: appChild.selected_subjects || ['English FAL', 'Mathematics', 'Life Orientation']
                    });
                } else if (childFirstName && childSurname) {
                    // Dynamically register new learner record with official sequential number
                    const assignedNum = await generateOfficialLearnerNumber();
                    const cleanId = childIdNum || '202601';
                    const generatedPassword = `FH@${cleanId.slice(0, 6)}`;
                    const learnerEmail = `${assignedNum.toLowerCase().replace(/[\s-]/g, '')}@fusion.high`;

                    validatedChildren.push({
                        is_new: true,
                        full_name: childFirstName,
                        surname: childSurname,
                        id_number: cleanId,
                        learner_number: assignedNum,
                        learner_email: learnerEmail,
                        generated_password: generatedPassword,
                        grade: childGrade || 10,
                        stream: childStream,
                        subjects: ['Mathematics', 'Physical Sciences', 'Life Sciences', 'English FAL']
                    });
                }
            }
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
            const query = `INSERT INTO users (email, password_hash, role_id, full_name, surname, id_number, dob, gender, phone, physical_address, country, race, parent_type)
                           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING id, email, full_name, surname`;
            const result = await db.query(query, [normalizedEmail, hash, parentRoleId, full_name, surname, id_number, dobForDb, gender, phone, physical_address, country, race, parent_type || null]);
            newUserId = result.rows[0].id;
        }

        // Link/create all verified children to the parent
        const finalLinkedChildren = [];
        const learnerRoleRes = await db.query("SELECT id FROM roles WHERE name = 'learner'");
        const learnerRoleId = learnerRoleRes.rows[0]?.id || 3;

        for (const child of validatedChildren) {
            const childPwHash = await bcrypt.hash(child.generated_password, 10);

            if (child.is_from_application || child.is_new) {
                // 1. Create or update user account for child
                let learnerUserId;
                const existingChildUser = await db.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [child.learner_email]);
                if (existingChildUser.rows.length === 0) {
                    const newChildUserRes = await db.query(
                        `INSERT INTO users (email, password_hash, role_id, full_name, surname, id_number)
                         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
                        [child.learner_email, childPwHash, learnerRoleId, child.full_name, child.surname, child.id_number]
                    );
                    learnerUserId = newChildUserRes.rows[0].id;
                } else {
                    learnerUserId = existingChildUser.rows[0].id;
                    await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [childPwHash, learnerUserId]);
                }

                let childHomeLang = child.home_language || 'isiZulu';
                if (child.application_number) {
                    const appLangRes = await db.query('SELECT home_language FROM applications WHERE application_number = $1', [child.application_number]);
                    if (appLangRes.rows.length > 0 && appLangRes.rows[0].home_language) {
                        childHomeLang = appLangRes.rows[0].home_language;
                    }
                }
                const officialSubjects = curriculumService.getSubjectsForGradeAndStream(child.grade, child.stream, childHomeLang);

                // 2. Create or update children record
                let childDbId;
                const existingChildInDb = await db.query('SELECT id FROM children WHERE learner_number = $1 OR (full_name ILIKE $2 AND surname ILIKE $3)', [child.learner_number, child.full_name, child.surname]);
                if (existingChildInDb.rows.length === 0) {
                    const newChildRes = await db.query(
                        `INSERT INTO children (learner_user_id, full_name, surname, parent_id, learner_number, grade, stream, subjects, class_id, application_number, home_language)
                         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
                        [learnerUserId, child.full_name, child.surname, newUserId, child.learner_number, child.grade, child.stream, officialSubjects, child.assigned_class_id || null, child.application_number || null, childHomeLang]
                    );
                    childDbId = newChildRes.rows[0].id;
                } else {
                    childDbId = existingChildInDb.rows[0].id;
                    await db.query('UPDATE children SET parent_id = $1, learner_user_id = $2, subjects = $3, grade = $4, stream = $5, home_language = $6 WHERE id = $7', [newUserId, learnerUserId, officialSubjects, child.grade, child.stream, childHomeLang, childDbId]);
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
                
                if (child.learner_user_id) {
                    await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [childPwHash, child.learner_user_id]);
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

        // Send rich parent confirmation email with Child Learner Number and ID-generated passwords
        try {
            const tpl = emailService.templates.parentRegistrationSuccessWithLearners(full_name || normalizedEmail, finalLinkedChildren, baseUrl);
            await emailService.send(normalizedEmail, tpl.subject, tpl.body);
        } catch (e) {
            console.warn('Registration email dispatch warning:', e.message);
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
        // Query users table with support for email, learner_number, SA ID number, and fusion.high username
        let result = await db.query(
            `SELECT u.id, u.email, u.password_hash, u.id_number, u.full_name, u.surname, r.name as role_name,
                    c.id as child_id, c.learner_number, c.grade, c.stream
             FROM users u
             JOIN roles r ON u.role_id = r.id
             LEFT JOIN children c ON c.learner_user_id = u.id
             WHERE LOWER(u.email) = LOWER($1)
                OR c.learner_number = $1
                OR (u.id_number IS NOT NULL AND TRIM(u.id_number) = $1)
                OR (u.id_number IS NOT NULL AND REGEXP_REPLACE(u.id_number, '[^0-9]', '', 'g') = REGEXP_REPLACE($1, '[^0-9]', '', 'g'))
                OR (LOWER(u.email) = LOWER($1 || '@fusion.high'))
                OR (c.id::text = $1)
             ORDER BY u.id ASC
             LIMIT 1`,
            [rawIdentifier]
        );

        // Fallback: If learner exists in children table without linked learner_user_id
        if (result.rows.length === 0) {
            const childRes = await db.query(
                `SELECT c.* FROM children c WHERE c.learner_number = $1 OR c.id::text = $1 LIMIT 1`,
                [rawIdentifier]
            );

            if (childRes.rows.length > 0) {
                const child = childRes.rows[0];
                // Check if user exists by email pattern or name
                const userEmail = `${child.learner_number}@fusion.high`;
                let userCheck = await db.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [userEmail]);

                if (userCheck.rows.length === 0) {
                    // Create auth record for this enrolled learner with default password from ID/dob
                    const defaultPw = child.learner_number;
                    const hashedPw = await bcrypt.hash(defaultPw, 10);
                    const roleRes = await db.query("SELECT id FROM roles WHERE name = 'learner' LIMIT 1");
                    const roleId = roleRes.rows[0]?.id || 1;

                    const newUserRes = await db.query(
                        `INSERT INTO users (email, password_hash, role_id, full_name, surname, country, race)
                         VALUES ($1, $2, $3, $4, $5, 'South Africa', 'Black') RETURNING *`,
                        [userEmail, hashedPw, roleId, child.full_name, child.surname]
                    );
                    const newUser = newUserRes.rows[0];
                    await db.query('UPDATE children SET learner_user_id = $1 WHERE id = $2', [newUser.id, child.id]);

                    result = {
                        rows: [{
                            id: newUser.id,
                            email: newUser.email,
                            password_hash: newUser.password_hash,
                            id_number: null,
                            full_name: newUser.full_name,
                            surname: newUser.surname,
                            role_name: 'learner',
                            child_id: child.id,
                            learner_number: child.learner_number,
                            grade: child.grade,
                            stream: child.stream
                        }]
                    };
                } else {
                    await db.query('UPDATE children SET learner_user_id = $1 WHERE id = $2', [userCheck.rows[0].id, child.id]);
                    result = await db.query(
                        `SELECT u.id, u.email, u.password_hash, u.id_number, u.full_name, u.surname, r.name as role_name,
                                c.id as child_id, c.learner_number, c.grade, c.stream
                         FROM users u
                         JOIN roles r ON u.role_id = r.id
                         LEFT JOIN children c ON c.learner_user_id = u.id
                         WHERE u.id = $1`,
                        [userCheck.rows[0].id]
                    );
                }
            }
        }

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials. No account found matching this Learner Number or Email.' });
        }

        const user = result.rows[0];
        let isValid = false;

        // 1. Check bcrypt hash
        if (user.password_hash) {
            try {
                isValid = await bcrypt.compare(rawPassword, user.password_hash);
            } catch (e) {}
        }

        // 2. Check plaintext ID number match for learners
        if (!isValid && (user.role_name === 'learner' || user.id_number)) {
            const cleanInputPw = rawPassword.replace(/\D/g, '');
            const cleanIdNum = (user.id_number || '').replace(/\D/g, '');
            const trimmedInput = rawPassword.trim();
            const trimmedId = (user.id_number || '').trim();

            if (
                (cleanIdNum.length >= 6 && cleanInputPw === cleanIdNum) ||
                (trimmedId && trimmedInput === trimmedId) ||
                (user.password_hash && trimmedInput === user.password_hash) ||
                (user.learner_number && trimmedInput === user.learner_number)
            ) {
                isValid = true;
                // Rehash and update in DB so standard bcrypt authentication works for future logins
                try {
                    const newHash = await bcrypt.hash(rawPassword, 10);
                    await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, user.id]);
                } catch (e) {}
            }
        }

        if (!isValid) {
            return res.status(401).json({ error: 'Invalid password. Please check your credentials.' });
        }

        const token = jwt.sign(
            { id: user.id, role: user.role_name, email: user.email, full_name: user.full_name },
            process.env.JWT_SECRET || 'fusion_high_secret_jwt_key',
            { expiresIn: '7d' }
        );

        res.json({
            token,
            role: user.role_name,
            user: {
                id: user.id,
                email: user.email,
                full_name: `${user.full_name || ''} ${user.surname || ''}`.trim(),
                role: user.role_name,
                learner_number: user.learner_number || (user.role_name === 'learner' ? rawIdentifier : undefined),
                grade: user.grade,
                stream: user.stream
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Login error: ' + err.message });
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
        if (!queryInput) return res.status(400).json({ error: 'Email address, Learner Number, or ID Number is required.' });

        const userLookup = await db.query(`
            SELECT u.id, u.email, u.full_name, u.surname, r.name as role_name, u.id_number, c.learner_number,
                   pu.email as parent_user_email
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            LEFT JOIN children c ON c.learner_user_id = u.id
            LEFT JOIN users pu ON c.parent_id = pu.id
            WHERE LOWER(u.email) = LOWER($1)
               OR LOWER(u.email) = LOWER($1) || '@fusion.high'
               OR (u.id_number IS NOT NULL AND u.id_number = $1)
               OR (c.learner_number IS NOT NULL AND c.learner_number = $1)
            LIMIT 1
        `, [queryInput]);

        if (userLookup.rows.length === 0) {
            return res.status(404).json({ error: 'No account found matching this Email, Learner Number, or ID Number.' });
        }

        const user = userLookup.rows[0];

        // Resolve real destination email (if learner account is @fusion.high, deliver to registered parent email)
        let targetDeliveryEmail = user.email;
        if (user.email.endsWith('@fusion.high') && user.parent_user_email) {
            targetDeliveryEmail = user.parent_user_email;
        }

        const otp = Math.floor(1000 + Math.random() * 9000).toString();
        // Set OTP expiry strictly to 2 minutes from generation on the user record
        await db.query(
            "UPDATE users SET reset_code = $1, reset_expiry = NOW() + INTERVAL '2 minutes' WHERE id = $2",
            [otp, user.id]
        );

        // Dynamically determine baseUrl from request headers
        let baseUrl = req.get('origin');
        if (!baseUrl && req.get('referer')) {
            try {
                const u = new URL(req.get('referer'));
                baseUrl = `${u.protocol}//${u.host}`;
            } catch (e) {}
        }
        if (!baseUrl) {
            const host = req.get('host') || `localhost:${process.env.PORT || 4000}`;
            const protocol = req.protocol || 'http';
            baseUrl = `${protocol}://${host}`;
        }

        const tpl = emailService.templates.forgotPassword(otp, targetDeliveryEmail, baseUrl);
        
        // Dispatch email immediately with robust error logging
        console.log(`[AUTH] Dispatching OTP [${otp}] to destination email: ${targetDeliveryEmail} for user ID ${user.id} (${user.email})`);
        emailService.send(targetDeliveryEmail, tpl.subject, tpl.body).catch(err => {
            console.error('[EMAIL ERROR] Failed to send OTP email to ' + targetDeliveryEmail + ':', err);
        });

        // Create a helpful masked email (e.g. ts***@gmail.com)
        const parts = targetDeliveryEmail.split('@');
        const masked = parts[0].length > 2 
            ? `${parts[0].slice(0, 2)}***@${parts[1]}` 
            : `${parts[0].slice(0, 1)}***@${parts[1]}`;

        res.json({ 
            message: `A 4-digit reset code has been sent immediately to your registered email (${masked}). Valid for 2 minutes.`,
            email: user.email,
            delivery_email: masked,
            expires_in: 120
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

        const result = await db.query(`
            SELECT u.id, u.email, u.reset_code, u.reset_expiry
            FROM users u
            LEFT JOIN children c ON c.learner_user_id = u.id
            WHERE (LOWER(u.email) = LOWER($1)
               OR LOWER(u.email) = LOWER($1) || '@fusion.high'
               OR (u.id_number IS NOT NULL AND u.id_number = $1)
               OR (c.learner_number IS NOT NULL AND c.learner_number = $1))
              AND u.reset_code = $2
            LIMIT 1
        `, [queryInput, rawCode]);

        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'Invalid 4-digit OTP code or identifier. Please check and try again.' });
        }

        const user = result.rows[0];
        const now = new Date();
        if (user.reset_expiry && new Date(user.reset_expiry) < now) {
            return res.status(400).json({ error: 'OTP code has expired (2-minute limit). Please click Resend Code to receive a new OTP.' });
        }
        
        // Once verified within 2m, extend reset_expiry so user has sufficient time (15 mins) to enter new password
        await db.query("UPDATE users SET reset_expiry = NOW() + INTERVAL '15 minutes' WHERE id = $1", [user.id]);
        res.json({ message: 'Code verified successfully. You can now set your new password.', email: user.email });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.resetPassword = async (req, res) => {
    const { email, identifier, code, otp, new_password, newPassword } = req.body;
    try {
        const queryInput = (email || identifier || '').toString().trim();
        const rawCode = (code || otp || '').toString().trim();
        const targetPassword = new_password || newPassword || '';

        if (!queryInput || !rawCode || !targetPassword) {
            return res.status(400).json({ error: 'Email/Identifier, OTP code, and new password are required.' });
        }

        const userRes = await db.query(`
            SELECT u.id, u.email, u.password_hash, u.reset_expiry
            FROM users u
            LEFT JOIN children c ON c.learner_user_id = u.id
            WHERE (LOWER(u.email) = LOWER($1)
               OR LOWER(u.email) = LOWER($1) || '@fusion.high'
               OR (u.id_number IS NOT NULL AND u.id_number = $1)
               OR (c.learner_number IS NOT NULL AND c.learner_number = $1))
              AND u.reset_code = $2
            LIMIT 1
        `, [queryInput, rawCode]);

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

        // 2. Similarity & Exact Match Detection against old password
        if (user.password_hash) {
            const isExactMatch = await bcrypt.compare(targetPassword, user.password_hash);
            if (isExactMatch) {
                return res.status(400).json({
                    error: "You are close! This is the exact password you were trying to recover. If you remembered it, you can log in directly, or enter a new, distinct password to replace it."
                });
            }

            // Check common slight mutations/variations (trailing digits, casing, suffix)
            const mutations = [
                new_password.slice(0, -1),
                new_password.slice(0, -2),
                new_password.toLowerCase(),
                new_password.toUpperCase(),
                new_password.replace(/\d+$/, ''),
                new_password.replace(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/g, '')
            ].filter(m => m && m.length >= 4 && m !== new_password);

            for (const mutation of mutations) {
                try {
                    const isClose = await bcrypt.compare(mutation, user.password_hash);
                    if (isClose) {
                        return res.status(400).json({
                            error: "You are very close to your old password! Please create a distinctly different new password to ensure account security."
                        });
                    }
                } catch (e) {
                    // Ignore compare errors on malformed candidate
                }
            }
        }

        // 3. If password is way different, replace the old one with the new one
        const hash = await bcrypt.hash(new_password, 10);
        await db.query('UPDATE users SET password_hash = $1, reset_code = NULL, reset_expiry = NULL WHERE LOWER(email) = LOWER($2)', [hash, normalizedEmail]);
        await emailService.send(normalizedEmail, emailService.templates.passwordResetSuccess().subject, emailService.templates.passwordResetSuccess().body);
        res.json({ message: 'Password updated successfully! Your old password has been replaced with your new one.' });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.changePassword = async (req, res) => {
    const { current_password, new_password, confirm_password } = req.body;
    const userId = req.user.id;

    if (!current_password || !new_password || !confirm_password) {
        return res.status(400).json({ error: 'Current password, new password, and confirmation password are required.' });
    }
    if (new_password !== confirm_password) {
        return res.status(400).json({ error: 'New password and confirmation password do not match.' });
    }

    const pwError = validatePassword(new_password);
    if (pwError) return res.status(400).json({ error: pwError });

    try {
        const userRes = await db.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
        if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found.' });

        const valid = await bcrypt.compare(current_password, userRes.rows[0].password_hash);
        if (!valid) return res.status(400).json({ error: 'Current password is incorrect.' });

        const hash = await bcrypt.hash(new_password, 10);
        await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, userId]);

        res.json({ message: 'Password updated successfully.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.validatePassword = validatePassword;
exports.register = exports.registerUser;