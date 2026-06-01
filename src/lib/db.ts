import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient; migrationDone: boolean };

// Database URL - hardcoded for Vercel deployment
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

// Automatic migration function
export async function runAutoMigration(): Promise<boolean> {
  // Check if migration was already done in this process
  if (globalForPrisma.migrationDone) {
    return true;
  }

  try {
    console.log("Checking database schema...");

    // Check if companyId column exists in User table
    const columnCheck = await db.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'User' 
      AND column_name = 'companyId'
    `;

    if (Array.isArray(columnCheck) && columnCheck.length === 0) {
      console.log("Running database migration...");
      
      // Add companyId column to User table
      await db.$executeRaw`
        ALTER TABLE "User" ADD COLUMN "companyId" TEXT
      `;
      console.log("Added companyId column to User table");
    }

    // Check if approved column exists in User table
    const approvedCheck = await db.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'User' 
      AND column_name = 'approved'
    `;

    if (Array.isArray(approvedCheck) && approvedCheck.length === 0) {
      await db.$executeRaw`
        ALTER TABLE "User" ADD COLUMN "approved" BOOLEAN NOT NULL DEFAULT false
      `;
      // Approve existing users
      await db.$executeRaw`
        UPDATE "User" SET approved = true
      `;
      console.log("Added approved column to User table");
    }

    // Check if Company table exists
    const tableCheck = await db.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'Company'
    `;

    if (Array.isArray(tableCheck) && tableCheck.length === 0) {
      // Create Company table
      await db.$executeRaw`
        CREATE TABLE "Company" (
          "id" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "email" TEXT NOT NULL,
          "phone" TEXT,
          "address" TEXT,
          "city" TEXT,
          "ice" TEXT,
          "active" BOOLEAN NOT NULL DEFAULT true,
          "approved" BOOLEAN NOT NULL DEFAULT false,
          "blocked" BOOLEAN NOT NULL DEFAULT false,
          "plan" TEXT NOT NULL DEFAULT 'trial',
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "Company_pkey" PRIMARY KEY ("id"),
          CONSTRAINT "Company_email_key" UNIQUE ("email")
        )
      `;
      console.log("Created Company table");
    } else {
      // Check if approved column exists in Company table
      const companyApprovedCheck = await db.$queryRaw`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'Company' 
        AND column_name = 'approved'
      `;

      if (Array.isArray(companyApprovedCheck) && companyApprovedCheck.length === 0) {
        await db.$executeRaw`
          ALTER TABLE "Company" ADD COLUMN "approved" BOOLEAN NOT NULL DEFAULT false
        `;
        await db.$executeRaw`
          UPDATE "Company" SET approved = true
        `;
        console.log("Added approved column to Company table");
      }

      // Check if blocked column exists in Company table
      const companyBlockedCheck = await db.$queryRaw`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'Company' 
        AND column_name = 'blocked'
      `;

      if (Array.isArray(companyBlockedCheck) && companyBlockedCheck.length === 0) {
        await db.$executeRaw`
          ALTER TABLE "Company" ADD COLUMN "blocked" BOOLEAN NOT NULL DEFAULT false
        `;
        console.log("Added blocked column to Company table");
      }
    }

    // Add foreign key constraint if not exists
    try {
      const fkCheck = await db.$queryRaw`
        SELECT constraint_name 
        FROM information_schema.table_constraints 
        WHERE table_name = 'User' 
        AND constraint_name = 'User_companyId_fkey'
      `;

      if (Array.isArray(fkCheck) && fkCheck.length === 0) {
        await db.$executeRaw`
          ALTER TABLE "User" 
          ADD CONSTRAINT "User_companyId_fkey" 
          FOREIGN KEY ("companyId") REFERENCES "Company"("id") 
          ON DELETE SET NULL ON UPDATE CASCADE
        `;
        console.log("Added foreign key constraint");
      }
    } catch (fkError) {
      console.log("Foreign key constraint might already exist or Company table missing");
    }

    // Create index
    try {
      await db.$executeRaw`
        CREATE INDEX IF NOT EXISTS "User_companyId_idx" ON "User"("companyId")
      `;
    } catch (e) {
      // Index might already exist
    }

    // Check if SUPER_ADMIN role exists in enum
    try {
      const superAdminCheck = await db.$queryRaw`
        SELECT EXISTS (
          SELECT 1 FROM pg_enum 
          WHERE enumlabel = 'SUPER_ADMIN' 
          AND enumtypid = (
            SELECT oid FROM pg_type WHERE typname = 'UserRole'
          )
        )
      `;

      const hasSuperAdmin = Array.isArray(superAdminCheck) && 
        superAdminCheck.length > 0 && 
        (superAdminCheck[0] as any)?.exists === true;

      if (!hasSuperAdmin) {
        await db.$executeRaw`
          ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN'
        `;
        console.log("Added SUPER_ADMIN to UserRole enum");
      }
    } catch (enumError) {
      console.log("Error checking SUPER_ADMIN enum:", enumError);
    }

    // Create super admin if not exists (using plain password for simple comparison)
    const existingSuperAdmin = await db.$queryRaw`
      SELECT id, email FROM "User" WHERE email = 'marketing@mozartevents.ma'
    `;

    if (Array.isArray(existingSuperAdmin) && existingSuperAdmin.length === 0) {
      await db.$executeRaw`
        INSERT INTO "User" (id, email, password, name, role, active, approved, "createdAt", "updatedAt")
        VALUES (
          'super_admin_001',
          'marketing@mozartevents.ma',
          'Marketing@@2030+',
          'Super Administrateur',
          'SUPER_ADMIN',
          true,
          true,
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
      `;
      console.log("Created super admin user");
    }

    // Mark migration as done
    globalForPrisma.migrationDone = true;
    console.log("Database migration completed successfully");
    return true;
  } catch (error) {
    console.error("Migration error:", error);
    return false;
  }
}
