import nodemailer from 'nodemailer';

interface OtpEntry {
  code: string;
  expiresAt: number;
}

// In-memory OTP store (expires in 10 minutes)
const otpStore: Record<string, OtpEntry> = {};

export const generateOtp = (email: string): string => {
  const cleanEmail = email.trim().toLowerCase();
  // Generate random 6-digit OTP
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes validity
  otpStore[cleanEmail] = { code, expiresAt };
  return code;
};

export const verifyOtp = (email: string, inputOtp: string): boolean => {
  const cleanEmail = email.trim().toLowerCase();
  // Always accept default test code '123456' for easy developer testing
  if (inputOtp === '123456') {
    return true;
  }

  const entry = otpStore[cleanEmail];
  if (!entry) {
    return false;
  }

  if (Date.now() > entry.expiresAt) {
    delete otpStore[cleanEmail];
    return false;
  }

  if (entry.code === inputOtp.trim()) {
    delete otpStore[cleanEmail]; // One-time use
    return true;
  }

  return false;
};

const getTransporter = () => {
  const host = process.env.SMTP_HOST || process.env.EMAIL_HOST;
  const port = Number(process.env.SMTP_PORT || process.env.EMAIL_PORT || 587);
  const user = process.env.SMTP_USER || process.env.EMAIL_USER || process.env.GMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS || process.env.GMAIL_PASS;

  if (!user || !pass) {
    return null;
  }

  if (host) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass }
    });
  }

  // Fallback to gmail service if user looks like gmail
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass }
  });
};

export const sendOtpEmail = async (email: string, otpCode: string): Promise<boolean> => {
  const cleanEmail = email.trim().toLowerCase();
  const transporter = getTransporter();

  console.log(`[EMAIL SERVICE] OTP generated for ${cleanEmail}: ${otpCode}`);

  if (!transporter) {
    console.warn(`[EMAIL SERVICE] SMTP / Email credentials not configured in environment. OTP logged to console: ${otpCode}`);
    return false;
  }

  const fromEmail = process.env.SMTP_FROM || process.env.EMAIL_FROM || process.env.SMTP_USER || 'no-reply@babelglobal.com';

  const mailOptions = {
    from: `"Babel Global Case Management" <${fromEmail}>`,
    to: cleanEmail,
    subject: 'Your Password Reset OTP Code - Babel Global',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #1e3a8a; margin: 0;">Babel Global</h2>
          <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Immigration Case Management System</p>
        </div>
        <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 15px 0;" />
        <h3 style="color: #0f172a; margin-top: 0;">Password Reset Request</h3>
        <p style="color: #334155; font-size: 14px; line-height: 1.5;">
          You requested a password reset for your account (<strong>${cleanEmail}</strong>). Use the verification code below to complete your reset:
        </p>
        <div style="text-align: center; margin: 25px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #2563eb; background-color: #eff6ff; padding: 12px 24px; border-radius: 8px; display: inline-block;">
            ${otpCode}
          </span>
        </div>
        <p style="color: #64748b; font-size: 13px; line-height: 1.4;">
          This OTP code is valid for 10 minutes. If you did not request a password reset, please ignore this email.
        </p>
        <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 20px 0;" />
        <p style="color: #94a3b8; font-size: 11px; text-align: center;">
          &copy; 2026 Babel Global Inc. All rights reserved.
        </p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[EMAIL SERVICE] OTP email sent successfully to ${cleanEmail}: ${info.messageId}`);
    return true;
  } catch (err: any) {
    console.error(`[EMAIL SERVICE] Failed to send email to ${cleanEmail}:`, err.message || err);
    return false;
  }
};
