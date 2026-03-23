import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ServiceStatus, InvoiceStatus } from "@prisma/client";

export async function GET() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get today's services count
    const todayServices = await db.service.count({
      where: {
        date: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    // Get vehicles in mission
    const vehiclesInMission = await db.vehicle.count({
      where: {
        status: "in_mission",
      },
    });

    // Get pending invoices count
    const pendingInvoices = await db.invoice.count({
      where: {
        status: InvoiceStatus.SENT,
      },
    });

    // Get today's revenue
    const todayServicesData = await db.service.findMany({
      where: {
        date: {
          gte: today,
          lt: tomorrow,
        },
      },
      select: {
        price: true,
      },
    });

    const todayRevenue = todayServicesData.reduce(
      (sum, service) => sum + service.price,
      0
    );

    // Get recent services
    const recentServices = await db.service.findMany({
      take: 5,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        client: {
          select: {
            name: true,
          },
        },
        vehicle: {
          select: {
            brand: true,
            model: true,
            registration: true,
          },
        },
        driver: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Get pending invoices list
    const pendingInvoicesList = await db.invoice.findMany({
      where: {
        status: InvoiceStatus.SENT,
      },
      take: 5,
      orderBy: {
        issueDate: "desc",
      },
      include: {
        client: {
          select: {
            name: true,
          },
        },
      },
    });

    // Get monthly revenue (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyServices = await db.service.findMany({
      where: {
        date: {
          gte: sixMonthsAgo,
        },
        status: ServiceStatus.FACTUREE,
      },
      select: {
        price: true,
        date: true,
      },
    });

    // Group by month
    const monthlyRevenue = monthlyServices.reduce(
      (acc, service) => {
        const month = service.date.toISOString().slice(0, 7);
        acc[month] = (acc[month] || 0) + service.price;
        return acc;
      },
      {} as Record<string, number>
    );

    // Get stats by status
    const servicesByStatus = await db.service.groupBy({
      by: ["status"],
      _count: {
        id: true,
      },
    });

    // Get unpaid amount
    const unpaidInvoices = await db.invoice.aggregate({
      where: {
        status: InvoiceStatus.SENT,
      },
      _sum: {
        total: true,
      },
    });

    return NextResponse.json({
      stats: {
        todayServices,
        vehiclesInMission,
        pendingInvoices,
        todayRevenue,
        unpaidAmount: unpaidInvoices._sum.total || 0,
      },
      recentServices,
      pendingInvoicesList,
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
