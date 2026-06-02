import { NextRequest, NextResponse } from "next/server";
import { db, runAutoMigration, getUserTableColumns, getCompanyTableColumns } from "@/lib/db";

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

    // Check if email already exists
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
    const now = new Date().toISOString();

    // Get actual table columns
    const userCols = await getUserTableColumns();
    const companyCols = await getCompanyTableColumns();

    // Build Company INSERT
    const companyData: Record<string, any> = {
      id: companyId,
      name: companyName,
      email: email,
      active: true,
      approved: false,
      plan: 'trial',
      createdAt: now,
      updatedAt: now,
    };
    if (phone && companyCols.includes('phone')) companyData.phone = phone;
    if (companyCols.includes('blocked')) companyData.blocked = false;

    const companyInsertCols = Object.keys(companyData).filter(k => companyCols.includes(k));
    const companyInsertVals = companyInsertCols.map(c => companyData[c]);
    const companyColStr = companyInsertCols.map(c => `"${c}"`).join(', ');
    const companyValStr = companyInsertVals.map((_, i) => `$${i + 1}`).join(', ');

    await db.$executeRawUnsafe(
      `INSERT INTO "Company" (${companyColStr}) VALUES (${companyValStr})`,
      ...companyInsertVals
    );

    // Build User INSERT
    const userData: Record<string, any> = {
      id: userId,
      email: email,
      password: password,
      name: name,
      role: 'ADMIN',
      active: true,
      approved: false,
      companyId: companyId,
      createdAt: now,
      updatedAt: now,
    };
    if (phone && userCols.includes('phone')) userData.phone = phone;

    const userInsertCols = Object.keys(userData).filter(k => userCols.includes(k));
    const userInsertVals = userInsertCols.map(c => userData[c]);
    const userColStr = userInsertCols.map(c => `"${c}"`).join(', ');
    const userValStr = userInsertVals.map((_, i) => `$${i + 1}`).join(', ');

    await db.$executeRawUnsafe(
      `INSERT INTO "User" (${userColStr}) VALUES (${userValStr})`,
      ...userInsertVals
    );

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
