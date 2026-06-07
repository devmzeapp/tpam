import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient; migrationDone: boolean; tenantMigrationDone: boolean };

// Database URL - must be set in environment variables
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

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

    // First, get all existing User table columns
    const userColumns = await db.$queryRaw`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'User' 
      ORDER BY ordinal_position
    `;
    console.log("User table columns:", JSON.stringify(userColumns, null, 2));

    // Fix any NOT NULL columns without defaults that might cause issues
    // For each NOT NULL column without a default, we need to either add a default or allow NULL
    const userCols = userColumns as Array<{ column_name: string; data_type: string; is_nullable: string; column_default: string | null }>;
    
    for (const col of userCols) {
      // Skip primary key and known columns
      if (['id', 'email', 'password', 'name', 'role', 'active', 'approved', 'companyId', 'tenantId', 'createdAt', 'updatedAt'].includes(col.column_name)) {
        continue;
      }
      
      // If column is NOT NULL and has no default, add a default or make it nullable
      if (col.is_nullable === 'NO' && !col.column_default) {
        console.log(`Fixing column ${col.column_name} - adding default or making nullable`);
        try {
          if (col.data_type === 'text' || col.data_type === 'character varying') {
            await db.$executeRawUnsafe(`ALTER TABLE "User" ALTER COLUMN "${col.column_name}" DROP NOT NULL`);
          } else if (col.data_type === 'boolean') {
            await db.$executeRawUnsafe(`ALTER TABLE "User" ALTER COLUMN "${col.column_name}" SET DEFAULT false`);
          } else if (col.data_type === 'integer' || col.data_type === 'bigint') {
            await db.$executeRawUnsafe(`ALTER TABLE "User" ALTER COLUMN "${col.column_name}" SET DEFAULT 0`);
          } else {
            await db.$executeRawUnsafe(`ALTER TABLE "User" ALTER COLUMN "${col.column_name}" DROP NOT NULL`);
          }
        } catch (e) {
          console.log(`Could not fix column ${col.column_name}:`, e);
        }
      }
    }

    // Check if companyId column exists in User table
    const companyIdExists = userCols.some(c => c.column_name === 'companyId');
    if (!companyIdExists) {
      console.log("Adding companyId column to User table...");
      await db.$executeRaw`ALTER TABLE "User" ADD COLUMN "companyId" TEXT`;
      console.log("Added companyId column to User table");
    }

    // Check if tenantId column exists in User table (multi-tenant)
    const tenantIdExists = userCols.some(c => c.column_name === 'tenantId');
    if (!tenantIdExists) {
      console.log("Adding tenantId column to User table...");
      await db.$executeRaw`ALTER TABLE "User" ADD COLUMN "tenantId" TEXT`;
      console.log("Added tenantId column to User table");
    }

    // Check if approved column exists in User table
    const approvedExists = userCols.some(c => c.column_name === 'approved');
    if (!approvedExists) {
      console.log("Adding approved column to User table...");
      await db.$executeRaw`ALTER TABLE "User" ADD COLUMN "approved" BOOLEAN NOT NULL DEFAULT false`;
      // Approve existing users
      await db.$executeRaw`UPDATE "User" SET approved = true WHERE approved = false`;
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
      // Check and add missing columns to Company table
      const companyColumns = await db.$queryRaw`
        SELECT column_name FROM information_schema.columns WHERE table_name = 'Company'
      `;
      const companyCols = (companyColumns as any[]).map(c => c.column_name);

      if (!companyCols.includes('approved')) {
        await db.$executeRaw`ALTER TABLE "Company" ADD COLUMN "approved" BOOLEAN NOT NULL DEFAULT false`;
        await db.$executeRaw`UPDATE "Company" SET approved = true`;
      }
      if (!companyCols.includes('blocked')) {
        await db.$executeRaw`ALTER TABLE "Company" ADD COLUMN "blocked" BOOLEAN NOT NULL DEFAULT false`;
      }
    }

    // Check if TenantAccount table exists (multi-tenant)
    const tenantTableCheck = await db.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'TenantAccount'
    `;

    if (Array.isArray(tenantTableCheck) && tenantTableCheck.length === 0) {
      console.log("Creating TenantAccount table...");
      await db.$executeRaw`
        CREATE TABLE IF NOT EXISTS "TenantAccount" (
          "id" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "slug" TEXT NOT NULL UNIQUE,
          "email" TEXT NOT NULL UNIQUE,
          "phone" TEXT,
          "address" TEXT,
          "city" TEXT,
          "ice" TEXT,
          "rc" TEXT,
          "if" TEXT,
          "cnss" TEXT,
          "logo" TEXT,
          "stamp" TEXT,
          "signature" TEXT,
          "plan" TEXT NOT NULL DEFAULT 'trial',
          "active" BOOLEAN NOT NULL DEFAULT true,
          "approved" BOOLEAN NOT NULL DEFAULT false,
          "blocked" BOOLEAN NOT NULL DEFAULT false,
          "blockReason" TEXT,
          "trialEndsAt" TIMESTAMP(3),
          "subscriptionEndsAt" TIMESTAMP(3),
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "TenantAccount_pkey" PRIMARY KEY ("id")
        )
      `;
      console.log("Created TenantAccount table");
    }

    // Add tenantId to other tables if needed
    const tablesToAddTenant = ['Vehicle', 'Driver', 'Client', 'Service', 'Invoice', 'Payment', 'Manifest'];
    for (const table of tablesToAddTenant) {
      try {
        const colCheck = await db.$queryRawUnsafe(`
          SELECT column_name FROM information_schema.columns 
          WHERE table_name = '${table}' AND column_name = 'tenantId'
        `);
        if (!Array.isArray(colCheck) || colCheck.length === 0) {
          await db.$executeRawUnsafe(`ALTER TABLE "${table}" ADD COLUMN "tenantId" TEXT`);
          console.log(`Added tenantId column to ${table} table`);
        }
      } catch (e) {
        console.log(`Could not add tenantId to ${table}:`, e);
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
      console.log("Foreign key constraint issue:", fkError);
    }

    // Create indexes
    try {
      await db.$executeRaw`CREATE INDEX IF NOT EXISTS "User_companyId_idx" ON "User"("companyId")`;
      await db.$executeRaw`CREATE INDEX IF NOT EXISTS "User_tenantId_idx" ON "User"("tenantId")`;
    } catch (e) {
      // Index might already exist
    }

    // Check if SUPER_ADMIN role exists in enum
    try {
      const superAdminCheck = await db.$queryRaw`
        SELECT EXISTS (
          SELECT 1 FROM pg_enum 
          WHERE enumlabel = 'SUPER_ADMIN' 
          AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'UserRole')
        )
      `;

      const hasSuperAdmin = Array.isArray(superAdminCheck) && 
        superAdminCheck.length > 0 && 
        (superAdminCheck[0] as any)?.exists === true;

      if (!hasSuperAdmin) {
        await db.$executeRaw`ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN'`;
        console.log("Added SUPER_ADMIN to UserRole enum");
      }
    } catch (enumError) {
      console.log("Error checking SUPER_ADMIN enum:", enumError);
    }

    // Check if ADMIN_CLIENT role exists in enum
    try {
      const adminClientCheck = await db.$queryRaw`
        SELECT EXISTS (
          SELECT 1 FROM pg_enum 
          WHERE enumlabel = 'ADMIN_CLIENT' 
          AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'UserRole')
        )
      `;

      const hasAdminClient = Array.isArray(adminClientCheck) && 
        adminClientCheck.length > 0 && 
        (adminClientCheck[0] as any)?.exists === true;

      if (!hasAdminClient) {
        await db.$executeRaw`ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'ADMIN_CLIENT'`;
        console.log("Added ADMIN_CLIENT to UserRole enum");
      }
    } catch (enumError) {
      console.log("Error checking ADMIN_CLIENT enum:", enumError);
    }

    // Create super admin if not exists
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'marketing@mozartevents.ma';
    const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD;

    const existingSuperAdmin = await db.$queryRawUnsafe(`
      SELECT id, email FROM "User" WHERE email = '${superAdminEmail}'
    `);

    if (Array.isArray(existingSuperAdmin) && existingSuperAdmin.length === 0) {
      if (!superAdminPassword) {
        console.log("SUPER_ADMIN_PASSWORD not set - skipping super admin creation");
      } else {
        // Build INSERT based on actual columns
        const insertCols = ['id', 'email', 'password', 'name', 'role', 'active', 'approved', 'createdAt', 'updatedAt'];
        const insertVals = [
          "'super_admin_001'",
          `'${superAdminEmail}'`,
          `'${superAdminPassword}'`,
          "'Super Administrateur'",
          "'SUPER_ADMIN'",
          'true',
          'true',
          'CURRENT_TIMESTAMP',
          'CURRENT_TIMESTAMP'
        ];
        
        const colStr = insertCols.map(c => `"${c}"`).join(', ');
        const valStr = insertVals.join(', ');
        
        await db.$executeRawUnsafe(`INSERT INTO "User" (${colStr}) VALUES (${valStr})`);
        console.log(`Created super admin user: ${superAdminEmail}`);
      }
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

// Get actual table columns helper
export async function getUserTableColumns(): Promise<string[]> {
  const result = await db.$queryRaw`
    SELECT column_name FROM information_schema.columns WHERE table_name = 'User' ORDER BY ordinal_position
  `;
  return (result as any[]).map(c => c.column_name);
}

export async function getCompanyTableColumns(): Promise<string[]> {
  const result = await db.$queryRaw`
    SELECT column_name FROM information_schema.columns WHERE table_name = 'Company' ORDER BY ordinal_position
  `;
  return (result as any[]).map(c => c.column_name);
}

/**
 * Get tenant ID for a user
 */
export async function getUserTenantId(userId: string): Promise<string | null> {
  try {
    const result = await db.$queryRaw`
      SELECT "tenantId" FROM "User" WHERE id = ${userId}
    `;
    return Array.isArray(result) && result.length > 0 ? (result[0] as any).tenantId : null;
  } catch {
    return null;
  }
}

/**
 * Create a new tenant account
 */
export async function createTenantAccount(data: {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  ice?: string;
}): Promise<string> {
  const id = `tenant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const slug = data.name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50);

  await db.$executeRaw`
    INSERT INTO "TenantAccount" (
      id, name, slug, email, phone, address, city, ice,
      active, approved, "createdAt", "updatedAt"
    ) VALUES (
      ${id}, ${data.name}, ${slug}, ${data.email},
      ${data.phone || null}, ${data.address || null}, ${data.city || null},
      ${data.ice || null}, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )
  `;

  return id;
}
