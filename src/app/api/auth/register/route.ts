import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, companyName, phone } = await request.json();

    if (!name || !email || !password || !companyName) {
      return NextResponse.json(
        { error: "Tous les champs obligatoires doivent être remplis" },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Cet email est déjà utilisé" },
        { status: 400 }
      );
    }

    // Check if company email already exists
    const existingCompany = await db.company.findUnique({
      where: { email },
    });

    if (existingCompany) {
      return NextResponse.json(
        { error: "Une entreprise avec cet email existe déjà" },
        { status: 400 }
      );
    }

    // Create company and admin user in a transaction
    // Both will be pending approval (approved: false by default)
    const result = await db.$transaction(async (tx) => {
      // Create company (pending approval)
      const company = await tx.company.create({
        data: {
          name: companyName,
          email: email,
          phone: phone || null,
          approved: false, // Requires super admin approval
        },
      });

      // Create admin user for the company (pending approval)
      const user = await tx.user.create({
        data: {
          name,
          email,
          password, // In production, hash the password
          role: "ADMIN",
          companyId: company.id,
          approved: false, // Requires super admin approval
        },
      });

      return { company, user };
    });

    return NextResponse.json({
      success: true,
      pendingApproval: true,
      message: "Votre compte a été créé avec succès. Il est en attente d'approbation par l'administrateur. Vous recevrez une notification une fois votre compte activé.",
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
        companyId: result.company.id,
        companyName: result.company.name,
        approved: false,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'inscription" },
      { status: 500 }
    );
  }
}
