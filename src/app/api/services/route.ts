import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ServiceStatus, ServiceType } from "@prisma/client";

// GET all services with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const vehicleId = searchParams.get("vehicleId");
    const driverId = searchParams.get("driverId");
    const clientId = searchParams.get("clientId");
    const status = searchParams.get("status");

    const where: Record<string, unknown> = {};

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    } else if (startDate) {
      where.date = {
        gte: new Date(startDate),
      };
    } else if (endDate) {
      where.date = {
        lte: new Date(endDate),
      };
    }

    if (vehicleId) where.vehicleId = vehicleId;
    if (driverId) where.driverId = driverId;
    if (clientId) where.clientId = clientId;
    if (status) where.status = status as ServiceStatus;

    const services = await db.service.findMany({
      where,
      orderBy: {
        date: "desc",
      },
      include: {
        client: true,
        vehicle: true,
        driver: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(services);
  } catch (error) {
    console.error("Get services error:", error);
    return NextResponse.json(
      { error: "Failed to fetch services" },
      { status: 500 }
    );
  }
}

// POST create service
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // Get the first admin user as default creator if not provided
    let createdById = data.createdById;
    if (!createdById) {
      const adminUser = await db.user.findFirst({
        where: { role: "ADMIN" },
      });
      if (!adminUser) {
        return NextResponse.json(
          { error: "No admin user found. Please run /api/init first." },
          { status: 500 }
        );
      }
      createdById = adminUser.id;
    }

    const service = await db.service.create({
      data: {
        clientId: data.clientId,
        vehicleId: data.vehicleId,
        driverId: data.driverId,
        createdById: createdById,
        type: (data.type as ServiceType) || ServiceType.TRANSFERT,
        description: data.description,
        date: new Date(data.date),
        endTime: data.endTime ? new Date(data.endTime) : null,
        departurePlace: data.departurePlace,
        arrivalPlace: data.arrivalPlace,
        passengerCount: parseInt(data.passengerCount) || 1,
        passengerNames: data.passengerNames,
        price: parseFloat(data.price) || 0,
        currency: data.currency || "MAD",
        status: (data.status as ServiceStatus) || ServiceStatus.NON_DECLAREE,
        notes: data.notes,
      },
      include: {
        client: true,
        vehicle: true,
        driver: true,
      },
    });

    // Update vehicle status if needed
    if (data.updateVehicleStatus) {
      await db.vehicle.update({
        where: { id: data.vehicleId },
        data: { status: "in_mission" },
      });
    }

    return NextResponse.json(service);
  } catch (error) {
    console.error("Create service error:", error);
    return NextResponse.json(
      { error: "Failed to create service" },
      { status: 500 }
    );
  }
}
