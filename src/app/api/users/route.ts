import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";
import { getUserContext, canWrite, hasRole, USER_MANAGEMENT_ROLES } from "@/lib/tenant-context";

// GET all users - filtré par tenant
export async function GET(request: NextRequest) {
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

    // Construire la requête avec filtre tenant
    let users: any[];

    if (context.canAccessAllTenants) {
      // Super admin - voir tous les utilisateurs
      users = await db.$queryRaw`
        SELECT id, email, name, role, active, approved, "tenantId", "createdAt", "updatedAt"
        FROM "User"
        ORDER BY "createdAt" DESC
      `;
    } else {
      // Utilisateur normal - voir seulement les utilisateurs de son tenant
      users = await db.$queryRaw`
        SELECT id, email, name, role, active, approved, "tenantId", "createdAt", "updatedAt"
        FROM "User"
        WHERE "tenantId" = ${context.tenantId}
        ORDER BY "createdAt" DESC
      `;
    }

    return NextResponse.json(users);
  } catch (error) {
    console.error("Get users error:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

// POST create user - avec tenant automatique
export async function POST(request: NextRequest) {
  try {
    const currentUserId = request.headers.get("x-user-id") || 
                          request.nextUrl.searchParams.get("userId");

    if (!currentUserId) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const context = await getUserContext(currentUserId);
    if (!context) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    // Vérifier les droits de gestion des utilisateurs
    if (!hasRole(context, USER_MANAGEMENT_ROLES)) {
      return NextResponse.json({ error: "Non autorisé à créer des utilisateurs" }, { status: 403 });
    }

    const data = await request.json();

    // Vérifier si l'email existe déjà
    const existingUser = await db.$queryRaw`
      SELECT id FROM "User" WHERE email = ${data.email}
    `;

    if (Array.isArray(existingUser) && existingUser.length > 0) {
      return NextResponse.json(
        { error: "Cet email est déjà utilisé" },
        { status: 400 }
      );
    }

    // Générer un ID unique
    const id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Déterminer le tenantId
    let tenantId: string | null = null;
    
    if (context.canAccessAllTenants) {
      // Super admin peut créer pour n'importe quel tenant
      tenantId = data.tenantId || null;
    } else {
      // Utilisateur normal - créer dans son propre tenant
      tenantId = context.tenantId;
    }

    // Vérifier que le rôle est autorisé
    const role = (data.role as UserRole) || UserRole.AGENT;
    
    // Seul le super admin peut créer un super admin
    if (role === "SUPER_ADMIN" && !context.canAccessAllTenants) {
      return NextResponse.json(
        { error: "Non autorisé à créer un super administrateur" },
        { status: 403 }
      );
    }

    // Créer l'utilisateur
    await db.$executeRawUnsafe(`
      INSERT INTO "User" (
        id, email, password, name, role, active, approved, "tenantId", "createdAt", "updatedAt"
      ) VALUES (
        '${id}',
        '${data.email}',
        '${data.password}',
        '${data.name?.replace(/'/g, "''") || ''}',
        '${role}',
        ${data.active ?? true},
        ${data.approved ?? false},
        ${tenantId ? `'${tenantId}'` : 'NULL'},
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
    `);

    return NextResponse.json({
      id,
      email: data.email,
      name: data.name,
      role,
      active: data.active ?? true,
      tenantId,
    });
  } catch (error) {
    console.error("Create user error:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}
