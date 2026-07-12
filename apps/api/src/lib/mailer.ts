import nodemailer from "nodemailer";
import { env } from "../config/env";
import { logger } from "./logger";

export interface InterviewEmailDetails {
  jobTitle: string;
  company: string;
  date: string;
  time: string;
  mode: string;
  meetingLink?: string;
  location?: string;
}

const isMailerConfigured =
  Boolean(env.SMTP_HOST) &&
  Boolean(env.SMTP_PORT) &&
  Boolean(env.SMTP_USER) &&
  Boolean(env.SMTP_PASS) &&
  Boolean(env.EMAIL_FROM);

const transporter = isMailerConfigured
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: Number(env.SMTP_PORT) === 465,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS
      }
    })
  : null;

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

const renderEmailLayout = (title: string, recipientName: string, content: string): string => {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
  </head>
  <body style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0"
            style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;box-shadow:0 2px 8px rgba(0,0,0,0.06);">

            <!-- Header -->
            <tr>
              <td style="background:linear-gradient(135deg,#1B3A6B 0%,#2a5298 100%);padding:24px 32px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td>
                      <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">
                        CampusHire
                      </h1>
                      <p style="margin:4px 0 0 0;font-size:12px;color:#93c5fd;letter-spacing:0.3px;">
                        The Future of Hiring, Today
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding:32px;">
                <p style="margin:0 0 20px 0;font-size:15px;line-height:1.5;color:#374151;">
                  Hi ${recipientName},
                </p>
                ${content}
                <p style="margin:32px 0 0 0;font-size:14px;line-height:1.5;color:#6b7280;">
                  Best regards,<br/>
                  <strong style="color:#374151;">The CampusHire Team</strong>
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="font-size:11px;color:#9ca3af;">
                      Powered by Talentor Edge Private Limited &nbsp;&bull;&nbsp;
                      <a href="mailto:support@campushire.in"
                        style="color:#6b7280;text-decoration:underline;">support@campushire.in</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`.trim();
};

// ---------------------------------------------------------------------------
// CTA button helper
// ---------------------------------------------------------------------------

const renderCtaButton = (label: string, url: string, color = "#0EA5E9"): string => {
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0;">
      <tr>
        <td style="border-radius:8px;background:${color};">
          <a href="${url}" target="_blank" rel="noopener noreferrer"
            style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:600;
                   color:#ffffff;text-decoration:none;border-radius:8px;
                   background:${color};letter-spacing:0.2px;">
            ${label}
          </a>
        </td>
      </tr>
    </table>`.trim();
};

// ---------------------------------------------------------------------------
// Plain-text fallback URL block
// ---------------------------------------------------------------------------

const renderFallbackUrl = (label: string, url: string): string => {
  return `
    <p style="margin:16px 0 0 0;font-size:12px;color:#9ca3af;word-break:break-all;">
      If the button does not work, copy and paste this link into your browser:<br/>
      <a href="${url}" style="color:#6b7280;">${url}</a>
    </p>`.trim();
};

// ---------------------------------------------------------------------------
// Core send helper
// ---------------------------------------------------------------------------

export const sendEmail = async (to: string, subject: string, html: string): Promise<void> => {
  if (!transporter || !env.EMAIL_FROM) {
    logger.warn({ to, subject }, "SMTP not configured; email skipped");
    return;
  }

  await transporter.sendMail({
    from: env.EMAIL_FROM,
    to,
    subject,
    html
  });
};

// ---------------------------------------------------------------------------
// Verification email  (Task 1 + Task 6)
// ---------------------------------------------------------------------------

export const sendVerificationEmail = async (to: string, token: string, name: string): Promise<void> => {
  const verifyUrl = `${env.FRONTEND_URL}/verify-email?token=${encodeURIComponent(token)}`;

  const content = `
    <p style="margin:0 0 12px 0;font-size:15px;font-weight:600;color:#111827;">
      Confirm your email address
    </p>
    <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#374151;">
      Thank you for creating your CampusHire account. Click the button below to verify
      your email and activate your account.
    </p>
    ${renderCtaButton("Verify Email Address", verifyUrl)}
    <p style="margin:16px 0 0 0;font-size:13px;color:#9ca3af;">
      This link expires in <strong>24 hours</strong>. If you did not create a CampusHire
      account, you can safely ignore this email.
    </p>
    ${renderFallbackUrl("Verify email", verifyUrl)}`;

  await sendEmail(
    to,
    "Verify Your CampusHire Email",
    renderEmailLayout("Email Verification", name, content)
  );
};

