import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonNoStore, errorToResponse } from "@/lib/response";
import { prisma } from "@/lib/prisma";
import { getClientIp, hashIp, hashUserAgent, hashDeviceFingerprint } from "@/lib/security";
import { enforceSubmitRateLimit, invalidateSubmitRateCache } from "@/lib/rate-limit";
import { closeSession } from "@/lib/session-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const bodySchema = z.object({
  sessionId: z.string().min(1),
  token: z.string().min(8),
  roll: z
    .string()
    .min(2)
    .max(32)
    .regex(/^[A-Za-z0-9\-_/]+$/, "Roll format is invalid."),
  name: z.string().min(2).max(120),
});

export async function POST(request: NextRequest) {
  try {
    const raw = await request.json();
    const data = bodySchema.parse(raw);

    const session = await prisma.session.findUnique({
      where: { id: data.sessionId },
    });

    if (!session) {
      return jsonNoStore(
        {
          error: "SESSION_NOT_FOUND",
          message: "Session closed.",
        },
        { status: 404 }
      );
    }

    if (session.token !== data.token) {
      return jsonNoStore(
        {
          error: "INVALID_TOKEN",
          message: "Session closed.",
        },
        { status: 400 }
      );
    }

    const now = new Date();
    if (now < session.startAtUTC) {
      return jsonNoStore(
        {
          error: "NOT_OPEN",
          message: "Session is not open yet.",
        },
        { status: 400 }
      );
    }

    if (now >= session.endAtUTC || session.status !== "OPEN") {
      await closeSession(session.id, { silent: true });
      return jsonNoStore(
        {
          error: "SESSION_CLOSED",
          message: "Session closed.",
        },
        { status: 410 }
      );
    }

    const ip = getClientIp(request);
    const ipHash = hashIp(ip);
    await enforceSubmitRateLimit(ipHash, data.roll.trim().toUpperCase());

    const normalizedRoll = data.roll.trim().toUpperCase();
    const normalizedName = data.name.trim();
    const deviceHash = hashDeviceFingerprint(request);
    const userAgentHash = hashUserAgent(request.headers.get("user-agent"));

    // Check for duplicate device submission in the same period on the same day for the same section
    if (deviceHash) {
      const duplicateSubmission = await prisma.attendanceSubmission.findFirst({
        where: {
          session: {
            sectionId: session.sectionId,
            dateLocal: session.dateLocal,
            periodId: session.periodId,
          },
          deviceHash,
        },
      });

      if (duplicateSubmission) {
        return jsonNoStore(
          {
            error: "DUPLICATE_DEVICE",
            message: "This device has already submitted attendance for this section in this period today.",
          },
          { status: 409 }
        );
      }
    }

    try {
      const submission = await prisma.attendanceSubmission.create({
        data: {
          sessionId: session.id,
          roll: normalizedRoll,
          name: normalizedName,
          ipHash,
          deviceHash,
          userAgentHash,
        },
      });

      // Invalidate rate limit cache after successful submission
      invalidateSubmitRateCache(ipHash, normalizedRoll);

      return jsonNoStore({
        status: "OK",
        submissionId: submission.id,
        alreadySubmitted: false,
      });
    } catch (error: unknown) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code: string }).code === "P2002"
      ) {
        return jsonNoStore({
          status: "OK",
          alreadySubmitted: true,
        });
      }
      throw error;
    }
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return jsonNoStore(
        {
          error: "VALIDATION_ERROR",
          message: "Invalid request.",
          details: error.flatten(),
        },
        { status: 422 }
      );
    }
    return errorToResponse(error);
  }
}
