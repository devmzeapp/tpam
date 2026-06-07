import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserContext } from "@/lib/tenant-context";

// GET all services with filters - filtré par tenant
export async function GET(request: NextRequest) {
  try {
    // Récupérer le contexte utilisateur
    const userContext = await getUserContext(request);
    
    if (!userContext) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const vehicleId = searchParams.get("vehicleId");
    const driverId = searchParams.get("driverId");
    const clientId = searchParams.get("clientId");
    const status = searchParams.get("status");

    // Construire la requête avec filtre tenant
    const tenantCondition = userContext.isSuperAdmin 
      ? '1=1' 
      : `s."tenantId" = '${userContext.tenantId}'`;
    
    let query = `
      SELECT s.*, 
        c.id as "client_id", c.name as "client_name", c."contactName" as "client_contactName", 
        c.email as "client_email", c.phone as "client_phone", c.address as "client_address",
        v.id as "vehicle_id", v.brand as "vehicle_brand", v.model as "vehicle_model", 
        v.registration as "vehicle_registration", v.capacity as "vehicle_capacity",
        d.id as "driver_id", d."firstName" as "driver_firstName", d."lastName" as "driver_lastName",
        d.phone as "driver_phone",
        u.id as "createdBy_id", u.name as "createdBy_name", u.email as "createdBy_email"
      FROM "Service" s
      LEFT JOIN "Client" c ON s."clientId" = c.id
      LEFT JOIN "Vehicle" v ON s."vehicleId" = v.id
      LEFT JOIN "Driver" d ON s."driverId" = d.id
      LEFT JOIN "User" u ON s."createdById" = u.id
      WHERE ${tenantCondition}
    `;
    
    const params: any[] = [];
    let paramIndex = 1;
    
    if (startDate && endDate) {
      query += ` AND s.date >= $${paramIndex} AND s.date <= $${paramIndex + 1}`;
      params.push(new Date(startDate), new Date(endDate));
      paramIndex += 2;
    } else if (startDate) {
      query += ` AND s.date >= $${paramIndex}`;
      params.push(new Date(startDate));
      paramIndex++;
    } else if (endDate) {
      query += ` AND s.date <= $${paramIndex}`;
      params.push(new Date(endDate));
      paramIndex++;
    }

    if (vehicleId) {
      query += ` AND s."vehicleId" = $${paramIndex}`;
      params.push(vehicleId);
      paramIndex++;
    }
    if (driverId) {
      query += ` AND s."driverId" = $${paramIndex}`;
      params.push(driverId);
      paramIndex++;
    }
    if (clientId) {
      query += ` AND s."clientId" = $${paramIndex}`;
      params.push(clientId);
      paramIndex++;
    }
    if (status) {
      query += ` AND s.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    query += ` ORDER BY s.date DESC`;
    
    const services = await db.$queryRawUnsafe(query, ...params);
    
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
        id: s.createdBy_id,
        name: s.createdBy_name,
        email: s.createdBy_email,
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

// POST create service - assigné au tenant de l'utilisateur
export async function POST(request: NextRequest) {
  try {
    // Récupérer le contexte utilisateur
    const userContext = await getUserContext(request);
    
    if (!userContext) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    
    const data = await request.json();
    
    // Déterminer le tenant
    let tenantId = userContext.tenantId;
    
    if (userContext.isSuperAdmin) {
      tenantId = data.tenantId || userContext.tenantId;
      
      if (!tenantId) {
        return NextResponse.json(
          { error: "Un tenantId est requis pour créer une prestation" },
          { status: 400 }
        );
      }
    }
    
    // Vérifier que le client, véhicule et chauffeur appartiennent au même tenant
    if (!userContext.isSuperAdmin || data.validateTenant !== false) {
      const clientCheck = await db.$queryRaw`
        SELECT id FROM "Client" WHERE id = ${data.clientId} AND "tenantId" = ${tenantId}
      `;
      if (!Array.isArray(clientCheck) || clientCheck.length === 0) {
        return NextResponse.json(
          { error: "Client non trouvé ou n'appartient pas à votre espace" },
          { status: 400 }
        );
      }
      
      const vehicleCheck = await db.$queryRaw`
        SELECT id FROM "Vehicle" WHERE id = ${data.vehicleId} AND "tenantId" = ${tenantId}
      `;
      if (!Array.isArray(vehicleCheck) || vehicleCheck.length === 0) {
        return NextResponse.json(
          { error: "Véhicule non trouvé ou n'appartient pas à votre espace" },
          { status: 400 }
        );
      }
      
      const driverCheck = await db.$queryRaw`
        SELECT id FROM "Driver" WHERE id = ${data.driverId} AND "tenantId" = ${tenantId}
      `;
      if (!Array.isArray(driverCheck) || driverCheck.length === 0) {
        return NextResponse.json(
          { error: "Chauffeur non trouvé ou n'appartient pas à votre espace" },
          { status: 400 }
        );
      }
    }

    // Get the first admin user as default creator if not provided
    let createdById = data.createdById || userContext.id;

    // Créer la prestation
    const serviceResult = await db.$executeRawUnsafe(`
      INSERT INTO "Service" (
        id, "tenantId", "clientId", "vehicleId", "driverId", "createdById",
        type, description, date, "endTime", "departurePlace", "arrivalPlace",
        "passengerCount", "passengerNames", price, currency, status, notes,
        "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid(),
        '${tenantId}',
        '${data.clientId}',
        '${data.vehicleId}',
        '${data.driverId}',
        '${createdById}',
        '${data.type || 'TRANSFERT'}',
        ${data.description ? `'${data.description.replace(/'/g, "''")}'` : 'NULL'},
        '${data.date}'::timestamp,
        ${data.endTime ? `'${data.endTime}'::timestamp` : 'NULL'},
        '${data.departurePlace?.replace(/'/g, "''") || ''}',
        '${data.arrivalPlace?.replace(/'/g, "''") || ''}',
        ${parseInt(data.passengerCount) || 1},
        ${data.passengerNames ? `'${data.passengerNames.replace(/'/g, "''")}'` : 'NULL'},
        ${parseFloat(data.price) || 0},
        '${data.currency || "MAD"}',
        '${data.status || "NON_DECLAREE"}',
        ${data.notes ? `'${data.notes.replace(/'/g, "''")}'` : 'NULL'},
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      ) RETURNING id
    `);

    // Récupérer la prestation créée avec les relations
    const newService = await db.$queryRawUnsafe(`
      SELECT s.*, 
        c.name as "client_name", 
        v.brand as "vehicle_brand", v.model as "vehicle_model", v.registration as "vehicle_registration",
        d."firstName" as "driver_firstName", d."lastName" as "driver_lastName"
      FROM "Service" s
      LEFT JOIN "Client" c ON s."clientId" = c.id
      LEFT JOIN "Vehicle" v ON s."vehicleId" = v.id
      LEFT JOIN "Driver" d ON s."driverId" = d.id
      WHERE s.id = (SELECT id FROM "Service" ORDER BY "createdAt" DESC LIMIT 1)
    `);

    // Update vehicle status if needed
    if (data.updateVehicleStatus) {
      await db.$executeRawUnsafe(`
        UPDATE "Vehicle" SET status = 'in_mission' WHERE id = '${data.vehicleId}'
      `);
    }

    return NextResponse.json(Array.isArray(newService) && newService.length > 0 ? newService[0] : {});
  } catch (error) {
    console.error("Create service error:", error);
    return NextResponse.json(
      { error: "Failed to create service" },
      { status: 500 }
    );
  }
}