// ---------------------------------------------------------------------------
// Password reset email  (Task 2 + Task 6)
// ---------------------------------------------------------------------------

export const sendPasswordResetEmail = async (to: string, token: string, name: string): Promise<void> => {
  const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${encodeURIComponent(token)}`;

  const content = `
    <p style="margin:0 0 12px 0;font-size:15px;font-weight:600;color:#111827;">
      Reset your password
    </p>
    <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#374151;">
      We received a request to reset the password for your CampusHire account. Click the
      button below to choose a new password.
    </p>
    ${renderCtaButton("Reset Password", resetUrl, "#1B3A6B")}
    <p style="margin:16px 0 0 0;font-size:13px;color:#9ca3af;">
      This link expires in <strong>1 hour</strong>. If you did not request a password
      reset, please ignore this email — your account remains secure.
    </p>
    ${renderFallbackUrl("Reset password", resetUrl)}`;

  await sendEmail(
    to,
    "Reset Your CampusHire Password",
    renderEmailLayout("Password Reset", name, content)
  );
};

// ---------------------------------------------------------------------------
// Welcome email  (Task 6)
// ---------------------------------------------------------------------------

export const sendWelcomeEmail = async (to: string, name: string, role: string): Promise<void> => {
  const dashboardUrl = `${env.FRONTEND_URL}/dashboard`;
  const roleLabel = role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const content = `
    <p style="margin:0 0 12px 0;font-size:15px;font-weight:600;color:#111827;">
      Welcome to CampusHire!
    </p>
    <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#374151;">
      Your account has been verified and is now active. You are registered as a
      <strong>${roleLabel}</strong> on CampusHire — India's intelligent campus hiring platform.
    </p>
    ${renderCtaButton("Go to Dashboard", dashboardUrl)}
    <p style="margin:16px 0 0 0;font-size:13px;color:#9ca3af;">
      Questions? Reach us at
      <a href="mailto:support@campushire.in" style="color:#6b7280;">support@campushire.in</a>
    </p>`;

  await sendEmail(
    to,
    "Welcome to CampusHire",
    renderEmailLayout("Welcome", name, content)
  );
};

// ---------------------------------------------------------------------------
// Application status update email
// ---------------------------------------------------------------------------

export const sendApplicationStatusEmail = async (
  to: string,
  name: string,
  jobTitle: string,
  status: string
): Promise<void> => {
  const applicationsUrl = `${env.FRONTEND_URL}/dashboard/applications`;

  const content = `
    <p style="margin:0 0 12px 0;font-size:15px;font-weight:600;color:#111827;">
      Application status update
    </p>
    <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#374151;">
      Your application status has been updated.
    </p>
    <table role="presentation" cellspacing="0" cellpadding="0" width="100%"
      style="margin:0 0 20px 0;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
      <tr style="background:#f9fafb;">
        <td style="padding:12px 16px;font-size:13px;color:#6b7280;width:120px;">Role</td>
        <td style="padding:12px 16px;font-size:14px;font-weight:600;color:#111827;">${jobTitle}</td>
      </tr>
      <tr>
        <td style="padding:12px 16px;font-size:13px;color:#6b7280;">Status</td>
        <td style="padding:12px 16px;font-size:14px;font-weight:600;color:#111827;">
          ${status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
        </td>
      </tr>
    </table>
    ${renderCtaButton("View Applications", applicationsUrl)}`;

  await sendEmail(
    to,
    "Application Status Update",
    renderEmailLayout("Application Update", name, content)
  );
};

// ---------------------------------------------------------------------------
// Interview scheduled email
// ---------------------------------------------------------------------------

export const sendInterviewScheduledEmail = async (
  to: string,
  name: string,
  details: InterviewEmailDetails
): Promise<void> => {
  const interviewsUrl = `${env.FRONTEND_URL}/dashboard/interviews`;

  const meetingRow = details.meetingLink
    ? `<tr>
        <td style="padding:12px 16px;font-size:13px;color:#6b7280;">Meeting Link</td>
        <td style="padding:12px 16px;font-size:14px;color:#111827;">
          <a href="${details.meetingLink}" style="color:#0EA5E9;">${details.meetingLink}</a>
        </td>
       </tr>`
    : "";

  const locationRow = details.location
    ? `<tr>
        <td style="padding:12px 16px;font-size:13px;color:#6b7280;">Venue</td>
        <td style="padding:12px 16px;font-size:14px;color:#111827;">${details.location}</td>
       </tr>`
    : "";

  const content = `
    <p style="margin:0 0 12px 0;font-size:15px;font-weight:600;color:#111827;">
      Interview scheduled
    </p>
    <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#374151;">
      Your interview has been confirmed. Please review the details below.
    </p>
    <table role="presentation" cellspacing="0" cellpadding="0" width="100%"
      style="margin:0 0 20px 0;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
      <tr style="background:#f9fafb;">
        <td style="padding:12px 16px;font-size:13px;color:#6b7280;width:120px;">Role</td>
        <td style="padding:12px 16px;font-size:14px;font-weight:600;color:#111827;">${details.jobTitle}</td>
      </tr>
      <tr>
        <td style="padding:12px 16px;font-size:13px;color:#6b7280;">Company</td>
        <td style="padding:12px 16px;font-size:14px;color:#111827;">${details.company}</td>
      </tr>
      <tr style="background:#f9fafb;">
        <td style="padding:12px 16px;font-size:13px;color:#6b7280;">Date</td>
        <td style="padding:12px 16px;font-size:14px;color:#111827;">${details.date}</td>
      </tr>
      <tr>
        <td style="padding:12px 16px;font-size:13px;color:#6b7280;">Time</td>
        <td style="padding:12px 16px;font-size:14px;color:#111827;">${details.time}</td>
      </tr>
      <tr style="background:#f9fafb;">
        <td style="padding:12px 16px;font-size:13px;color:#6b7280;">Mode</td>
        <td style="padding:12px 16px;font-size:14px;color:#111827;">${details.mode}</td>
      </tr>
      ${meetingRow}
      ${locationRow}
    </table>
    ${renderCtaButton("View Interview Details", interviewsUrl)}`;

  await sendEmail(
    to,
    "Interview Scheduled — CampusHire",
    renderEmailLayout("Interview Scheduled", name, content)
  );
};

// ---------------------------------------------------------------------------
// Offer received email
// ---------------------------------------------------------------------------

export const sendOfferEmail = async (
  to: string,
  name: string,
  jobTitle: string,
  company: string
): Promise<void> => {
  const applicationsUrl = `${env.FRONTEND_URL}/dashboard/applications`;

  const content = `
    <p style="margin:0 0 12px 0;font-size:15px;font-weight:600;color:#111827;">
      Congratulations — you have received an offer! 🎉
    </p>
    <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#374151;">
      Great news! You have received a job offer through CampusHire.
    </p>
    <table role="presentation" cellspacing="0" cellpadding="0" width="100%"
      style="margin:0 0 20px 0;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
      <tr style="background:#f9fafb;">
        <td style="padding:12px 16px;font-size:13px;color:#6b7280;width:120px;">Role</td>
        <td style="padding:12px 16px;font-size:14px;font-weight:600;color:#111827;">${jobTitle}</td>
      </tr>
      <tr>
        <td style="padding:12px 16px;font-size:13px;color:#6b7280;">Company</td>
        <td style="padding:12px 16px;font-size:14px;color:#111827;">${company}</td>
      </tr>
    </table>
    ${renderCtaButton("View Offer", applicationsUrl, "#10B981")}`;

  await sendEmail(
    to,
    "Offer Received — CampusHire",
    renderEmailLayout("Offer Received", name, content)
  );
};
