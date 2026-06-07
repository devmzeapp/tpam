import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { InvoiceType, InvoiceStatus, ServiceStatus } from "@prisma/client";
import { getUserContext, canWrite } from "@/lib/tenant-context";

// Generate invoice number - filtré par tenant
async function generateInvoiceNumber(type: InvoiceType, tenantId: string | null): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = type === InvoiceType.PRO_FORMA ? "PF" : "FAC";

  // Construire la requête avec filtre tenant
  let lastInvoice: any[];
  
  if (tenantId) {
    lastInvoice = await db.$queryRaw`
      SELECT number FROM "Invoice"
      WHERE number LIKE ${prefix + '%'}
      AND "issueDate" >= ${new Date(`${year}-01-01`)}
      AND "issueDate" < ${new Date(`${year + 1}-01-01`)}
      AND "tenantId" = ${tenantId}
      ORDER BY number DESC
      LIMIT 1
    `;
  } else {
    lastInvoice = await db.$queryRaw`
      SELECT number FROM "Invoice"
      WHERE number LIKE ${prefix + '%'}
      AND "issueDate" >= ${new Date(`${year}-01-01`)}
      AND "issueDate" < ${new Date(`${year + 1}-01-01`)}
      ORDER BY number DESC
      LIMIT 1
    `;
  }

  let nextNumber = 1;
  if (Array.isArray(lastInvoice) && lastInvoice.length > 0) {
    const lastNumber = parseInt(lastInvoice[0].number.split("-")[1]);
    nextNumber = lastNumber + 1;
  }

  return `${prefix}-${nextNumber.toString().padStart(3, "0")}-${year}`;
}

// GET all invoices - filtré par tenant
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id") || 
                   request.nextUrl.searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const context = await getUserContext(userId);
    if (!context) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");
    const status = searchParams.get("status");
    const type = searchParams.get("type");

    // Construire la requête SQL avec filtres
    let whereClause = context.canAccessAllTenants 
      ? "1=1" 
      : `"tenantId" = '${context.tenantId}'`;

    if (clientId) {
      whereClause += ` AND "clientId" = '${clientId}'`;
    }
    if (status) {
      whereClause += ` AND status = '${status}'`;
    }
    if (type) {
      whereClause += ` AND type = '${type}'`;
    }

    const invoices = await db.$queryRawUnsafe(`
      SELECT i.*, 
        c.id as client_id, c.name as client_name, c.email as client_email, c.phone as client_phone,
        u.id as creator_id, u.name as creator_name,
        COALESCE(p.paid_amount, 0) as paid_amount
      FROM "Invoice" i
      LEFT JOIN "Client" c ON i."clientId" = c.id
      LEFT JOIN "User" u ON i."createdById" = u.id
      LEFT JOIN (
        SELECT "invoiceId", SUM(amount) as paid_amount 
        FROM "Payment" 
        GROUP BY "invoiceId"
      ) p ON i.id = p."invoiceId"
      WHERE ${whereClause}
      ORDER BY i."issueDate" DESC
    `);

    // Récupérer les items pour chaque facture
    const invoicesWithItems = await Promise.all(
      (invoices as any[]).map(async (inv) => {
        const items = await db.$queryRawUnsafe(`
          SELECT ii.*, 
            s.id as service_id, s.type as service_type, s.description as service_description,
            s.date as service_date, s.price as service_price,
            v.brand as vehicle_brand, v.model as vehicle_model, v.registration as vehicle_registration,
            d."firstName" as driver_first_name, d."lastName" as driver_last_name
          FROM "InvoiceItem" ii
          LEFT JOIN "Service" s ON ii."serviceId" = s.id
          LEFT JOIN "Vehicle" v ON s."vehicleId" = v.id
          LEFT JOIN "Driver" d ON s."driverId" = d.id
          WHERE ii."invoiceId" = '${inv.id}'
        `);

        return {
          ...inv,
          client: {
            id: inv.client_id,
            name: inv.client_name,
            email: inv.client_email,
            phone: inv.client_phone,
          },
          createdBy: {
            id: inv.creator_id,
            name: inv.creator_name,
          },
          items: items,
          paidAmount: parseFloat(inv.paid_amount) || 0,
        };
      })
    );

    return NextResponse.json(invoicesWithItems);
  } catch (error) {
    console.error("Get invoices error:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoices" },
      { status: 500 }
    );
  }
}

