/**
 * application-history.ts
 *
 * Single source of truth for writing ApplicationStatusHistory records.
 *
 * Previously duplicated as inline prisma calls across:
 *   - modules/applications/applications.service.ts  (applyToJob, withdrawApplication)
 *   - modules/ats/ats.service.ts                    (performMove)
 *   - modules/interviews/interviews.service.ts       (markApplicationInterviewStage)
 *   - modules/freelance/freelance.service.ts         (createReferral, inside transaction)
 *
 * Design decisions:
 *   - Accepts both a Prisma TransactionClient and the base prisma instance so
 *     it can be called both inside and outside transactions.
 *   - fromStatus is nullable to represent the initial APPLIED entry.
 *   - note is optional; omitting it writes null (consistent with existing behaviour).
 *   - The function is intentionally thin — it does exactly one thing.
 */

import { Prisma } from "@prisma/client";
import { ApplicationStatus } from "@campushire/types";

export interface WriteStatusHistoryInput {
  applicationId: string;
  fromStatus: ApplicationStatus | null;
  toStatus: ApplicationStatus;
  changedByUserId: string;
  note?: string;
}

type PrismaClient = Prisma.TransactionClient | {
  applicationStatusHistory: {
    create: (args: { data: Prisma.ApplicationStatusHistoryUncheckedCreateInput }) => Promise<unknown>;
  };
};

/**
 * Writes a single ApplicationStatusHistory record.
 *
 * Pass a TransactionClient when inside a prisma.$transaction block,
 * or the global prisma instance for standalone calls.
 *
 * @example Inside a transaction
 *   await prisma.$transaction(async (tx) => {
 *     await writeApplicationStatusHistory(tx, { ... });
 *   });
 *
 * @example Outside a transaction
 *   import { prisma } from "../../lib/prisma";
 *   await writeApplicationStatusHistory(prisma, { ... });
 */
export const writeApplicationStatusHistory = async (
  client: PrismaClient,
  input: WriteStatusHistoryInput
): Promise<void> => {
  await client.applicationStatusHistory.create({
    data: {
      applicationId: input.applicationId,
      fromStatus: input.fromStatus ?? null,
      toStatus: input.toStatus,
      changedByUserId: input.changedByUserId,
      note: input.note ?? null
    }
  });
};
