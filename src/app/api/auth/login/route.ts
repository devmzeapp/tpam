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

    // Use raw SQL to get user with tenant information
    // Support both old (companyId) and new (tenantId) schemas during migration
    const userResult = await db.$queryRaw`
      SELECT u.id, u.email, u.password, u.name, u.role, u.active, u.approved, 
             COALESCE(u."tenantId", u."companyId") as "tenantId",
             COALESCE(t.name, c.name) as "tenantName",
             COALESCE(t.blocked, c.blocked, false) as "tenantBlocked",
             COALESCE(t.active, true) as "tenantActive"
      FROM "User" u
      LEFT JOIN "TenantAccount" t ON u."tenantId" = t.id
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

    // Check if tenant is blocked
    if (user.tenantBlocked) {
      return NextResponse.json(
        { error: "Votre compte entreprise est bloqué. Veuillez contacter l'administrateur." },
        { status: 403 }
      );
    }

    // Check if tenant is active
    if (!user.tenantActive) {
      return NextResponse.json(
        { error: "Votre compte entreprise est désactivé. Veuillez contacter l'administrateur." },
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

    // Determine if user is super admin
    const isSuperAdminUser = user.role === 'SUPER_ADMIN';
    
    // Determine if user is admin client
    const isAdminClient = user.role === 'ADMIN_CLIENT' || user.role === 'ADMIN';

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
        tenantName: user.tenantName,
        isSuperAdmin: isSuperAdminUser,
        isAdminClient: isAdminClient,
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
