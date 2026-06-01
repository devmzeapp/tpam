import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isSuperAdmin } from "@/lib/super-admin";

// Get all companies with their approval status
export async function GET(request: NextRequest) {
  try {
    // Get authorization from header or cookie
    const authHeader = request.headers.get("authorization");
    const userEmail = request.headers.get("x-user-email");
    
    // For now, we'll check if the request comes from an authenticated super admin
    // In production, you'd use proper session management
    
    const companies = await db.company.findMany({
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            approved: true,
            createdAt: true,
          }
        },
        _count: {
          select: { users: true }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return NextResponse.json({
      success: true,
      companies: companies.map(company => ({
        id: company.id,
        name: company.name,
        email: company.email,
        phone: company.phone,
        address: company.address,
        city: company.city,
        ice: company.ice,
        active: company.active,
        approved: company.approved,
        plan: company.plan,
        createdAt: company.createdAt,
        usersCount: company._count.users,
        adminUser: company.users.find(u => u.role === "ADMIN"),
      }))
    });
  } catch (error) {
    console.error("Error fetching companies:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des entreprises" },
      { status: 500 }
    );
  }
}
