import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserContext, getTenantFilter } from "@/lib/tenant-context";

// GET all vehicles - filtré par tenant
export async function GET(request: NextRequest) {
  try {
    // Récupérer le contexte utilisateur
    const userContext = await getUserContext(request);
    
    if (!userContext) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    
    // Obtenir le filtre tenant
    const tenantFilter = getTenantFilter(userContext);
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const where: Record<string, unknown> = {
      ...tenantFilter, // Toujours filtrer par tenant
    };
    
    if (status) {
      where.status = status;
    }

    const vehicles = await db.$queryRawUnsafe(`
      SELECT * FROM "Vehicle" 
      WHERE ${userContext.isSuperAdmin ? '1=1' : `"tenantId" = '${userContext.tenantId}'`}
      ${status ? `AND status = '${status}'` : ''}
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

// POST create vehicle - assigné au tenant de l'utilisateur
export async function POST(request: NextRequest) {
  try {
    // Récupérer le contexte utilisateur
    const userContext = await getUserContext(request);
    
    if (!userContext) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    
    // Les super admins doivent spécifier un tenant
    const data = await request.json();
    
    // Déterminer le tenant
    let tenantId = userContext.tenantId;
    
    if (userContext.isSuperAdmin) {
      // Super admin peut créer pour n'importe quel tenant
      tenantId = data.tenantId || userContext.tenantId;
      
      if (!tenantId) {
        return NextResponse.json(
          { error: "Un tenantId est requis pour créer un véhicule" },
          { status: 400 }
        );
      }
    }
    
    // Vérifier que l'immatriculation n'existe pas déjà dans ce tenant
    const existingVehicle = await db.$queryRaw`
      SELECT id FROM "Vehicle" 
      WHERE registration = ${data.registration} 
      AND "tenantId" = ${tenantId}
    `;
    
    if (Array.isArray(existingVehicle) && existingVehicle.length > 0) {
      return NextResponse.json(
        { error: "Un véhicule avec cette immatriculation existe déjà" },
        { status: 400 }
      );
    }

    // Créer le véhicule avec le tenant
    const vehicle = await db.$executeRawUnsafe(`
      INSERT INTO "Vehicle" (
        id, "tenantId", brand, model, registration, capacity, type, status, notes,
        "currentKm", "lastOilChangeDate", "lastOilChangeKm", "nextOilChangeKm",
        "insuranceExpiry", "vignetteExpiry", "technicalInspectionExpiry",
        "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid(),
        '${tenantId}',
        '${data.brand || ''}',
        '${data.model || ''}',
        '${data.registration || ''}',
        ${parseInt(data.capacity) || 1},
        ${data.type ? `'${data.type}'` : 'NULL'},
        '${data.status || "available"}',
        ${data.notes ? `'${data.notes.replace(/'/g, "''")}'` : 'NULL'},
        ${data.currentKm ? parseInt(data.currentKm) : 'NULL'},
        ${data.lastOilChangeDate ? `'${data.lastOilChangeDate}'::timestamp` : 'NULL'},
        ${data.lastOilChangeKm ? parseInt(data.lastOilChangeKm) : 'NULL'},
        ${data.nextOilChangeKm ? parseInt(data.nextOilChangeKm) : 'NULL'},
        ${data.insuranceExpiry ? `'${data.insuranceExpiry}'::timestamp` : 'NULL'},
        ${data.vignetteExpiry ? `'${data.vignetteExpiry}'::timestamp` : 'NULL'},
        ${data.technicalInspectionExpiry ? `'${data.technicalInspectionExpiry}'::timestamp` : 'NULL'},
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      ) RETURNING *
    `);

    return NextResponse.json(vehicle);
  } catch (error) {
    console.error("Create vehicle error:", error);
    return NextResponse.json(
      { error: "Failed to create vehicle" },
      { status: 500 }
    );
  }
}
