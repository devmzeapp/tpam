import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserContext, getTenantWhereSQL, canWrite } from "@/lib/tenant-context";

// GET all clients - filtré par tenant
export async function GET(request: NextRequest) {
  try {
    // Récupérer l'userId depuis les headers ou query params
    const userId = request.headers.get("x-user-id") || 
                   request.nextUrl.searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const context = await getUserContext(userId);
    if (!context) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    // Construire la requête avec filtre tenant
    let clients: any[];
    
    if (context.canAccessAllTenants) {
      // Super admin - voir tous les clients
      clients = await db.$queryRaw`
        SELECT c.*,
          (SELECT COUNT(*) FROM "Service" s WHERE s."clientId" = c.id) as service_count,
          (SELECT COUNT(*) FROM "Invoice" i WHERE i."clientId" = c.id) as invoice_count
        FROM "Client" c
        ORDER BY c.name ASC
      `;
    } else {
      // Utilisateur normal - voir seulement son tenant
      clients = await db.$queryRaw`
        SELECT c.*,
          (SELECT COUNT(*) FROM "Service" s WHERE s."clientId" = c.id) as service_count,
          (SELECT COUNT(*) FROM "Invoice" i WHERE i."clientId" = c.id) as invoice_count
        FROM "Client" c
        WHERE c."tenantId" = ${context.tenantId}
        ORDER BY c.name ASC
      `;
    }

    // Formater les résultats
    const formattedClients = (clients as any[]).map(c => ({
      ...c,
      _count: {
        services: parseInt(c.service_count) || 0,
        invoices: parseInt(c.invoice_count) || 0,
      }
    }));

    return NextResponse.json(formattedClients);
  } catch (error) {
    console.error("Get clients error:", error);
    return NextResponse.json(
      { error: "Failed to fetch clients" },
      { status: 500 }
    );
  }
}

// POST create client - avec tenant automatique
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

    // Générer un ID unique
    const id = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Déterminer le tenantId
    const tenantId = context.canAccessAllTenants 
      ? (data.tenantId || context.tenantId) 
      : context.tenantId;

    // Créer le client avec tenantId
    const result = await db.$queryRaw`
      INSERT INTO "Client" (
        id, name, "contactName", email, phone, address, city,
        ice, cnss, if, rc, notes, "tenantId",
        "createdAt", "updatedAt"
      ) VALUES (
        ${id}, ${data.name || ''}, ${data.contactName || null}, ${data.email || null},
        ${data.phone || null}, ${data.address || null}, ${data.city || null},
        ${data.ice || null}, ${data.cnss || null}, ${data.if || null},
        ${data.rc || null}, ${data.notes || null}, ${tenantId},
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      RETURNING *
    `;

    return NextResponse.json(Array.isArray(result) ? result[0] : result);
  } catch (error) {
    console.error("Create client error:", error);
    return NextResponse.json(
      { error: "Failed to create client" },
      { status: 500 }
    );
  }
}
