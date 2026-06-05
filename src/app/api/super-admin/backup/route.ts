import { NextRequest, NextResponse } from "next/server";
import { db, runAutoMigration } from "@/lib/db";

// GET: Export database backup as JSON
export async function GET(request: NextRequest) {
  try {
    await runAutoMigration();

    // Get all data from all tables
    const backup = {
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      data: {
        companies: await db.$queryRaw`SELECT * FROM "Company"`,
        users: await db.$queryRaw`SELECT * FROM "User"`,
        vehicles: await db.$queryRaw`SELECT * FROM "Vehicle"`,
        drivers: await db.$queryRaw`SELECT * FROM "Driver"`,
        clients: await db.$queryRaw`SELECT * FROM "Client"`,
        services: await db.$queryRaw`SELECT * FROM "Service"`,
        invoices: await db.$queryRaw`SELECT * FROM "Invoice"`,
        invoiceItems: await db.$queryRaw`SELECT * FROM "InvoiceItem"`,
        payments: await db.$queryRaw`SELECT * FROM "Payment"`,
        manifests: await db.$queryRaw`SELECT * FROM "Manifest"`,
        settings: await db.$queryRaw`SELECT * FROM "Setting"`,
      },
    };

    // Return JSON with backup data
    return NextResponse.json({
      success: true,
      backup,
    });
  } catch (error) {
    console.error("Error creating backup:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création de la sauvegarde" },
      { status: 500 }
    );
  }
}

// POST: Import database backup from JSON
export async function POST(request: NextRequest) {
  try {
    await runAutoMigration();

    const body = await request.json();
    const backup = body.backup;

    if (!backup || !backup.data) {
      return NextResponse.json(
        { error: "Format de sauvegarde invalide" },
        { status: 400 }
      );
    }

    const results: string[] = [];

    // Restore in order to respect foreign key constraints
    // 1. First restore companies (no dependencies)
    if (backup.data.companies && Array.isArray(backup.data.companies)) {
      for (const company of backup.data.companies) {
        try {
          await db.$executeRaw`
            INSERT INTO "Company" (id, name, email, phone, address, city, ice, active, approved, blocked, "blockReason", plan, "createdAt", "updatedAt")
            VALUES (${company.id}, ${company.name}, ${company.email}, ${company.phone || null}, ${company.address || null}, ${company.city || null}, ${company.ice || null}, ${company.active ?? true}, ${company.approved ?? false}, ${company.blocked ?? false}, ${company.blockReason || null}, ${company.plan || 'trial'}, ${company.createdAt}, ${company.updatedAt})
            ON CONFLICT (id) DO UPDATE SET
              name = ${company.name},
              email = ${company.email},
              phone = ${company.phone || null},
              active = ${company.active ?? true},
              approved = ${company.approved ?? false},
              blocked = ${company.blocked ?? false},
              "updatedAt" = CURRENT_TIMESTAMP
          `;
        } catch (e) {
          results.push(`Warning: Could not restore company ${company.id}`);
        }
      }
      results.push(`Restored ${backup.data.companies.length} companies`);
    }

    // 2. Restore users (depends on companies)
    if (backup.data.users && Array.isArray(backup.data.users)) {
      for (const user of backup.data.users) {
        try {
          // Skip super admin from backup to preserve existing
          if (user.email === 'marketing@mozartevents.ma') continue;
          
          await db.$executeRaw`
            INSERT INTO "User" (id, email, password, name, role, active, approved, "companyId", "createdAt", "updatedAt")
            VALUES (${user.id}, ${user.email}, ${user.password}, ${user.name}, ${user.role}, ${user.active ?? true}, ${user.approved ?? false}, ${user.companyId || null}, ${user.createdAt}, ${user.updatedAt})
            ON CONFLICT (id) DO UPDATE SET
              email = ${user.email},
              name = ${user.name},
              role = ${user.role},
              active = ${user.active ?? true},
              approved = ${user.approved ?? false},
              "companyId" = ${user.companyId || null},
              "updatedAt" = CURRENT_TIMESTAMP
          `;
        } catch (e) {
          results.push(`Warning: Could not restore user ${user.id}`);
        }
      }
      results.push(`Restored ${backup.data.users.length} users`);
    }

    // 3. Restore clients
    if (backup.data.clients && Array.isArray(backup.data.clients)) {
      for (const client of backup.data.clients) {
        try {
          await db.$executeRaw`
            INSERT INTO "Client" (id, name, "contactName", email, phone, address, city, ice, cnss, if, rc, notes, "createdAt", "updatedAt")
            VALUES (${client.id}, ${client.name}, ${client.contactName || null}, ${client.email || null}, ${client.phone || null}, ${client.address || null}, ${client.city || null}, ${client.ice || null}, ${client.cnss || null}, ${client.if || null}, ${client.rc || null}, ${client.notes || null}, ${client.createdAt}, ${client.updatedAt})
            ON CONFLICT (id) DO NOTHING
          `;
        } catch (e) {
          results.push(`Warning: Could not restore client ${client.id}`);
        }
      }
      results.push(`Restored ${backup.data.clients.length} clients`);
    }

    // 4. Restore vehicles
    if (backup.data.vehicles && Array.isArray(backup.data.vehicles)) {
      for (const vehicle of backup.data.vehicles) {
        try {
          await db.$executeRaw`
            INSERT INTO "Vehicle" (id, brand, model, registration, capacity, type, status, notes, "createdAt", "updatedAt")
            VALUES (${vehicle.id}, ${vehicle.brand}, ${vehicle.model}, ${vehicle.registration}, ${vehicle.capacity}, ${vehicle.type || null}, ${vehicle.status || 'available'}, ${vehicle.notes || null}, ${vehicle.createdAt}, ${vehicle.updatedAt})
            ON CONFLICT (id) DO NOTHING
          `;
        } catch (e) {
          results.push(`Warning: Could not restore vehicle ${vehicle.id}`);
        }
      }
      results.push(`Restored ${backup.data.vehicles.length} vehicles`);
    }

    // 5. Restore drivers
    if (backup.data.drivers && Array.isArray(backup.data.drivers)) {
      for (const driver of backup.data.drivers) {
        try {
          await db.$executeRaw`
            INSERT INTO "Driver" (id, "firstName", "lastName", phone, email, "licenseNumber", available, notes, "createdAt", "updatedAt")
            VALUES (${driver.id}, ${driver.firstName}, ${driver.lastName}, ${driver.phone}, ${driver.email || null}, ${driver.licenseNumber || null}, ${driver.available ?? true}, ${driver.notes || null}, ${driver.createdAt}, ${driver.updatedAt})
            ON CONFLICT (id) DO NOTHING
          `;
        } catch (e) {
          results.push(`Warning: Could not restore driver ${driver.id}`);
        }
      }
      results.push(`Restored ${backup.data.drivers.length} drivers`);
    }

    return NextResponse.json({
      success: true,
      message: "Sauvegarde importée avec succès",
      results,
    });
  } catch (error) {
    console.error("Error restoring backup:", error);
    return NextResponse.json(
      { error: "Erreur lors de la restauration: " + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}
