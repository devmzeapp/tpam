import { NextRequest, NextResponse } from "next/server";
import { db, runAutoMigration } from "@/lib/db";

// GET: List all companies with their users
export async function GET(request: NextRequest) {
  try {
    await runAutoMigration();

    // Get all companies with user count and status
    const companies = await db.$queryRaw`
      SELECT 
        c.id,
        c.name,
        c.email,
        c.phone,
        c.active,
        c.approved,
        c.blocked,
        c."blockReason",
        c.plan,
        c."createdAt",
        c."updatedAt",
        COUNT(u.id) as "userCount"
      FROM "Company" c
      LEFT JOIN "User" u ON u."companyId" = c.id
      GROUP BY c.id, c.name, c.email, c.phone, c.active, c.approved, c.blocked, c."blockReason", c.plan, c."createdAt", c."updatedAt"
      ORDER BY c."createdAt" DESC
    `;

    // Get all users with company info
    const users = await db.$queryRaw`
      SELECT 
        u.id,
        u.email,
        u.name,
        u.role,
        u.active,
        u.approved,
        u."companyId",
        c.name as "companyName",
        u."createdAt"
      FROM "User" u
      LEFT JOIN "Company" c ON u."companyId" = c.id
      ORDER BY u."createdAt" DESC
    `;

    return NextResponse.json({
      success: true,
      companies,
      users,
    });
  } catch (error) {
    console.error("Error fetching companies:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des entreprises" },
      { status: 500 }
    );
  }
}
