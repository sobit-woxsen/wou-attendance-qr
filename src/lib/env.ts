const DEFAULT_TIMEZONE = "Asia/Kolkata";

function readEnv(name: string): string | undefined {
  if (typeof process === "undefined") return undefined;
  return process.env[name];
}

export const env = {
  timezone: readEnv("TIMEZONE") ?? DEFAULT_TIMEZONE,
  cronSecret: readEnv("CRON_SECRET"),
  passkeyHash: readEnv("PASSKEY_HASH"),
  passkeyVersion: Number(readEnv("PASSKEY_VERSION") ?? "1"),
  adminEmail: readEnv("ADMIN_EMAIL"),
  adminPasswordHash: readEnv("ADMIN_PASSWORD_HASH"),
  adminPasswordVersion: Number(readEnv("ADMIN_PASSWORD_VERSION") ?? "1"),
  deviceHashSalt: readEnv("DEVICE_HASH_SALT") ?? "device-salt",
  ipHashSalt: readEnv("IP_HASH_SALT") ?? "ip-salt",
  baseUrl: readEnv("APP_BASE_URL"),
};
