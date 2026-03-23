import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET all clients
export async function GET() {
  try {
    const clients = await db.client.findMany({
      orderBy: {
        name: "asc",
      },
      include: {
        _count: {
          select: {
            services: true,
            invoices: true,
          },
        },
      },
    });

    return NextResponse.json(clients);
  } catch (error) {
    console.error("Get clients error:", error);
    return NextResponse.json(
      { error: "Failed to fetch clients" },
      { status: 500 }
    );
  }
}

// POST create client
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    const client = await db.client.create({
      data: {
        name: data.name,
        contactName: data.contactName,
        email: data.email,
        phone: data.phone,
        address: data.address,
        city: data.city,
        ice: data.ice,
        cnss: data.cnss,
        if: data.if,
        rc: data.rc,
        notes: data.notes,
      },
    });

    return NextResponse.json(client);
  } catch (error) {
    console.error("Create client error:", error);
    return NextResponse.json(
      { error: "Failed to create client" },
      { status: 500 }
    );
  }
}
