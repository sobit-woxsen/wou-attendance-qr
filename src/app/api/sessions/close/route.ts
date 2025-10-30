import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonNoStore, errorToResponse } from "@/lib/response";
import { closeSession, ensureValidPasskey } from "@/lib/session-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const schema = z.object({
  sessionId: z.string().min(1),
  passkey: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = schema.parse(body);

    await ensureValidPasskey(data.passkey);
    const closure = await closeSession(data.sessionId);

    return jsonNoStore({
      sessionId: data.sessionId,
      status: closure?.session.status ?? "CLOSED",
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
