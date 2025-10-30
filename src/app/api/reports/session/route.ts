import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonNoStore } from "@/lib/response";
import { requireAdminSession } from "@/lib/admin-auth";
import { loadSessionReport } from "@/lib/reports";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const filterSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  periodId: z.string().min(2).max(4),
  sectionId: z.coerce.number().int().positive(),
});

const requestSchema = z.union([
  z.object({
    sessionId: z.string().min(1),
  }),
  z.object({
    filter: filterSchema,
  }),
]);

export async function POST(request: NextRequest) {
  try {
    await requireAdminSession();
    const parsed = requestSchema.parse(await request.json());

    const report = await loadSessionReport(
      "sessionId" in parsed
        ? { sessionId: parsed.sessionId }
        : {
            filter: {
              date: parsed.filter.date,
              periodId: parsed.filter.periodId,
              sectionId: parsed.filter.sectionId,
            },
          }
    );

    if (!report) {
      return jsonNoStore(
        { error: "SESSION_NOT_FOUND", message: "Session not found." },
        { status: 404 }
      );
    }

    return jsonNoStore({
      session: {
        id: report.session.id,
        dateLocal: report.session.dateLocal,
        course: report.session.course,
        facultyName: report.session.facultyName,
        periodId: report.session.periodId,
        periodLabel: report.session.period.label,
        section: {
          id: report.session.section.id,
          name: report.session.section.name,
          semesterNumber: report.session.section.semester.number,
        },
        startAtUTC: report.session.startAtUTC,
        endAtUTC: report.session.endAtUTC,
        closedAtUTC: report.session.closedAtUTC,
        status: report.session.status,
      },
      metrics: {
        totalSubmissions: report.submissions.length,
      },
      submissions: report.submissions,
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return jsonNoStore(
        {
          error: "VALIDATION_ERROR",
          message: "Invalid request body.",
          details: error.flatten(),
        },
        { status: 422 }
      );
    }

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

    console.error("Report generation error", error);
    return jsonNoStore(
      { error: "INTERNAL_ERROR", message: "Unable to load session report." },
      { status: 500 }
    );
  }
}
