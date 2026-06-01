import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL || 
  "postgresql://neondb_owner:npg_34VWfvXExqkd@ep-round-sky-an1ah6j4-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

// GET - Export database backup
export async function GET(request: NextRequest) {
  try {
    const sql = postgres(DATABASE_URL);

    // Get all data from all tables
    const [
      users,
      companies,
      vehicles,
      drivers,
      clients,
      services,
      invoices,
      invoiceItems,
      payments,
      manifests,
      settings
    ] = await Promise.all([
      sql`SELECT * FROM "User"`,
      sql`SELECT * FROM "Company"`,
      sql`SELECT * FROM "Vehicle"`,
      sql`SELECT * FROM "Driver"`,
      sql`SELECT * FROM "Client"`,
      sql`SELECT * FROM "Service"`,
      sql`SELECT * FROM "Invoice"`,
      sql`SELECT * FROM "InvoiceItem"`,
      sql`SELECT * FROM "Payment"`,
      sql`SELECT * FROM "Manifest"`,
      sql`SELECT * FROM "Setting"`
    ]);

    await sql.end();

    const backup = {
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      data: {
        users,
        companies,
        vehicles,
        drivers,
        clients,
        services,
        invoices,
        invoiceItems,
        payments,
        manifests,
        settings
      },
      stats: {
        users: users.length,
        companies: companies.length,
        vehicles: vehicles.length,
        drivers: drivers.length,
        clients: clients.length,
        services: services.length,
        invoices: invoices.length,
        payments: payments.length,
        manifests: manifests.length
      }
    };

    return NextResponse.json({
      success: true,
      backup,
      exportDate: backup.timestamp,
      message: "Sauvegarde exportée avec succès"
    });
  } catch (error: any) {
    console.error("Export error:", error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

// POST - Import database backup
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { backup, mode = "merge" } = body; // mode: "merge" or "replace"

    if (!backup || !backup.data) {
      return NextResponse.json({ error: "Données de sauvegarde invalides" }, { status: 400 });
    }

    const sql = postgres(DATABASE_URL);
    const results: string[] = [];

    try {
      // If mode is "replace", clear existing data first (dangerous!)
      if (mode === "replace") {
        results.push("Mode: Remplacement complet");
        await sql`TRUNCATE TABLE "InvoiceItem", "Payment", "Invoice", "Manifest", "Service", "Client", "Driver", "Vehicle", "User", "Company" CASCADE`;
        results.push("Tables vidées");
      }

      const { data } = backup;

      // Import companies
      if (data.companies && data.companies.length > 0) {
        for (const company of data.companies) {
          try {
            await sql`
              INSERT INTO "Company" (${sql(Object.keys(company))})
              VALUES (${sql(Object.values(company))})
              ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                email = EXCLUDED.email,
                phone = EXCLUDED.phone,
                active = EXCLUDED.active,
                approved = EXCLUDED.approved,
                plan = EXCLUDED.plan
            `;
          } catch (e) {
            // Skip duplicates in merge mode
          }
        }
        results.push(`Entreprises: ${data.companies.length}`);
      }

      // Import users (skip super admin to preserve credentials)
      if (data.users && data.users.length > 0) {
        for (const user of data.users) {
          if (user.email === 'marketing@mozartevents.ma') continue;
          try {
            await sql`
              INSERT INTO "User" (${sql(Object.keys(user))})
              VALUES (${sql(Object.values(user))})
              ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                email = EXCLUDED.email,
                role = EXCLUDED.role,
                active = EXCLUDED.active,
                approved = EXCLUDED.approved
            `;
          } catch (e) {
            // Skip duplicates in merge mode
          }
        }
        results.push(`Utilisateurs: ${data.users.length}`);
      }

      // Import vehicles
      if (data.vehicles && data.vehicles.length > 0) {
        for (const vehicle of data.vehicles) {
          try {
            await sql`
              INSERT INTO "Vehicle" (${sql(Object.keys(vehicle))})
              VALUES (${sql(Object.values(vehicle))})
              ON CONFLICT (id) DO NOTHING
            `;
          } catch (e) {}
        }
        results.push(`Véhicules: ${data.vehicles.length}`);
      }

      // Import drivers
      if (data.drivers && data.drivers.length > 0) {
        for (const driver of data.drivers) {
          try {
            await sql`
              INSERT INTO "Driver" (${sql(Object.keys(driver))})
              VALUES (${sql(Object.values(driver))})
              ON CONFLICT (id) DO NOTHING
            `;
          } catch (e) {}
        }
        results.push(`Chauffeurs: ${data.drivers.length}`);
      }

      // Import clients
      if (data.clients && data.clients.length > 0) {
        for (const client of data.clients) {
          try {
            await sql`
              INSERT INTO "Client" (${sql(Object.keys(client))})
              VALUES (${sql(Object.values(client))})
              ON CONFLICT (id) DO NOTHING
            `;
          } catch (e) {}
        }
        results.push(`Clients: ${data.clients.length}`);
      }

      // Import services
      if (data.services && data.services.length > 0) {
        for (const service of data.services) {
          try {
            await sql`
              INSERT INTO "Service" (${sql(Object.keys(service))})
              VALUES (${sql(Object.values(service))})
              ON CONFLICT (id) DO NOTHING
            `;
          } catch (e) {}
        }
        results.push(`Prestations: ${data.services.length}`);
      }

      // Import invoices
      if (data.invoices && data.invoices.length > 0) {
        for (const invoice of data.invoices) {
          try {
            await sql`
              INSERT INTO "Invoice" (${sql(Object.keys(invoice))})
              VALUES (${sql(Object.values(invoice))})
              ON CONFLICT (id) DO NOTHING
            `;
          } catch (e) {}
        }
        results.push(`Factures: ${data.invoices.length}`);
      }

      // Import invoice items
      if (data.invoiceItems && data.invoiceItems.length > 0) {
        for (const item of data.invoiceItems) {
          try {
            await sql`
              INSERT INTO "InvoiceItem" (${sql(Object.keys(item))})
              VALUES (${sql(Object.values(item))})
              ON CONFLICT (id) DO NOTHING
            `;
          } catch (e) {}
        }
        results.push(`Lignes de facture: ${data.invoiceItems.length}`);
      }

      // Import payments
      if (data.payments && data.payments.length > 0) {
        for (const payment of data.payments) {
          try {
            await sql`
              INSERT INTO "Payment" (${sql(Object.keys(payment))})
              VALUES (${sql(Object.values(payment))})
              ON CONFLICT (id) DO NOTHING
            `;
          } catch (e) {}
        }
        results.push(`Paiements: ${data.payments.length}`);
      }

      // Import manifests
      if (data.manifests && data.manifests.length > 0) {
        for (const manifest of data.manifests) {
          try {
            await sql`
              INSERT INTO "Manifest" (${sql(Object.keys(manifest))})
              VALUES (${sql(Object.values(manifest))})
              ON CONFLICT (id) DO NOTHING
            `;
          } catch (e) {}
        }
        results.push(`Manifestes: ${data.manifests.length}`);
      }

      await sql.end();

      return NextResponse.json({
        success: true,
        message: "Sauvegarde importée avec succès",
        results
      });

    } catch (error: any) {
      await sql.end();
      throw error;
    }
  } catch (error: any) {
    console.error("Import error:", error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
