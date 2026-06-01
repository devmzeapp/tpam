import { NextRequest, NextResponse } from "next/server";
import { db, runAutoMigration } from "@/lib/db";

// POST: Restore database from backup JSON
export async function POST(request: NextRequest) {
  try {
    await runAutoMigration();

    const backup = await request.json();

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
            VALUES (${company.id}, ${company.name}, ${company.email}, ${company.phone}, ${company.address}, ${company.city}, ${company.ice}, ${company.active}, ${company.approved}, ${company.blocked || false}, ${company.blockReason || null}, ${company.plan}, ${company.createdAt}, ${company.updatedAt})
            ON CONFLICT (id) DO UPDATE SET
              name = ${company.name},
              email = ${company.email},
              phone = ${company.phone},
              active = ${company.active},
              approved = ${company.approved},
              blocked = ${company.blocked || false},
              "updatedAt" = CURRENT_TIMESTAMP
          `;
        } catch (e) {
          results.push(`Warning: Could not restore company ${company.id}: ${e instanceof Error ? e.message : String(e)}`);
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
            VALUES (${user.id}, ${user.email}, ${user.password}, ${user.name}, ${user.role}, ${user.active}, ${user.approved}, ${user.companyId}, ${user.createdAt}, ${user.updatedAt})
            ON CONFLICT (id) DO UPDATE SET
              email = ${user.email},
              name = ${user.name},
              role = ${user.role},
              active = ${user.active},
              approved = ${user.approved},
              "companyId" = ${user.companyId},
              "updatedAt" = CURRENT_TIMESTAMP
          `;
        } catch (e) {
          results.push(`Warning: Could not restore user ${user.id}: ${e instanceof Error ? e.message : String(e)}`);
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
            VALUES (${client.id}, ${client.name}, ${client.contactName}, ${client.email}, ${client.phone}, ${client.address}, ${client.city}, ${client.ice}, ${client.cnss}, ${client.if}, ${client.rc}, ${client.notes}, ${client.createdAt}, ${client.updatedAt})
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
            VALUES (${vehicle.id}, ${vehicle.brand}, ${vehicle.model}, ${vehicle.registration}, ${vehicle.capacity}, ${vehicle.type}, ${vehicle.status}, ${vehicle.notes}, ${vehicle.createdAt}, ${vehicle.updatedAt})
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
            VALUES (${driver.id}, ${driver.firstName}, ${driver.lastName}, ${driver.phone}, ${driver.email}, ${driver.licenseNumber}, ${driver.available}, ${driver.notes}, ${driver.createdAt}, ${driver.updatedAt})
            ON CONFLICT (id) DO NOTHING
          `;
        } catch (e) {
          results.push(`Warning: Could not restore driver ${driver.id}`);
        }
      }
      results.push(`Restored ${backup.data.drivers.length} drivers`);
    }

    // 6. Restore services
    if (backup.data.services && Array.isArray(backup.data.services)) {
      for (const service of backup.data.services) {
        try {
          await db.$executeRaw`
            INSERT INTO "Service" (id, "clientId", "vehicleId", "driverId", "createdById", type, description, date, "endTime", "departurePlace", "arrivalPlace", "passengerCount", "passengerNames", price, currency, status, notes, "createdAt", "updatedAt")
            VALUES (${service.id}, ${service.clientId}, ${service.vehicleId}, ${service.driverId}, ${service.createdById}, ${service.type}, ${service.description}, ${service.date}, ${service.endTime}, ${service.departurePlace}, ${service.arrivalPlace}, ${service.passengerCount}, ${service.passengerNames}, ${service.price}, ${service.currency}, ${service.status}, ${service.notes}, ${service.createdAt}, ${service.updatedAt})
            ON CONFLICT (id) DO NOTHING
          `;
        } catch (e) {
          results.push(`Warning: Could not restore service ${service.id}`);
        }
      }
      results.push(`Restored ${backup.data.services.length} services`);
    }

    // 7. Restore invoices
    if (backup.data.invoices && Array.isArray(backup.data.invoices)) {
      for (const invoice of backup.data.invoices) {
        try {
          await db.$executeRaw`
            INSERT INTO "Invoice" (id, number, "clientId", "createdById", type, status, "issueDate", "dueDate", "paidDate", subtotal, "taxRate", "taxAmount", total, currency, notes, terms, "createdAt", "updatedAt")
            VALUES (${invoice.id}, ${invoice.number}, ${invoice.clientId}, ${invoice.createdById}, ${invoice.type}, ${invoice.status}, ${invoice.issueDate}, ${invoice.dueDate}, ${invoice.paidDate}, ${invoice.subtotal}, ${invoice.taxRate}, ${invoice.taxAmount}, ${invoice.total}, ${invoice.currency}, ${invoice.notes}, ${invoice.terms}, ${invoice.createdAt}, ${invoice.updatedAt})
            ON CONFLICT (id) DO NOTHING
          `;
        } catch (e) {
          results.push(`Warning: Could not restore invoice ${invoice.id}`);
        }
      }
      results.push(`Restored ${backup.data.invoices.length} invoices`);
    }

    // 8. Restore payments
    if (backup.data.payments && Array.isArray(backup.data.payments)) {
      for (const payment of backup.data.payments) {
        try {
          await db.$executeRaw`
            INSERT INTO "Payment" (id, "clientId", "invoiceId", amount, currency, method, reference, "paymentDate", notes, "createdAt", "updatedAt")
            VALUES (${payment.id}, ${payment.clientId}, ${payment.invoiceId}, ${payment.amount}, ${payment.currency}, ${payment.method}, ${payment.reference}, ${payment.paymentDate}, ${payment.notes}, ${payment.createdAt}, ${payment.updatedAt})
            ON CONFLICT (id) DO NOTHING
          `;
        } catch (e) {
          results.push(`Warning: Could not restore payment ${payment.id}`);
        }
      }
      results.push(`Restored ${backup.data.payments.length} payments`);
    }

    return NextResponse.json({
      success: true,
      message: "Restauration terminée avec succès",
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
