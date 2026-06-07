import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserContext } from "@/lib/tenant-context";

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

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Construire le filtre tenant
    const tenantFilter = context.canAccessAllTenants 
      ? "" 
      : `AND "tenantId" = '${context.tenantId}'`;

    // Services du jour
    const todayServicesResult = await db.$queryRawUnsafe(`
      SELECT COUNT(*) as count FROM "Service"
      WHERE date >= '${today.toISOString()}'
      AND date < '${tomorrow.toISOString()}'
      ${tenantFilter}
    `);
    const todayServices = parseInt((todayServicesResult as any)[0]?.count) || 0;

    // Véhicules en mission
    const vehiclesInMissionResult = await db.$queryRawUnsafe(`
      SELECT COUNT(*) as count FROM "Vehicle"
      WHERE status = 'in_mission'
      ${tenantFilter.replace('AND', 'AND')}
    `);
    const vehiclesInMission = parseInt((vehiclesInMissionResult as any)[0]?.count) || 0;

    // Factures en attente
    const pendingInvoicesResult = await db.$queryRawUnsafe(`
      SELECT COUNT(*) as count FROM "Invoice"
      WHERE status = 'SENT'
      ${tenantFilter}
    `);
    const pendingInvoices = parseInt((pendingInvoicesResult as any)[0]?.count) || 0;

    // Revenus du jour
    const todayRevenueResult = await db.$queryRawUnsafe(`
      SELECT COALESCE(SUM(price), 0) as total FROM "Service"
      WHERE date >= '${today.toISOString()}'
      AND date < '${tomorrow.toISOString()}'
      ${tenantFilter}
    `);
    const todayRevenue = parseFloat((todayRevenueResult as any)[0]?.total) || 0;

    // Services récents
    const recentServices = await db.$queryRawUnsafe(`
      SELECT s.*,
        c.name as client_name,
        v.brand as vehicle_brand, v.model as vehicle_model, v.registration as vehicle_registration,
        d."firstName" as driver_first_name, d."lastName" as driver_last_name
      FROM "Service" s
      LEFT JOIN "Client" c ON s."clientId" = c.id
      LEFT JOIN "Vehicle" v ON s."vehicleId" = v.id
      LEFT JOIN "Driver" d ON s."driverId" = d.id
      WHERE 1=1 ${tenantFilter}
      ORDER BY s."createdAt" DESC
      LIMIT 5
    `);

    // Factures en attente (liste)
    const pendingInvoicesList = await db.$queryRawUnsafe(`
      SELECT i.*, c.name as client_name
      FROM "Invoice" i
      LEFT JOIN "Client" c ON i."clientId" = c.id
      WHERE i.status = 'SENT'
      ${tenantFilter}
      ORDER BY i."issueDate" DESC
      LIMIT 5
    `);

    // Revenus mensuels (6 derniers mois)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyServices = await db.$queryRawUnsafe(`
      SELECT price, date
      FROM "Service"
      WHERE date >= '${sixMonthsAgo.toISOString()}'
      AND status = 'FACTUREE'
      ${tenantFilter}
    `);

    // Grouper par mois
    const monthlyRevenue = (monthlyServices as any[]).reduce(
      (acc, service) => {
        const month = service.date.toISOString().slice(0, 7);
        acc[month] = (acc[month] || 0) + service.price;
        return acc;
      },
      {} as Record<string, number>
    );

    // Stats par statut
    const servicesByStatus = await db.$queryRawUnsafe(`
      SELECT status, COUNT(*) as count
      FROM "Service"
      WHERE 1=1 ${tenantFilter}
      GROUP BY status
    `);

    // Montant non payé
    const unpaidInvoicesResult = await db.$queryRawUnsafe(`
      SELECT COALESCE(SUM(total), 0) as total
      FROM "Invoice"
      WHERE status = 'SENT'
      ${tenantFilter}
    `);
    const unpaidAmount = parseFloat((unpaidInvoicesResult as any)[0]?.total) || 0;

    return NextResponse.json({
      stats: {
        todayServices,
        vehiclesInMission,
        pendingInvoices,
        todayRevenue,
        unpaidAmount,
      },
      recentServices: (recentServices as any[]).map(s => ({
        ...s,
        client: { name: s.client_name },
        vehicle: { brand: s.vehicle_brand, model: s.vehicle_model, registration: s.vehicle_registration },
        driver: { firstName: s.driver_first_name, lastName: s.driver_last_name },
      })),
      pendingInvoicesList: (pendingInvoicesList as any[]).map(i => ({
        ...i,
        client: { name: i.client_name },
      })),
      monthlyRevenue,
      servicesByStatus,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}
