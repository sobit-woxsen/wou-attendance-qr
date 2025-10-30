import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonNoStore, errorToResponse } from "@/lib/response";
import { getClientIp } from "@/lib/security";
import { startSession } from "@/lib/session-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const schema = z.object({
  sectionId: z.coerce.number().int().positive(),
  course: z.string().min(1).max(120),
  facultyName: z.string().min(1).max(120),
  passkey: z.string().min(1).max(120),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = schema.parse(body);
    const ip = getClientIp(request);
    const idempotencyKey =
      request.headers.get("idempotency-key") ??
      request.headers.get("Idempotency-Key");

    const origin =
      request.headers.get("origin") ??
      request.headers.get("x-forwarded-host") ??
      request.nextUrl.origin;

    const result = await startSession({
      sectionId: data.sectionId,
      course: data.course,
      facultyName: data.facultyName,
      passkey: data.passkey,
      ip,
      origin,
      idempotencyKey,
    });

    const responsePayload = {
      sessionId: result.session.id,
      shortUrl: result.shortUrl,
      tokenTail: result.tokenTail,
      endsAtIST: result.endsAtIST,
    };

    return jsonNoStore(responsePayload, {
      status: 200,
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

    return errorToResponse(error);
  }
}
