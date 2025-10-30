import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdminSessionApi } from "@/lib/admin-auth";
import { loadSessionReport } from "@/lib/reports";
import { formatIST } from "@/lib/time";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const filterSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  periodId: z.string().min(2).max(4),
  sectionId: z.coerce.number().int().positive(),
});

const bodySchema = z.union([
  z.object({ sessionId: z.string().min(1) }),
  z.object({ filter: filterSchema }),
]);

function escapeCsvValue(value: string) {
  if (value.includes(",") || value.includes("\n") || value.includes(`"`)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminSessionApi();
    const parsed = bodySchema.parse(await request.json());

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
      return new Response(
        JSON.stringify({
          error: "SESSION_NOT_FOUND",
          message: "Session not found.",
        }),
        {
          status: 404,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store",
          },
        }
      );
    }

    const rows: string[] = [];
    rows.push(["Roll", "Name", "Submitted At (IST)"].map(escapeCsvValue).join(","));

    for (const submission of report.submissions) {
      rows.push(
        [
          submission.roll,
          submission.name,
          formatIST(submission.submittedAtUTC, "yyyy-MM-dd HH:mm:ss"),
        ].map(escapeCsvValue).join(",")
      );
    }

    const csvContent = rows.join("\r\n");
    const safeSection = report.session.section.name.replace(/\s+/g, "_");
    const fileName = `Session_Attendance_${report.session.dateLocal}_S${report.session.section.semester.number}_${safeSection}_P${report.session.periodId}.csv`;

    return new Response(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({
          error: "VALIDATION_ERROR",
          message: "Invalid request body.",
          details: error.flatten(),
        }),
        {
          status: 422,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store",
          },
        }
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
      return new Response(
        JSON.stringify({ error: code, message }),
        {
          status: statusCode,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store",
          },
        }
      );
    }

    console.error("CSV export error", error);
    return new Response(
      JSON.stringify({
        error: "INTERNAL_ERROR",
        message: "Unable to export CSV.",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      }
    );
  }
}
