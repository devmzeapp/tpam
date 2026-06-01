import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { randomBytes } from "crypto";

// Reset password for a user
export async function POST(request: NextRequest) {
  try {
    const { userId, newPassword } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "ID utilisateur requis" }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      include: { company: true }
    });

    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    // Generate a random password if not provided
    const password = newPassword || generateRandomPassword();

    // Update the user's password
    await db.user.update({
      where: { id: userId },
      data: { password }
    });

    return NextResponse.json({
      success: true,
      message: `Mot de passe réinitialisé pour ${user.name}`,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      },
      newPassword: password
    });
  } catch (error) {
    console.error("Error resetting password:", error);
    return NextResponse.json({ error: "Erreur lors de la réinitialisation" }, { status: 500 });
  }
}

// Generate a random password
function generateRandomPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
  let password = "";
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}
