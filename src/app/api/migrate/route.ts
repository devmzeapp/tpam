import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    console.log("Starting database migration...");
    const results: string[] = [];

    // Check and add companyId column to User table
    try {
      // Check if column exists
      const columnCheck = await db.$queryRaw`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'User' 
        AND column_name = 'companyId'
      `;

      if (Array.isArray(columnCheck) && columnCheck.length === 0) {
        // Column doesn't exist, add it
        await db.$executeRaw`
          ALTER TABLE "User" ADD COLUMN "companyId" TEXT
        `;
        results.push("Added companyId column to User table");
        console.log("Added companyId column to User table");
      } else {
        results.push("companyId column already exists in User table");
      }
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      results.push(`Error checking/adding companyId: ${error}`);
      console.error("Error with companyId column:", e);
    }

    // Check if Company table exists
    try {
      const tableCheck = await db.$queryRaw`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name = 'Company'
      `;

      if (Array.isArray(tableCheck) && tableCheck.length === 0) {
        // Company table doesn't exist, create it
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
            "plan" TEXT NOT NULL DEFAULT 'trial',
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL,
            CONSTRAINT "Company_pkey" PRIMARY KEY ("id"),
            CONSTRAINT "Company_email_key" UNIQUE ("email")
          )
        `;
        results.push("Created Company table");
        console.log("Created Company table");
      } else {
        results.push("Company table already exists");
      }
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      results.push(`Error checking/creating Company table: ${error}`);
      console.error("Error with Company table:", e);
    }

    // Add foreign key constraint if both exist
    try {
      // Check if foreign key already exists
      const fkCheck = await db.$queryRaw`
        SELECT constraint_name 
        FROM information_schema.table_constraints 
        WHERE table_name = 'User' 
        AND constraint_name = 'User_companyId_fkey'
      `;

      if (Array.isArray(fkCheck) && fkCheck.length === 0) {
        // Try to add foreign key (might fail if Company table doesn't exist)
        try {
          await db.$executeRaw`
            ALTER TABLE "User" 
            ADD CONSTRAINT "User_companyId_fkey" 
            FOREIGN KEY ("companyId") REFERENCES "Company"("id") 
            ON DELETE SET NULL ON UPDATE CASCADE
          `;
          results.push("Added foreign key constraint for companyId");
        } catch (fkError) {
          results.push(`Could not add foreign key (Company table may not exist): ${fkError instanceof Error ? fkError.message : String(fkError)}`);
        }
      } else {
        results.push("Foreign key constraint already exists");
      }
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      results.push(`Error checking foreign key: ${error}`);
    }

    // Create index on companyId
    try {
      const indexCheck = await db.$queryRaw`
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'User' 
        AND indexname = 'User_companyId_idx'
      `;

      if (Array.isArray(indexCheck) && indexCheck.length === 0) {
        await db.$executeRaw`
          CREATE INDEX "User_companyId_idx" ON "User"("companyId")
        `;
        results.push("Created index on User.companyId");
      } else {
        results.push("Index on companyId already exists");
      }
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      results.push(`Error creating index: ${error}`);
    }

    // Ensure SUPER_ADMIN role exists in enum
    try {
      // Check if any SUPER_ADMIN exists
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
          ALTER TYPE "UserRole" ADD VALUE 'SUPER_ADMIN'
        `;
        results.push("Added SUPER_ADMIN to UserRole enum");
      } else {
        results.push("SUPER_ADMIN role already exists in enum");
      }
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      results.push(`Error with SUPER_ADMIN enum: ${error}`);
    }

    // Create super admin if not exists
    try {
      const existingSuperAdmin = await db.$queryRaw`
        SELECT id, email FROM "User" WHERE email = 'marketing@mozartevents.ma'
      `;

      if (Array.isArray(existingSuperAdmin) && existingSuperAdmin.length === 0) {
        await db.$executeRaw`
          INSERT INTO "User" (id, email, password, name, role, active, "createdAt", "updatedAt")
          VALUES (
            'super_admin_001',
            'marketing@mozartevents.ma',
            'Marketing@@2030+',
            'Super Administrateur',
            'SUPER_ADMIN',
            true,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
          )
        `;
        results.push("Created super admin user: marketing@mozartevents.ma");
      } else {
        results.push("Super admin user already exists");
      }
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      results.push(`Error creating super admin: ${error}`);
    }

    return NextResponse.json({
      success: true,
      message: "Migration completed",
      results,
    });
  } catch (error) {
    console.error("Migration error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Migration failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
