import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserContext } from "@/lib/tenant-context";

// GET reports data - filtré par tenant
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id") || 
                   request.nextUrl.searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const context = await getUserContext(userId);
    if (!context) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get("type") || "planning";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const vehicleId = searchParams.get("vehicleId");
    const driverId = searchParams.get("driverId");

    // Construire le filtre tenant
    const tenantFilter = context.canAccessAllTenants 
      ? "" 
      : `AND "tenantId" = '${context.tenantId}'`;

    let whereClause = "1=1";
    if (startDate) {
      whereClause += ` AND date >= '${startDate}'`;
    }
    if (endDate) {
      whereClause += ` AND date <= '${endDate}'`;
    }
    if (vehicleId) {
      whereClause += ` AND "vehicleId" = '${vehicleId}'`;
    }
    if (driverId) {
      whereClause += ` AND "driverId" = '${driverId}'`;
    }

    let data: unknown;

    switch (reportType) {
      case "planning":
        data = await db.$queryRawUnsafe(`
          SELECT s.*, 
            c.id as client_id, c.name as client_name,
            v.id as vehicle_id, v.brand as vehicle_brand, v.model as vehicle_model, v.registration as vehicle_registration,
            d.id as driver_id, d."firstName" as driver_firstName, d."lastName" as driver_lastName
          FROM "Service" s
          LEFT JOIN "Client" c ON s."clientId" = c.id
          LEFT JOIN "Vehicle" v ON s."vehicleId" = v.id
          LEFT JOIN "Driver" d ON s."driverId" = d.id
          WHERE ${whereClause} ${tenantFilter}
          ORDER BY s.date ASC
        `);
        break;

      case "vehicle":
        const vehiclesData = await db.$queryRawUnsafe(`
          SELECT v.*, 
            (SELECT COUNT(*) FROM "Service" s WHERE s."vehicleId" = v.id ${tenantFilter.replace('AND', 'AND')}) as service_count,
            (SELECT COALESCE(SUM(price), 0) FROM "Service" s WHERE s."vehicleId" = v.id ${tenantFilter.replace('AND', 'AND')}) as total_revenue
          FROM "Vehicle" v
          WHERE 1=1 ${tenantFilter.replace('AND', 'AND')}
          ORDER BY v.brand ASC
        `);
        data = vehiclesData;
        break;

      case "driver":
        const driversData = await db.$queryRawUnsafe(`
          SELECT d.*, 
            (SELECT COUNT(*) FROM "Service" s WHERE s."driverId" = d.id ${tenantFilter.replace('AND', 'AND')}) as service_count,
            (SELECT COALESCE(SUM(price), 0) FROM "Service" s WHERE s."driverId" = d.id ${tenantFilter.replace('AND', 'AND')}) as total_revenue
          FROM "Driver" d
          WHERE 1=1 ${tenantFilter.replace('AND', 'AND')}
          ORDER BY d."firstName" ASC
        `);
        data = driversData;
        break;

      case "combined":
        data = await db.$queryRawUnsafe(`
          SELECT s.*, 
            c.id as client_id, c.name as client_name,
            v.id as vehicle_id, v.brand as vehicle_brand, v.model as vehicle_model, v.registration as vehicle_registration,
            d.id as driver_id, d."firstName" as driver_firstName, d."lastName" as driver_lastName
          FROM "Service" s
          LEFT JOIN "Client" c ON s."clientId" = c.id
          LEFT JOIN "Vehicle" v ON s."vehicleId" = v.id
          LEFT JOIN "Driver" d ON s."driverId" = d.id
          WHERE ${whereClause} ${tenantFilter}
          ORDER BY s.date ASC
        `);
        break;

      case "debtors":
        const debtorsData = await db.$queryRawUnsafe(`
          SELECT c.*,
            (SELECT COALESCE(SUM(i.total - COALESCE((
              SELECT SUM(amount) FROM "Payment" p WHERE p."invoiceId" = i.id
            ), 0)), 0)
            FROM "Invoice" i WHERE i."clientId" = c.id AND i.status = 'SENT'
            ) as total_debt,
            (SELECT COUNT(*) FROM "Invoice" i WHERE i."clientId" = c.id AND i.status = 'SENT') as unpaid_invoices,
            (SELECT COUNT(*) FROM "Service" s WHERE s."clientId" = c.id AND s.status = 'NON_DECLAREE') as undeclared_services
          FROM "Client" c
          WHERE 1=1 ${tenantFilter.replace('AND', 'AND')}
          ORDER BY total_debt DESC
        `);
        data = debtorsData;
        break;

      default:
        data = await db.$queryRawUnsafe(`
          SELECT s.*, 
            c.id as client_id, c.name as client_name,
            v.id as vehicle_id, v.brand as vehicle_brand, v.model as vehicle_model, v.registration as vehicle_registration,
            d.id as driver_id, d."firstName" as driver_firstName, d."lastName" as driver_lastName
          FROM "Service" s
          LEFT JOIN "Client" c ON s."clientId" = c.id
          LEFT JOIN "Vehicle" v ON s."vehicleId" = v.id
          LEFT JOIN "Driver" d ON s."driverId" = d.id
          WHERE ${whereClause} ${tenantFilter}
          ORDER BY s.date DESC
        `);
    }

    return NextResponse.json({
      type: reportType,
      generatedAt: new Date().toISOString(),
      data,
    });
  } catch (error) {
    console.error("Get reports error:", error);
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 }
    );
  }
}
