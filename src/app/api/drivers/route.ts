import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET all drivers
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const available = searchParams.get("available");

    const where: Record<string, unknown> = {};
    if (available !== null) {
      where.available = available === "true";
    }

    const drivers = await db.driver.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(drivers);
  } catch (error) {
    console.error("Get drivers error:", error);
    return NextResponse.json(
      { error: "Failed to fetch drivers" },
      { status: 500 }
    );
  }
}

// POST create driver
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    const driver = await db.driver.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        email: data.email,
        licenseNumber: data.licenseNumber,
        available: data.available ?? true,
        notes: data.notes,
      },
    });

    return NextResponse.json(driver);
  } catch (error) {
    console.error("Create driver error:", error);
    return NextResponse.json(
      { error: "Failed to create driver" },
      { status: 500 }
    );
  }
}
