import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    // Get the actual Vehicle table columns from the database
    const columns = await db.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'Vehicle'
      ORDER BY ordinal_position
    `;

    // Try to get vehicles count
    const vehicleCount = await db.vehicle.count();

    return NextResponse.json({
      success: true,
      vehicleTableColumns: columns,
      vehicleCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Debug error:", error);
    return NextResponse.json({
      success: false,
      error: String(error),
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
