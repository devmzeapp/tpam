import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";

export async function GET() {
  try {
    // Check if admin already exists
    const existingAdmin = await db.user.findUnique({
      where: { email: "admin@tpam.ma" },
    });

    if (existingAdmin) {
      return NextResponse.json({
        message: "Database already seeded",
        users: await db.user.count(),
      });
    }

    // Create admin user
    const admin = await db.user.create({
      data: {
        email: "admin@tpam.ma",
        password: "admin123",
        name: "Administrateur TPAM",
        role: UserRole.ADMIN,
      },
    });

    // Create agent user
    const agent = await db.user.create({
      data: {
        email: "agent@tpam.ma",
        password: "agent123",
        name: "Agent Opérationnel",
        role: UserRole.AGENT,
      },
    });

    // Create accountant user
    const accountant = await db.user.create({
      data: {
        email: "compta@tpam.ma",
        password: "compta123",
        name: "Comptable",
        role: UserRole.COMPTABLE,
      },
    });

    // Create sample vehicles
    const vehicles = await Promise.all([
      db.vehicle.create({
        data: {
          brand: "Mercedes",
          model: "Sprinter",
          registration: "A-1234-MA",
          capacity: 16,
          type: "Van",
          status: "available",
        },
      }),
      db.vehicle.create({
        data: {
          brand: "Volkswagen",
          model: "Crafter",
          registration: "B-5678-MA",
          capacity: 19,
          type: "Van",
          status: "available",
        },
      }),
      db.vehicle.create({
        data: {
          brand: "Mercedes",
          model: "Classe V",
          registration: "C-9012-MA",
          capacity: 7,
          type: "Berline",
          status: "available",
        },
      }),
    ]);

    // Create sample drivers
    const drivers = await Promise.all([
      db.driver.create({
        data: {
          firstName: "Mohammed",
          lastName: "Alami",
          phone: "+212 6 12 34 56 78",
          licenseNumber: "PERMIS-001",
          available: true,
        },
      }),
      db.driver.create({
        data: {
          firstName: "Ahmed",
          lastName: "Benjelloun",
          phone: "+212 6 98 76 54 32",
          licenseNumber: "PERMIS-002",
          available: true,
        },
      }),
      db.driver.create({
        data: {
          firstName: "Karim",
          lastName: "Tazi",
          phone: "+212 6 55 44 33 22",
          licenseNumber: "PERMIS-003",
          available: true,
        },
      }),
    ]);

    // Create sample clients
    const clients = await Promise.all([
      db.client.create({
        data: {
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
      }),
      db.client.create({
        data: {
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
      }),
      db.client.create({
        data: {
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
      }),
    ]);

    return NextResponse.json({
      message: "Database seeded successfully!",
      data: {
        users: { admin, agent, accountant },
        vehicles: vehicles.length,
        drivers: drivers.length,
        clients: clients.length,
      },
    });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json(
      { error: "Failed to seed database" },
      { status: 500 }
    );
  }
}
