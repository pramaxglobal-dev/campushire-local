import { Prisma } from "@prisma/client";
import {
  NotificationChannel,
  NotificationType,
  type Application,
  type CollegeProfile,
  type InterviewSlot,
  type Job,
  type RecruiterProfile,
  type User
} from "@campushire/types";
import { formatDate } from "@campushire/utils";
import { prisma } from "./prisma";
import { emitToUser } from "./socket";
import { sendEmail } from "./mailer";
import { sendWhatsAppMessage } from "./whatsapp";
import { sendPushNotification } from "./firebase";
import { logger } from "./logger";
import { redis } from "./redis";

export interface SendNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  actionUrl?: string;
  contextType?: string;
  contextId?: string;
  channels: NotificationChannel[];
  emailHtml?: string;
  whatsappMessage?: string;
  pushData?: Record<string, string>;
}

type NotificationUser = {
  id: string;
  tenantId: string | null;
  email: string;
  phone: string | null;
  firstName: string;
  lastName: string;
  metadata: Prisma.JsonValue | null;
};

const defaultEmailHtml = (name: string, title: string, body: string): string => {
  return `
<div style="font-family:Arial,sans-serif;color:#1f2937;line-height:1.6;">
  <div style="background:#1B3A6B;padding:16px;color:#fff;border-radius:8px 8px 0 0;">CampusHire</div>
  <div style="border:1px solid #e5e7eb;border-top:0;padding:16px;border-radius:0 0 8px 8px;">
    <p>Hi ${name},</p>
    <p><strong>${title}</strong></p>
    <p>${body}</p>
  </div>
</div>
`.trim();
};

const toInputJsonValue = (value: Record<string, unknown>): Prisma.InputJsonValue => {
  return value as Prisma.InputJsonValue;
};

const getPreferenceEnabled = async (
  userId: string,
  type: NotificationType,
  channel: NotificationChannel
): Promise<boolean> => {
  const pref = await prisma.notificationPreference.findUnique({
    where: {
      userId_type_channel: {
        userId,
        type,
        channel
      }
    },
    select: {
      isEnabled: true
    }
  });
  return pref?.isEnabled ?? true;
};

const getPushTokenFromMetadata = (metadata: Prisma.JsonValue | null): string | null => {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }
  const raw = (metadata as Record<string, unknown>).fcmToken;
  return typeof raw === "string" && raw.trim().length > 0 ? raw.trim() : null;
};

const getPushTokenFromSettings = async (
  userId: string,
  tenantId: string | null
): Promise<string | null> => {
  if (!tenantId) {
    return null;
  }

  const setting = await prisma.platformSetting.findFirst({
    where: {
      tenantId,
      key: `FCM_TOKEN_${userId}`
    },
    select: {
      value: true
    }
  });

  if (!setting) {
    return null;
  }

  if (typeof setting.value === "string") {
    return setting.value.trim() || null;
  }

  if (setting.value && typeof setting.value === "object" && !Array.isArray(setting.value)) {
    const token = (setting.value as Record<string, unknown>).token;
    return typeof token === "string" && token.trim().length > 0 ? token.trim() : null;
  }

  return null;
};

const invalidateUnreadCountCache = async (userId: string): Promise<void> => {
  try {
    await redis.del(`notif:unread:${userId}`);
  } catch (error) {
    logger.error({ error, userId }, "Failed to invalidate unread cache");
  }
};

const fetchUser = async (userId: string): Promise<NotificationUser | null> => {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      tenantId: true,
      email: true,
      phone: true,
      firstName: true,
      lastName: true,
      metadata: true
    }
  });
};

export const sendNotification = async (input: SendNotificationInput): Promise<void> => {
  try {
    const user = await fetchUser(input.userId);
    if (!user) {
      return;
    }

    const notificationPayload: Record<string, unknown> = {
      actionUrl: input.actionUrl ?? null,
      contextType: input.contextType ?? null,
      contextId: input.contextId ?? null
    };

    await prisma.notification.create({
      data: {
        tenantId: user.tenantId ?? null,
        userId: user.id,
        type: input.type,
        channel: NotificationChannel.IN_APP,
        title: input.title,
        body: input.body,
        data: toInputJsonValue(notificationPayload),
        sentAt: new Date()
      }
    });

    await invalidateUnreadCountCache(user.id);

    if (input.channels.includes(NotificationChannel.IN_APP)) {
      emitToUser(user.id, "notification:new", {
        type: input.type,
        title: input.title,
        body: input.body,
        actionUrl: input.actionUrl,
        contextType: input.contextType,
        contextId: input.contextId
      });
    }

    if (input.channels.includes(NotificationChannel.EMAIL)) {
      try {
        const allowed = await getPreferenceEnabled(user.id, input.type, NotificationChannel.EMAIL);
        if (allowed) {
          await sendEmail(
            user.email,
            input.title,
            input.emailHtml ?? defaultEmailHtml(`${user.firstName} ${user.lastName}`.trim(), input.title, input.body)
          );
        }
      } catch (error) {
        logger.error({ error, userId: user.id }, "Email notification failed");
      }
    }

    if (input.channels.includes(NotificationChannel.WHATSAPP)) {
      try {
        const allowed = await getPreferenceEnabled(user.id, input.type, NotificationChannel.WHATSAPP);
        if (allowed && user.phone) {
          await sendWhatsAppMessage(
            user.phone,
            input.whatsappMessage ?? `${input.title}\n${input.body}`
          );
        }
      } catch (error) {
        logger.error({ error, userId: user.id }, "WhatsApp notification failed");
      }
    }

    if (input.channels.includes(NotificationChannel.PUSH)) {
      try {
        const allowed = await getPreferenceEnabled(user.id, input.type, NotificationChannel.PUSH);
        if (allowed) {
          const tokenFromMetadata = getPushTokenFromMetadata(user.metadata);
          const token =
            tokenFromMetadata ?? (await getPushTokenFromSettings(user.id, user.tenantId));
          if (token) {
            await sendPushNotification(token, input.title, input.body, input.pushData);
          }
        }
      } catch (error) {
        logger.error({ error, userId: user.id }, "Push notification failed");
      }
    }
  } catch (error) {
    logger.error({ error, userId: input.userId }, "Notification dispatch failed");
  }
};

