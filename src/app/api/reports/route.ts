import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET reports data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get("type") || "planning";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const vehicleId = searchParams.get("vehicleId");
    const driverId = searchParams.get("driverId");

    const dateFilter: Record<string, Date> = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    const where: Record<string, unknown> = {};
    if (startDate || endDate) {
      where.date = dateFilter;
    }
    if (vehicleId) where.vehicleId = vehicleId;
    if (driverId) where.driverId = driverId;

    let data: unknown;

    switch (reportType) {
      case "planning":
        data = await db.service.findMany({
          where,
          orderBy: { date: "asc" },
          include: {
            client: true,
            vehicle: true,
            driver: true,
          },
        });
        break;

      case "vehicle":
        const vehicles = await db.vehicle.findMany({
          include: {
            services: {
              where,
              include: {
                client: true,
                driver: true,
              },
            },
            _count: {
              select: { services: true },
            },
          },
        });
        data = vehicles.map((v) => ({
          ...v,
          totalRevenue: v.services.reduce((sum, s) => sum + s.price, 0),
        }));
        break;

      case "driver":
        const drivers = await db.driver.findMany({
          include: {
            services: {
              where,
              include: {
                client: true,
                vehicle: true,
              },
            },
            _count: {
              select: { services: true },
            },
          },
        });
        data = drivers.map((d) => ({
          ...d,
          totalRevenue: d.services.reduce((sum, s) => sum + s.price, 0),
        }));
        break;

      case "combined":
        data = await db.service.findMany({
          where,
          orderBy: { date: "asc" },
          include: {
            client: true,
            vehicle: true,
            driver: true,
          },
        });
        break;

      case "debtors":
        const clients = await db.client.findMany({
          include: {
            invoices: {
              where: {
                status: "SENT",
              },
              include: {
                items: true,
                payments: true,
              },
            },
            services: {
              where: {
                status: "NON_DECLAREE",
              },
            },
          },
        });
        data = clients.map((c) => ({
          ...c,
          totalDebt: c.invoices.reduce((sum, inv) => {
            const paid = inv.payments.reduce((s, p) => s + p.amount, 0);
            return sum + (inv.total - paid);
          }, 0),
          unpaidInvoices: c.invoices,
          undeclaredServices: c.services,
        }));
        break;

      default:
        data = await db.service.findMany({
          where,
          include: {
            client: true,
            vehicle: true,
            driver: true,
          },
        });
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
