import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function GET() {
  try {
    // First, push the schema to create tables
    try {
      await execAsync("npx prisma db push --accept-data-loss");
    } catch {
      // Ignore errors if tables already exist
    }

    // Check if admin already exists
    const existingAdmin = await db.user.findUnique({
      where: { email: "admin@tpam.ma" },
    });

    if (existingAdmin) {
      return NextResponse.json({
        message: "Database already initialized",
        users: await db.user.count(),
        vehicles: await db.vehicle.count(),
        drivers: await db.driver.count(),
        clients: await db.client.count(),
      });
    }

    // Create admin user
    await db.user.createMany({
      data: [
        {
          email: "admin@tpam.ma",
          password: "admin123",
          name: "Administrateur TPAM",
          role: "ADMIN",
        },
        {
          email: "agent@tpam.ma",
          password: "agent123",
          name: "Agent Opérationnel",
          role: "AGENT",
        },
        {
          email: "compta@tpam.ma",
          password: "compta123",
          name: "Comptable",
          role: "COMPTABLE",
        },
      ],
    });

    // Create sample vehicles
    await db.vehicle.createMany({
      data: [
        {
          brand: "Mercedes",
          model: "Sprinter",
          registration: "A-1234-MA",
          capacity: 16,
          type: "Van",
          status: "available",
        },
        {
          brand: "Volkswagen",
          model: "Crafter",
          registration: "B-5678-MA",
          capacity: 19,
          type: "Van",
          status: "available",
        },
        {
          brand: "Mercedes",
          model: "Classe V",
          registration: "C-9012-MA",
          capacity: 7,
          type: "Berline",
          status: "available",
        },
      ],
    });

    // Create sample drivers
    await db.driver.createMany({
      data: [
        {
          firstName: "Mohammed",
          lastName: "Alami",
          phone: "+212 6 12 34 56 78",
          licenseNumber: "PERMIS-001",
          available: true,
        },
        {
          firstName: "Ahmed",
          lastName: "Benjelloun",
          phone: "+212 6 98 76 54 32",
          licenseNumber: "PERMIS-002",
          available: true,
        },
        {
          firstName: "Karim",
          lastName: "Tazi",
          phone: "+212 6 55 44 33 22",
          licenseNumber: "PERMIS-003",
          available: true,
        },
      ],
    });

    // Create sample clients
    await db.client.createMany({
      data: [
        {
          name: "Voyages Atlas",
          contactName: "Mme. Fatima Zahra",
          email: "contact@voyagesatlas.ma",
          phone: "+212 5 22 11 22 33",
          address: "123 Boulevard Mohammed V, Casablanca",
          city: "Casablanca",
          ice: "001234567000089",
          if: "12345678",
          rc: "123456",
          cnss: "7890123",
        },
        {
          name: "Tours Maroc",
          contactName: "M. Hassan Idrissi",
          email: "info@toursmaroc.ma",
          phone: "+212 5 24 33 44 55",
          address: "45 Rue Moulay Ismail, Marrakech",
          city: "Marrakech",
          ice: "009876543000012",
          if: "87654321",
          rc: "654321",
        },
        {
          name: "Desert Express",
          contactName: "M. Omar Berrada",
          email: "reservation@desertexpress.ma",
          phone: "+212 5 35 66 77 88",
          address: "78 Avenue Hassan II, Fès",
          city: "Fès",
          ice: "001122334000055",
          if: "11223344",
          rc: "332211",
        },
      ],
    });

    return NextResponse.json({
      success: true,
      message: "Database initialized and seeded successfully!",
      data: {
        users: await db.user.count(),
        vehicles: await db.vehicle.count(),
        drivers: await db.driver.count(),
        clients: await db.client.count(),
      },
    });
  } catch (error) {
    console.error("Init error:", error);
    return NextResponse.json(
      { error: "Failed to initialize database", details: String(error) },
      { status: 500 }
    );
  }
}