const fetchRecruiterUserForJob = async (job: Job): Promise<User | null> => {
  return prisma.user.findFirst({
    where: {
      id: job.createdByUserId,
      tenantId: job.tenantId
    }
  });
};

export const notifyApplicationReceived = async (
  application: Application,
  job: Job,
  candidate: User
): Promise<void> => {
  const recruiter = await fetchRecruiterUserForJob(job);
  if (!recruiter) {
    return;
  }

  await sendNotification({
    userId: recruiter.id,
    type: NotificationType.APPLICATION_STATUS,
    title: "New Application Received",
    body: `${candidate.firstName} ${candidate.lastName} applied for ${job.title}.`,
    contextType: "APPLICATION",
    contextId: application.id,
    actionUrl: `/recruiter/jobs/${job.id}/applications`,
    channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL]
  });
};

export const notifyApplicationStatusChanged = async (
  application: Application,
  job: Job,
  candidate: User,
  recruiter: User
): Promise<void> => {
  await sendNotification({
    userId: candidate.id,
    type: NotificationType.APPLICATION_STATUS,
    title: "Application Status Updated",
    body: `Your application for ${job.title} was moved to ${application.status} by ${recruiter.firstName} ${recruiter.lastName}.`,
    contextType: "APPLICATION",
    contextId: application.id,
    actionUrl: `/applications/${application.id}`,
    channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL, NotificationChannel.WHATSAPP]
  });
};

export const notifyInterviewScheduled = async (
  slot: InterviewSlot,
  application: Application,
  job: Job,
  candidate: User
): Promise<void> => {
  const start = formatDate(slot.scheduledStartAt, "dd MMM yyyy, hh:mm a");
  const end = formatDate(slot.scheduledEndAt, "hh:mm a");
  const detail = `${start} - ${end}`;
  const mode = slot.mode.replace(/_/g, " ");

  await sendNotification({
    userId: candidate.id,
    type: NotificationType.INTERVIEW_SCHEDULED,
    title: "Interview Scheduled",
    body: `${job.title} interview (${slot.round}) is scheduled for ${detail} via ${mode}.`,
    contextType: "APPLICATION",
    contextId: application.id,
    actionUrl: `/interviews/${slot.id}`,
    channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL, NotificationChannel.WHATSAPP],
    whatsappMessage: `Interview scheduled for ${job.title} on ${detail}. Mode: ${mode}.`,
    emailHtml: defaultEmailHtml(
      `${candidate.firstName} ${candidate.lastName}`.trim(),
      "Interview Scheduled",
      `Your interview for <strong>${job.title}</strong> is scheduled for <strong>${detail}</strong> (${mode}). ${slot.meetingLink ? `Meeting link: ${slot.meetingLink}` : ""}`
    )
  });
};

export const notifyOfferReceived = async (
  application: Application,
  job: Job,
  candidate: User,
  company: string
): Promise<void> => {
  await sendNotification({
    userId: candidate.id,
    type: NotificationType.OFFER_RECEIVED,
    title: "Offer Received",
    body: `You received an offer for ${job.title} at ${company}.`,
    contextType: "APPLICATION",
    contextId: application.id,
    actionUrl: `/applications/${application.id}`,
    channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL, NotificationChannel.WHATSAPP]
  });
};

export const notifyConnectionRequest = async (
  college: CollegeProfile,
  recruiter: RecruiterProfile
): Promise<void> => {
  await sendNotification({
    userId: college.adminUserId,
    type: NotificationType.CONNECTION_REQUEST,
    title: "New Recruiter Connection Request",
    body: `${recruiter.companyName} requested to connect with ${college.name}.`,
    contextType: "COLLEGE_RECRUITER",
    contextId: `${college.id}:${recruiter.id}`,
    actionUrl: "/connections",
    channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL]
  });
};

export const notifyConnectionApproved = async (
  college: CollegeProfile,
  recruiter: RecruiterProfile
): Promise<void> => {
  await sendNotification({
    userId: recruiter.userId,
    type: NotificationType.CONNECTION_REQUEST,
    title: "College Connection Approved",
    body: `${college.name} approved your connection request.`,
    contextType: "COLLEGE_RECRUITER",
    contextId: `${college.id}:${recruiter.id}`,
    actionUrl: "/connections",
    channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL]
  });
};

export const notifyJobMatch = async (
  candidate: User,
  job: Job,
  matchScore: number
): Promise<void> => {
  await sendNotification({
    userId: candidate.id,
    type: NotificationType.JOB_MATCH,
    title: "New Job Match",
    body: `${job.title} matches your profile with score ${matchScore}.`,
    contextType: "APPLICATION",
    contextId: job.id,
    actionUrl: `/jobs/${job.id}`,
    channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH]
  });
};
