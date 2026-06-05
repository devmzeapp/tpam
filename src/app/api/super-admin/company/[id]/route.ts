import { NextRequest, NextResponse } from "next/server";
import { db, runAutoMigration } from "@/lib/db";

// PATCH: Block or unblock a company
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await runAutoMigration();
    const { id: companyId } = await params;
    const { action, reason } = await request.json();

    if (!companyId || !action) {
      return NextResponse.json(
        { error: "ID entreprise et action requis" },
        { status: 400 }
      );
    }

    // Check if company exists
    const companyResult = await db.$queryRaw`
      SELECT id, name, email, active, blocked FROM "Company" WHERE id = ${companyId}
    `;

    if (!Array.isArray(companyResult) || companyResult.length === 0) {
      return NextResponse.json(
        { error: "Entreprise non trouvée" },
        { status: 404 }
      );
    }

    const company = companyResult[0] as any;

    if (action === "block") {
      // Block the company
      await db.$executeRaw`
        UPDATE "Company" 
        SET active = false, blocked = true, "blockReason" = ${reason || null}, "updatedAt" = CURRENT_TIMESTAMP
        WHERE id = ${companyId}
      `;

      return NextResponse.json({
        success: true,
        message: `Entreprise "${company.name}" bloquée avec succès`,
        blocked: true,
      });
    } else if (action === "unblock") {
      // Unblock the company
      await db.$executeRaw`
        UPDATE "Company" 
        SET active = true, blocked = false, "blockReason" = null, "updatedAt" = CURRENT_TIMESTAMP
        WHERE id = ${companyId}
      `;

      return NextResponse.json({
        success: true,
        message: `Entreprise "${company.name}" débloquée avec succès`,
        blocked: false,
      });
    }

    return NextResponse.json(
      { error: "Action invalide. Utilisez 'block' ou 'unblock'" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error in company operation:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'opération: " + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}

// DELETE: Delete a company and all its users
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await runAutoMigration();
    const { id: companyId } = await params;

    if (!companyId) {
      return NextResponse.json(
        { error: "ID entreprise requis" },
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

    const company = companyResult[0] as any;

    // Delete all users associated with the company first
    await db.$executeRaw`
      DELETE FROM "User" WHERE "companyId" = ${companyId}
    `;

    // Delete the company
    await db.$executeRaw`
      DELETE FROM "Company" WHERE id = ${companyId}
    `;

    return NextResponse.json({
      success: true,
      message: `Entreprise "${company.name}" et ses utilisateurs supprimés avec succès`,
      deletedCompany: company,
    });
  } catch (error) {
    console.error("Error deleting company:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression de l'entreprise" },
      { status: 500 }
    );
  }
}
