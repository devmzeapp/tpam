import { NextRequest, NextResponse } from "next/server";
import { db, runAutoMigration } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    // Run auto migration first to ensure database is up to date
    await runAutoMigration();

    const { name, email, password, companyName, phone } = await request.json();

    if (!name || !email || !password || !companyName) {
      return NextResponse.json(
        { error: "Tous les champs obligatoires doivent être remplis" },
        { status: 400 }
      );
    }

    // Use raw SQL to check if email already exists (avoids Prisma schema issues)
    const existingUserResult = await db.$queryRaw`
      SELECT id, email FROM "User" WHERE email = ${email}
    `;

    if (Array.isArray(existingUserResult) && existingUserResult.length > 0) {
      return NextResponse.json(
        { error: "Cet email est déjà utilisé" },
        { status: 400 }
      );
    }

    // Check if company email already exists
    const existingCompanyResult = await db.$queryRaw`
      SELECT id, email FROM "Company" WHERE email = ${email}
    `;

    if (Array.isArray(existingCompanyResult) && existingCompanyResult.length > 0) {
      return NextResponse.json(
        { error: "Une entreprise avec cet email existe déjà" },
        { status: 400 }
      );
    }

    // Generate IDs
    const companyId = `company_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create company using raw SQL
    await db.$executeRaw`
      INSERT INTO "Company" (id, name, email, phone, active, approved, blocked, plan, "createdAt", "updatedAt")
      VALUES (${companyId}, ${companyName}, ${email}, ${phone || null}, true, false, false, 'trial', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `;

    // Create user using raw SQL
    await db.$executeRaw`
      INSERT INTO "User" (id, name, email, password, role, active, approved, "companyId", "createdAt", "updatedAt")
      VALUES (${userId}, ${name}, ${email}, ${password}, 'ADMIN', true, false, ${companyId}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `;

    return NextResponse.json({
      success: true,
      pendingApproval: true,
      message: "Votre compte a été créé avec succès. Il est en attente d'approbation par l'administrateur. Vous recevrez une notification une fois votre compte activé.",
      user: {
        id: userId,
        email: email,
        name: name,
        role: "ADMIN",
        companyId: companyId,
        companyName: companyName,
        approved: false,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'inscription: " + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}
