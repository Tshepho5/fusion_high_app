const db = require('./db');
const bcrypt = require('bcryptjs');
const { validateSAID } = require('../public/src/controller/saIDvalidations');
const { generateLearnerPasswordFromID } = require('../public/src/controller/authController');

function calcLuhn(digits12) {
    let sum = 0;
    let bEven = true;
    for (let i = digits12.length - 1; i >= 0; i--) {
        let n = parseInt(digits12.charAt(i), 10);
        if (bEven) {
            n *= 2;
            if (n > 9) n -= 9;
        }
        sum += n;
        bEven = !bEven;
    }
    return ((10 - (sum % 10)) % 10).toString();
}

function generateValidSAID(grade, gender = 'Female', seed = 1) {
    // Determine Year of birth based on Grade in 2026
    // Grade 8: 2012 (14 yrs) -> 12
    // Grade 9: 2011 (15 yrs) -> 11
    // Grade 10: 2010 (16 yrs) -> 10
    // Grade 11: 2009 (17 yrs) -> 09
    // Grade 12: 2008 (18 yrs) -> 08
    let yearPrefix = '10';
    if (grade === 8) yearPrefix = '12';
    else if (grade === 9) yearPrefix = '11';
    else if (grade === 10) yearPrefix = '10';
    else if (grade === 11) yearPrefix = '09';
    else if (grade === 12) yearPrefix = '08';

    // Month (01-12) & Day (01-28)
    const monthNum = ((seed * 7) % 12) + 1;
    const dayNum = ((seed * 13) % 28) + 1;
    const month = monthNum.toString().padStart(2, '0');
    const day = dayNum.toString().padStart(2, '0');

    // Gender code: Female 0000-4999, Male 5000-9999
    const isMale = (gender || '').toLowerCase().startsWith('m');
    const baseGenderNum = isMale ? 5000 : 800;
    const genderOffset = (seed * 37) % 4000;
    const genderCode = (baseGenderNum + genderOffset).toString().padStart(4, '0');

    // Citizenship: 0 (SA Citizen), Race: 8 (Black/standard)
    const citizenship = '0';
    const race = '8';

    const first12 = `${yearPrefix}${month}${day}${genderCode}${citizenship}${race}`;
    const checkDigit = calcLuhn(first12);
    const fullId = `${first12}${checkDigit}`;

    return {
        idNumber: fullId,
        dob: `20${yearPrefix}-${month}-${day}`,
        gender: isMale ? 'Male' : 'Female'
    };
}

async function updateAllLearnersWithSAID() {
    console.log('[MIGRATION] Checking and generating valid SA ID numbers for all learners in database...');
    
    const query = `
        SELECT u.id as user_id, u.email, u.full_name, u.surname, u.id_number, u.gender, u.dob,
               c.id as child_id, c.learner_number, c.grade, c.stream
        FROM users u
        LEFT JOIN children c ON c.learner_user_id = u.id
        WHERE u.role_id = 3 OR u.role_id::text = 'learner'
        ORDER BY u.id ASC
    `;
    const res = await db.query(query);
    console.log(`Found ${res.rows.length} learner accounts.`);

    let updatedCount = 0;
    let existingValidCount = 0;

    for (let i = 0; i < res.rows.length; i++) {
        const user = res.rows[i];
        let isValid = false;

        if (user.id_number) {
            const check = validateSAID(user.id_number.trim());
            if (check.isValid) {
                isValid = true;
                existingValidCount++;
            }
        }

        if (!isValid) {
            // Generate valid SA ID
            const gradeNum = parseInt(user.grade, 10) || 10;
            const generated = generateValidSAID(gradeNum, user.gender, i + 1);

            // Double check validity with validateSAID
            const valCheck = validateSAID(generated.idNumber);
            if (!valCheck.isValid) {
                console.error(`Generated invalid ID for user ${user.user_id}: ${generated.idNumber}`);
                continue;
            }

            // Calculate systematic password
            const systematicPw = generateLearnerPasswordFromID(generated.idNumber);
            const passwordHash = await bcrypt.hash(systematicPw, 10);

            // Update user record
            await db.query(`
                UPDATE users 
                SET id_number = $1, 
                    dob = COALESCE(dob, $2), 
                    gender = COALESCE(gender, $3),
                    password_hash = $4,
                    country = COALESCE(country, 'South Africa'),
                    race = COALESCE(race, 'Black')
                WHERE id = $5
            `, [generated.idNumber, generated.dob, generated.gender, passwordHash, user.user_id]);

            updatedCount++;
        }
    }

    console.log(`[MIGRATION COMPLETE] Successfully updated ${updatedCount} learners with valid South African ID numbers.`);
    console.log(`Total verified SA ID learners in system: ${existingValidCount + updatedCount} / ${res.rows.length}`);
}

if (require.main === module) {
    updateAllLearnersWithSAID()
        .then(() => process.exit(0))
        .catch(err => {
            console.error('[MIGRATION ERROR]', err);
            process.exit(1);
        });
}

module.exports = { updateAllLearnersWithSAID, generateValidSAID };
