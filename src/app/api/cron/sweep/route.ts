import { NextRequest } from "next/server";
import { sweepExpiredSessions } from "@/lib/session-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Cron endpoint to sweep expired sessions
 * Should be called periodically (e.g., every 5 minutes) by a cron service
 *
 * Usage:
 * - Set CRON_SECRET in environment variables
 * - Configure cron job to call: GET /api/cron/sweep
 * - Include header: Authorization: Bearer <CRON_SECRET>
 */
export async function GET(request: NextRequest) {
  // Verify cron secret for security
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || cronSecret.trim() === "") {
    return Response.json(
      { error: "Cron secret not configured" },
      { status: 500 }
    );
  }

  const expectedAuth = `Bearer ${cronSecret}`;
  if (authHeader !== expectedAuth) {
    console.warn("Unauthorized cron sweep attempt");
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const startTime = Date.now();
    await sweepExpiredSessions();
    const duration = Date.now() - startTime;

    console.log(`Session sweep completed in ${duration}ms`);

    return Response.json({
      success: true,
      message: "Sweep completed",
      durationMs: duration,
    });
  } catch (error) {
    console.error("Sweep failed:", error);
    return Response.json(
      {
        error: "Sweep failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
