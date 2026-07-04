import admin, { type ServiceAccount } from "firebase-admin";
import { env } from "../config/env";
import { logger } from "./logger";

const isFirebaseConfigured =
  Boolean(env.FIREBASE_PROJECT_ID) &&
  Boolean(env.FIREBASE_PRIVATE_KEY) &&
  Boolean(env.FIREBASE_CLIENT_EMAIL);

let firebaseInitialized = false;

if (isFirebaseConfigured && admin.apps.length === 0) {
  const serviceAccount: ServiceAccount = {
    projectId: env.FIREBASE_PROJECT_ID as string,
    privateKey: env.FIREBASE_PRIVATE_KEY as string,
    clientEmail: env.FIREBASE_CLIENT_EMAIL as string
  };

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  firebaseInitialized = true;
}

export const sendPushNotification = async (
  token: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<void> => {
  if (!firebaseInitialized) {
    logger.warn({ token }, "Firebase not configured; push skipped");
    return;
  }

  try {
    await admin.messaging().send({
      token,
      notification: { title, body },
      data
    });
  } catch (error) {
    logger.error({ error, token }, "Failed to send push notification");
  }
};

export const sendMulticastPush = async (
  tokens: string[],
  title: string,
  body: string
): Promise<void> => {
  if (!firebaseInitialized) {
    logger.warn("Firebase not configured; multicast push skipped");
    return;
  }

  if (tokens.length === 0) {
    return;
  }

  try {
    await admin.messaging().sendEachForMulticast({
      tokens,
      notification: { title, body }
    });
  } catch (error) {
    logger.error({ error }, "Failed to send multicast push notification");
  }
};
