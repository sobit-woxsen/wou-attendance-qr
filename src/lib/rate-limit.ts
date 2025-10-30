import { prisma } from "./prisma";
import { RateLimitError } from "./errors";
import { rateLimitCache } from "./cache";

function minutesAgo(minutes: number): Date {
  return new Date(Date.now() - minutes * 60 * 1000);
}

export async function enforceStartRateLimit(ipHash: string) {
  const cacheKey = `start:${ipHash}`;
  const now = Date.now();

  // Check cache first
  let count = rateLimitCache.get(cacheKey);

  if (count === undefined) {
    // Cache miss - query database
    const since = minutesAgo(15);
    count = await prisma.session.count({
      where: {
        startIpHash: ipHash,
        createdAtUTC: {
          gte: since,
        },
      },
    });
    // Cache for 1 minute
    rateLimitCache.set(cacheKey, count, 60 * 1000);
  }

  if (count >= 5) {
    throw new RateLimitError("Start rate limit exceeded. Try again shortly.");
  }
}

export async function enforceSubmitRateLimit(ipHash: string, roll: string) {
  const ipCacheKey = `submit:ip:${ipHash}`;
  const rollCacheKey = `submit:roll:${roll}`;
  const now = Date.now();

  // Try to get from cache first
  let ipCount = rateLimitCache.get(ipCacheKey);
  let rollCount = rateLimitCache.get(rollCacheKey);

  // Only query database for cache misses
  const sinceMinute = minutesAgo(1);

  if (ipCount === undefined || rollCount === undefined) {
    const queries = [];

    if (ipCount === undefined) {
      queries.push(
        prisma.attendanceSubmission.count({
          where: {
            ipHash,
            submittedAtUTC: {
              gte: sinceMinute,
            },
          },
        })
      );
    } else {
      queries.push(Promise.resolve(ipCount));
    }

    if (rollCount === undefined) {
      queries.push(
        prisma.attendanceSubmission.count({
          where: {
            roll,
            submittedAtUTC: {
              gte: sinceMinute,
            },
          },
        })
      );
    } else {
      queries.push(Promise.resolve(rollCount));
    }

    const [newIpCount, newRollCount] = await Promise.all(queries);
    ipCount = newIpCount;
    rollCount = newRollCount;

    // Cache for 30 seconds (shorter TTL for more accurate rate limiting)
    rateLimitCache.set(ipCacheKey, ipCount, 30 * 1000);
    rateLimitCache.set(rollCacheKey, rollCount, 30 * 1000);
  }

  if (ipCount >= 60) {
    throw new RateLimitError("Submission rate limit exceeded for this device.");
  }

  if (rollCount >= 5) {
    throw new RateLimitError("Submission rate limit exceeded for this roll number.");
  }
}

// Helper to invalidate cache after successful submission
export function invalidateSubmitRateCache(ipHash: string, roll: string) {
  rateLimitCache.delete(`submit:ip:${ipHash}`);
  rateLimitCache.delete(`submit:roll:${roll}`);
}
