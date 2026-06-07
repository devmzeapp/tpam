import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { PaymentMethod, InvoiceStatus } from "@prisma/client";
import { getUserContext, canWrite, requireTenantAccess } from "@/lib/tenant-context";

// GET all payments - filtré par tenant
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
    const invoiceId = searchParams.get("invoiceId");

    // Construire la requête avec filtre tenant
    let whereClause = context.canAccessAllTenants 
      ? "1=1" 
      : `p."tenantId" = '${context.tenantId}'`;

    if (clientId) {
      whereClause += ` AND p."clientId" = '${clientId}'`;
    }
    if (invoiceId) {
      whereClause += ` AND p."invoiceId" = '${invoiceId}'`;
    }

    const payments = await db.$queryRawUnsafe(`
      SELECT p.*,
        c.id as client_id, c.name as client_name, c.email as client_email,
        i.id as invoice_id, i.number as invoice_number, i.total as invoice_total
      FROM "Payment" p
      LEFT JOIN "Client" c ON p."clientId" = c.id
      LEFT JOIN "Invoice" i ON p."invoiceId" = i.id
      WHERE ${whereClause}
      ORDER BY p."paymentDate" DESC
    `);

    // Formater les résultats
    const formattedPayments = (payments as any[]).map(p => ({
      ...p,
      client: {
        id: p.client_id,
        name: p.client_name,
        email: p.client_email,
      },
      invoice: p.invoice_id ? {
        id: p.invoice_id,
        number: p.invoice_number,
        total: p.invoice_total,
      } : null,
    }));

    return NextResponse.json(formattedPayments);
  } catch (error) {
    console.error("Get payments error:", error);
    return NextResponse.json(
      { error: "Failed to fetch payments" },
      { status: 500 }
    );
  }
}

// POST create payment - avec tenant automatique
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

    // Vérifier que le client appartient au même tenant
    if (data.clientId) {
      const accessCheck = await requireTenantAccess(context, "Client", data.clientId);
      if (!accessCheck.allowed) {
        return NextResponse.json({ error: accessCheck.error }, { status: 403 });
      }
    }

    // Vérifier que la facture appartient au même tenant
    if (data.invoiceId) {
      const accessCheck = await requireTenantAccess(context, "Invoice", data.invoiceId);
      if (!accessCheck.allowed) {
        return NextResponse.json({ error: accessCheck.error }, { status: 403 });
      }
    }

    // Générer un ID unique
    const id = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Déterminer le tenantId (prendre celui du client si disponible)
    let tenantId = context.tenantId;
    if (!context.canAccessAllTenants && data.clientId) {
      const clientCheck = await requireTenantAccess(context, "Client", data.clientId);
      tenantId = (clientCheck.record as any)?.tenantId || context.tenantId;
    }

    // Créer le paiement
    const result = await db.$queryRawUnsafe(`
      INSERT INTO "Payment" (
        id, "clientId", "invoiceId", amount, currency, method,
        reference, "paymentDate", notes, "tenantId", "createdAt", "updatedAt"
      ) VALUES (
        '${id}',
        '${data.clientId}',
        ${data.invoiceId ? `'${data.invoiceId}'` : 'NULL'},
        ${parseFloat(data.amount)},
        '${data.currency || 'MAD'}',
        '${data.method || 'ESPECES'}',
        ${data.reference ? `'${data.reference.replace(/'/g, "''")}'` : 'NULL'},
        ${data.paymentDate ? `'${data.paymentDate}'` : 'CURRENT_TIMESTAMP'},
        ${data.notes ? `'${data.notes.replace(/'/g, "''")}'` : 'NULL'},
        ${tenantId ? `'${tenantId}'` : 'NULL'},
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      RETURNING *
    `);

    // Si le paiement est pour une facture, vérifier si elle est entièrement payée
    if (data.invoiceId) {
      const invoicePayments = await db.$queryRawUnsafe(`
        SELECT COALESCE(SUM(amount), 0) as total_paid
        FROM "Payment"
        WHERE "invoiceId" = '${data.invoiceId}'
      `);

      const invoice = await db.$queryRawUnsafe(`
        SELECT id, total FROM "Invoice" WHERE id = '${data.invoiceId}'
      `);

      if (Array.isArray(invoice) && invoice.length > 0 && Array.isArray(invoicePayments) && invoicePayments.length > 0) {
        const totalPaid = parseFloat((invoicePayments[0] as any).total_paid) || 0;
        const invoiceTotal = parseFloat((invoice[0] as any).total) || 0;

        if (totalPaid >= invoiceTotal) {
          await db.$executeRawUnsafe(`
            UPDATE "Invoice"
            SET status = 'PAID', "paidDate" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP
            WHERE id = '${data.invoiceId}'
          `);
        }
      }
    }

    return NextResponse.json(Array.isArray(result) ? result[0] : result);
  } catch (error) {
    console.error("Create payment error:", error);
    return NextResponse.json(
      { error: "Failed to create payment" },
      { status: 500 }
    );
  }
}
