import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// Get all companies with their statistics
export async function GET(request: NextRequest) {
  try {
    const companies = await db.company.findMany({
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            approved: true,
            active: true,
            createdAt: true,
          }
        },
        _count: {
          select: { 
            users: true 
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    // Get additional stats for each company
    const companiesWithStats = await Promise.all(
      companies.map(async (company) => {
        // Get counts from related tables through users
        const users = company.users;
        const userIds = users.map(u => u.id);
        
        // Count services
        const servicesCount = userIds.length > 0 
          ? await db.service.count({ where: { createdById: { in: userIds } } })
          : 0;
        
        // Count invoices
        const invoicesCount = userIds.length > 0
          ? await db.invoice.count({ where: { createdById: { in: userIds } } })
          : 0;
        
        // Count vehicles (global for now, should be per-company later)
        const vehiclesCount = await db.vehicle.count();
        
        // Count drivers (global for now)
        const driversCount = await db.driver.count();

        return {
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
          users: company.users,
          stats: {
            services: servicesCount,
            invoices: invoicesCount,
            vehicles: vehiclesCount,
            drivers: driversCount,
          }
        };
      })
    );

    return NextResponse.json({
      success: true,
      companies: companiesWithStats
    });
  } catch (error) {
    console.error("Error fetching companies:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des entreprises" },
      { status: 500 }
    );
  }
}
