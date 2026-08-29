require('dotenv').config();
const dns = require('dns');
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}
const nodemailer = require('nodemailer');

const net = require('net');

const getSmtpUser = () => (process.env.SMTP_USER || 'tshepomakola23@gmail.com').trim().replace(/^["']|["']$/g, '');
const getSmtpPass = () => (process.env.SMTP_PASS || 'ixuyslitvtetlmzc').trim().replace(/^["']|["']$/g, '').replace(/\s+/g, '');

let pooledTransporter = null;
let lastSmtpUser = null;
let lastSmtpPass = null;
let cachedSmtpIp = null;

function resolveHostToIp(host = 'smtp.gmail.com') {
  if (net.isIP(host)) return Promise.resolve(host);
  if (cachedSmtpIp) return Promise.resolve(cachedSmtpIp);
  return new Promise((resolve) => {
    dns.lookup(host, { family: 4 }, (err, address) => {
      if (!err && address) {
        cachedSmtpIp = address;
        resolve(address);
      } else {
        resolve(host === 'smtp.gmail.com' ? '142.251.127.109' : host);
      }
    });
  });
}

function getPooledTransporter() {
  const user = getSmtpUser();
  const pass = getSmtpPass();
  const hostIp = cachedSmtpIp || '142.251.127.109';

  if (pooledTransporter && lastSmtpUser === user && lastSmtpPass === pass) {
    return pooledTransporter;
  }

  pooledTransporter = nodemailer.createTransport({
    pool: true,
    maxConnections: 5,
    maxMessages: 500,
    rateLimit: 14, // Gmail max 14 msgs/sec
    host: hostIp,
    port: 465,
    secure: true,
    servername: 'smtp.gmail.com',
    auth: { user, pass },
    tls: { servername: 'smtp.gmail.com', rejectUnauthorized: false },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000
  });

  lastSmtpUser = user;
  lastSmtpPass = pass;
  return pooledTransporter;
}

function createDirectTransporter(port = 465, secure = true) {
  const user = getSmtpUser();
  const pass = getSmtpPass();
  const hostIp = cachedSmtpIp || '142.251.127.109';
  
  return nodemailer.createTransport({
    host: hostIp,
    port,
    secure,
    servername: 'smtp.gmail.com',
    auth: { user, pass },
    tls: { servername: 'smtp.gmail.com', rejectUnauthorized: false, ciphers: 'SSLv3' },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000
  });
}

// Pre-resolve host IP in background on startup
resolveHostToIp('smtp.gmail.com').catch(() => {});

/**
 * Modern HTML Email Base Layout Wrapper
 * Ensures 100% email client compatibility (Gmail, Outlook, Apple Mail, iOS, Android)
 */
function createBaseEmailTemplate({ preheader, title, subtitle, contentHtml, ctaText, ctaLink }) {
  const currentYear = new Date().getFullYear();
  const ctaButtonHtml = ctaText && ctaLink ? `
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 28px 0 16px 0;">
      <tr>
        <td align="center" style="border-radius: 10px; background: linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%);">
          <a href="${ctaLink}" target="_blank" style="font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-weight: 700; display: inline-block; letter-spacing: 0.3px;">
            ${ctaText} &rarr;
          </a>
        </td>
      </tr>
    </table>
  ` : '';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; -webkit-text-size-adjust: 100%;">
  <div style="display: none; font-size: 1px; color: #0f172a; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
    ${preheader || title}
  </div>

  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0f172a; padding: 30px 12px;">
    <tr>
      <td align="center">
        <!-- Main Email Container -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #1e293b; border-radius: 16px; border: 1px solid #334155; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
          
          <!-- Top Gradient Accent Bar -->
          <tr>
            <td height="6" style="background: linear-gradient(90deg, #4f46e5 0%, #06b6d4 50%, #10b981 100%);"></td>
          </tr>

          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 20px 32px; text-align: left; border-bottom: 1px solid #334155;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <div style="display: inline-block; vertical-align: middle;">
                      <span style="display: inline-block; width: 36px; height: 36px; line-height: 36px; text-align: center; border-radius: 10px; background: rgba(99, 102, 241, 0.2); border: 1px solid rgba(99, 102, 241, 0.4); color: #818cf8; font-weight: 900; font-size: 18px; margin-right: 10px;">F</span>
                      <span style="font-size: 20px; font-weight: 800; color: #f8fafc; letter-spacing: -0.5px; vertical-align: middle;">FUSION HIGH</span>
                    </div>
                  </td>
                  <td align="right">
                    <span style="font-size: 11px; font-weight: 700; color: #38bdf8; background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.3); padding: 4px 10px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px;">Official Notice</span>
                  </td>
                </tr>
              </table>
              <h1 style="margin: 22px 0 6px 0; font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px; line-height: 1.3;">
                ${title}
              </h1>
              ${subtitle ? `<p style="margin: 0; font-size: 13px; color: #94a3b8; line-height: 1.5;">${subtitle}</p>` : ''}
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 28px 32px; color: #cbd5e1; font-size: 14px; line-height: 1.6;">
              ${contentHtml}
              ${ctaButtonHtml}
            </td>
          </tr>

          <!-- Security & Help Note -->
          <tr>
            <td style="padding: 0 32px 24px 32px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background: rgba(15, 23, 42, 0.6); border: 1px solid #334155; border-radius: 10px; padding: 14px 18px;">
                <tr>
                  <td width="28" valign="top" style="padding-right: 12px;">
                    <div style="width: 24px; height: 24px; line-height: 24px; text-align: center; border-radius: 6px; background: rgba(56, 189, 248, 0.15); color: #38bdf8; font-weight: 900; font-size: 11px;">SEC</div>
                  </td>
                  <td style="font-size: 12px; color: #94a3b8; line-height: 1.5;">
                    <strong style="color: #e2e8f0;">Security Notice:</strong> Fusion High School will never request your account password via email. If you did not initiate this request, please contact school administration immediately.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #0f172a; border-top: 1px solid #334155; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 700; color: #cbd5e1;">
                Fusion High School Management System
              </p>
              <p style="margin: 0 0 12px 0; font-size: 11px; color: #64748b;">
                Excellence in South African Secondary Education &bull; CAPS Curriculum
              </p>
              <p style="margin: 0; font-size: 11px; color: #475569;">
                &copy; ${currentYear} Fusion High School. All rights reserved. &bull; <a href="mailto:support@fusionhigh.co.za" style="color: #6366f1; text-decoration: none;">support@fusionhigh.co.za</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

const emailService = {
  /**
   * High-speed email sender using Nodemailer connection pooling with automatic fallback.
   */
  send: async (to, subject, body, replyTo = null) => {
    if (!to || !to.includes('@')) {
      console.error('[EMAIL ERROR] Invalid recipient email address:', to);
      return { success: false, error: `Invalid recipient email address: '${to}'` };
    }

    let targetRecipient = to.trim().toLowerCase();

    // If destination is a learner login address (@fusion.high or @fusionhigh.co.za), automatically resolve the linked Parent's personal email
    if (targetRecipient.endsWith('@fusion.high') || targetRecipient.endsWith('@fusionhigh.co.za')) {
      try {
        const db = require('../../../db/db');
        const parentRes = await db.query(`
          SELECT pu.email as parent_email 
          FROM users u
          LEFT JOIN children c ON c.learner_user_id::text = u.id::text
          LEFT JOIN users pu ON c.parent_id::text = pu.id::text
          WHERE LOWER(u.email::text) = $1 AND pu.email IS NOT NULL AND pu.email NOT LIKE '%@fusion.high%' AND pu.email NOT LIKE '%@fusionhigh.co.za%'
          LIMIT 1
        `, [targetRecipient]);

        if (parentRes.rows.length > 0 && parentRes.rows[0].parent_email) {
          const parentPersonalEmail = parentRes.rows[0].parent_email.trim();
          console.log(`[EMAIL ROUTING] Redirected learner login [${targetRecipient}] notice to Parent personal email [${parentPersonalEmail}]`);
          targetRecipient = parentPersonalEmail;
        } else {
          console.log(`[EMAIL NOTICE] Learner email [${targetRecipient}] is a portal login identifier. No linked parent email was found.`);
          return { success: true, skipped: true, reason: 'Learner accounts are for portal login only.' };
        }
      } catch (lookupErr) {
        console.warn('[EMAIL ROUTING] Parent email lookup notice:', lookupErr.message);
        return { success: true, skipped: true, reason: 'Learner login identifier only.' };
      }
    }

    const senderUser = getSmtpUser();
    const mailOptions = {
      from: `"Fusion High School" <${senderUser}>`,
      to: targetRecipient,
      subject,
      html: body,
      ...(replyTo && { replyTo })
    };

    // Strategy 1: High-speed Persistent Connection Pool (SSL Port 465)
    try {
      const pool = getPooledTransporter();
      const info = await pool.sendMail(mailOptions);
      console.log(`[EMAIL DISPATCH INSTANT] Delivered to ${targetRecipient}: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (e1) {
      console.warn(`[EMAIL RETRY 1] Pool delivery warning (${e1.message}), attempting direct Port 587 STARTTLS...`);
      // Strategy 2: Direct Port 587 STARTTLS
      try {
        const t2 = createDirectTransporter(587, false);
        const info = await t2.sendMail(mailOptions);
        console.log(`[EMAIL SUCCESS - Port 587] Delivered to ${targetRecipient}: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
      } catch (e2) {
        console.warn(`[EMAIL RETRY 2] Port 587 warning (${e2.message}), attempting direct service: 'gmail'...`);
        // Strategy 3: Direct Port 465 SSL
        try {
          const hostIp = cachedSmtpIp || '142.251.127.109';
          const t3 = nodemailer.createTransport({
            host: hostIp,
            port: 465,
            secure: true,
            servername: 'smtp.gmail.com',
            auth: { user: senderUser, pass: getSmtpPass() },
            tls: { servername: 'smtp.gmail.com', rejectUnauthorized: false },
            connectionTimeout: 10000,
            greetingTimeout: 10000
          });
          const info = await t3.sendMail(mailOptions);
          console.log(`[EMAIL SUCCESS - Direct Port 465] Delivered to ${targetRecipient}: ${info.messageId}`);
          return { success: true, messageId: info.messageId };
        } catch (e3) {
          console.error('[EMAIL ERROR - All Transporters Failed]:', e3.message || e3);
          return { success: false, error: e1.message || e2.message || e3.message };
        }
      }
    }
  },

  /**
   * Asynchronous fire-and-forget email sender for high-throughput background notifications.
   * Returns immediately so API responses are near-instantaneous.
   */
  sendAsync: (to, subject, body, replyTo = null) => {
    setImmediate(() => {
      emailService.send(to, subject, body, replyTo).catch(err => {
        console.warn('[EMAIL ASYNC ERROR]:', err.message);
      });
    });
  },

  // Alias for send
  sendEmail: async (to, subject, body, replyTo = null) => {
    return await emailService.send(to, subject, body, replyTo);
  },

  templates: {
    // 1. User Registration Success
    registrationSuccess: (name) => {
      const title = 'Welcome to Fusion High School';
      const contentHtml = `
        <p style="font-size: 15px; color: #ffffff; margin-top: 0;">Hello <strong>${name || 'User'}</strong>,</p>
        <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
          Your account has been successfully created in the Fusion High School platform. You can now access your personalized dashboard, view updates, and utilize school portal tools.
        </p>
        <div style="background: #0f172a; border-left: 4px solid #10b981; border-radius: 8px; padding: 14px 18px; margin: 20px 0;">
          <p style="margin: 0; font-size: 13px; color: #34d399; font-weight: 700;">Account Activated</p>
          <p style="margin: 4px 0 0 0; font-size: 12px; color: #94a3b8;">Use your registered email and chosen password to log in.</p>
        </div>
      `;

      return {
        subject: 'Welcome to Fusion High - Registration Confirmed',
        body: createBaseEmailTemplate({
          preheader: 'Your Fusion High School account has been activated.',
          title,
          subtitle: 'Your account registration has been confirmed.',
          contentHtml,
          ctaText: 'Access Your Portal',
          ctaLink: 'http://localhost:5173/login'
        })
      };
    },

    // 2. Parent Registration with Linked Learners & Generated Student Credentials
    parentRegistrationSuccessWithLearners: (parentName, learners, baseUrl = 'http://localhost:4000') => {
      const title = 'Parent Account & Child Linkage Confirmed';
      const cleanBaseUrl = (baseUrl || 'http://localhost:4000').replace(/\/+$/, '');
      const learnersHtml = (learners || []).map((l, i) => `
        <div style="background: #0f172a; border: 1px solid #334155; border-left: 4px solid #38bdf8; border-radius: 10px; padding: 16px 20px; margin-bottom: 14px;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td>
                <h4 style="margin: 0; color: #ffffff; font-size: 16px; font-weight: 800;">
                  ${l.full_name} ${l.surname || ''}
                </h4>
              </td>
              <td align="right">
                <span style="font-size: 11px; font-weight: 800; color: #38bdf8; background: rgba(56, 189, 248, 0.15); padding: 4px 10px; border-radius: 6px; font-family: monospace; border: 1px solid rgba(56, 189, 248, 0.3);">
                  ID: ${l.learner_number || `ID-${l.id}`}
                </span>
              </td>
            </tr>
          </table>

          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 10px; font-size: 12px; color: #cbd5e1; border-top: 1px solid #1e293b; padding-top: 8px;">
            <tr>
              <td style="padding: 3px 0; width: 140px; color: #94a3b8;">Grade Level:</td>
              <td style="color: #ffffff; font-weight: 700;">Grade ${l.grade} &bull; Stream: ${l.stream || 'General'}</td>
            </tr>
            <tr>
              <td style="padding: 3px 0; color: #94a3b8;">Student Login Email:</td>
              <td style="color: #38bdf8; font-family: monospace; font-weight: 700;">${l.learner_email || `${(l.learner_number || 'learner').toLowerCase().replace(/\s/g, '')}@fusionhigh.co.za`}</td>
            </tr>
            <tr>
              <td style="padding: 3px 0; color: #94a3b8;">Initial Password (from ID):</td>
              <td>
                <span style="display: inline-block; background: rgba(99, 102, 241, 0.2); border: 1px solid rgba(99, 102, 241, 0.4); color: #c7d2fe; padding: 2px 8px; border-radius: 4px; font-family: monospace; font-weight: 800;">
                  ${l.generated_password || 'FH@202601'}
                </span>
                <span style="font-size: 10px; color: #64748b; margin-left: 6px;">(Derived from ID Number)</span>
              </td>
            </tr>
          </table>
        </div>
      `).join('');

      const contentHtml = `
        <p style="font-size: 15px; color: #ffffff; margin-top: 0;">Dear <strong>${parentName || 'Parent / Guardian'}</strong>,</p>
        <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
          Your <strong>Parent Portal Account</strong> has been established and linked to your enrolled learner(s).
        </p>
        
        <h3 style="color: #f8fafc; font-size: 15px; font-weight: 800; margin: 22px 0 12px 0;">
          Linked Learner Credentials & Academic Records:
        </h3>
        ${learnersHtml || '<p style="color: #94a3b8; font-size: 13px;">No learners linked.</p>'}

        <div style="background: rgba(15, 23, 42, 0.8); border: 1px solid #334155; border-radius: 8px; padding: 12px 16px; margin: 16px 0;">
          <p style="margin: 0; font-size: 12px; color: #94a3b8; line-height: 1.5;">
            <strong style="color: #e2e8f0;">Student Sign In Guide:</strong> Your learner can use their <strong>Student Login Email</strong> and <strong>Initial Password</strong> above to access their personalized AI Subject Tutor, timetables, and assignments.
          </p>
        </div>

        <p style="color: #94a3b8; font-size: 13px; line-height: 1.6; margin-top: 14px;">
          Through your Parent Portal, you can review real-time classroom attendance, inspect term report cards, follow homework submissions, and directly message subject educators.
        </p>
      `;

      return {
        subject: 'Fusion High School - Parent Registration & Child Credentials Confirmed',
        body: createBaseEmailTemplate({
          preheader: 'Your parent account and student login credentials are ready.',
          title,
          subtitle: 'Comprehensive parent-student academic link established.',
          contentHtml,
          ctaText: 'Access Parent Portal',
          ctaLink: `${cleanBaseUrl}/dashboard/parent`
        })
      };
    },

    // 3. One-Time Password (OTP) for Password Reset
    forgotPassword: (otp, email, baseUrl = 'http://localhost:4000') => {
      const title = 'Password Reset Verification Code';
      const encodedEmail = encodeURIComponent(email || '');
      const cleanBaseUrl = (baseUrl || 'http://localhost:4000').replace(/\/+$/, '');
      const resetLink = `${cleanBaseUrl}/forgot-password?email=${encodedEmail}&step=verify`;

      const contentHtml = `
        <p style="font-size: 14px; color: #cbd5e1; margin-top: 0;">
          We received a request to reset your password for your Fusion High account. Please use the 4-digit verification code below:
        </p>

        <div style="background: #0f172a; border: 1px dashed #6366f1; border-radius: 12px; padding: 22px; text-align: center; margin: 20px 0;">
          <p style="margin: 0 0 6px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; font-weight: 700;">
            Your 4-Digit Security Code
          </p>
          <span style="font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #818cf8; font-family: monospace; display: inline-block;">
            ${otp}
          </span>
          <div style="margin-top: 10px; display: inline-block; padding: 4px 12px; border-radius: 20px; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3);">
            <span style="font-size: 11px; color: #f87171; font-weight: 700; letter-spacing: 0.2px;">
              ⏱️ VALID FOR 2 MINUTES
            </span>
          </div>
        </div>

        <p style="font-size: 13px; color: #cbd5e1; line-height: 1.5;">
          Click the button below to open the verification screen and manually enter your 4-digit OTP code before it expires:
        </p>
      `;

      return {
        subject: `Verification Code: ${otp} (Valid for 2 Minutes) - Password Reset`,
        body: createBaseEmailTemplate({
          preheader: `Your verification code is ${otp}. Valid for 2 minutes. Click to enter your OTP code.`,
          title,
          subtitle: 'One-time security recovery code (2-minute limit)',
          contentHtml,
          ctaText: 'Verify OTP & Reset Password',
          ctaLink: resetLink
        })
      };
    },

    // 4. Password Reset Success Notification
    passwordResetSuccess: () => {
      const title = 'Password Updated Successfully';
      const contentHtml = `
        <div style="background: #0f172a; border-left: 4px solid #10b981; border-radius: 8px; padding: 16px 20px; margin: 10px 0 20px 0;">
          <p style="margin: 0; font-size: 14px; color: #34d399; font-weight: 700;">Security Confirmation</p>
          <p style="margin: 6px 0 0 0; font-size: 13px; color: #94a3b8; line-height: 1.5;">
            Your Fusion High account password was changed successfully. You can now use your new password to sign in.
          </p>
        </div>
        <p style="font-size: 13px; color: #cbd5e1;">
          If you did not perform this change, please report this immediately to school administration to secure your profile.
        </p>
      `;

      return {
        subject: 'Security Alert: Password Changed Successfully',
        body: createBaseEmailTemplate({
          preheader: 'Your account password has been updated.',
          title,
          subtitle: 'Security confirmation from Fusion High',
          contentHtml,
          ctaText: 'Sign In With New Password',
          ctaLink: 'http://localhost:5173/login'
        })
      };
    },

    // 5. Attendance Alert for Present, Late, or Absent
    attendanceNotification: ({ parentName, learnerName, learnerNumber, status, subject, date, time, baseUrl = 'https://educonnect-cmyh.onrender.com' }) => {
      const statusUpper = (status || 'present').toUpperCase();
      let statusColor = '#10b981';
      let statusTitle = 'Present & Verified';
      if (status === 'late') {
        statusColor = '#f59e0b';
        statusTitle = 'Marked Late';
      } else if (status === 'absent') {
        statusColor = '#f43f5e';
        statusTitle = 'Marked Absent';
      }

      const title = `Attendance Alert: ${learnerName} - ${statusTitle}`;
      const contentHtml = `
        <p style="font-size:15px; color:#ffffff; margin-top:0;">Dear <strong>${parentName || 'Parent / Guardian'}</strong>,</p>
        <p style="color:#cbd5e1; font-size:14px; line-height:1.6;">
          This is an official automated attendance record notification regarding your child at Fusion High School:
        </p>
        <div style="background:#0f172a; border:1px solid #334155; border-left:4px solid ${statusColor}; border-radius:10px; padding:16px 20px; margin:18px 0;">
          <p style="margin:0; color:${statusColor}; font-size:16px; font-weight:800; text-transform:uppercase;">
            ${statusTitle}
          </p>
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top:12px; font-size:13px; color:#cbd5e1;">
            <tr><td style="padding:4px 0; color:#94a3b8; width:130px;">Learner:</td><td style="color:#ffffff; font-weight:700;">${learnerName} (${learnerNumber || 'N/A'})</td></tr>
            <tr><td style="padding:4px 0; color:#94a3b8;">Subject / Class:</td><td style="color:#38bdf8; font-weight:700;">${subject}</td></tr>
            <tr><td style="padding:4px 0; color:#94a3b8;">Date Recorded:</td><td style="color:#ffffff; font-weight:700;">${date}</td></tr>
            <tr><td style="padding:4px 0; color:#94a3b8;">Logged Time:</td><td style="color:#ffffff; font-weight:700;">${time}</td></tr>
          </table>
        </div>
        <p style="font-size:13px; color:#94a3b8; line-height:1.5;">
          You can track this and past attendance records under the <strong>School Calendar</strong> and Attendance tabs in your Parent Portal.
        </p>
      `;

      return {
        subject: `[Attendance Notice] ${learnerName} marked ${statusUpper} on ${date}`,
        body: createBaseEmailTemplate({
          preheader: `${learnerName} marked ${statusTitle} for ${subject} on ${date}.`,
          title,
          subtitle: 'Official School Attendance Register',
          contentHtml,
          ctaText: 'Open Parent Portal Calendar',
          ctaLink: `${baseUrl}/dashboard/parent?tab=calendar`
        })
      };
    },

    // 6. New Homework Assignment Published
    homeworkPublished: ({ recipientName, isParent, learnerName, title, subject, grade, dueDate, maxPoints, teacherName, baseUrl = 'https://educonnect-cmyh.onrender.com' }) => {
      const emailTitle = `New Homework Published: ${subject}`;
      const portalTab = isParent ? 'subjects' : 'subjects';
      const ctaUrl = isParent ? `${baseUrl}/dashboard/parent?tab=subjects` : `${baseUrl}/dashboard/learner?tab=subjects`;

      const contentHtml = `
        <p style="font-size:15px; color:#ffffff; margin-top:0;">Dear <strong>${recipientName || (isParent ? 'Parent / Guardian' : 'Learner')}</strong>,</p>
        <p style="color:#cbd5e1; font-size:14px; line-height:1.6;">
          ${isParent ? `A new homework task has been assigned for your child <strong>${learnerName}</strong>` : `A new homework task has been published for your class`} by <strong>${teacherName || 'Subject Educator'}</strong>:
        </p>
        <div style="background:#0f172a; border:1px solid #334155; border-left:4px solid #6366f1; border-radius:10px; padding:16px 20px; margin:18px 0;">
          <p style="margin:0; color:#818cf8; font-size:16px; font-weight:800;">
            ${title}
          </p>
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top:12px; font-size:13px; color:#cbd5e1;">
            <tr><td style="padding:4px 0; color:#94a3b8; width:130px;">Subject:</td><td style="color:#38bdf8; font-weight:700;">${subject} (Grade ${grade})</td></tr>
            <tr><td style="padding:4px 0; color:#94a3b8;">Due Date:</td><td style="color:#f59e0b; font-weight:700;">${dueDate}</td></tr>
            <tr><td style="padding:4px 0; color:#94a3b8;">Total Marks:</td><td style="color:#ffffff; font-weight:700;">${maxPoints} Marks</td></tr>
            <tr><td style="padding:4px 0; color:#94a3b8;">Educator:</td><td style="color:#ffffff; font-weight:700;">${teacherName || 'Class Educator'}</td></tr>
          </table>
        </div>
        <p style="font-size:13px; color:#94a3b8; line-height:1.5;">
          Learners can download the task material, upload their completed solutions, and receive instant <strong>Fusion AI Subject Evaluation</strong> feedback before final educator sign-off.
        </p>
      `;

      return {
        subject: `[New Homework] ${subject}: ${title} (Due ${dueDate})`,
        body: createBaseEmailTemplate({
          preheader: `New ${subject} homework task: ${title}. Due ${dueDate}.`,
          title: emailTitle,
          subtitle: `Grade ${grade} Homework & Submission Portal`,
          contentHtml,
          ctaText: isParent ? 'View Child Subjects & Homework' : 'Open Assignment & Submit Solution',
          ctaLink: ctaUrl
        })
      };
    },

    // 7. Homework Graded & Signed Off
    homeworkGraded: ({ recipientName, isParent, learnerName, title, subject, score, totalMarks, percentage, feedback, teacherName, baseUrl = 'https://educonnect-cmyh.onrender.com' }) => {
      const emailTitle = `Homework Marked: ${title}`;
      const ctaUrl = isParent ? `${baseUrl}/dashboard/parent?tab=marks` : `${baseUrl}/dashboard/learner?tab=subjects`;

      const contentHtml = `
        <p style="font-size:15px; color:#ffffff; margin-top:0;">Dear <strong>${recipientName || (isParent ? 'Parent / Guardian' : 'Learner')}</strong>,</p>
        <p style="color:#cbd5e1; font-size:14px; line-height:1.6;">
          ${isParent ? `The homework submission for your child <strong>${learnerName}</strong>` : `Your homework submission`} has been reviewed and officially signed off by <strong>${teacherName || 'Subject Educator'}</strong>:
        </p>
        <div style="background:#0f172a; border:1px solid #334155; border-left:4px solid #10b981; border-radius:10px; padding:16px 20px; margin:18px 0;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td>
                <h4 style="margin:0; color:#ffffff; font-size:16px; font-weight:800;">${title} (${subject})</h4>
              </td>
              <td align="right">
                <span style="font-size:18px; font-weight:900; color:#34d399; font-family:monospace;">
                  ${score} / ${totalMarks} (${percentage}%)
                </span>
              </td>
            </tr>
          </table>
          ${feedback ? `
            <div style="margin-top:12px; padding:10px 14px; background:rgba(15,23,42,0.6); border-radius:8px; border:1px solid #1e293b;">
              <p style="margin:0; font-size:11px; font-weight:700; color:#94a3b8; text-transform:uppercase;">Educator Feedback:</p>
              <p style="margin:4px 0 0 0; font-size:13px; color:#e2e8f0; font-style:italic;">"${feedback}"</p>
            </div>
          ` : ''}
        </div>
        <p style="font-size:13px; color:#94a3b8; line-height:1.5;">
          The mark has been recorded in the student's continuous assessment profile.
        </p>
      `;

      return {
        subject: `[Marks Recorded] ${subject}: ${title} - ${score}/${totalMarks} (${percentage}%)`,
        body: createBaseEmailTemplate({
          preheader: `Homework results for ${title}: ${score}/${totalMarks} (${percentage}%).`,
          title: emailTitle,
          subtitle: `Educator Assessment & Sign-Off Record`,
          contentHtml,
          ctaText: isParent ? 'View Academic Marks Profile' : 'View Full Homework Feedback',
          ctaLink: ctaUrl
        })
      };
    },

    // 8. Learner Admission / Enrollment Notification
    learnerAdmission: (name, surname, learnerId, grade, password, registrarRole) => {
      const title = `Learner Admission Confirmed`;
      const contentHtml = `
        <p style="font-size: 15px; color: #ffffff; margin-top: 0;">Dear Guardian / Learner,</p>
        <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
          The admission enrollment for <strong>${name} ${surname}</strong> has been officially confirmed by the ${registrarRole || 'School Administration'}.
        </p>

        <div style="background: #0f172a; border: 1px solid #334155; border-radius: 12px; padding: 18px 22px; margin: 20px 0;">
          <h4 style="margin: 0 0 12px 0; color: #38bdf8; font-size: 14px; font-weight: 700; text-transform: uppercase;">
            Learner Login Credentials
          </h4>
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 13px;">
            <tr>
              <td style="padding: 5px 0; color: #94a3b8; width: 140px;">Learner Name:</td>
              <td style="padding: 5px 0; color: #ffffff; font-weight: 700;">${name} ${surname}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #94a3b8;">Learner Number:</td>
              <td style="padding: 5px 0; color: #38bdf8; font-family: monospace; font-weight: 700;">${learnerId}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #94a3b8;">Enrolled Grade:</td>
              <td style="padding: 5px 0; color: #ffffff; font-weight: 700;">Grade ${grade}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #94a3b8;">Initial Password:</td>
              <td style="padding: 5px 0; color: #a78bfa; font-family: monospace; font-weight: 700;">${password}</td>
            </tr>
          </table>
        </div>
      `;

      return {
        subject: `Admission Confirmed: ${name} ${surname} (ID: ${learnerId})`,
        body: createBaseEmailTemplate({
          preheader: `Admission confirmed for ${name} ${surname}.`,
          title,
          subtitle: `Grade ${grade} Enrollment Details`,
          contentHtml,
          ctaText: 'Sign In to Learner Portal',
          ctaLink: 'http://localhost:5173/login'
        })
      };
    },

    // 6. New Assignment / Homework Notification
    newAssignment: (learnerName, subject, title, dueDate) => {
      const emailTitle = `New Assessment: ${subject}`;
      const contentHtml = `
        <p style="font-size: 15px; color: #ffffff; margin-top: 0;">Hello <strong>${learnerName}</strong>,</p>
        <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
          Your subject educator has published a new assignment for <strong>${subject}</strong>:
        </p>

        <div style="background: #0f172a; border-left: 4px solid #38bdf8; border-radius: 10px; padding: 18px 20px; margin: 20px 0;">
          <h3 style="margin: 0 0 6px 0; color: #ffffff; font-size: 16px; font-weight: 800;">
            ${title}
          </h3>
          <p style="margin: 0; font-size: 13px; color: #94a3b8;">
            Subject: <strong style="color: #38bdf8;">${subject}</strong> ${dueDate ? `&bull; Due: <strong style="color: #f59e0b;">${dueDate}</strong>` : ''}
          </p>
        </div>

        <p style="color: #cbd5e1; font-size: 13px; line-height: 1.6;">
          Please log in to your Learner Portal to review the instructions, download learning materials, and submit your responses before the cutoff date.
        </p>
      `;

      return {
        subject: `New Assignment: ${subject} - "${title}"`,
        body: createBaseEmailTemplate({
          preheader: `New assignment posted in ${subject}: ${title}`,
          title: emailTitle,
          subtitle: 'Classroom homework and assessment update',
          contentHtml,
          ctaText: 'View Assignment in Portal',
          ctaLink: 'http://localhost:5173/learner'
        })
      };
    },

    // 7. Learner Activation by Parent
    learnerActivationSuccess: (details) => {
      const title = 'Child Academic Account Activated';
      const contentHtml = `
        <p style="font-size: 15px; color: #ffffff; margin-top: 0;">Dear Parent,</p>
        <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
          You have successfully linked and activated your child's academic profile in your Parent Portal account.
        </p>

        <div style="background: #0f172a; border: 1px solid #334155; border-left: 4px solid #06b6d4; border-radius: 12px; padding: 18px 22px; margin: 20px 0;">
          <h4 style="margin: 0 0 12px 0; color: #38bdf8; font-size: 14px; font-weight: 700; text-transform: uppercase;">
            Learner Profile Credentials
          </h4>
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 13px;">
            <tr>
              <td style="padding: 4px 0; color: #94a3b8; width: 140px;">Learner Name:</td>
              <td style="padding: 4px 0; color: #ffffff; font-weight: 700;">${details.name} ${details.surname}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #94a3b8;">Learner ID / Number:</td>
              <td style="padding: 4px 0; color: #38bdf8; font-family: monospace; font-weight: 700;">${details.learnerNumber}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #94a3b8;">Grade & Stream:</td>
              <td style="padding: 4px 0; color: #ffffff; font-weight: 700;">Grade ${details.grade} (${details.stream || 'General'})</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #94a3b8;">Portal Password:</td>
              <td style="padding: 4px 0; color: #a78bfa; font-family: monospace; font-weight: 700;">${details.password}</td>
            </tr>
          </table>
        </div>
      `;

      return {
        subject: `Learner Activation Confirmed: ${details.name} ${details.surname}`,
        body: createBaseEmailTemplate({
          preheader: `Child account activated for ${details.name} ${details.surname}.`,
          title,
          subtitle: 'Academic access profile activated',
          contentHtml,
          ctaText: 'Access Parent Portal',
          ctaLink: 'http://localhost:5173/parent'
        })
      };
    },

    // 8. Learner Deactivation / Unlink Notification
    learnerDeactivationSuccess: (childName) => {
      const title = 'Child Profile Unlinked';
      const contentHtml = `
        <div style="background: #0f172a; border-left: 4px solid #f43f5e; border-radius: 8px; padding: 16px 20px; margin: 10px 0 20px 0;">
          <p style="margin: 0; font-size: 14px; color: #fb7185; font-weight: 700;">Profile Unlinked</p>
          <p style="margin: 6px 0 0 0; font-size: 13px; color: #94a3b8; line-height: 1.5;">
            The student profile for <strong>${childName}</strong> has been unlinked from your parent portal account.
          </p>
        </div>
        <p style="font-size: 13px; color: #cbd5e1;">
          If you did not perform this action or did so in error, please re-link the learner using their Learner ID or contact school administration.
        </p>
      `;

      return {
        subject: `Confirmation: Unlinked ${childName} from Parent Account`,
        body: createBaseEmailTemplate({
          preheader: `Student profile for ${childName} has been unlinked.`,
          title,
          subtitle: 'Student linkage updated',
          contentHtml,
          ctaText: 'Open Parent Portal',
          ctaLink: 'http://localhost:5173/parent'
        })
      };
    },

    // 9. Parent to Teacher Direct Message Dispatch
    parentToTeacher: (parent, teacherEmail, subject, message, childFullName) => {
      const title = `Message from Parent regarding ${childFullName}`;
      const contentHtml = `
        <div style="background: #0f172a; border: 1px solid #334155; border-left: 4px solid #818cf8; border-radius: 10px; padding: 18px 20px; margin: 10px 0 20px 0;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 13px; margin-bottom: 12px; border-bottom: 1px solid #334155; padding-bottom: 8px;">
            <tr>
              <td style="color: #94a3b8; width: 90px; padding: 3px 0;">From Parent:</td>
              <td style="color: #ffffff; font-weight: 700; padding: 3px 0;">${parent.full_name} ${parent.surname || ''} (${parent.email})</td>
            </tr>
            <tr>
              <td style="color: #94a3b8; padding: 3px 0;">Regarding:</td>
              <td style="color: #38bdf8; font-weight: 700; padding: 3px 0;">${childFullName}</td>
            </tr>
            </tr>
            <tr>
              <td style="color: #94a3b8; padding: 3px 0;">Subject:</td>
              <td style="color: #ffffff; font-weight: 700; padding: 3px 0;">${subject}</td>
            </tr>
          </table>

          <div style="font-size: 14px; color: #cbd5e1; line-height: 1.6; white-space: pre-wrap;">
            ${message}
          </div>
        </div>

        <p style="font-size: 12px; color: #94a3b8;">
          You can reply directly to this email to respond to the parent, or log in to your Teacher Message Center.
        </p>
      `;

      return {
        to: teacherEmail,
        replyTo: parent.email,
        subject: `[Fusion High] Parent Inquiry: ${childFullName} - ${subject}`,
        body: createBaseEmailTemplate({
          preheader: `Parent message from ${parent.full_name} regarding ${childFullName}`,
          title,
          subtitle: 'Direct Parent-Teacher Communication',
          contentHtml,
          ctaText: 'Open Teacher Message Center',
          ctaLink: 'http://localhost:5173/teacher'
        })
      };
    },

    // 10. Application Needs Correction / Document Rejection
    applicationCorrection: ({ parentName, learnerName, applicationNumber, issues = [], resumptionUrl }) => {
      const title = 'Action Required: Application Update Needed';
      const issuesListHtml = (issues || []).map(issue => `
        <li style="margin-bottom: 8px; color: #f87171;">
          <strong style="color: #ffffff;">${typeof issue === 'string' ? issue : issue.message || 'Issue detected'}</strong>
          ${issue.details ? `<div style="font-size: 12px; color: #cbd5e1; margin-top: 2px;">${issue.details}</div>` : ''}
        </li>
      `).join('');

      const contentHtml = `
        <p style="font-size: 15px; color: #ffffff; margin-top: 0;">Dear <strong>${parentName || 'Parent / Guardian'}</strong>,</p>
        <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
          Thank you for submitting an admission application for <strong>${learnerName}</strong> (Ref: <code style="color: #38bdf8; background: #0f172a; padding: 2px 6px; border-radius: 4px;">${applicationNumber}</code>) at Fusion High School.
        </p>
        <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
          During our automated document and detail verification process, our system identified the following item(s) that require your attention:
        </p>

        <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 10px; padding: 18px 22px; margin: 20px 0;">
          <h4 style="margin: 0 0 10px 0; color: #ef4444; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Issues Identified</h4>
          <ul style="margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.5;">
            ${issuesListHtml || '<li style="color: #f87171;">Document clarity or information mismatch detected. Please review uploaded files.</li>'}
          </ul>
        </div>

        <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
          <strong>No need to start over!</strong> Click the button below to resume your application right where you left off, correct the highlighted fields, and upload updated documents.
        </p>
      `;

      return {
        subject: `[Fusion High] Action Required: Application ${applicationNumber} - Document Correction`,
        body: createBaseEmailTemplate({
          preheader: `Update required for ${learnerName}'s application (${applicationNumber})`,
          title,
          subtitle: 'Automated Document Verification Notice',
          contentHtml,
          ctaText: 'Resume & Correct Application',
          ctaLink: resumptionUrl
        })
      };
    },

    // 11. Application Accepted Notification
    applicationAccepted: ({ parentName, learnerName, grade, stream, applicationNumber, registrationUrl }) => {
      const title = 'Admission Application Approved!';
      const contentHtml = `
        <p style="font-size: 15px; color: #ffffff; margin-top: 0;">Dear <strong>${parentName || 'Parent / Guardian'}</strong>,</p>
        <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
          We are thrilled to inform you that the admission application for <strong>${learnerName}</strong> has been <span style="color: #10b981; font-weight: 700;">APPROVED</span> for <strong>Grade ${grade}${stream && stream !== 'General' ? ` (${stream} Stream)` : ''}</strong> at Fusion High School!
        </p>

        <div style="background: #0f172a; border: 1px solid #334155; border-left: 4px solid #10b981; border-radius: 10px; padding: 20px; margin: 24px 0;">
          <h4 style="margin: 0 0 14px 0; color: #ffffff; font-size: 15px; font-weight: 800; letter-spacing: -0.3px;">Enrollment Details</h4>
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 13px;">
            <tr>
              <td style="color: #94a3b8; width: 140px; padding: 4px 0;">Learner Full Name:</td>
              <td style="color: #ffffff; font-weight: 700; padding: 4px 0;">${learnerName}</td>
            </tr>
            <tr>
              <td style="color: #94a3b8; padding: 4px 0;">Grade / Stream:</td>
              <td style="color: #38bdf8; font-weight: 700; padding: 4px 0;">Grade ${grade} &bull; ${stream || 'General'}</td>
            </tr>
            <tr>
              <td style="color: #94a3b8; padding: 4px 0;">Application Ref:</td>
              <td style="color: #e2e8f0; font-family: monospace; font-weight: 700; padding: 4px 0;">${applicationNumber}</td>
            </tr>
            <tr>
              <td style="color: #94a3b8; padding: 4px 0;">Enrollment Status:</td>
              <td style="color: #10b981; font-weight: 800; padding: 4px 0; font-size: 13px;">Provisional Admission Approved</td>
            </tr>
          </table>
        </div>

        <div style="background: rgba(56, 189, 248, 0.08); border: 1px solid rgba(56, 189, 248, 0.25); border-radius: 10px; padding: 18px; margin: 20px 0;">
          <h4 style="margin: 0 0 6px 0; color: #38bdf8; font-size: 14px; font-weight: 700;">Next Step: Complete Parent Registration</h4>
          <p style="margin: 0; font-size: 13px; color: #cbd5e1; line-height: 1.5;">
            To finalize enrollment and issue your child's official <strong>Learner Number</strong> and student portal login, please click the button below to complete the <strong>Parent Registration Form</strong>.
          </p>
        </div>
      `;

      return {
        subject: `[Fusion High] Congratulations! Application Approved: ${learnerName} (Grade ${grade})`,
        body: createBaseEmailTemplate({
          preheader: `Admission approved for ${learnerName} - Grade ${grade}`,
          title,
          subtitle: 'Official Letter of Acceptance',
          contentHtml,
          ctaText: 'Complete Registration & Issue Learner ID',
          ctaLink: registrationUrl
        })
      };
    },

    // 12. Application Waitlisted
    applicationWaitlisted: ({ parentName, learnerName, grade, applicationNumber }) => {
      const title = 'Application Status: Waiting List Notification';
      const contentHtml = `
        <p style="font-size: 15px; color: #ffffff; margin-top: 0;">Dear <strong>${parentName || 'Parent / Guardian'}</strong>,</p>
        <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
          Thank you for applying to Fusion High School for <strong>${learnerName}</strong> for <strong>Grade ${grade}</strong> (Ref: <code style="color: #38bdf8; background: #0f172a; padding: 2px 6px; border-radius: 4px;">${applicationNumber}</code>).
        </p>
        <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
          Our Grade ${grade} classes are currently operating at maximum capacity (< 30 learners per class limit). Your application has passed initial qualification and has been placed on our priority <strong>Waiting List</strong>.
        </p>
        <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 10px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0; color: #fbbf24; font-weight: 700; font-size: 14px;">Next Steps</p>
          <p style="margin: 6px 0 0 0; color: #cbd5e1; font-size: 13px;">
            As soon as an enrollment opening becomes available, our Admissions Office will immediately contact you via email and SMS with final registration instructions.
          </p>
        </div>
      `;

      return {
        subject: `[Fusion High] Waiting List Notice: Application ${applicationNumber} - Grade ${grade}`,
        body: createBaseEmailTemplate({
          preheader: `Application ${applicationNumber} placed on Grade ${grade} Waiting List`,
          title,
          subtitle: 'Grade Capacity Update',
          contentHtml
        })
      };
    },

    // 13. Employee / Teacher Welcome with Login Credentials & Assigned Subjects
    employeeWelcome: ({ name, surname, email, temporaryPassword, roleTitle = 'Educator / Teacher', department = 'Academic Department', subjects = [], grades = [], classes = [], baseUrl = 'http://localhost:5173' }) => {
      const title = 'Welcome to Fusion High School — Staff Account Credentials';
      const cleanBaseUrl = (baseUrl || 'http://localhost:5173').replace(/\/+$/, '');
      const loginUrl = `${cleanBaseUrl}/login`;

      const subjectsDisplay = Array.isArray(subjects) && subjects.length > 0
        ? subjects.join(', ')
        : 'General Allocation';

      const gradesDisplay = Array.isArray(grades) && grades.length > 0
        ? grades.map(g => `Grade ${g}`).join(', ')
        : 'Grade 10, 11, 12';

      const classesDisplay = Array.isArray(classes) && classes.length > 0
        ? classes.join(', ')
        : 'Assigned Classes';

      const contentHtml = `
        <p style="font-size: 15px; color: #ffffff; margin-top: 0;">Dear <strong>${name} ${surname}</strong>,</p>
        <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
          Welcome to Fusion High School. Your staff account has been created by the School Administration / Principal (Mr Kunene).
        </p>
        <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
          You can now access the staff portal to manage your assigned subjects, mark registers, classroom attendance, and parent-learner communications.
        </p>

        <div style="background: #0f172a; border: 1px solid #334155; border-left: 4px solid #38bdf8; border-radius: 12px; padding: 20px 24px; margin: 22px 0;">
          <h4 style="margin: 0 0 14px 0; color: #38bdf8; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
            Your Staff Access Credentials
          </h4>
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 13px;">
            <tr>
              <td style="padding: 6px 0; color: #94a3b8; width: 150px;">Full Name:</td>
              <td style="padding: 6px 0; color: #ffffff; font-weight: 700;">${name} ${surname}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #94a3b8;">Login Email:</td>
              <td style="padding: 6px 0; color: #38bdf8; font-family: monospace; font-weight: 700;">${email}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #94a3b8;">Temporary Password:</td>
              <td style="padding: 6px 0;">
                <span style="display: inline-block; background: rgba(99, 102, 241, 0.2); border: 1px solid rgba(99, 102, 241, 0.4); color: #c7d2fe; padding: 3px 10px; border-radius: 6px; font-family: monospace; font-weight: 800; font-size: 14px;">
                  ${temporaryPassword}
                </span>
                <span style="font-size: 11px; color: #94a3b8; margin-left: 8px;">(Change after first sign in)</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #94a3b8;">Designation / Role:</td>
              <td style="padding: 6px 0; color: #ffffff; font-weight: 700;">${roleTitle}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #94a3b8;">Department:</td>
              <td style="padding: 6px 0; color: #ffffff; font-weight: 700;">${department}</td>
            </tr>
          </table>
        </div>

        <div style="background: rgba(15, 23, 42, 0.8); border: 1px solid #334155; border-left: 4px solid #10b981; border-radius: 12px; padding: 18px 22px; margin: 20px 0;">
          <h4 style="margin: 0 0 12px 0; color: #34d399; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
            Assigned Teaching Workload
          </h4>
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 13px;">
            <tr>
              <td style="padding: 5px 0; color: #94a3b8; width: 150px;">Assigned Subject(s):</td>
              <td style="padding: 5px 0; color: #34d399; font-weight: 700;">${subjectsDisplay}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #94a3b8;">Grades Taught:</td>
              <td style="padding: 5px 0; color: #ffffff; font-weight: 700;">${gradesDisplay}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #94a3b8;">Classes Taught:</td>
              <td style="padding: 5px 0; color: #ffffff; font-weight: 700;">${classesDisplay}</td>
            </tr>
          </table>
        </div>

        <p style="color: #cbd5e1; font-size: 13px; line-height: 1.6;">
          Please sign in to your dashboard to view your timetable, download past papers and textbooks, and submit student marks.
        </p>
      `;

      return {
        subject: `Welcome to Fusion High School — Staff Account Credentials for ${name} ${surname}`,
        body: createBaseEmailTemplate({
          preheader: `Welcome to Fusion High School. Staff account details and temporary password for ${name} ${surname}.`,
          title,
          subtitle: `Staff Profile & Workload Assignment Notification`,
          contentHtml,
          ctaText: 'Sign In to Staff Portal',
          ctaLink: loginUrl
        })
      };
    },

    parentWelcome: ({ name, surname, email, temporaryPassword, baseUrl }) => {
      const title = `Welcome to Fusion High School Parent Portal`;
      const cleanBaseUrl = (baseUrl || process.env.APP_URL || process.env.BASE_URL || 'https://fusion-high-app.onrender.com').replace(/\/+$/, '');
      const loginUrl = `${cleanBaseUrl}/login`;

      const contentHtml = `
        <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
          Dear <strong style="color: #ffffff;">${name} ${surname}</strong>,
        </p>
        <p style="color: #cbd5e1; font-size: 13px; line-height: 1.6; margin-bottom: 20px;">
          An official parent account has been created for you on the <strong>Fusion High School Parent Portal</strong>. You can now securely monitor your children's academic reports, track live class attendance, view timetables, communicate with teachers, and pay school fees.
        </p>

        <!-- Credentials Card -->
        <div style="background: rgba(15, 23, 42, 0.8); border: 1px solid #334155; border-left: 4px solid #4f46e5; border-radius: 12px; padding: 20px 24px; margin: 24px 0;">
          <h4 style="margin: 0 0 14px 0; color: #818cf8; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
            Your Login Credentials
          </h4>
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 13px;">
            <tr>
              <td style="padding: 6px 0; color: #94a3b8; width: 140px;">Portal URL:</td>
              <td style="padding: 6px 0; color: #38bdf8; font-weight: 600;">
                <a href="${loginUrl}" style="color: #38bdf8; text-decoration: none;">${loginUrl}</a>
              </td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #94a3b8;">Login Email:</td>
              <td style="padding: 6px 0; color: #ffffff; font-weight: 700; font-family: monospace;">${email}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #94a3b8;">Temporary Password:</td>
              <td style="padding: 6px 0; color: #34d399; font-weight: 700; font-family: monospace; font-size: 14px;">${temporaryPassword}</td>
            </tr>
          </table>
        </div>

        <!-- Linking Children Guide -->
        <div style="background: rgba(15, 23, 42, 0.8); border: 1px solid #334155; border-left: 4px solid #06b6d4; border-radius: 12px; padding: 18px 22px; margin: 20px 0;">
          <h4 style="margin: 0 0 12px 0; color: #22d3ee; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
            How to Link Your Child / Children
          </h4>
          <ol style="margin: 0; padding-left: 18px; color: #cbd5e1; font-size: 13px; line-height: 1.6;">
            <li style="margin-bottom: 6px;">Sign in to your parent dashboard using your email and temporary password.</li>
            <li style="margin-bottom: 6px;">Click on <strong>"Link Child / Learner"</strong>.</li>
            <li style="margin-bottom: 6px;">Enter your child's <strong>Learner Number</strong> (e.g., <code style="color: #38bdf8;">2026001</code> or <code style="color: #38bdf8;">2026-FHS-001</code>) and their <strong>National ID Number</strong>.</li>
            <li>You can repeat this simple step to link <strong>all of your children</strong> to the same account.</li>
          </ol>
        </div>

        <p style="color: #94a3b8; font-size: 12px; line-height: 1.5; margin-top: 24px;">
          For security reasons, we recommend updating your password in your profile settings after your initial login.
        </p>
      `;

      return {
        subject: `Welcome to Fusion High School — Parent Portal Account Details`,
        body: createBaseEmailTemplate({
          preheader: `Your Fusion High Parent Portal account is ready. Temporary login credentials inside.`,
          title,
          subtitle: `Official Parent & Guardian Account Activation`,
          contentHtml,
          ctaText: 'Sign In to Parent Portal',
          ctaLink: loginUrl
        })
      };
    },

    timetableDraft: ({ teacherName, grade, stream, timetableName }) => {
      const title = `Timetable Draft for Review: Grade ${grade} (${stream})`;
      const loginUrl = (process.env.APP_URL || 'https://educonnect-cmyh.onrender.com').trim() + '/login';

      const contentHtml = `
        <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6; margin-top: 0;">
          Dear <strong>${teacherName || 'Educator'}</strong>,
        </p>
        <p style="color: #cbd5e1; font-size: 13px; line-height: 1.6;">
          Administration has generated and distributed the clash-free 1-hour weekly timetable draft for <strong>Grade ${grade} (${stream})</strong>.
        </p>

        <div style="background: #0f172a; border: 1px solid #334155; border-left: 4px solid #38bdf8; border-radius: 12px; padding: 20px 24px; margin: 22px 0;">
          <h4 style="margin: 0 0 14px 0; color: #38bdf8; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
            Schedule Details
          </h4>
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 13px;">
            <tr>
              <td style="padding: 6px 0; color: #94a3b8; width: 140px;">Timetable:</td>
              <td style="padding: 6px 0; color: #ffffff; font-weight: 700;">${timetableName || `Grade ${grade} Master Timetable`}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #94a3b8;">Target Grade:</td>
              <td style="padding: 6px 0; color: #38bdf8; font-weight: 700;">Grade ${grade} (${stream})</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #94a3b8;">Daily Structure:</td>
              <td style="padding: 6px 0; color: #34d399; font-weight: 700;">6 Periods × 1 Hour (07:15 - 14:00)</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #94a3b8;">Status:</td>
              <td style="padding: 6px 0; color: #fbbf24; font-weight: 700;">Pending Educator Review</td>
            </tr>
          </table>
        </div>

        <div style="background: rgba(15, 23, 42, 0.8); border: 1px solid #334155; border-left: 4px solid #10b981; border-radius: 12px; padding: 18px 22px; margin: 20px 0;">
          <h4 style="margin: 0 0 10px 0; color: #34d399; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
            Action Required
          </h4>
          <ol style="margin: 0; padding-left: 18px; color: #cbd5e1; font-size: 13px; line-height: 1.6;">
            <li style="margin-bottom: 6px;">Sign in to your <strong>Educator Portal</strong>.</li>
            <li style="margin-bottom: 6px;">Open the <strong>Timetable</strong> tab to inspect your assigned periods and rooms.</li>
            <li>Once you confirm your allocations are accurate, click <strong>"Publish to Learners & Parents"</strong> to make the schedule live.</li>
          </ol>
        </div>
      `;

      return {
        subject: `[Fusion High] Timetable Draft for Educator Review: Grade ${grade} (${stream})`,
        body: createBaseEmailTemplate({
          preheader: `Grade ${grade} timetable draft is ready for your review in the Educator Portal.`,
          title,
          subtitle: `Official Educator Timetable Verification Notice`,
          contentHtml,
          ctaText: 'Review My Schedule in Portal',
          ctaLink: loginUrl
        })
      };
    },

    timetableReleased: ({ recipientName, grade, stream, timetableName }) => {
      const title = `Official Timetable Released: Grade ${grade} (${stream})`;
      const loginUrl = (process.env.APP_URL || 'https://educonnect-cmyh.onrender.com').trim() + '/login';

      const contentHtml = `
        <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6; margin-top: 0;">
          Dear <strong>${recipientName || 'Learner / Parent'}</strong>,
        </p>
        <p style="color: #cbd5e1; font-size: 13px; line-height: 1.6;">
          Your subject educators have verified and officially published the weekly 1-hour class schedule for <strong>Grade ${grade} (${stream})</strong>.
        </p>

        <div style="background: #0f172a; border: 1px solid #334155; border-left: 4px solid #10b981; border-radius: 12px; padding: 20px 24px; margin: 22px 0;">
          <h4 style="margin: 0 0 14px 0; color: #34d399; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
            Schedule Summary
          </h4>
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 13px;">
            <tr>
              <td style="padding: 6px 0; color: #94a3b8; width: 140px;">Timetable:</td>
              <td style="padding: 6px 0; color: #ffffff; font-weight: 700;">${timetableName || `Grade ${grade} Master Timetable`}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #94a3b8;">Grade:</td>
              <td style="padding: 6px 0; color: #38bdf8; font-weight: 700;">Grade ${grade} (${stream})</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #94a3b8;">School Hours:</td>
              <td style="padding: 6px 0; color: #34d399; font-weight: 700;">07:15 - 14:00 (1-Hour Periods)</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #94a3b8;">Status:</td>
              <td style="padding: 6px 0; color: #10b981; font-weight: 700;">Live & Active</td>
            </tr>
          </table>
        </div>

        <p style="color: #cbd5e1; font-size: 13px; line-height: 1.6;">
          You can now view your daily periods, classroom allocations, and subject teachers in your portal.
        </p>
      `;

      return {
        subject: `[Fusion High] Official Timetable Released: Grade ${grade} (${stream})`,
        body: createBaseEmailTemplate({
          preheader: `Your official Grade ${grade} weekly class timetable is now live in your portal.`,
          title,
          subtitle: `Official Academic Schedule Release`,
          contentHtml,
          ctaText: 'View My Timetable',
          ctaLink: loginUrl
        })
      };
    },

    examInvigilationNotice: ({ teacherName, sessionTitle, venue, date, time, role }) => {
      const loginUrl = (process.env.APP_URL || 'https://educonnect-cmyh.onrender.com').trim() + '/login';
      const contentHtml = `
        <p style="color: #cbd5e1; font-size: 14px; margin-top: 0;">Dear <strong>${teacherName}</strong>,</p>
        <p style="color: #cbd5e1; font-size: 13px;">You have been officially assigned as <strong>${role || 'Invigilator'}</strong> for the upcoming formal examination session.</p>
        <div style="background: #0f172a; border: 1px solid #334155; border-left: 4px solid #6366f1; border-radius: 12px; padding: 18px 22px; margin: 20px 0;">
          <p style="margin: 0; color: #818cf8; font-weight: 700; font-size: 15px;">${sessionTitle}</p>
          <p style="margin: 6px 0 0 0; color: #cbd5e1; font-size: 13px;">Venue: <strong>${venue}</strong></p>
          <p style="margin: 4px 0 0 0; color: #94a3b8; font-size: 12px;">Date: <strong>${date}</strong> | Time: <strong>${time}</strong></p>
          <p style="margin: 4px 0 0 0; color: #34d399; font-size: 12px;">Role: <strong>${role || 'Invigilator'}</strong></p>
        </div>
        <p style="color: #94a3b8; font-size: 12px;">Please arrive at the exam venue 20 minutes prior to paper commencement to oversee candidate check-in.</p>
      `;
      return {
        subject: `[Fusion High] Exam Invigilation Duty: ${sessionTitle} (${date})`,
        body: createBaseEmailTemplate({
          preheader: `Invigilation assignment for ${sessionTitle} on ${date}.`,
          title: 'Exam Invigilation Duty Assignment',
          subtitle: 'Formal Assessment Office',
          contentHtml,
          ctaText: 'Open Exam Seating Manager',
          ctaLink: loginUrl
        })
      };
    },

    matricRemedialNotice: ({ recipientName, learnerName, subjects, clinicSchedule }) => {
      const loginUrl = (process.env.APP_URL || 'https://educonnect-cmyh.onrender.com').trim() + '/login';
      const contentHtml = `
        <p style="color: #cbd5e1; font-size: 14px; margin-top: 0;">Dear <strong>${recipientName}</strong>,</p>
        <p style="color: #cbd5e1; font-size: 13px;">In preparation for the National Senior Certificate (NSC) examinations, <strong>${learnerName}</strong> has been enrolled into our intensive <strong>Matric Academic Remedial & Saturday Clinic Program</strong>.</p>
        <div style="background: #0f172a; border: 1px solid #334155; border-left: 4px solid #f59e0b; border-radius: 12px; padding: 18px 22px; margin: 20px 0;">
          <p style="margin: 0; color: #fbbf24; font-weight: 700; font-size: 14px;">Focus Subjects: ${Array.isArray(subjects) ? subjects.join(', ') : subjects}</p>
          <p style="margin: 6px 0 0 0; color: #cbd5e1; font-size: 13px;">Schedule: <strong>${clinicSchedule || 'Saturdays 08:30 - 12:30 & Tue/Thu Afternoon Labs'}</strong></p>
        </div>
        <p style="color: #cbd5e1; font-size: 13px;">Curated CAPS past-paper revision packs and AI Tutor exercises are now active in the learner dashboard.</p>
      `;
      return {
        subject: `[Fusion High] Matric Academic Clinic Enrollment: ${learnerName}`,
        body: createBaseEmailTemplate({
          preheader: `Remedial clinic enrollment and study pack for ${learnerName}.`,
          title: 'Matric At-Risk Intervention & Clinic Roster',
          subtitle: 'Academic Excellence Department',
          contentHtml,
          ctaText: 'Access Revision Materials',
          ctaLink: loginUrl
        })
      };
    },

    textbookOverdueNotice: ({ parentName, learnerName, textbookTitle, unitCost, dueDate }) => {
      const loginUrl = (process.env.APP_URL || 'https://educonnect-cmyh.onrender.com').trim() + '/login';
      const contentHtml = `
        <p style="color: #cbd5e1; font-size: 14px; margin-top: 0;">Dear <strong>${parentName}</strong>,</p>
        <p style="color: #cbd5e1; font-size: 13px;">This is an official notice regarding an overdue learning resource issued to <strong>${learnerName}</strong>.</p>
        <div style="background: #0f172a; border: 1px solid #334155; border-left: 4px solid #ef4444; border-radius: 12px; padding: 18px 22px; margin: 20px 0;">
          <p style="margin: 0; color: #f87171; font-weight: 700; font-size: 14px;">Resource: ${textbookTitle}</p>
          <p style="margin: 6px 0 0 0; color: #cbd5e1; font-size: 13px;">Due Date: <strong>${dueDate || 'End of Term'}</strong></p>
          <p style="margin: 4px 0 0 0; color: #fbbf24; font-size: 13px;">Replacement Value: <strong>R${unitCost || '350.00'}</strong></p>
        </div>
        <p style="color: #cbd5e1; font-size: 13px;">Please ensure the textbook is returned to the school library within 3 school days to avoid replacement cost billing.</p>
      `;
      return {
        subject: `[Fusion High] Overdue Textbook Notice: ${textbookTitle} (${learnerName})`,
        body: createBaseEmailTemplate({
          preheader: `Overdue textbook notice for ${learnerName}.`,
          title: 'Textbook Asset Return Notice',
          subtitle: 'Learning Resources & Library Services',
          contentHtml,
          ctaText: 'View Student Account',
          ctaLink: loginUrl
        })
      };
    },

    consultationBookedNotice: ({ recipientName, otherPartyName, learnerName, subjectName, date, timeSlot, meetingLink }) => {
      const loginUrl = (process.env.APP_URL || 'https://educonnect-cmyh.onrender.com').trim() + '/login';
      const contentHtml = `
        <p style="color: #cbd5e1; font-size: 14px; margin-top: 0;">Dear <strong>${recipientName}</strong>,</p>
        <p style="color: #cbd5e1; font-size: 13px;">A 1-on-1 parent-educator consultation has been confirmed for <strong>${learnerName}</strong>.</p>
        <div style="background: #0f172a; border: 1px solid #334155; border-left: 4px solid #38bdf8; border-radius: 12px; padding: 18px 22px; margin: 20px 0;">
          <p style="margin: 0; color: #38bdf8; font-weight: 700; font-size: 14px;">Consultation with: ${otherPartyName}</p>
          <p style="margin: 6px 0 0 0; color: #cbd5e1; font-size: 13px;">Subject: <strong>${subjectName || 'General Academic Progress'}</strong></p>
          <p style="margin: 4px 0 0 0; color: #cbd5e1; font-size: 13px;">Date & Time: <strong>${date} at ${timeSlot}</strong></p>
          ${meetingLink ? `<p style="margin: 6px 0 0 0; color: #34d399; font-size: 12px;">Virtual Room: <a href="${meetingLink}" style="color: #38bdf8; text-decoration: underline;">Join Video Consultation</a></p>` : ''}
        </div>
      `;
      return {
        subject: `[Fusion High] Confirmed Consultation: ${learnerName} with ${otherPartyName}`,
        body: createBaseEmailTemplate({
          preheader: `Parent-Teacher consultation scheduled for ${date}.`,
          title: 'Parent-Educator Consultation Confirmed',
          subtitle: 'Academic Support Services',
          contentHtml,
          ctaText: 'Open Parent Portal',
          ctaLink: loginUrl
        })
      };
    },

    sundayParentDigest: ({ parentName, learnerName, attendancePct, upcomingTests, pendingHomework, feeBalance }) => {
      const loginUrl = (process.env.APP_URL || 'https://educonnect-cmyh.onrender.com').trim() + '/login';
      const contentHtml = `
        <p style="color: #cbd5e1; font-size: 14px; margin-top: 0;">Dear <strong>${parentName}</strong>,</p>
        <p style="color: #cbd5e1; font-size: 13px;">Here is your weekly academic summary for <strong>${learnerName}</strong> as we head into the new school week.</p>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 20px 0;">
          <div style="background: #0f172a; border: 1px solid #334155; border-radius: 10px; padding: 14px;">
            <p style="margin: 0; color: #94a3b8; font-size: 11px; text-transform: uppercase; font-weight: 700;">Attendance</p>
            <p style="margin: 4px 0 0 0; color: #34d399; font-size: 20px; font-weight: 800;">${attendancePct}%</p>
          </div>
          <div style="background: #0f172a; border: 1px solid #334155; border-radius: 10px; padding: 14px;">
            <p style="margin: 0; color: #94a3b8; font-size: 11px; text-transform: uppercase; font-weight: 700;">Fee Balance</p>
            <p style="margin: 4px 0 0 0; color: ${parseFloat(feeBalance) > 0 ? '#fbbf24' : '#34d399'}; font-size: 20px; font-weight: 800;">R${feeBalance}</p>
          </div>
        </div>

        <div style="background: #0f172a; border: 1px solid #334155; border-radius: 12px; padding: 16px 20px; margin-bottom: 20px;">
          <h4 style="margin: 0 0 8px 0; color: #38bdf8; font-size: 13px;">Upcoming Assessments & Tasks</h4>
          <p style="margin: 0; color: #cbd5e1; font-size: 12px;"><strong>Assessments:</strong> ${upcomingTests || 'No formal tests scheduled this week.'}</p>
          <p style="margin: 6px 0 0 0; color: #cbd5e1; font-size: 12px;"><strong>Homework Tasks:</strong> ${pendingHomework || 'All current homework assignments submitted.'}</p>
        </div>
      `;
      return {
        subject: `[Fusion High] Weekly Academic Digest: ${learnerName}`,
        body: createBaseEmailTemplate({
          preheader: `Weekly academic and attendance overview for ${learnerName}.`,
          title: 'Weekly Parent Academic Digest',
          subtitle: 'Fusion High Executive Summary',
          contentHtml,
          ctaText: 'Sign In to Parent Portal',
          ctaLink: loginUrl
        })
      };
    },

    // 14. Formal School Announcement & Communique
    schoolAnnouncement: ({ recipientName, title, content, authorName, authorRole, targetAudience, date, baseUrl = 'https://educonnect-cmyh.onrender.com' }) => {
      const loginUrl = `${(baseUrl || 'https://educonnect-cmyh.onrender.com').replace(/\/+$/, '')}/login`;
      const displayDate = date || new Date().toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' });
      const audienceBadge = targetAudience ? targetAudience.toUpperCase() : 'GENERAL';

      const contentHtml = `
        <p style="color: #cbd5e1; font-size: 15px; margin-top: 0;">Dear <strong>${recipientName || 'Member of Fusion High Community'}</strong>,</p>
        <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
          An official school communique has been issued by <strong>${authorName || 'School Administration'}</strong>${authorRole ? ` (${authorRole})` : ''}:
        </p>

        <div style="background: #0f172a; border: 1px solid #334155; border-left: 4px solid #38bdf8; border-radius: 12px; padding: 22px 24px; margin: 20px 0;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <span style="font-size: 11px; font-weight: 800; color: #38bdf8; background: rgba(56, 189, 248, 0.15); padding: 4px 10px; border-radius: 6px; text-transform: uppercase; border: 1px solid rgba(56, 189, 248, 0.3);">
              Audience: ${audienceBadge}
            </span>
            <span style="font-size: 12px; color: #94a3b8;">${displayDate}</span>
          </div>
          <h3 style="margin: 0 0 12px 0; color: #ffffff; font-size: 18px; font-weight: 800;">${title}</h3>
          <div style="color: #e2e8f0; font-size: 14px; line-height: 1.7; white-space: pre-wrap;">${content}</div>
        </div>

        <p style="color: #94a3b8; font-size: 12px; line-height: 1.5;">
          This formal announcement is also recorded in your portal <strong>Message Center</strong> and Notice Board.
        </p>
      `;

      return {
        subject: `[Fusion High Official Communique] ${title}`,
        body: createBaseEmailTemplate({
          preheader: `${title} - Official communique from ${authorName || 'School Administration'}.`,
          title: 'Official School Announcement',
          subtitle: 'Executive Communique & Circular',
          contentHtml,
          ctaText: 'View In Portal Notice Board',
          ctaLink: loginUrl
        })
      };
    },

    // 15. Application Accepted / Approved
    applicationAccepted: ({ parentName, learnerName, grade, stream, applicationNumber, learnerNumber, registrationUrl, baseUrl = 'https://educonnect-cmyh.onrender.com' }) => {
      const loginUrl = registrationUrl || `${(baseUrl || 'https://educonnect-cmyh.onrender.com').replace(/\/+$/, '')}/register`;
      const contentHtml = `
        <p style="color: #ffffff; font-size: 15px; margin-top: 0;">Dear <strong>${parentName || 'Parent / Guardian'}</strong>,</p>
        <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
          We are pleased to inform you that the admission application for <strong>${learnerName}</strong> has been <strong style="color: #34d399;">OFFICIALLY APPROVED</strong> for admission to Fusion High School.
        </p>

        <div style="background: #0f172a; border: 1px solid #334155; border-left: 4px solid #10b981; border-radius: 12px; padding: 20px 24px; margin: 22px 0;">
          <h4 style="margin: 0 0 14px 0; color: #34d399; font-size: 14px; font-weight: 800; text-transform: uppercase;">
            Admission Details
          </h4>
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 13px; color: #cbd5e1;">
            <tr>
              <td style="padding: 5px 0; color: #94a3b8; width: 150px;">Learner Name:</td>
              <td style="color: #ffffff; font-weight: 700;">${learnerName}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #94a3b8;">Grade & Stream:</td>
              <td style="color: #38bdf8; font-weight: 700;">Grade ${grade || '8'} (${stream || 'General'})</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #94a3b8;">Application Reference:</td>
              <td style="color: #fbbf24; font-family: monospace; font-weight: 700;">${applicationNumber || 'APP-2026'}</td>
            </tr>
            ${learnerNumber ? `<tr>
              <td style="padding: 5px 0; color: #94a3b8;">Allocated Student ID:</td>
              <td style="color: #34d399; font-family: monospace; font-weight: 700;">${learnerNumber}</td>
            </tr>` : ''}
          </table>
        </div>

        <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 10px; padding: 14px 18px; margin: 18px 0;">
          <p style="margin: 0; font-size: 13px; color: #34d399; font-weight: 700;">Next Step: Complete Registration</p>
          <p style="margin: 4px 0 0 0; font-size: 12px; color: #cbd5e1; line-height: 1.5;">
            Please click the button below to complete Parent Registration and activate your child's student portal account.
          </p>
        </div>
      `;

      return {
        subject: `[Fusion High] Admission Approved: Welcome ${learnerName} to Grade ${grade || '8'}!`,
        body: createBaseEmailTemplate({
          preheader: `Congratulations! ${learnerName} has been accepted to Fusion High School.`,
          title: 'Admission Application Approved',
          subtitle: 'Official Letter of Acceptance',
          contentHtml,
          ctaText: 'Complete Parent Registration & Link Student',
          ctaLink: loginUrl
        })
      };
    },

    // 16. Application Waitlisted
    applicationWaitlisted: ({ parentName, learnerName, grade, applicationNumber }) => {
      const loginUrl = (process.env.APP_URL || 'https://educonnect-cmyh.onrender.com').trim() + '/application-status.html';
      const contentHtml = `
        <p style="color: #ffffff; font-size: 15px; margin-top: 0;">Dear <strong>${parentName || 'Parent / Guardian'}</strong>,</p>
        <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
          Thank you for submitting an admission application for <strong>${learnerName}</strong> for <strong>Grade ${grade || '8'}</strong> at Fusion High School.
        </p>

        <div style="background: #0f172a; border: 1px solid #334155; border-left: 4px solid #f59e0b; border-radius: 12px; padding: 20px 24px; margin: 22px 0;">
          <h4 style="margin: 0 0 10px 0; color: #fbbf24; font-size: 14px; font-weight: 800;">
            Status: Priority Waitlist
          </h4>
          <p style="margin: 0; color: #cbd5e1; font-size: 13px; line-height: 1.6;">
            The application meets all academic requirements; however, Grade ${grade || '8'} is currently at maximum statutory capacity (&le; 30 learners per class). ${learnerName} has been placed on our <strong>Priority Waiting List</strong> (Application Ref: <strong>${applicationNumber}</strong>).
          </p>
        </div>

        <p style="color: #94a3b8; font-size: 13px; line-height: 1.6;">
          Our Admissions Office continuously monitors capacity. As vacancies arise, offers are extended in order of waitlist queue. You will be notified immediately via email if a placement opens.
        </p>
      `;

      return {
        subject: `[Fusion High] Application Update: ${learnerName} Placed on Priority Waitlist (Grade ${grade})`,
        body: createBaseEmailTemplate({
          preheader: `Application update for ${learnerName} (Ref: ${applicationNumber}).`,
          title: 'Admission Status Update',
          subtitle: 'Priority Waitlist Placement',
          contentHtml,
          ctaText: 'Track Application Status Online',
          ctaLink: loginUrl
        })
      };
    },

    // 17. Application Correction / Action Required
    applicationCorrection: ({ parentName, learnerName, applicationNumber, issues = [], resumptionUrl }) => {
      const loginUrl = resumptionUrl || (process.env.APP_URL || 'https://educonnect-cmyh.onrender.com').trim() + '/application.html';
      const issuesList = Array.isArray(issues) && issues.length > 0 
        ? issues.map(i => `<li style="margin-bottom: 6px; color: #f87171;">${i}</li>`).join('')
        : '<li style="color: #f87171;">Document clarity or information verification required.</li>';

      const contentHtml = `
        <p style="color: #ffffff; font-size: 15px; margin-top: 0;">Dear <strong>${parentName || 'Parent / Guardian'}</strong>,</p>
        <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
          During the automated verification of the admission application for <strong>${learnerName}</strong> (Ref: <strong>${applicationNumber}</strong>), our system noted items that require your attention:
        </p>

        <div style="background: #0f172a; border: 1px solid #334155; border-left: 4px solid #ef4444; border-radius: 12px; padding: 20px 24px; margin: 22px 0;">
          <h4 style="margin: 0 0 10px 0; color: #f87171; font-size: 14px; font-weight: 800;">
            Action Required Items:
          </h4>
          <ul style="margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.6;">
            ${issuesList}
          </ul>
        </div>

        <p style="color: #cbd5e1; font-size: 13px; line-height: 1.6;">
          Please click the button below to resume your application, update the necessary fields or re-upload clearer documents. Your existing details have been securely saved.
        </p>
      `;

      return {
        subject: `[Action Required] Update Admission Application for ${learnerName} (Ref: ${applicationNumber})`,
        body: createBaseEmailTemplate({
          preheader: `Document update required for ${learnerName}'s admission application.`,
          title: 'Application Action Required',
          subtitle: 'Verification & Document Resubmission',
          contentHtml,
          ctaText: 'Resume & Update Application',
          ctaLink: loginUrl
        })
      };
    },

    // 18. Application Unsuccessful / Rejected
    applicationUnsuccessful: ({ parentName, learnerName, grade, applicationNumber, reason }) => {
      const loginUrl = (process.env.APP_URL || 'https://educonnect-cmyh.onrender.com').trim() + '/application-status.html';
      const contentHtml = `
        <p style="color: #ffffff; font-size: 15px; margin-top: 0;">Dear <strong>${parentName || 'Parent / Guardian'}</strong>,</p>
        <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
          Thank you for considering Fusion High School for <strong>${learnerName}</strong> (Ref: <strong>${applicationNumber || 'N/A'}</strong>).
        </p>

        <div style="background: #0f172a; border: 1px solid #334155; border-left: 4px solid #64748b; border-radius: 12px; padding: 20px 24px; margin: 22px 0;">
          <h4 style="margin: 0 0 10px 0; color: #94a3b8; font-size: 14px; font-weight: 800;">
            Application Status: Unsuccessful
          </h4>
          <p style="margin: 0; color: #cbd5e1; font-size: 13px; line-height: 1.6;">
            After careful review of submitted academic records and statutory grade capacity, we regret to inform you that we are unable to offer a placement for Grade ${grade || '8'} for the upcoming academic cycle.
          </p>
          ${reason ? `<p style="margin: 8px 0 0 0; color: #f87171; font-size: 12px;"><strong>Note:</strong> ${reason}</p>` : ''}
        </div>

        <p style="color: #94a3b8; font-size: 13px; line-height: 1.6;">
          We appreciate your interest in Fusion High School and wish ${learnerName} every success in their academic journey.
        </p>
      `;

      return {
        subject: `[Fusion High] Admission Application Outcome: ${learnerName} (Ref: ${applicationNumber || 'N/A'})`,
        body: createBaseEmailTemplate({
          preheader: `Admission application outcome for ${learnerName}.`,
          title: 'Admission Outcome Notification',
          subtitle: 'Formal Admissions Decision',
          contentHtml,
          ctaText: 'View Application Record',
          ctaLink: loginUrl
        })
      };
    },

    // 19. Employee Welcome & Onboarding
    employeeWelcome: ({ name, email, employeeNumber, role, temporaryPassword, baseUrl = 'https://educonnect-cmyh.onrender.com' }) => {
      const loginUrl = `${(baseUrl || 'https://educonnect-cmyh.onrender.com').replace(/\/+$/, '')}/login`;
      const contentHtml = `
        <p style="color: #ffffff; font-size: 15px; margin-top: 0;">Dear <strong>${name || 'Staff Member'}</strong>,</p>
        <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
          Welcome to the staff body at Fusion High School. Your official staff portal account has been provisioned:
        </p>

        <div style="background: #0f172a; border: 1px solid #334155; border-left: 4px solid #6366f1; border-radius: 12px; padding: 20px 24px; margin: 20px 0;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 13px; color: #cbd5e1;">
            <tr><td style="padding: 4px 0; color: #94a3b8; width: 140px;">Staff ID:</td><td style="color: #ffffff; font-weight: 700;">${employeeNumber || 'EMP-001'}</td></tr>
            <tr><td style="padding: 4px 0; color: #94a3b8;">Designated Role:</td><td style="color: #818cf8; font-weight: 700; text-transform: capitalize;">${role || 'Educator'}</td></tr>
            <tr><td style="padding: 4px 0; color: #94a3b8;">Portal Email:</td><td style="color: #38bdf8; font-family: monospace; font-weight: 700;">${email}</td></tr>
            <tr><td style="padding: 4px 0; color: #94a3b8;">Temporary Password:</td><td style="color: #34d399; font-family: monospace; font-weight: 700;">${temporaryPassword || 'ChangeMe@2026'}</td></tr>
          </table>
        </div>
      `;

      return {
        subject: `Welcome to Fusion High School — Staff Account Credentials`,
        body: createBaseEmailTemplate({
          preheader: `Your staff portal account credentials for Fusion High School.`,
          title: 'Welcome to Fusion High Staff Portal',
          subtitle: 'Staff Onboarding & Credentials',
          contentHtml,
          ctaText: 'Sign In to Staff Portal',
          ctaLink: loginUrl
        })
      };
    },

    // 20. Parent Welcome & Portal Access
    parentWelcome: ({ name, email, temporaryPassword, baseUrl = 'https://educonnect-cmyh.onrender.com' }) => {
      const loginUrl = `${(baseUrl || 'https://educonnect-cmyh.onrender.com').replace(/\/+$/, '')}/login`;
      const contentHtml = `
        <p style="color: #ffffff; font-size: 15px; margin-top: 0;">Dear <strong>${name || 'Parent / Guardian'}</strong>,</p>
        <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
          Welcome to the Fusion High School Parent Portal. Your official access credentials are confirmed below:
        </p>

        <div style="background: #0f172a; border: 1px solid #334155; border-left: 4px solid #38bdf8; border-radius: 12px; padding: 20px 24px; margin: 20px 0;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 13px; color: #cbd5e1;">
            <tr><td style="padding: 4px 0; color: #94a3b8; width: 140px;">Login Email:</td><td style="color: #38bdf8; font-family: monospace; font-weight: 700;">${email}</td></tr>
            ${temporaryPassword ? `<tr><td style="padding: 4px 0; color: #94a3b8;">Password:</td><td style="color: #34d399; font-family: monospace; font-weight: 700;">${temporaryPassword}</td></tr>` : ''}
          </table>
        </div>
      `;

      return {
        subject: `Welcome to Fusion High School — Parent Portal Details`,
        body: createBaseEmailTemplate({
          preheader: `Parent Portal access credentials for Fusion High School.`,
          title: 'Welcome to Parent Portal',
          subtitle: 'Parent & Guardian Portal Access',
          contentHtml,
          ctaText: 'Sign In to Parent Portal',
          ctaLink: loginUrl
        })
      };
    }
  },

  sendSchoolAnnouncement: async (params) => {
    const template = emailService.templates.schoolAnnouncement(params);
    return await emailService.send(params.recipientEmail, template.subject, template.body);
  },

  sendApplicationCorrection: async (params) => {
    const template = emailService.templates.applicationCorrection(params);
    return await emailService.send(params.parentEmail, template.subject, template.body);
  },

  sendApplicationAccepted: async (params) => {
    const template = emailService.templates.applicationAccepted(params);
    return await emailService.send(params.parentEmail, template.subject, template.body);
  },

  sendApplicationWaitlisted: async (params) => {
    const template = emailService.templates.applicationWaitlisted(params);
    return await emailService.send(params.parentEmail, template.subject, template.body);
  },

  sendApplicationUnsuccessful: async (params) => {
    const template = emailService.templates.applicationUnsuccessful(params);
    return await emailService.send(params.parentEmail, template.subject, template.body);
  },

  sendEmployeeWelcome: async (params) => {
    const template = emailService.templates.employeeWelcome(params);
    return await emailService.send(params.email, template.subject, template.body);
  },

  sendParentWelcome: async (params) => {
    const template = emailService.templates.parentWelcome(params);
    return await emailService.send(params.email, template.subject, template.body);
  },

  sendTimetableDraftToTeacher: async (params) => {
    const template = emailService.templates.timetableDraft(params);
    return await emailService.send(params.teacherEmail, template.subject, template.body);
  },

  sendTimetableReleased: async (params) => {
    const template = emailService.templates.timetableReleased(params);
    return await emailService.send(params.email, template.subject, template.body);
  },

  sendExamInvigilationNotice: async (params) => {
    const template = emailService.templates.examInvigilationNotice(params);
    return await emailService.send(params.email, template.subject, template.body);
  },

  sendMatricRemedialNotice: async (params) => {
    const template = emailService.templates.matricRemedialNotice(params);
    return await emailService.send(params.email, template.subject, template.body);
  },

  sendTextbookOverdueNotice: async (params) => {
    const template = emailService.templates.textbookOverdueNotice(params);
    return await emailService.send(params.email, template.subject, template.body);
  },

  sendConsultationBookedNotice: async (params) => {
    const template = emailService.templates.consultationBookedNotice(params);
    return await emailService.send(params.email, template.subject, template.body);
  },

  sendSundayParentDigest: async (params) => {
    const template = emailService.templates.sundayParentDigest(params);
    return await emailService.send(params.email, template.subject, template.body);
  }
};

module.exports = emailService;