import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

// Configure connection pooling for better performance
const getDatabaseUrl = () => {
  const baseUrl = process.env.DATABASE_URL || "";
  if (!baseUrl) return baseUrl;

  // Add connection pool parameters if not already present
  const hasParams = baseUrl.includes("connection_limit") || baseUrl.includes("pool_timeout");
  if (hasParams) return baseUrl;

  const separator = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${separator}connection_limit=10&pool_timeout=20`;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "info", "warn", "error"]
        : ["warn", "error"],
    datasources: {
      db: {
        url: getDatabaseUrl(),
      },
    },
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
