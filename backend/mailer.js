const nodemailer = require('nodemailer');

function boolFromEnv(v) {
  if (v === undefined || v === null) return false;
  const s = String(v).trim().toLowerCase();
  return s === '1' || s === 'true' || s === 'yes';
}

function getSmtpConfig() {
  const host = process.env.SMTP_HOST;
  const portRaw = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM;
  const secure = boolFromEnv(process.env.SMTP_SECURE);

  const port = portRaw ? Number(portRaw) : (secure ? 465 : 587);

  return {
    host,
    port,
    secure,
    user,
    pass,
    from,
  };
}

function smtpConfigured() {
  const cfg = getSmtpConfig();
  return Boolean(cfg.host && cfg.user && cfg.pass && cfg.from);
}

async function sendPasswordResetEmail(params) {
  const cfg = getSmtpConfig();
  if (!smtpConfigured()) {
    throw new Error('SMTP is not configured');
  }

  const transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: {
      user: cfg.user,
      pass: cfg.pass,
    },
  });

  const subject = 'Reset your password';
  const text = `You requested a password reset.\n\nReset link: ${params.resetUrl}\n\nReset token (if needed): ${params.token}\n\nThis link expires in 15 minutes. If you did not request this, you can ignore this email.`;
  const html = `
    <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; line-height: 1.4;">
      <h2 style="margin: 0 0 12px;">Reset your password</h2>
      <p style="margin: 0 0 12px;">You requested a password reset.</p>
      <p style="margin: 0 0 12px;">
        <a href="${params.resetUrl}" style="display: inline-block; padding: 10px 14px; background: #2563eb; color: white; border-radius: 10px; text-decoration: none; font-weight: 700;">
          Reset password
        </a>
      </p>
      <p style="margin: 0 0 12px;">If the button doesn't work, copy/paste this link:</p>
      <p style="margin: 0 0 12px; word-break: break-all;"><a href="${params.resetUrl}">${params.resetUrl}</a></p>
      <p style="margin: 0 0 12px;">Or paste this token in the app:</p>
      <p style="margin: 0 0 12px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, \"Liberation Mono\", \"Courier New\", monospace;">
        ${params.token}
      </p>
      <p style="margin: 0; color: #64748b;">This link expires in 15 minutes. If you didn't request this, ignore this email.</p>
    </div>
  `;

  await transporter.sendMail({
    from: cfg.from,
    to: params.to,
    subject,
    text,
    html,
  });
}

module.exports = {
  smtpConfigured,
  sendPasswordResetEmail,
};
