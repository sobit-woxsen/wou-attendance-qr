import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "./prisma";
import { generateToken, hashSessionToken, verifyHashAgainstPassword } from "./security";
import { UnauthorizedError } from "./errors";

export const ADMIN_SESSION_COOKIE = "qr_admin_session";
const SESSION_TTL_SECONDS = 12 * 60 * 60; // 12 hours

export async function createAdminSession(userId: number) {
  const token = generateToken(32);
  const tokenHash = hashSessionToken(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_SECONDS * 1000);

  await prisma.adminSession.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  return { token, expiresAt };
}

export async function setAdminSessionCookie(token: string, expiresAt: Date) {
  const cookieStore = await cookies();
  cookieStore.set({
    name: ADMIN_SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    expires: expiresAt,
  });
}

export async function removeAdminSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
}

export async function getAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }

  const tokenHash = hashSessionToken(token);
  const session = await prisma.adminSession.findFirst({
    where: {
      tokenHash,
      revokedAt: null,
      expiresAt: {
        gt: new Date(),
      },
    },
    include: {
      user: true,
    },
  });

  if (!session) {
    await removeAdminSessionCookie();
    return null;
  }

  await prisma.adminSession.update({
    where: { id: session.id },
    data: {
      lastSeenAt: new Date(),
    },
  });

  return session;
}

export async function requireAdminSession() {
  const session = await getAdminSession();
  if (!session) {
    redirect("/admin/login");
  }
  return session;
}

export async function verifyAdminCredentials(email: string, password: string) {
  const admin = await prisma.adminUser.findUnique({
    where: { email },
  });

  if (!admin) {
    return null;
  }

  const valid = await verifyHashAgainstPassword(password, admin.passwordHash);
  if (!valid) {
    return null;
  }

  return admin;
}

export async function revokeAdminSessionByToken(token: string) {
  const tokenHash = hashSessionToken(token);
  const existing = await prisma.adminSession.findFirst({
    where: { tokenHash, revokedAt: null },
  });
  if (!existing) return;
  await prisma.adminSession.update({
    where: { id: existing.id },
    data: {
      revokedAt: new Date(),
    },
  });
}
