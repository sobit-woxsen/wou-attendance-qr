import { jsonNoStore } from "@/lib/response";
import {
  ADMIN_SESSION_COOKIE,
  removeAdminSessionCookie,
  revokeAdminSessionByToken,
} from "@/lib/admin-auth";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (token) {
    await revokeAdminSessionByToken(token);
  }
  await removeAdminSessionCookie();
  return jsonNoStore({ success: true });
}
