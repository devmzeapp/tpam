import { NextRequest, NextResponse } from "next/server";
import { db, runAutoMigration } from "@/lib/db";

// DELETE: Delete a company and all its users
export async function DELETE(request: NextRequest) {
  try {
    await runAutoMigration();

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

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
      message: "Entreprise et ses utilisateurs supprimés avec succès",
      deletedCompany: companyResult[0],
    });
  } catch (error) {
    console.error("Error deleting company:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression de l'entreprise" },
      { status: 500 }
    );
  }
}
