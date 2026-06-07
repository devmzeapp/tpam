import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserContext, canWrite } from "@/lib/tenant-context";

// GET all drivers - filtré par tenant
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
    const available = searchParams.get("available");

    // Construire la requête avec filtre tenant
    let whereClause = context.canAccessAllTenants 
      ? "1=1" 
      : `"tenantId" = '${context.tenantId}'`;

    if (available !== null) {
      whereClause += ` AND available = ${available === "true"}`;
    }

    const drivers = await db.$queryRawUnsafe(`
      SELECT * FROM "Driver"
      WHERE ${whereClause}
      ORDER BY "createdAt" DESC
    `);

    return NextResponse.json(drivers);
  } catch (error) {
    console.error("Get drivers error:", error);
    return NextResponse.json(
      { error: "Failed to fetch drivers" },
      { status: 500 }
    );
  }
}

// POST create driver - avec tenant automatique
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
    const id = `driver_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Déterminer le tenantId
    const tenantId = context.canAccessAllTenants 
      ? (data.tenantId || context.tenantId) 
      : context.tenantId;

    // Créer le chauffeur avec tenantId
    const result = await db.$queryRawUnsafe(`
      INSERT INTO "Driver" (
        id, "firstName", "lastName", phone, email, "licenseNumber",
        available, notes, "tenantId", "createdAt", "updatedAt"
      ) VALUES (
        '${id}',
        '${data.firstName?.replace(/'/g, "''") || ''}',
        '${data.lastName?.replace(/'/g, "''") || ''}',
        '${data.phone || ''}',
        ${data.email ? `'${data.email}'` : 'NULL'},
        ${data.licenseNumber ? `'${data.licenseNumber}'` : 'NULL'},
        ${data.available ?? true},
        ${data.notes ? `'${data.notes.replace(/'/g, "''")}'` : 'NULL'},
        ${tenantId ? `'${tenantId}'` : 'NULL'},
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      RETURNING *
    `);

    return NextResponse.json(Array.isArray(result) ? result[0] : result);
  } catch (error) {
    console.error("Create driver error:", error);
    return NextResponse.json(
      { error: "Failed to create driver" },
      { status: 500 }
    );
  }
}
