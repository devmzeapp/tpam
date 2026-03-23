import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET all manifests
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const serviceId = searchParams.get("serviceId");

    const where: Record<string, unknown> = {};
    if (serviceId) where.serviceId = serviceId;

    const manifests = await db.manifest.findMany({
      where,
      orderBy: {
        date: "desc",
      },
      include: {
        service: {
          include: {
            client: true,
          },
        },
        vehicle: true,
        driver: true,
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(manifests);
  } catch (error) {
    console.error("Get manifests error:", error);
    return NextResponse.json(
      { error: "Failed to fetch manifests" },
      { status: 500 }
    );
  }
}

// POST create manifest
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    const manifest = await db.manifest.create({
      data: {
        serviceId: data.serviceId,
        vehicleId: data.vehicleId,
        driverId: data.driverId,
        createdById: data.createdById || "default-user",
        date: new Date(data.date),
        departurePlace: data.departurePlace,
        arrivalPlace: data.arrivalPlace,
        departureTime: data.departureTime,
        arrivalTime: data.arrivalTime,
        passengerCount: parseInt(data.passengerCount) || 1,
        passengerList: data.passengerList,
        remarks: data.remarks,
      },
      include: {
        service: {
          include: {
            client: true,
          },
        },
        vehicle: true,
        driver: true,
      },
    });

    return NextResponse.json(manifest);
  } catch (error) {
    console.error("Create manifest error:", error);
    return NextResponse.json(
      { error: "Failed to create manifest" },
      { status: 500 }
    );
  }
}
