import { NextRequest, NextResponse } from "next/server";
import { db, runAutoMigration } from "@/lib/db";

// POST: Block or unblock a company
export async function POST(request: NextRequest) {
  try {
    await runAutoMigration();

    const { companyId, blocked, reason } = await request.json();

    if (!companyId || typeof blocked !== 'boolean') {
      return NextResponse.json(
        { error: "ID entreprise et statut de blocage requis" },
        { status: 400 }
      );
    }

    // Check if company exists
    const companyResult = await db.$queryRaw`
      SELECT id, name, email FROM "Company" WHERE id = ${companyId}
    `;

    if (!Array.isArray(companyResult) || companyResult.length === 0) {
      return NextResponse.json(
        { error: "Entreprise non trouvée" },
        { status: 404 }
      );
    }

    // Update company blocked status
    await db.$executeRaw`
      UPDATE "Company" 
      SET blocked = ${blocked}, 
          "blockReason" = ${blocked ? (reason || null) : null},
          "updatedAt" = CURRENT_TIMESTAMP
      WHERE id = ${companyId}
    `;

    return NextResponse.json({
      success: true,
      message: blocked 
        ? "Entreprise bloquée avec succès" 
        : "Entreprise débloquée avec succès",
      company: companyResult[0],
      blocked,
    });
  } catch (error) {
    console.error("Error blocking/unblocking company:", error);
    return NextResponse.json(
      { error: "Erreur lors du blocage/déblocage de l'entreprise" },
      { status: 500 }
    );
  }
}
