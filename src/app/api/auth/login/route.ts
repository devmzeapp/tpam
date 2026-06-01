import { NextRequest, NextResponse } from "next/server";
import { db, runAutoMigration } from "@/lib/db";
import { isSuperAdmin, getSuperAdminUser } from "@/lib/super-admin";

export async function POST(request: NextRequest) {
  try {
    // Run auto migration first to ensure database is up to date
    await runAutoMigration();

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

    // Use raw SQL to avoid Prisma schema issues
    const userResult = await db.$queryRaw`
      SELECT u.id, u.email, u.password, u.name, u.role, u.active, u.approved, u."companyId",
             c.name as "companyName", c.blocked as "companyBlocked"
      FROM "User" u
      LEFT JOIN "Company" c ON u."companyId" = c.id
      WHERE u.email = ${email}
    `;

    if (!Array.isArray(userResult) || userResult.length === 0) {
      return NextResponse.json(
        { error: "Utilisateur non trouvé" },
        { status: 401 }
      );
    }

    const user = userResult[0] as any;

    if (!user.active) {
      return NextResponse.json(
        { error: "Utilisateur inactif" },
        { status: 401 }
      );
    }

    // Check if company is blocked
    if (user.companyBlocked) {
      return NextResponse.json(
        { error: "Votre compte entreprise est bloqué. Veuillez contacter l'administrateur." },
        { status: 403 }
      );
    }

    // Check if user is approved
    if (!user.approved) {
      return NextResponse.json(
        { 
          error: "Votre compte est en attente d'approbation. Vous serez notifié une fois votre compte activé.",
          pendingApproval: true 
        },
        { status: 403 }
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
        companyName: user.companyName,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Erreur de connexion: " + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}
