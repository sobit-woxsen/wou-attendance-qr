import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonNoStore } from "@/lib/response";
import {
  createAdminSession,
  setAdminSessionCookie,
  verifyAdminCredentials,
} from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200),
});

export async function POST(request: NextRequest) {
  try {
    const data = schema.parse(await request.json());
    const admin = await verifyAdminCredentials(
      data.email.toLowerCase(),
      data.password
    );

    if (!admin) {
      return jsonNoStore(
        {
          error: "INVALID_CREDENTIALS",
          message: "Invalid email or password.",
        },
        { status: 401 }
      );
    }

    const { token, expiresAt } = await createAdminSession(admin.id);
    await setAdminSessionCookie(token, expiresAt);
    return jsonNoStore({ success: true });
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

    console.error("Admin login error", error);
    return jsonNoStore(
      { error: "INTERNAL_ERROR", message: "Unable to login." },
      { status: 500 }
    );
  }
}
