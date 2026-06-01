import { NextRequest, NextResponse } from "next/server";
import { db, runAutoMigration } from "@/lib/db";

// POST: Reset a user's password
export async function POST(request: NextRequest) {
  try {
    await runAutoMigration();

    const { userId, newPassword } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "ID utilisateur requis" },
        { status: 400 }
      );
    }

    // Generate random password if not provided
    const password = newPassword || Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4).toUpperCase();

    // Check if user exists
    const userResult = await db.$queryRaw`
      SELECT id, email, name FROM "User" WHERE id = ${userId}
    `;

    if (!Array.isArray(userResult) || userResult.length === 0) {
      return NextResponse.json(
        { error: "Utilisateur non trouvé" },
        { status: 404 }
      );
    }

    // Update password (in production, should hash the password)
    await db.$executeRaw`
      UPDATE "User" 
      SET password = ${password}, "updatedAt" = CURRENT_TIMESTAMP
      WHERE id = ${userId}
    `;

    return NextResponse.json({
      success: true,
      message: "Mot de passe réinitialisé avec succès",
      newPassword: password,
      user: userResult[0],
    });
  } catch (error) {
    console.error("Error resetting password:", error);
    return NextResponse.json(
      { error: "Erreur lors de la réinitialisation du mot de passe" },
      { status: 500 }
    );
  }
}
