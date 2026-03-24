import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Database URL - hardcoded for Vercel deployment
// In production, this should be in environment variables
const DATABASE_URL = process.env.DATABASE_URL || 
  "postgresql://neondb_owner:npg_34VWfvXExqkd@ep-round-sky-an1ah6j4-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: ["error"],
    datasources: {
      db: {
        url: DATABASE_URL,
      },
    },
  });
}

export const db = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
