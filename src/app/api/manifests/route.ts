import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserContext, canWrite, requireTenantAccess } from "@/lib/tenant-context";

// GET all manifests - filtré par tenant
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
    const serviceId = searchParams.get("serviceId");

    // Construire la requête avec filtre tenant
    let whereClause = context.canAccessAllTenants 
      ? "1=1" 
      : `m."tenantId" = '${context.tenantId}'`;

    if (serviceId) {
      whereClause += ` AND m."serviceId" = '${serviceId}'`;
    }

    const manifests = await db.$queryRawUnsafe(`
      SELECT m.*,
        s.id as service_id, s.type as service_type, s.description as service_description,
        s.date as service_date, s.price as service_price,
        c.id as client_id, c.name as client_name,
        v.id as vehicle_id, v.brand as vehicle_brand, v.model as vehicle_model, v.registration as vehicle_registration,
        d.id as driver_id, d."firstName" as driver_first_name, d."lastName" as driver_last_name,
        u.id as creator_id, u.name as creator_name
      FROM "Manifest" m
      LEFT JOIN "Service" s ON m."serviceId" = s.id
      LEFT JOIN "Client" c ON s."clientId" = c.id
      LEFT JOIN "Vehicle" v ON m."vehicleId" = v.id
      LEFT JOIN "Driver" d ON m."driverId" = d.id
      LEFT JOIN "User" u ON m."createdById" = u.id
      WHERE ${whereClause}
      ORDER BY m.date DESC
    `);

    // Formater les résultats
    const formattedManifests = (manifests as any[]).map(m => ({
      ...m,
      service: {
        id: m.service_id,
        type: m.service_type,
        description: m.service_description,
        date: m.service_date,
        price: m.service_price,
        client: {
          id: m.client_id,
          name: m.client_name,
        },
      },
      vehicle: {
        id: m.vehicle_id,
        brand: m.vehicle_brand,
        model: m.vehicle_model,
        registration: m.vehicle_registration,
      },
      driver: {
        id: m.driver_id,
        firstName: m.driver_first_name,
        lastName: m.driver_last_name,
      },
      createdBy: {
        id: m.creator_id,
        name: m.creator_name,
      },
    }));

    return NextResponse.json(formattedManifests);
  } catch (error) {
    console.error("Get manifests error:", error);
    return NextResponse.json(
      { error: "Failed to fetch manifests" },
      { status: 500 }
    );
  }
}

// POST create manifest - avec tenant automatique
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

    // Vérifier que le service appartient au même tenant
    if (data.serviceId) {
      const accessCheck = await requireTenantAccess(context, "Service", data.serviceId);
      if (!accessCheck.allowed) {
        return NextResponse.json({ error: accessCheck.error }, { status: 403 });
      }
    }

    // Vérifier que le véhicule appartient au même tenant
    if (data.vehicleId) {
      const accessCheck = await requireTenantAccess(context, "Vehicle", data.vehicleId);
      if (!accessCheck.allowed) {
        return NextResponse.json({ error: accessCheck.error }, { status: 403 });
      }
    }

    // Vérifier que le chauffeur appartient au même tenant
    if (data.driverId) {
      const accessCheck = await requireTenantAccess(context, "Driver", data.driverId);
      if (!accessCheck.allowed) {
        return NextResponse.json({ error: accessCheck.error }, { status: 403 });
      }
    }

    // Déterminer le tenantId (prendre celui du service si disponible)
    let tenantId = context.tenantId;
    if (!context.canAccessAllTenants && data.serviceId) {
      const serviceCheck = await requireTenantAccess(context, "Service", data.serviceId);
      tenantId = (serviceCheck.record as any)?.tenantId || context.tenantId;
    }

    // Générer un ID unique
    const id = `man_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Créer le manifeste
    const result = await db.$queryRawUnsafe(`
      INSERT INTO "Manifest" (
        id, "serviceId", "vehicleId", "driverId", "createdById",
        date, "departurePlace", "arrivalPlace", "departureTime", "arrivalTime",
        "passengerCount", "passengerList", remarks, "tenantId", "createdAt", "updatedAt"
      ) VALUES (
        '${id}',
        '${data.serviceId}',
        '${data.vehicleId}',
        '${data.driverId}',
        '${userId}',
        '${data.date}',
        '${data.departurePlace?.replace(/'/g, "''") || ''}',
        '${data.arrivalPlace?.replace(/'/g, "''") || ''}',
        ${data.departureTime ? `'${data.departureTime}'` : 'NULL'},
        ${data.arrivalTime ? `'${data.arrivalTime}'` : 'NULL'},
        ${parseInt(data.passengerCount) || 1},
        ${data.passengerList ? `'${data.passengerList.replace(/'/g, "''")}'` : 'NULL'},
        ${data.remarks ? `'${data.remarks.replace(/'/g, "''")}'` : 'NULL'},
        ${tenantId ? `'${tenantId}'` : 'NULL'},
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      RETURNING *
    `);

    return NextResponse.json(Array.isArray(result) ? result[0] : result);
  } catch (error) {
    console.error("Create manifest error:", error);
    return NextResponse.json(
      { error: "Failed to create manifest" },
      { status: 500 }
    );
  }
}
