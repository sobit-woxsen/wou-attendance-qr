import { jsonNoStore } from "@/lib/response";
import { requireAdminSessionApi } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    await requireAdminSessionApi();

    const [openSessions, totalSections, recentSubmissions] = await Promise.all([
      prisma.session.count({ where: { status: "OPEN" } }),
      prisma.section.count(),
      prisma.attendanceSubmission.count({
        where: {
          submittedAtUTC: {
            gte: new Date(Date.now() - 60 * 60 * 1000),
          },
        },
      }),
    ]);

    return jsonNoStore({
      openSessions,
      totalSections,
      submissionsLastHour: recentSubmissions,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "statusCode" in error &&
      "message" in error &&
      "code" in error
    ) {
      const { statusCode, message, code } = error as {
        statusCode: number;
        message: string;
        code: string;
      };
      return jsonNoStore(
        {
          error: code,
          message,
        },
        { status: statusCode }
      );
    }

    console.error("Health endpoint error", error);
    return jsonNoStore(
      { error: "INTERNAL_ERROR", message: "Unable to load health data." },
      { status: 500 }
    );
  }
}
