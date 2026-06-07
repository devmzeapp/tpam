import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET a single vehicle by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const vehicle = await db.vehicle.findUnique({
      where: { id },
    });

    if (!vehicle) {
      return NextResponse.json(
        { error: "Vehicle not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(vehicle);
  } catch (error) {
    console.error("Get vehicle error:", error);
    return NextResponse.json(
      { error: "Failed to fetch vehicle" },
      { status: 500 }
    );
  }
}

// PATCH - Update a vehicle (including maintenance data)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await request.json();

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {};

    // Basic vehicle info
    if (data.brand !== undefined) updateData.brand = data.brand;
    if (data.model !== undefined) updateData.model = data.model;
    if (data.registration !== undefined) updateData.registration = data.registration;
    if (data.capacity !== undefined) updateData.capacity = data.capacity;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.notes !== undefined) updateData.notes = data.notes;

    // Kilométrage et maintenance
    if (data.currentKm !== undefined) updateData.currentKm = data.currentKm;
    if (data.lastOilChangeDate !== undefined) updateData.lastOilChangeDate = data.lastOilChangeDate;
    if (data.lastOilChangeKm !== undefined) updateData.lastOilChangeKm = data.lastOilChangeKm;
    if (data.nextOilChangeKm !== undefined) updateData.nextOilChangeKm = data.nextOilChangeKm;

    // Documents administratifs
    if (data.insuranceExpiry !== undefined) updateData.insuranceExpiry = data.insuranceExpiry;
    if (data.vignetteExpiry !== undefined) updateData.vignetteExpiry = data.vignetteExpiry;
    if (data.technicalInspectionExpiry !== undefined) updateData.technicalInspectionExpiry = data.technicalInspectionExpiry;

    const vehicle = await db.vehicle.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(vehicle);
  } catch (error) {
    console.error("Update vehicle error:", error);
    return NextResponse.json(
      { error: "Failed to update vehicle" },
      { status: 500 }
    );
  }
}

// DELETE a vehicle
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await db.vehicle.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete vehicle error:", error);
    return NextResponse.json(
      { error: "Failed to delete vehicle" },
      { status: 500 }
    );
  }
}
