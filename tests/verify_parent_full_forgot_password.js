const axios = require('axios');
const db = require('../db/db');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'fusion_high_secret_jwt_key';

const BASE_URL = 'http://localhost:4000/api';

async function verifyParentFullForgotPassword() {
    console.log('====================================================');
    console.log('🔐 VERIFYING COMPLETE PARENT FORGOT PASSWORD & OTP FLOW');
    console.log('====================================================\n');

    try {
        // 1. Admin authentication
        console.log('1. Admin authenticating...');
        const adminRes = await db.query(
            "SELECT u.id, u.email FROM users u JOIN roles r ON u.role_id = r.id WHERE r.name = 'admin' LIMIT 1"
        );
        const adminUser = adminRes.rows[0] || { id: 1, email: 'admin@fusionhigh.co.za' };
        const adminToken = jwt.sign(
            { id: adminUser.id, email: adminUser.email, role: 'admin' },
            JWT_SECRET,
            { expiresIn: '1h' }
        );
        console.log('   ✅ Admin authenticated for:', adminUser.email, '\n');

        // 2. Register a new parent via admin
        const uniqueSuffix = Date.now();
        const testParentEmail = `parent.recovery.${uniqueSuffix}@example.com`;
        const testParentIdNumber = `850818502908${uniqueSuffix.toString().slice(-1)}`;
        const testParentPhone = `082${uniqueSuffix.toString().slice(-7)}`;
        const initialTempPassword = 'ParentTemp@2026';

        console.log('2. Admin registering parent account:');
        console.log(`   Email: ${testParentEmail}`);
        console.log(`   ID Number: ${testParentIdNumber}`);
        console.log(`   Phone: ${testParentPhone}`);

        const parentRegRes = await axios.post(`${BASE_URL}/admin/parents`, {
            full_name: 'Bontle',
            surname: 'Khuzwayo',
            email: testParentEmail,
            password: initialTempPassword,
            phone: testParentPhone,
            id_number: testParentIdNumber,
            gender: 'Female',
            physical_address: '100 Madiba Street, Pretoria',
            relationship: 'Mother'
        }, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });

        console.log('   ✅ Parent registered successfully via admin.\n');
        const parentId = parentRegRes.data.user.id;

        // 3. Parent initiates Forgot Password using their Email
        console.log('3. Parent requesting OTP using registered Email...');
        const forgotByEmailRes = await axios.post(`${BASE_URL}/forgot-password`, {
            email: testParentEmail
        });
        console.log('   ✅ OTP request succeeded:', forgotByEmailRes.data.message);

        // Fetch generated OTP from DB
        const otpRow1 = await db.query('SELECT reset_code, reset_expiry FROM users WHERE id = $1', [parentId]);
        const otp1 = otpRow1.rows[0].reset_code;
        console.log(`   Fetched generated 4-digit OTP from database: [${otp1}]\n`);

        // 4. Verify OTP via /api/verify-otp
        console.log('4. Verifying OTP code...');
        const verifyRes = await axios.post(`${BASE_URL}/verify-otp`, {
            email: testParentEmail,
            otp: otp1
        });
        console.log('   ✅ OTP verification succeeded:', verifyRes.data.message, '\n');

        // 5. Reset Password to a new secure password
        const newPassword = 'NewParentSecure#2026';
        console.log('5. Resetting password to:', newPassword);
        const resetRes = await axios.post(`${BASE_URL}/reset-password`, {
            email: testParentEmail,
            otp: otp1,
            new_password: newPassword
        });
        console.log('   ✅ Password reset succeeded:', resetRes.data.message, '\n');

        // 6. Authenticate using the NEW password
        console.log('6. Logging in with NEW password...');
        const loginWithNewPw = await axios.post(`${BASE_URL}/login`, {
            email: testParentEmail,
            password: newPassword
        });
        console.log('   ✅ Login successful with new password! Role:', loginWithNewPw.data.role);
        console.log('   User:', loginWithNewPw.data.user.full_name, '\n');

        // 7. Testing Forgot Password using National ID Number
        console.log('7. Testing forgot-password request using National ID Number...');
        const forgotByIdRes = await axios.post(`${BASE_URL}/forgot-password`, {
            identifier: testParentIdNumber
        });
        console.log('   ✅ OTP request by National ID succeeded:', forgotByIdRes.data.message);

        // 8. Testing Forgot Password using Phone Number
        console.log('\n8. Testing forgot-password request using Phone Number...');
        const forgotByPhoneRes = await axios.post(`${BASE_URL}/forgot-password`, {
            identifier: testParentPhone
        });
        console.log('   ✅ OTP request by Phone Number succeeded:', forgotByPhoneRes.data.message);

        console.log('\n====================================================');
        console.log('🎉 ALL PARENT FORGOT PASSWORD & OTP TESTS PASSED!');
        console.log('====================================================\n');
        process.exit(0);

    } catch (error) {
        console.error('\n❌ Test failed with error:', error.response?.data || error.message);
        process.exit(1);
    }
}

verifyParentFullForgotPassword();
