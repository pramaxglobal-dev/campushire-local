import { sendInterviewReminders } from "../modules/interviews/interviews.service";

export async function runInterviewReminderJob(): Promise<void> {
  await sendInterviewReminders();
}
