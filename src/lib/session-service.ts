import { SessionStatus, type Session } from "@prisma/client";
import { prisma } from "./prisma";
import {
  computeSessionEnd,
  formatIST,
  getCurrentPeriod,
  getLocalDateString,
  nowIST,
} from "./time";
import { ForbiddenError, NotFoundError } from "./errors";
import { generateShortCode, generateToken, hashIp, verifyHashAgainstPasskey } from "./security";
import { enforceStartRateLimit } from "./rate-limit";
import { env } from "./env";

let startupSweepPromise: Promise<void> | null = null;

export async function ensureStartupSweep() {
  if (!startupSweepPromise) {
    startupSweepPromise = sweepExpiredSessions().catch((error) => {
      console.error("Startup sweep failed", error);
    });
  }
  return startupSweepPromise;
}

export async function sweepExpiredSessions() {
  const now = new Date();
  const expiredSessions = await prisma.session.findMany({
    where: {
      status: SessionStatus.OPEN,
      endAtUTC: {
        lte: now,
      },
    },
    select: { id: true },
  });

  for (const session of expiredSessions) {
    await closeSession(session.id, { silent: true });
  }
}

export async function ensureValidPasskey(passkey: string) {
  const record = await prisma.passkey.findFirst({
    orderBy: { version: "desc" },
  });

  if (!record || !record.hash) {
    throw new ForbiddenError("Passkey not configured.");
  }

  const valid = await verifyHashAgainstPasskey(passkey, record.hash);
  if (!valid) {
    throw new ForbiddenError("Invalid passkey.");
  }
}

export async function startSession(params: {
  sectionId: number;
  course: string;
  facultyName: string;
  passkey: string;
  ip: string;
  origin: string;
  idempotencyKey?: string | null;
}) {
  await ensureStartupSweep();
  const now = nowIST();
  const currentPeriod = getCurrentPeriod(now);
  if (!currentPeriod) {
    throw new ForbiddenError(
      "Sessions can only be started during scheduled periods."
    );
  }

  await ensureValidPasskey(params.passkey);

  const section = await prisma.section.findUnique({
    where: { id: params.sectionId },
    include: { semester: true },
  });

  if (!section) {
    throw new NotFoundError("Section not found.");
  }

  const ipHash = hashIp(params.ip);

  await enforceStartRateLimit(ipHash);

  await lazyCloseSectionSessions(section.id);

  const openSession = await prisma.session.findFirst({
    where: {
      sectionId: section.id,
      status: SessionStatus.OPEN,
    },
  });

  if (openSession) {
    throw new ForbiddenError(
      "A session is already active for this section. Close it before starting a new one."
    );
  }

  const endAtIST = computeSessionEnd(now, currentPeriod);
  const startAtUTC = now.toUTC().toJSDate();
  const endAtUTC = endAtIST.toUTC().toJSDate();

  let token = generateToken(32);
  let tokenTail = token.slice(-6);

  let shortCode = generateShortCode();
  let attempt = 0;

  const idempotencyKey =
    params.idempotencyKey?.trim() && params.idempotencyKey.length > 0
      ? params.idempotencyKey.trim()
      : null;
  const idempotencyExpiry = new Date(Date.now() + 60 * 1000);

  while (attempt < 5) {
    try {
      const result = await prisma.$transaction(async (tx) => {
        if (idempotencyKey) {
          try {
            await tx.idempotencyKey.create({
              data: {
                key: idempotencyKey,
                sectionId: section.id,
                expiresAt: idempotencyExpiry,
              },
            });
          } catch (error: unknown) {
            if (
              typeof error === "object" &&
              error !== null &&
              "code" in error &&
              (error as { code: string }).code === "P2002"
            ) {
              const existing = await tx.idempotencyKey.findUnique({
                where: { key: idempotencyKey },
                include: { session: true },
              });
              if (
                existing?.expiresAt &&
                existing.expiresAt.getTime() > Date.now() &&
                existing.session
              ) {
                return existing.session;
              }
              if (existing && existing.sessionId) {
                const session = await tx.session.findUnique({
                  where: { id: existing.sessionId },
                });
                if (session) {
                  return session;
                }
              }
              // Fall through if expired to create new session.
            } else {
              throw error;
            }
          }
        }

        const session = await tx.session.create({
          data: {
            sectionId: section.id,
            periodId: currentPeriod.id,
            dateLocal: getLocalDateString(now),
            course: params.course.trim(),
            facultyName: params.facultyName.trim(),
            startAtUTC,
            endAtUTC,
            token,
            tokenTail,
            shortCode,
            startIpHash: ipHash,
          },
        });

        if (idempotencyKey) {
          await tx.idempotencyKey.update({
            where: { key: idempotencyKey },
            data: {
              sessionId: session.id,
            },
          });
        }

        return session;
      });

      const shortUrlOrigin = params.origin || env.baseUrl || "";
      const baseUrl = shortUrlOrigin || "";
      const urlBase = baseUrl.endsWith("/")
        ? baseUrl.slice(0, -1)
        : baseUrl.length > 0
          ? baseUrl
          : "";
      const shortUrl = urlBase
        ? `${urlBase}/s/${result.shortCode}?t=${token}`
        : `/s/${result.shortCode}?t=${token}`;

      return {
        session: result,
        shortUrl,
        tokenTail,
        endsAtIST: endAtIST.toISO(),
      };
    } catch (error: unknown) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code: string }).code === "P2002"
      ) {
        const meta = (error as { meta?: { target?: string | string[] } }).meta;
        const target =
          Array.isArray(meta?.target) === true
            ? ((meta?.target as string[]) ?? []).join(",")
            : (meta?.target as string) ?? "";

        if (
          target.includes("shortCode") ||
          target.includes("Session_shortCode_key")
        ) {
          attempt += 1;
          shortCode = generateShortCode();
          continue;
        }

        if (target.includes("token") || target.includes("Session_token_key")) {
          attempt += 1;
          shortCode = generateShortCode();
          token = generateToken(32);
          tokenTail = token.slice(-6);
          continue;
        }

        if (target.includes("only_one_open_per_section")) {
          throw new ForbiddenError(
            "A session is already active for this section. Close it before starting a new one."
          );
        }

        throw new ForbiddenError(
          "Unable to start session due to a conflicting request. Please retry."
        );
      }
      throw error;
    }
  }

  throw new Error("Unable to generate unique session token.");
}

