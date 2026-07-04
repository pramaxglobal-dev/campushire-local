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

const renderEmailLayout = (title: string, recipientName: string, content: string): string => {
  return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
  </head>
  <body style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="620" cellspacing="0" cellpadding="0" style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
            <tr>
              <td style="background:#1B3A6B;padding:20px 28px;">
                <h1 style="margin:0;font-size:20px;color:#ffffff;">CampusHire</h1>
                <p style="margin:6px 0 0 0;font-size:13px;color:#d1e5ff;">The Future of Hiring, Today</p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <p style="margin:0 0 16px 0;font-size:15px;">Hi ${recipientName},</p>
                ${content}
                <p style="margin:24px 0 0 0;font-size:14px;">Regards,<br/>CampusHire Team</p>
              </td>
            </tr>
            <tr>
              <td style="padding:14px 28px;background:#f9fafb;border-top:1px solid #e5e7eb;font-size:12px;color:#6b7280;">
                Powered by Talentor Edge Private Limited
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`.trim();
};

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

export const sendVerificationEmail = async (to: string, token: string, name: string): Promise<void> => {
  const content = `
    <p style="margin:0 0 12px 0;font-size:14px;line-height:1.6;">
      Please verify your email to activate your CampusHire account.
    </p>
    <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;">
      Verification Token: <strong>${token}</strong>
    </p>
    <p style="margin:0;font-size:13px;color:#6b7280;">This token expires in 24 hours.</p>
  `;
  await sendEmail(to, "Verify Your CampusHire Email", renderEmailLayout("Email Verification", name, content));
};

export const sendPasswordResetEmail = async (to: string, token: string, name: string): Promise<void> => {
  const content = `
    <p style="margin:0 0 12px 0;font-size:14px;line-height:1.6;">
      We received a request to reset your password.
    </p>
    <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;">
      Reset Token: <strong>${token}</strong>
    </p>
    <p style="margin:0;font-size:13px;color:#6b7280;">This token expires in 1 hour.</p>
  `;
  await sendEmail(to, "Reset Your CampusHire Password", renderEmailLayout("Password Reset", name, content));
};

export const sendWelcomeEmail = async (to: string, name: string, role: string): Promise<void> => {
  const content = `
    <p style="margin:0 0 12px 0;font-size:14px;line-height:1.6;">
      Welcome to CampusHire. Your account is now active.
    </p>
    <p style="margin:0;font-size:14px;line-height:1.6;">
      Registered Role: <strong>${role}</strong>
    </p>
  `;
  await sendEmail(to, "Welcome to CampusHire", renderEmailLayout("Welcome", name, content));
};

export const sendApplicationStatusEmail = async (
  to: string,
  name: string,
  jobTitle: string,
  status: string
): Promise<void> => {
  const content = `
    <p style="margin:0 0 12px 0;font-size:14px;line-height:1.6;">
      Your application status has been updated.
    </p>
    <ul style="margin:0;padding-left:20px;font-size:14px;line-height:1.8;">
      <li>Job: <strong>${jobTitle}</strong></li>
      <li>Current Status: <strong>${status}</strong></li>
    </ul>
  `;
  await sendEmail(to, "Application Status Update", renderEmailLayout("Application Update", name, content));
};

export const sendInterviewScheduledEmail = async (
  to: string,
  name: string,
  details: InterviewEmailDetails
): Promise<void> => {
  const content = `
    <p style="margin:0 0 12px 0;font-size:14px;line-height:1.6;">
      Your interview has been scheduled.
    </p>
    <ul style="margin:0;padding-left:20px;font-size:14px;line-height:1.8;">
      <li>Job: <strong>${details.jobTitle}</strong></li>
      <li>Company: <strong>${details.company}</strong></li>
      <li>Date: <strong>${details.date}</strong></li>
      <li>Time: <strong>${details.time}</strong></li>
      <li>Mode: <strong>${details.mode}</strong></li>
      ${details.meetingLink ? `<li>Meeting Link: <strong>${details.meetingLink}</strong></li>` : ""}
      ${details.location ? `<li>Location: <strong>${details.location}</strong></li>` : ""}
    </ul>
  `;
  await sendEmail(to, "Interview Scheduled", renderEmailLayout("Interview Scheduled", name, content));
};

export const sendOfferEmail = async (
  to: string,
  name: string,
  jobTitle: string,
  company: string
): Promise<void> => {
  const content = `
    <p style="margin:0 0 12px 0;font-size:14px;line-height:1.6;">
      Congratulations. You have received an offer.
    </p>
    <ul style="margin:0;padding-left:20px;font-size:14px;line-height:1.8;">
      <li>Job: <strong>${jobTitle}</strong></li>
      <li>Company: <strong>${company}</strong></li>
    </ul>
  `;
  await sendEmail(to, "Offer Received", renderEmailLayout("Offer Received", name, content));
};
