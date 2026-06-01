import { NextResponse } from "next/server";
import { db, runAutoMigration } from "@/lib/db";

export async function GET() {
  try {
    console.log("Running full database migration...");
    const results: string[] = [];

    // Run the auto-migration
    const success = await runAutoMigration();
    
    if (!success) {
      return NextResponse.json(
        { success: false, error: "Migration failed" },
        { status: 500 }
      );
    }

    // Additional migrations for blocked column on Company
    try {
      const blockedCheck = await db.$queryRaw`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'Company' 
        AND column_name = 'blocked'
      `;

      if (Array.isArray(blockedCheck) && blockedCheck.length === 0) {
        await db.$executeRaw`
          ALTER TABLE "Company" ADD COLUMN "blocked" BOOLEAN NOT NULL DEFAULT false
        `;
        results.push("Added blocked column to Company table");
      } else {
        results.push("blocked column already exists in Company table");
      }
    } catch (e) {
      results.push(`Error with blocked column: ${e instanceof Error ? e.message : String(e)}`);
    }

    // Add blockReason column
    try {
      const blockReasonCheck = await db.$queryRaw`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'Company' 
        AND column_name = 'blockReason'
      `;

      if (Array.isArray(blockReasonCheck) && blockReasonCheck.length === 0) {
        await db.$executeRaw`
          ALTER TABLE "Company" ADD COLUMN "blockReason" TEXT
        `;
        results.push("Added blockReason column to Company table");
      } else {
        results.push("blockReason column already exists in Company table");
      }
    } catch (e) {
      results.push(`Error with blockReason column: ${e instanceof Error ? e.message : String(e)}`);
    }

    return NextResponse.json({
      success: true,
      message: "Migration completed successfully",
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
