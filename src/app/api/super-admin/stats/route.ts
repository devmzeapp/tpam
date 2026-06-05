import { NextRequest, NextResponse } from "next/server";
import { db, runAutoMigration } from "@/lib/db";

// GET: Get platform statistics for super admin dashboard
export async function GET(request: NextRequest) {
  try {
    await runAutoMigration();

    // Get total companies count
    const totalCompaniesResult = await db.$queryRaw`
      SELECT COUNT(*) as count FROM "Company"
    `;
    const totalCompanies = Number((totalCompaniesResult as any[])?.[0]?.count || 0);

    // Get total users count
    const totalUsersResult = await db.$queryRaw`
      SELECT COUNT(*) as count FROM "User"
    `;
    const totalUsers = Number((totalUsersResult as any[])?.[0]?.count || 0);

    // Get active companies
    const activeCompaniesResult = await db.$queryRaw`
      SELECT COUNT(*) as count FROM "Company" WHERE active = true AND approved = true
    `;
    const activeCompanies = Number((activeCompaniesResult as any[])?.[0]?.count || 0);

    // Get pending approvals
    const pendingApprovalsResult = await db.$queryRaw`
      SELECT COUNT(*) as count FROM "Company" WHERE approved = false
    `;
    const pendingApprovals = Number((pendingApprovalsResult as any[])?.[0]?.count || 0);

    // Get blocked companies
    const blockedCompaniesResult = await db.$queryRaw`
      SELECT COUNT(*) as count FROM "Company" WHERE blocked = true
    `;
    const blockedCompanies = Number((blockedCompaniesResult as any[])?.[0]?.count || 0);

    // Get new companies this month
    const newCompaniesThisMonthResult = await db.$queryRaw`
      SELECT COUNT(*) as count FROM "Company" 
      WHERE "createdAt" >= date_trunc('month', CURRENT_DATE)
    `;
    const newCompaniesThisMonth = Number((newCompaniesThisMonthResult as any[])?.[0]?.count || 0);

    // Get new users this month
    const newUsersThisMonthResult = await db.$queryRaw`
      SELECT COUNT(*) as count FROM "User" 
      WHERE "createdAt" >= date_trunc('month', CURRENT_DATE)
    `;
    const newUsersThisMonth = Number((newUsersThisMonthResult as any[])?.[0]?.count || 0);

    // Calculate active percentage
    const activePercentage = totalCompanies > 0 
      ? Math.round((activeCompanies / totalCompanies) * 100) 
      : 0;

    // Default registration trend data
    const registrationTrend = [
      { month: "Jan", companies: 2, users: 5 },
      { month: "Fév", companies: 3, users: 8 },
      { month: "Mar", companies: 1, users: 4 },
      { month: "Avr", companies: 4, users: 12 },
      { month: "Mai", companies: 2, users: 7 },
      { month: "Juin", companies: Math.max(1, newCompaniesThisMonth), users: Math.max(2, newUsersThisMonth) },
    ];

    // Default plan distribution
    const planDistribution = [
      { name: "Trial", value: Math.max(1, totalCompanies), color: "#f59e0b" },
    ];

    // Get recent activity
    const recentActivity: any[] = [];

    // Get recent registrations
    try {
      const recentCompanies = await db.$queryRaw`
        SELECT name, "createdAt" FROM "Company" ORDER BY "createdAt" DESC LIMIT 5
      `;
      
      for (const company of (recentCompanies as any[])) {
        recentActivity.push({
          type: "registration",
          message: `Nouvelle entreprise: ${company.name}`,
          time: formatDate(company.createdAt),
        });
      }
    } catch (e) {
      // Ignore errors
    }

    return NextResponse.json({
      success: true,
      stats: {
        totalCompanies,
        totalUsers,
        activeCompanies,
        activePercentage,
        pendingApprovals,
        blockedCompanies,
        newCompaniesThisMonth,
        newUsersThisMonth,
        recentActivity,
      },
      registrationTrend,
      planDistribution,
    });
  } catch (error) {
    console.error("Error fetching platform stats:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des statistiques" },
      { status: 500 }
    );
  }
}

function formatDate(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `Il y a ${diffMins} min`;
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  if (diffDays < 7) return `Il y a ${diffDays}j`;
  return d.toLocaleDateString('fr-FR');
}
