import { prisma } from "./prisma";
import { RateLimitError } from "./errors";

function minutesAgo(minutes: number): Date {
  return new Date(Date.now() - minutes * 60 * 1000);
}

export async function enforceStartRateLimit(ipHash: string) {
  const since = minutesAgo(15);
  const count = await prisma.session.count({
    where: {
      startIpHash: ipHash,
      createdAtUTC: {
        gte: since,
      },
    },
  });
  if (count >= 5) {
    throw new RateLimitError("Start rate limit exceeded. Try again shortly.");
  }
}

export async function enforceSubmitRateLimit(ipHash: string, roll: string) {
  const sinceMinute = minutesAgo(1);
  const [ipCount, rollCount] = await Promise.all([
    prisma.attendanceSubmission.count({
      where: {
        ipHash,
        submittedAtUTC: {
          gte: sinceMinute,
        },
      },
    }),
    prisma.attendanceSubmission.count({
      where: {
        roll,
        submittedAtUTC: {
          gte: sinceMinute,
        },
      },
    }),
  ]);

  if (ipCount >= 60) {
    throw new RateLimitError("Submission rate limit exceeded for this device.");
  }

  if (rollCount >= 5) {
    throw new RateLimitError("Submission rate limit exceeded for this roll number.");
  }
}
