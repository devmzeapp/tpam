import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserContext, canWrite } from "@/lib/tenant-context";

// GET all vehicles - filtré par tenant
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
    const status = searchParams.get("status");

    // Construire la requête avec filtre tenant
    let whereClause = context.canAccessAllTenants 
      ? "1=1" 
      : `"tenantId" = '${context.tenantId}'`;

    if (status) {
      whereClause += ` AND status = '${status}'`;
    }

    const vehicles = await db.$queryRawUnsafe(`
      SELECT * FROM "Vehicle"
      WHERE ${whereClause}
      ORDER BY "createdAt" DESC
    `);

    return NextResponse.json(vehicles);
  } catch (error) {
    console.error("Get vehicles error:", error);
    return NextResponse.json(
      { error: "Failed to fetch vehicles" },
      { status: 500 }
    );
  }
}

// POST create vehicle - avec tenant automatique
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
    let tenantId: string | null = null;
    
    if (context.canAccessAllTenants) {
      tenantId = data.tenantId || null;
    } else {
      tenantId = context.tenantId;
    }

    // Vérifier que l'immatriculation n'existe pas déjà dans ce tenant
    if (tenantId && data.registration) {
      const existingVehicle = await db.$queryRawUnsafe(`
        SELECT id FROM "Vehicle"
        WHERE registration = '${data.registration}'
        AND "tenantId" = '${tenantId}'
      `);

      if (Array.isArray(existingVehicle) && existingVehicle.length > 0) {
        return NextResponse.json(
          { error: "Un véhicule avec cette immatriculation existe déjà dans ce tenant" },
          { status: 400 }
        );
      }
    }

    // Générer un ID unique
    const id = `veh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Fonction helper pour les valeurs NULL
    const nullIfEmpty = (val: any) => val ? `'${val}'` : 'NULL';
    const escapeStr = (val: string | null | undefined) => val ? val.replace(/'/g, "''") : '';

    // Créer le véhicule
    const result = await db.$queryRawUnsafe(`
      INSERT INTO "Vehicle" (
        id, "tenantId", brand, model, registration, capacity, type, status, notes,
        "currentKm", "lastOilChangeDate", "lastOilChangeKm", "nextOilChangeKm",
        "insuranceExpiry", "vignetteExpiry", "technicalInspectionExpiry",
        "createdAt", "updatedAt"
      ) VALUES (
        '${id}',
        ${tenantId ? `'${tenantId}'` : 'NULL'},
        '${escapeStr(data.brand)}',
        '${escapeStr(data.model)}',
        '${escapeStr(data.registration)}',
        ${parseInt(data.capacity) || 1},
        ${nullIfEmpty(data.type)},
        '${data.status || "available"}',
        ${data.notes ? `'${escapeStr(data.notes)}'` : 'NULL'},
        ${data.currentKm ? parseInt(data.currentKm) : 'NULL'},
        ${data.lastOilChangeDate ? `'${data.lastOilChangeDate}'::timestamp` : 'NULL'},
        ${data.lastOilChangeKm ? parseInt(data.lastOilChangeKm) : 'NULL'},
        ${data.nextOilChangeKm ? parseInt(data.nextOilChangeKm) : 'NULL'},
        ${data.insuranceExpiry ? `'${data.insuranceExpiry}'::timestamp` : 'NULL'},
        ${data.vignetteExpiry ? `'${data.vignetteExpiry}'::timestamp` : 'NULL'},
        ${data.technicalInspectionExpiry ? `'${data.technicalInspectionExpiry}'::timestamp` : 'NULL'},
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      RETURNING *
    `);

    return NextResponse.json(Array.isArray(result) ? result[0] : result);
  } catch (error) {
    console.error("Create vehicle error:", error);
    return NextResponse.json(
      { error: "Failed to create vehicle" },
      { status: 500 }
    );
  }
}
