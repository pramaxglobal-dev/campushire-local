import { Prisma } from "@prisma/client";
import { type StudentProfile } from "@campushire/types";
import { calculateCareerScore } from "@campushire/utils";
import { prisma } from "./prisma";

type CareerScoreClient = Prisma.TransactionClient | {
  studentProfile: {
    updateMany: (args: Prisma.StudentProfileUpdateManyArgs) => Promise<unknown>;
  };
  jobSeekerProfile: {
    updateMany: (args: Prisma.JobSeekerProfileUpdateManyArgs) => Promise<unknown>;
  };
};

export const calculateAuthoritativeCareerScore = (
  profile: Partial<StudentProfile>
): number => calculateCareerScore(profile);

export const writeCareerScoreForUser = async (
  client: CareerScoreClient,
  userId: string,
  careerScore: number
): Promise<void> => {
  await client.studentProfile.updateMany({
    where: { userId },
    data: { careerScore }
  });

  await client.jobSeekerProfile.updateMany({
    where: { userId },
    data: { careerScore }
  });
};

export const computeAndWriteCareerScoreForUser = async (userId: string): Promise<number> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      studentProfile: true,
      jobSeekerProfile: true
    }
  });

  if (!user) {
    throw new Error("User not found for career score.");
  }

  const profile = (user.studentProfile ?? user.jobSeekerProfile ?? {}) as Partial<StudentProfile>;
  const careerScore = calculateAuthoritativeCareerScore(profile);
  await writeCareerScoreForUser(prisma, userId, careerScore);

  return careerScore;
};
