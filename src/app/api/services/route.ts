import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserContext, canWrite } from "@/lib/tenant-context";

// GET all services with filters - filtré par tenant
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
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const vehicleId = searchParams.get("vehicleId");
    const driverId = searchParams.get("driverId");
    const clientId = searchParams.get("clientId");
    const status = searchParams.get("status");

    // Construire la requête avec filtre tenant
    const tenantCondition = context.canAccessAllTenants 
      ? '1=1' 
      : `s."tenantId" = '${context.tenantId}'`;

    let whereClause = tenantCondition;

    if (vehicleId) {
      whereClause += ` AND s."vehicleId" = '${vehicleId}'`;
    }
    if (driverId) {
      whereClause += ` AND s."driverId" = '${driverId}'`;
    }
    if (clientId) {
      whereClause += ` AND s."clientId" = '${clientId}'`;
    }
    if (status) {
      whereClause += ` AND s.status = '${status}'`;
    }
    if (startDate) {
      whereClause += ` AND s.date >= '${startDate}'`;
    }
    if (endDate) {
      whereClause += ` AND s.date <= '${endDate}'`;
    }

    const services = await db.$queryRawUnsafe(`
      SELECT s.*, 
        c.id as client_id, c.name as client_name, c."contactName" as client_contactName, 
        c.email as client_email, c.phone as client_phone, c.address as client_address,
        v.id as vehicle_id, v.brand as vehicle_brand, v.model as vehicle_model, 
        v.registration as vehicle_registration, v.capacity as vehicle_capacity,
        d.id as driver_id, d."firstName" as driver_firstName, d."lastName" as driver_lastName,
        d.phone as driver_phone,
        u.id as creator_id, u.name as creator_name, u.email as creator_email
      FROM "Service" s
      LEFT JOIN "Client" c ON s."clientId" = c.id
      LEFT JOIN "Vehicle" v ON s."vehicleId" = v.id
      LEFT JOIN "Driver" d ON s."driverId" = d.id
      LEFT JOIN "User" u ON s."createdById" = u.id
      WHERE ${whereClause}
      ORDER BY s.date DESC
    `);

    // Transformer les résultats
    const formattedServices = (services as any[]).map(s => ({
      id: s.id,
      clientId: s.clientId,
      vehicleId: s.vehicleId,
      driverId: s.driverId,
      createdById: s.createdById,
      type: s.type,
      description: s.description,
      date: s.date,
      endTime: s.endTime,
      departurePlace: s.departurePlace,
      arrivalPlace: s.arrivalPlace,
      passengerCount: s.passengerCount,
      passengerNames: s.passengerNames,
      price: s.price,
      currency: s.currency,
      status: s.status,
      notes: s.notes,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      client: {
        id: s.client_id,
        name: s.client_name,
        contactName: s.client_contactName,
        email: s.client_email,
        phone: s.client_phone,
        address: s.client_address,
      },
      vehicle: {
        id: s.vehicle_id,
        brand: s.vehicle_brand,
        model: s.vehicle_model,
        registration: s.vehicle_registration,
        capacity: s.vehicle_capacity,
      },
      driver: {
        id: s.driver_id,
        firstName: s.driver_firstName,
        lastName: s.driver_lastName,
        phone: s.driver_phone,
      },
      createdBy: {
        id: s.creator_id,
        name: s.creator_name,
        email: s.creator_email,
      },
    }));

    return NextResponse.json(formattedServices);
  } catch (error) {
    console.error("Get services error:", error);
    return NextResponse.json(
      { error: "Failed to fetch services" },
      { status: 500 }
    );
  }
}

// POST create service - avec tenant automatique
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

    // Vérifier que le client, véhicule et chauffeur appartiennent au même tenant
    if (tenantId) {
      if (data.clientId) {
        const clientCheck = await db.$queryRawUnsafe(`
          SELECT id FROM "Client" WHERE id = '${data.clientId}' AND "tenantId" = '${tenantId}'
        `);
        if (!Array.isArray(clientCheck) || clientCheck.length === 0) {
          return NextResponse.json(
            { error: "Client non trouvé ou n'appartient pas à votre espace" },
            { status: 400 }
          );
        }
      }

      if (data.vehicleId) {
        const vehicleCheck = await db.$queryRawUnsafe(`
          SELECT id FROM "Vehicle" WHERE id = '${data.vehicleId}' AND "tenantId" = '${tenantId}'
        `);
        if (!Array.isArray(vehicleCheck) || vehicleCheck.length === 0) {
          return NextResponse.json(
            { error: "Véhicule non trouvé ou n'appartient pas à votre espace" },
            { status: 400 }
          );
        }
      }

      if (data.driverId) {
        const driverCheck = await db.$queryRawUnsafe(`
          SELECT id FROM "Driver" WHERE id = '${data.driverId}' AND "tenantId" = '${tenantId}'
        `);
        if (!Array.isArray(driverCheck) || driverCheck.length === 0) {
          return NextResponse.json(
            { error: "Chauffeur non trouvé ou n'appartient pas à votre espace" },
            { status: 400 }
          );
        }
      }
    }

    // Générer un ID unique
    const id = `srv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Fonction helper
    const escapeStr = (val: string | null | undefined) => val ? val.replace(/'/g, "''") : '';

    // Créer la prestation
    await db.$executeRawUnsafe(`
      INSERT INTO "Service" (
        id, "tenantId", "clientId", "vehicleId", "driverId", "createdById",
        type, description, date, "endTime", "departurePlace", "arrivalPlace",
        "passengerCount", "passengerNames", price, currency, status, notes,
        "createdAt", "updatedAt"
      ) VALUES (
        '${id}',
        ${tenantId ? `'${tenantId}'` : 'NULL'},
        '${data.clientId}',
        '${data.vehicleId}',
        '${data.driverId}',
        '${userId}',
        '${data.type || 'TRANSFERT'}',
        ${data.description ? `'${escapeStr(data.description)}'` : 'NULL'},
        '${data.date}'::timestamp,
        ${data.endTime ? `'${data.endTime}'::timestamp` : 'NULL'},
        '${escapeStr(data.departurePlace) || ''}',
        '${escapeStr(data.arrivalPlace) || ''}',
        ${parseInt(data.passengerCount) || 1},
        ${data.passengerNames ? `'${escapeStr(data.passengerNames)}'` : 'NULL'},
        ${parseFloat(data.price) || 0},
        '${data.currency || "MAD"}',
        '${data.status || "NON_DECLAREE"}',
        ${data.notes ? `'${escapeStr(data.notes)}'` : 'NULL'},
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
    `);

    // Récupérer la prestation créée
    const newService = await db.$queryRawUnsafe(`
      SELECT s.*, 
        c.name as client_name, 
        v.brand as vehicle_brand, v.model as vehicle_model, v.registration as vehicle_registration,
        d."firstName" as driver_firstName, d."lastName" as driver_lastName
      FROM "Service" s
      LEFT JOIN "Client" c ON s."clientId" = c.id
      LEFT JOIN "Vehicle" v ON s."vehicleId" = v.id
      LEFT JOIN "Driver" d ON s."driverId" = d.id
      WHERE s.id = '${id}'
    `);

    return NextResponse.json(Array.isArray(newService) && newService.length > 0 ? newService[0] : {});
  } catch (error) {
    console.error("Create service error:", error);
    return NextResponse.json(
      { error: "Failed to create service" },
      { status: 500 }
    );
  }
}
