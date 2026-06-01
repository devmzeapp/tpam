import { NextResponse } from "next/server";
import postgres from "postgres";

// This endpoint uses raw PostgreSQL connection (not Prisma) to perform migrations
// This ensures it works even when the Prisma schema doesn't match the database

const DATABASE_URL = process.env.DATABASE_URL || 
  "postgresql://neondb_owner:npg_34VWfvXExqkd@ep-round-sky-an1ah6j4-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

export async function GET() {
  const sql = postgres(DATABASE_URL);
  const results: string[] = [];

  try {
    console.log("Starting database migration with raw SQL...");

    // 1. Add companyId column to User table if not exists
    try {
      const userColumns = await sql`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'User' AND column_name = 'companyId'
      `;
      
      if (userColumns.length === 0) {
        await sql`ALTER TABLE "User" ADD COLUMN "companyId" TEXT`;
        results.push("✅ Added 'companyId' column to User table");
      } else {
        results.push("ℹ️ 'companyId' column already exists in User table");
      }
    } catch (e: any) {
      results.push(`⚠️ Error adding companyId to User: ${e.message}`);
    }

    // 2. Create Company table if not exists
    try {
      const tableExists = await sql`
        SELECT table_name FROM information_schema.tables WHERE table_name = 'Company'
      `;
      
      if (tableExists.length === 0) {
        await sql`
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
            "plan" TEXT NOT NULL DEFAULT 'trial',
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "Company_pkey" PRIMARY KEY ("id"),
            CONSTRAINT "Company_email_key" UNIQUE ("email")
          )
        `;
        results.push("✅ Created 'Company' table");
      } else {
        results.push("ℹ️ 'Company' table already exists");
      }
    } catch (e: any) {
      results.push(`⚠️ Error creating Company table: ${e.message}`);
    }

    // 3. Add approved column to User table
    try {
      const approvedColumn = await sql`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'User' AND column_name = 'approved'
      `;
      
      if (approvedColumn.length === 0) {
        await sql`ALTER TABLE "User" ADD COLUMN "approved" BOOLEAN NOT NULL DEFAULT false`;
        results.push("✅ Added 'approved' column to User table");
        
        // Approve existing users (they were created before the approval system)
        await sql`UPDATE "User" SET approved = true WHERE "role" != 'SUPER_ADMIN'`;
        results.push("✅ Approved existing users");
      } else {
        results.push("ℹ️ 'approved' column already exists in User table");
      }
    } catch (e: any) {
      results.push(`⚠️ Error adding approved to User: ${e.message}`);
    }

    // 4. Add approved column to Company table
    try {
      const companyApproved = await sql`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'Company' AND column_name = 'approved'
      `;
      
      if (companyApproved.length === 0) {
        await sql`ALTER TABLE "Company" ADD COLUMN "approved" BOOLEAN NOT NULL DEFAULT false`;
        results.push("✅ Added 'approved' column to Company table");
      } else {
        results.push("ℹ️ 'approved' column already exists in Company table");
      }
    } catch (e: any) {
      results.push(`⚠️ Error adding approved to Company: ${e.message}`);
    }

    // 5. Add foreign key constraint
    try {
      const fkExists = await sql`
        SELECT constraint_name FROM information_schema.table_constraints 
        WHERE table_name = 'User' AND constraint_name = 'User_companyId_fkey'
      `;
      
      if (fkExists.length === 0) {
        try {
          await sql`
            ALTER TABLE "User" 
            ADD CONSTRAINT "User_companyId_fkey" 
            FOREIGN KEY ("companyId") REFERENCES "Company"("id") 
            ON DELETE SET NULL ON UPDATE CASCADE
          `;
          results.push("✅ Added foreign key constraint");
        } catch (fkError: any) {
          results.push(`⚠️ Could not add foreign key: ${fkError.message}`);
        }
      } else {
        results.push("ℹ️ Foreign key constraint already exists");
      }
    } catch (e: any) {
      results.push(`⚠️ Error checking foreign key: ${e.message}`);
    }

    // 6. Create index on companyId
    try {
      const indexExists = await sql`
        SELECT indexname FROM pg_indexes 
        WHERE tablename = 'User' AND indexname = 'User_companyId_idx'
      `;
      
      if (indexExists.length === 0) {
        await sql`CREATE INDEX "User_companyId_idx" ON "User"("companyId")`;
        results.push("✅ Created index on User.companyId");
      } else {
        results.push("ℹ️ Index on companyId already exists");
      }
    } catch (e: any) {
      results.push(`⚠️ Error creating index: ${e.message}`);
    }

    // 7. Add SUPER_ADMIN to UserRole enum if not exists
    try {
      const enumValues = await sql`
        SELECT enumlabel FROM pg_enum 
        WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'UserRole')
      `;
      
      const hasSuperAdmin = enumValues.some((v: any) => v.enumlabel === 'SUPER_ADMIN');
      
      if (!hasSuperAdmin) {
        await sql`ALTER TYPE "UserRole" ADD VALUE 'SUPER_ADMIN'`;
        results.push("✅ Added SUPER_ADMIN to UserRole enum");
      } else {
        results.push("ℹ️ SUPER_ADMIN already exists in enum");
      }
    } catch (e: any) {
      results.push(`⚠️ Error with enum: ${e.message}`);
    }

    // 8. Create super admin user if not exists
    try {
      const superAdmin = await sql`
        SELECT id FROM "User" WHERE email = 'marketing@mozartevents.ma'
      `;
      
      if (superAdmin.length === 0) {
        await sql`
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
        results.push("✅ Created super admin user: marketing@mozartevents.ma");
      } else {
        // Make sure the super admin has approved = true
        await sql`
          UPDATE "User" SET approved = true, role = 'SUPER_ADMIN'
          WHERE email = 'marketing@mozartevents.ma'
        `;
        results.push("✅ Updated super admin user");
      }
    } catch (e: any) {
      results.push(`⚠️ Error creating super admin: ${e.message}`);
    }

    // 9. Approve existing companies
    try {
      await sql`UPDATE "Company" SET approved = true WHERE approved = false`;
      results.push("✅ Approved existing companies");
    } catch (e: any) {
      results.push(`⚠️ Error approving companies: ${e.message}`);
    }

    await sql.end();

    return NextResponse.json({
      success: true,
      message: "Migration completed successfully!",
      results,
      nextSteps: [
        "1. You can now register new accounts",
        "2. Login as super admin: marketing@mozartevents.ma / Marketing@@2030+",
        "3. Approve or reject new registrations from the 'Entreprises' menu"
      ]
    });

  } catch (error: any) {
    await sql.end();
    console.error("Migration error:", error);
    return NextResponse.json({
      success: false,
      error: error.message,
      results,
    }, { status: 500 });
  }
}
