import { NextRequest } from "next/server";
import { jsonNoStore, errorToResponse } from "@/lib/response";
import { getActiveSessionForSection } from "@/lib/session-service";
import { formatIST } from "@/lib/time";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const sectionIdParam =
      request.nextUrl.searchParams.get("sectionId") ??
      request.nextUrl.searchParams.get("section_id");

    if (!sectionIdParam) {
      return jsonNoStore(
        {
          error: "INVALID_REQUEST",
          message: "sectionId is required.",
        },
        { status: 400 }
      );
    }

    const sectionId = Number(sectionIdParam);
    if (!Number.isFinite(sectionId) || sectionId <= 0) {
      return jsonNoStore(
        {
          error: "INVALID_REQUEST",
          message: "sectionId must be a positive integer.",
        },
        { status: 400 }
      );
    }

    const session = await getActiveSessionForSection(sectionId);
    if (!session) {
      return jsonNoStore({
        status: "IDLE",
      });
    }

    const endsAt = session.endAtUTC;
    const remainingSeconds = Math.max(
      0,
      Math.floor((endsAt.getTime() - Date.now()) / 1000)
    );

    return jsonNoStore({
      status: "OPEN",
      endsAtIST: formatIST(endsAt, "HH:mm"),
      remainingSeconds,
    });
  } catch (error: unknown) {
    return errorToResponse(error);
  }
}
