import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isSuperAdmin, getSuperAdminUser } from "@/lib/super-admin";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email et mot de passe requis" },
        { status: 400 }
      );
    }

    // Check for super admin first
    if (isSuperAdmin(email, password)) {
      const superAdmin = getSuperAdminUser();
      return NextResponse.json({
        success: true,
        user: superAdmin,
      });
    }

    const user = await db.user.findUnique({
      where: { email },
      include: { company: true },
    });

    if (!user || !user.active) {
      return NextResponse.json(
        { error: "Utilisateur non trouvé ou inactif" },
        { status: 401 }
      );
    }

    // Simple password comparison (in production, use bcrypt)
    if (user.password !== password) {
      return NextResponse.json(
        { error: "Mot de passe incorrect" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        companyId: user.companyId,
        companyName: user.company?.name,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Erreur de connexion" },
      { status: 500 }
    );
  }
}
