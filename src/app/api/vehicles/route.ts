import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET all vehicles
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const where: Record<string, unknown> = {};
    if (status) {
      where.status = status;
    }

    const vehicles = await db.vehicle.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(vehicles);
  } catch (error) {
    console.error("Get vehicles error:", error);
    return NextResponse.json(
      { error: "Failed to fetch vehicles" },
      { status: 500 }
    );
  }
}

// POST create vehicle
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    const vehicle = await db.vehicle.create({
      data: {
        brand: data.brand,
        model: data.model,
        registration: data.registration,
        capacity: parseInt(data.capacity) || 1,
        type: data.type,
        status: data.status || "available",
        notes: data.notes,
        // Kilométrage et maintenance
        currentKm: data.currentKm ? parseInt(data.currentKm) : null,
        lastOilChangeDate: data.lastOilChangeDate ? new Date(data.lastOilChangeDate) : null,
        lastOilChangeKm: data.lastOilChangeKm ? parseInt(data.lastOilChangeKm) : null,
        nextOilChangeKm: data.nextOilChangeKm ? parseInt(data.nextOilChangeKm) : null,
        // Documents administratifs
        insuranceExpiry: data.insuranceExpiry ? new Date(data.insuranceExpiry) : null,
        vignetteExpiry: data.vignetteExpiry ? new Date(data.vignetteExpiry) : null,
        technicalInspectionExpiry: data.technicalInspectionExpiry ? new Date(data.technicalInspectionExpiry) : null,
      },
    });

    return NextResponse.json(vehicle);
  } catch (error) {
    console.error("Create vehicle error:", error);
    return NextResponse.json(
      { error: "Failed to create vehicle" },
      { status: 500 }
    );
  }
}
