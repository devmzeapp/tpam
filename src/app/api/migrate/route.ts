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

    // ==================== Vehicle Maintenance Columns ====================
    
    // Add currentKm column to Vehicle
    try {
      const currentKmCheck = await db.$queryRaw`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'Vehicle' 
        AND column_name = 'currentKm'
      `;

      if (Array.isArray(currentKmCheck) && currentKmCheck.length === 0) {
        await db.$executeRaw`ALTER TABLE "Vehicle" ADD COLUMN "currentKm" INTEGER`;
        results.push("Added currentKm column to Vehicle table");
      } else {
        results.push("currentKm column already exists in Vehicle table");
      }
    } catch (e) {
      results.push(`Error with currentKm column: ${e instanceof Error ? e.message : String(e)}`);
    }

    // Add lastOilChangeDate column to Vehicle
    try {
      const colCheck = await db.$queryRaw`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'Vehicle' 
        AND column_name = 'lastOilChangeDate'
      `;

      if (Array.isArray(colCheck) && colCheck.length === 0) {
        await db.$executeRaw`ALTER TABLE "Vehicle" ADD COLUMN "lastOilChangeDate" TIMESTAMP(3)`;
        results.push("Added lastOilChangeDate column to Vehicle table");
      } else {
        results.push("lastOilChangeDate column already exists in Vehicle table");
      }
    } catch (e) {
      results.push(`Error with lastOilChangeDate column: ${e instanceof Error ? e.message : String(e)}`);
    }

    // Add lastOilChangeKm column to Vehicle
    try {
      const colCheck = await db.$queryRaw`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'Vehicle' 
        AND column_name = 'lastOilChangeKm'
      `;

      if (Array.isArray(colCheck) && colCheck.length === 0) {
        await db.$executeRaw`ALTER TABLE "Vehicle" ADD COLUMN "lastOilChangeKm" INTEGER`;
        results.push("Added lastOilChangeKm column to Vehicle table");
      } else {
        results.push("lastOilChangeKm column already exists in Vehicle table");
      }
    } catch (e) {
      results.push(`Error with lastOilChangeKm column: ${e instanceof Error ? e.message : String(e)}`);
    }

    // Add nextOilChangeKm column to Vehicle
    try {
      const colCheck = await db.$queryRaw`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'Vehicle' 
        AND column_name = 'nextOilChangeKm'
      `;

      if (Array.isArray(colCheck) && colCheck.length === 0) {
        await db.$executeRaw`ALTER TABLE "Vehicle" ADD COLUMN "nextOilChangeKm" INTEGER`;
        results.push("Added nextOilChangeKm column to Vehicle table");
      } else {
        results.push("nextOilChangeKm column already exists in Vehicle table");
      }
    } catch (e) {
      results.push(`Error with nextOilChangeKm column: ${e instanceof Error ? e.message : String(e)}`);
    }

    // Add insuranceExpiry column to Vehicle
    try {
      const colCheck = await db.$queryRaw`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'Vehicle' 
        AND column_name = 'insuranceExpiry'
      `;

      if (Array.isArray(colCheck) && colCheck.length === 0) {
        await db.$executeRaw`ALTER TABLE "Vehicle" ADD COLUMN "insuranceExpiry" TIMESTAMP(3)`;
        results.push("Added insuranceExpiry column to Vehicle table");
      } else {
        results.push("insuranceExpiry column already exists in Vehicle table");
      }
    } catch (e) {
      results.push(`Error with insuranceExpiry column: ${e instanceof Error ? e.message : String(e)}`);
    }

    // Add vignetteExpiry column to Vehicle
    try {
      const colCheck = await db.$queryRaw`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'Vehicle' 
        AND column_name = 'vignetteExpiry'
      `;

      if (Array.isArray(colCheck) && colCheck.length === 0) {
        await db.$executeRaw`ALTER TABLE "Vehicle" ADD COLUMN "vignetteExpiry" TIMESTAMP(3)`;
        results.push("Added vignetteExpiry column to Vehicle table");
      } else {
        results.push("vignetteExpiry column already exists in Vehicle table");
      }
    } catch (e) {
      results.push(`Error with vignetteExpiry column: ${e instanceof Error ? e.message : String(e)}`);
    }

    // Add technicalInspectionExpiry column to Vehicle
    try {
      const colCheck = await db.$queryRaw`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'Vehicle' 
        AND column_name = 'technicalInspectionExpiry'
      `;

      if (Array.isArray(colCheck) && colCheck.length === 0) {
        await db.$executeRaw`ALTER TABLE "Vehicle" ADD COLUMN "technicalInspectionExpiry" TIMESTAMP(3)`;
        results.push("Added technicalInspectionExpiry column to Vehicle table");
      } else {
        results.push("technicalInspectionExpiry column already exists in Vehicle table");
      }
    } catch (e) {
      results.push(`Error with technicalInspectionExpiry column: ${e instanceof Error ? e.message : String(e)}`);
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
