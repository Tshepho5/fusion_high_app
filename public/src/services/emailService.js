require('dotenv').config();
const dns = require('dns');
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}
const nodemailer = require('nodemailer');

const getSmtpUser = () => (process.env.SMTP_USER || 'tshepomakola23@gmail.com').trim().replace(/^["']|["']$/g, '');
const getSmtpPass = () => (process.env.SMTP_PASS || '').trim().replace(/^["']|["']$/g, '').replace(/\s+/g, '');

function createTransporter() {
  const user = getSmtpUser();
  const pass = getSmtpPass();
  
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000
  });
}

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
   * Real email sender using Nodemailer with automatic TLS fallback.
   */
  send: async (to, subject, body, replyTo = null) => {
    const senderUser = getSmtpUser();
    const mailOptions = {
      from: `"Fusion High School" <${senderUser}>`,
      to,
      subject,
      html: body,
      ...(replyTo && { replyTo })
    };

    try {
      const transporter = createTransporter();
      const info = await transporter.sendMail(mailOptions);
      console.log(`[EMAIL SUCCESS] Dispatched to ${to}: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.warn('[EMAIL PRIMARY RETRY] Primary transport failed (' + (error.message || error) + '), attempting direct SMTP 465 fallback...');
      try {
        const fallbackTransporter = nodemailer.createTransport({
          service: 'gmail',
          auth: { user: getSmtpUser(), pass: getSmtpPass() },
          tls: { rejectUnauthorized: false }
        });
        const fallbackInfo = await fallbackTransporter.sendMail(mailOptions);
        console.log(`[EMAIL SUCCESS - Fallback 465] Dispatched to ${to}: ${fallbackInfo.messageId}`);
        return { success: true, messageId: fallbackInfo.messageId };
      } catch (fallbackError) {
        console.error('[EMAIL ERROR - Both Transporters Failed]:', fallbackError.message || fallbackError);
        return { success: false, error: error.message || fallbackError.message };
      }
    }
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

    // 6. Learner Admission / Enrollment Notification
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
    }
  },

  sendApplicationCorrection: async (params) => {
    const template = emailService.templates.applicationCorrection(params);
    return await emailService.sendEmail(params.parentEmail, template.subject, template.body);
  },

  sendApplicationAccepted: async (params) => {
    const template = emailService.templates.applicationAccepted(params);
    return await emailService.sendEmail(params.parentEmail, template.subject, template.body);
  },

  sendApplicationWaitlisted: async (params) => {
    const template = emailService.templates.applicationWaitlisted(params);
    return await emailService.sendEmail(params.parentEmail, template.subject, template.body);
  },

  sendEmployeeWelcome: async (params) => {
    const template = emailService.templates.employeeWelcome(params);
    return await emailService.sendEmail(params.email, template.subject, template.body);
  }
};

module.exports = emailService;