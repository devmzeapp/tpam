import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserContext, canWrite, requireTenantAccess } from "@/lib/tenant-context";

// GET a single vehicle by ID - with tenant isolation
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    // Verify tenant access
    const accessCheck = await requireTenantAccess(context, "Vehicle", id);
    if (!accessCheck.allowed) {
      return NextResponse.json({ error: accessCheck.error }, { status: 403 });
    }

    return NextResponse.json(accessCheck.record);
  } catch (error) {
    console.error("Get vehicle error:", error);
    return NextResponse.json(
      { error: "Failed to fetch vehicle" },
      { status: 500 }
    );
  }
}

// PATCH - Update a vehicle (including maintenance data) - with tenant isolation
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    // Verify tenant access
    const accessCheck = await requireTenantAccess(context, "Vehicle", id);
    if (!accessCheck.allowed) {
      return NextResponse.json({ error: accessCheck.error }, { status: 403 });
    }

    const data = await request.json();

    // Build SET clause for SQL UPDATE
    const updates: string[] = [];
    const escapeStr = (val: string) => val.replace(/'/g, "''");

    // Basic vehicle info
    if (data.brand !== undefined) updates.push(`brand = '${escapeStr(data.brand)}'`);
    if (data.model !== undefined) updates.push(`model = '${escapeStr(data.model)}'`);
    if (data.registration !== undefined) updates.push(`registration = '${escapeStr(data.registration)}'`);
    if (data.capacity !== undefined) updates.push(`capacity = ${parseInt(data.capacity) || 1}`);
    if (data.type !== undefined) updates.push(`type = '${escapeStr(data.type)}'`);
    if (data.status !== undefined) updates.push(`status = '${escapeStr(data.status)}'`);
    if (data.notes !== undefined) updates.push(`notes = '${escapeStr(data.notes)}'`);

    // Kilométrage et maintenance
    if (data.currentKm !== undefined) updates.push(`"currentKm" = ${parseInt(data.currentKm) || 0}`);
    if (data.lastOilChangeDate !== undefined) updates.push(`"lastOilChangeDate" = '${data.lastOilChangeDate}'::timestamp`);
    if (data.lastOilChangeKm !== undefined) updates.push(`"lastOilChangeKm" = ${parseInt(data.lastOilChangeKm) || 0}`);
    if (data.nextOilChangeKm !== undefined) updates.push(`"nextOilChangeKm" = ${parseInt(data.nextOilChangeKm) || 0}`);

    // Documents administratifs
    if (data.insuranceExpiry !== undefined) updates.push(`"insuranceExpiry" = '${data.insuranceExpiry}'::timestamp`);
    if (data.vignetteExpiry !== undefined) updates.push(`"vignetteExpiry" = '${data.vignetteExpiry}'::timestamp`);
    if (data.technicalInspectionExpiry !== undefined) updates.push(`"technicalInspectionExpiry" = '${data.technicalInspectionExpiry}'::timestamp`);

    updates.push(`"updatedAt" = CURRENT_TIMESTAMP`);

    if (updates.length === 1) {
      return NextResponse.json({ error: "Aucune donnée à mettre à jour" }, { status: 400 });
    }

    const result = await db.$queryRawUnsafe(`
      UPDATE "Vehicle"
      SET ${updates.join(", ")}
      WHERE id = '${id}'
      RETURNING *
    `);

    return NextResponse.json(Array.isArray(result) ? result[0] : result);
  } catch (error) {
    console.error("Update vehicle error:", error);
    return NextResponse.json(
      { error: "Failed to update vehicle" },
      { status: 500 }
    );
  }
}

// DELETE a vehicle - with tenant isolation
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    // Verify tenant access
    const accessCheck = await requireTenantAccess(context, "Vehicle", id);
    if (!accessCheck.allowed) {
      return NextResponse.json({ error: accessCheck.error }, { status: 403 });
    }

    await db.$executeRawUnsafe(`DELETE FROM "Vehicle" WHERE id = '${id}'`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete vehicle error:", error);
    return NextResponse.json(
      { error: "Failed to delete vehicle" },
      { status: 500 }
    );
  }
}
