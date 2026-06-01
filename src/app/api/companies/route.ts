import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    // Get all companies with user count
    const companies = await db.company.findMany({
      include: {
        _count: {
          select: { users: true },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Get stats
    const totalCompanies = await db.company.count();
    const activeCompanies = await db.company.count({
      where: { active: true },
    });
    const totalUsers = await db.user.count();

    return NextResponse.json({
      companies,
      stats: {
        totalCompanies,
        activeCompanies,
        totalUsers,
      },
    });
  } catch (error) {
    console.error("Get companies error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des entreprises" },
      { status: 500 }
    );
  }
}
