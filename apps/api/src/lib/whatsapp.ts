import twilio from "twilio";
import { env } from "../config/env";
import { logger } from "./logger";

const isTwilioConfigured =
  Boolean(env.TWILIO_ACCOUNT_SID) &&
  Boolean(env.TWILIO_AUTH_TOKEN) &&
  Boolean(env.TWILIO_WHATSAPP_FROM);

const twilioClient = isTwilioConfigured
  ? twilio(env.TWILIO_ACCOUNT_SID as string, env.TWILIO_AUTH_TOKEN as string)
  : null;

const normalizeWhatsAppNumber = (to: string): string => {
  const trimmed = to.trim();
  return trimmed.startsWith("whatsapp:") ? trimmed : `whatsapp:${trimmed}`;
};

export const sendWhatsAppMessage = async (to: string, message: string): Promise<void> => {
  if (!twilioClient || !env.TWILIO_WHATSAPP_FROM) {
    logger.warn({ to }, "Twilio not configured; WhatsApp message skipped");
    return;
  }

  try {
    await twilioClient.messages.create({
      body: message,
      from: normalizeWhatsAppNumber(env.TWILIO_WHATSAPP_FROM),
      to: normalizeWhatsAppNumber(to)
    });
  } catch (error) {
    logger.error({ error, to }, "Failed to send WhatsApp message");
  }
};

export const sendApplicationStatusWhatsApp = async (
  to: string,
  name: string,
  jobTitle: string,
  status: string
): Promise<void> => {
  const message = `Hi ${name}, your application for ${jobTitle} is now ${status}. - CampusHire`;
  await sendWhatsAppMessage(to, message);
};

export const sendInterviewReminderWhatsApp = async (
  to: string,
  name: string,
  date: string,
  time: string,
  mode: string
): Promise<void> => {
  const message = `Hi ${name}, reminder: your interview is on ${date} at ${time} (${mode}). - CampusHire`;
  await sendWhatsAppMessage(to, message);
};

export const sendOfferWhatsAppMessage = async (
  to: string,
  name: string,
  jobTitle: string,
  company: string
): Promise<void> => {
  const message = `Congratulations ${name}. You received an offer for ${jobTitle} at ${company}. - CampusHire`;
  await sendWhatsAppMessage(to, message);
};