// POST create invoice - avec tenant automatique
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id") || 
                   request.nextUrl.searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const context = await getUserContext(userId);
    if (!context) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    // Vérifier les droits d'écriture
    if (!canWrite(context)) {
      return NextResponse.json({ error: "Accès en écriture non autorisé" }, { status: 403 });
    }

    const data = await request.json();

    // Déterminer le tenantId
    const tenantId = context.canAccessAllTenants 
      ? (data.tenantId || context.tenantId) 
      : context.tenantId;

    const type = (data.type as InvoiceType) || InvoiceType.FINALE;
    const number = await generateInvoiceNumber(type, tenantId);

    // Calculate totals
    let subtotal = 0;
    const items = data.items || [];

    for (const item of items) {
      subtotal += item.unitPrice * item.quantity;
    }

    const taxRate = data.taxRate || 0;
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount;

    // Générer un ID unique
    const invoiceId = `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Créer la facture
    await db.$executeRawUnsafe(`
      INSERT INTO "Invoice" (
        id, number, "clientId", "createdById", type, status,
        "issueDate", "dueDate", subtotal, "taxRate", "taxAmount", total,
        currency, notes, terms, "tenantId", "createdAt", "updatedAt"
      ) VALUES (
        '${invoiceId}', '${number}', '${data.clientId}', '${userId}',
        '${type}', 'DRAFT', CURRENT_TIMESTAMP,
        ${data.dueDate ? `'${data.dueDate}'` : 'NULL'},
        ${subtotal}, ${taxRate}, ${taxAmount}, ${total},
        '${data.currency || 'MAD'}',
        ${data.notes ? `'${data.notes.replace(/'/g, "''")}'` : 'NULL'},
        ${data.terms ? `'${data.terms.replace(/'/g, "''")}'` : 'NULL'},
        ${tenantId ? `'${tenantId}'` : 'NULL'},
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
    `);

    // Créer les items de facture
    for (const item of items) {
      const itemId = `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const itemTotal = item.unitPrice * item.quantity;
      
      await db.$executeRawUnsafe(`
        INSERT INTO "InvoiceItem" (
          id, "invoiceId", "serviceId", description, quantity, "unitPrice", total,
          "createdAt", "updatedAt"
        ) VALUES (
          '${itemId}', '${invoiceId}', '${item.serviceId}',
          '${item.description.replace(/'/g, "''")}',
          ${item.quantity}, ${item.unitPrice}, ${itemTotal},
          CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
      `);

      // Mettre à jour le statut du service
      if (type === InvoiceType.FINALE) {
        await db.$executeRawUnsafe(`
          UPDATE "Service" SET status = 'FACTUREE', "updatedAt" = CURRENT_TIMESTAMP
          WHERE id = '${item.serviceId}'
        `);
      } else if (type === InvoiceType.PRO_FORMA) {
        await db.$executeRawUnsafe(`
          UPDATE "Service" SET status = 'PRO_FORMA', "updatedAt" = CURRENT_TIMESTAMP
          WHERE id = '${item.serviceId}'
        `);
      }
    }

    // Récupérer la facture créée
    const invoice = await db.$queryRawUnsafe(`
      SELECT i.*, c.name as client_name
      FROM "Invoice" i
      LEFT JOIN "Client" c ON i."clientId" = c.id
      WHERE i.id = '${invoiceId}'
    `);

    return NextResponse.json(Array.isArray(invoice) ? invoice[0] : invoice);
  } catch (error) {
    console.error("Create invoice error:", error);
    return NextResponse.json(
      { error: "Failed to create invoice" },
      { status: 500 }
    );
  }
}
