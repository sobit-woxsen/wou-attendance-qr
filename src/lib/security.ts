import { createHash, randomBytes, timingSafeEqual } from "crypto";
import bcrypt from "bcryptjs";
import { env } from "./env";
import type { NextRequest } from "next/server";

export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function generateShortCode(): string {
  return randomBytes(4).toString("base64url");
}

export function hashValue(value: string, salt: string): string {
  return createHash("sha256").update(`${value}|${salt}`).digest("hex");
}

export function hashIp(ip: string): string {
  return hashValue(ip.trim().toLowerCase(), env.ipHashSalt);
}

export function hashUserAgent(userAgent: string | null | undefined): string | undefined {
  if (!userAgent) return undefined;
  return hashValue(userAgent.trim().toLowerCase(), env.deviceHashSalt);
}

export function hashDeviceFingerprint(request: NextRequest): string | undefined {
  const userAgent = request.headers.get("user-agent");
  const acceptLanguage = request.headers.get("accept-language");
  const acceptEncoding = request.headers.get("accept-encoding");

  if (!userAgent) return undefined;

  // Create a device fingerprint from multiple headers
  const fingerprint = [
    userAgent?.trim().toLowerCase() || "",
    acceptLanguage?.trim().toLowerCase() || "",
    acceptEncoding?.trim().toLowerCase() || "",
  ].join("|");

  return hashValue(fingerprint, env.deviceHashSalt);
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? "0.0.0.0";
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "0.0.0.0";
}

export async function verifyHashAgainstPasskey(candidate: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(candidate, hash);
  } catch {
    return false;
  }
}

export async function verifyHashAgainstPassword(candidate: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(candidate, hash);
  } catch {
    return false;
  }
}

export function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