export async function closeSession(
  sessionId: string,
  options: { silent?: boolean } = {}
) {
  await ensureStartupSweep();
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const session = await tx.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      if (options.silent) return null;
      throw new NotFoundError("Session not found.");
    }

    if (session.status !== SessionStatus.OPEN) {
      const existingLog = await tx.sessionLog.findUnique({
        where: { sessionId: session.id },
      });
      return { session, log: existingLog };
    }

    const submissionsCount = await tx.attendanceSubmission.count({
      where: { sessionId: session.id },
    });

    const closedSession = await tx.session.update({
      where: { id: session.id },
      data: {
        status: SessionStatus.CLOSED,
        closedAtUTC: now,
      },
    });

    const durationSec = Math.max(
      1,
      Math.floor((now.getTime() - session.startAtUTC.getTime()) / 1000)
    );

    const log = await tx.sessionLog.upsert({
      where: { sessionId: session.id },
      create: {
        sessionId: session.id,
        sectionId: session.sectionId,
        periodId: session.periodId,
        dateLocal: session.dateLocal,
        course: session.course,
        facultyName: session.facultyName,
        startAtUTC: session.startAtUTC,
        endAtUTC: session.endAtUTC,
        closedAtUTC: now,
        durationSec,
        presentCount: submissionsCount,
        status: SessionStatus.CLOSED,
        startIpHash: session.startIpHash,
      },
      update: {
        closedAtUTC: now,
        durationSec,
        presentCount: submissionsCount,
        status: SessionStatus.CLOSED,
      },
    });

    return { session: closedSession, log };
  });
}

export async function lazyCloseSectionSessions(sectionId: number) {
  const openSessions = await prisma.session.findMany({
    where: {
      sectionId,
      status: SessionStatus.OPEN,
    },
  });

  for (const session of openSessions) {
    if (session.endAtUTC.getTime() <= Date.now()) {
      await closeSession(session.id, { silent: true });
    }
  }
}

export async function lazyCloseSessionById(sessionId: string) {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
  });
  if (session && session.status === SessionStatus.OPEN) {
    if (session.endAtUTC.getTime() <= Date.now()) {
      await closeSession(session.id, { silent: true });
    }
  }
}

export async function getPublicSessionByShortCode(shortCode: string) {
  await ensureStartupSweep();
  const session = await prisma.session.findUnique({
    where: { shortCode },
    include: {
      section: {
        include: { semester: true },
      },
    },
  });
  if (!session) {
    return null;
  }
  if (session.status === SessionStatus.OPEN) {
    if (session.endAtUTC.getTime() <= Date.now()) {
      await closeSession(session.id, { silent: true });
      return getPublicSessionByShortCode(shortCode);
    }
  }
  return session;
}

export async function getActiveSessionForSection(sectionId: number) {
  await ensureStartupSweep();
  const session = await prisma.session.findFirst({
    where: {
      sectionId,
      status: SessionStatus.OPEN,
    },
    orderBy: { startAtUTC: "desc" },
  });

  if (!session) return null;

  if (session.endAtUTC.getTime() <= Date.now()) {
    await closeSession(session.id, { silent: true });
    return getActiveSessionForSection(sectionId);
  }

  return session;
}

export function buildEndsAtLabel(session: Session) {
  return formatIST(session.endAtUTC, "hh:mm a");
}
