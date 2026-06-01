import { NextRequest, NextResponse } from "next/server";
import { db, runAutoMigration } from "@/lib/db";

// Approve or reject a company and its admin user
export async function POST(request: NextRequest) {
  try {
    await runAutoMigration();

    const { companyId, userId, action } = await request.json();

    if (!action || !["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "Action invalide. Utilisez 'approve' ou 'reject'" },
        { status: 400 }
      );
    }

    const isApproved = action === "approve";

    // If approving/rejecting a company
    if (companyId) {
      // Get company info
      const companyResult = await db.$queryRaw`
        SELECT id, name, email FROM "Company" WHERE id = ${companyId}
      `;

      if (!Array.isArray(companyResult) || companyResult.length === 0) {
        return NextResponse.json(
          { error: "Entreprise non trouvée" },
          { status: 404 }
        );
      }

      const company = companyResult[0] as any;

      // Update company approval status
      await db.$executeRaw`
        UPDATE "Company" 
        SET approved = ${isApproved}, active = ${isApproved}, "updatedAt" = CURRENT_TIMESTAMP
        WHERE id = ${companyId}
      `;

      // Also update the admin user(s) of this company
      await db.$executeRaw`
        UPDATE "User" 
        SET approved = ${isApproved}, active = ${isApproved}, "updatedAt" = CURRENT_TIMESTAMP
        WHERE "companyId" = ${companyId}
      `;

      return NextResponse.json({
        success: true,
        message: isApproved 
          ? `Entreprise "${company.name}" approuvée avec succès` 
          : `Entreprise "${company.name}" rejetée`,
        company: {
          id: company.id,
          name: company.name,
          approved: isApproved
        }
      });
    }

    // If approving/rejecting a specific user
    if (userId) {
      // Get user info
      const userResult = await db.$queryRaw`
        SELECT u.id, u.name, u.email, c.name as "companyName"
        FROM "User" u
        LEFT JOIN "Company" c ON u."companyId" = c.id
        WHERE u.id = ${userId}
      `;

      if (!Array.isArray(userResult) || userResult.length === 0) {
        return NextResponse.json(
          { error: "Utilisateur non trouvé" },
          { status: 404 }
        );
      }

      const user = userResult[0] as any;

      // Update user approval status
      await db.$executeRaw`
        UPDATE "User" 
        SET approved = ${isApproved}, active = ${isApproved}, "updatedAt" = CURRENT_TIMESTAMP
        WHERE id = ${userId}
      `;

      return NextResponse.json({
        success: true,
        message: isApproved 
          ? `Utilisateur "${user.name}" approuvé avec succès` 
          : `Utilisateur "${user.name}" rejeté`,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          approved: isApproved
        }
      });
    }

    return NextResponse.json(
      { error: "companyId ou userId requis" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error in approval process:", error);
    return NextResponse.json(
      { error: "Erreur lors du processus d'approbation: " + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}

// Get pending approvals
export async function GET(request: NextRequest) {
  try {
    await runAutoMigration();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "pending"; // pending, approved, all, blocked

    let companies;
    
    if (status === "pending") {
      companies = await db.$queryRaw`
        SELECT 
          c.id, c.name, c.email, c.phone, c.address, c.city, c.ice, 
          c.approved, c.active, c.blocked, c.plan, c."createdAt",
          u.id as "adminId", u.name as "adminName", u.email as "adminEmail", u.role as "adminRole"
        FROM "Company" c
        LEFT JOIN "User" u ON u."companyId" = c.id AND u.role = 'ADMIN'
        WHERE c.approved = false
        ORDER BY c."createdAt" DESC
      `;
    } else if (status === "approved") {
      companies = await db.$queryRaw`
        SELECT 
          c.id, c.name, c.email, c.phone, c.address, c.city, c.ice, 
          c.approved, c.active, c.blocked, c.plan, c."createdAt",
          u.id as "adminId", u.name as "adminName", u.email as "adminEmail", u.role as "adminRole"
        FROM "Company" c
        LEFT JOIN "User" u ON u."companyId" = c.id AND u.role = 'ADMIN'
        WHERE c.approved = true AND c.blocked = false
        ORDER BY c."createdAt" DESC
      `;
    } else if (status === "blocked") {
      companies = await db.$queryRaw`
        SELECT 
          c.id, c.name, c.email, c.phone, c.address, c.city, c.ice, 
          c.approved, c.active, c.blocked, c."blockReason", c.plan, c."createdAt",
          u.id as "adminId", u.name as "adminName", u.email as "adminEmail", u.role as "adminRole"
        FROM "Company" c
        LEFT JOIN "User" u ON u."companyId" = c.id AND u.role = 'ADMIN'
        WHERE c.blocked = true
        ORDER BY c."createdAt" DESC
      `;
    } else {
      companies = await db.$queryRaw`
        SELECT 
          c.id, c.name, c.email, c.phone, c.address, c.city, c.ice, 
          c.approved, c.active, c.blocked, c."blockReason", c.plan, c."createdAt",
          u.id as "adminId", u.name as "adminName", u.email as "adminEmail", u.role as "adminRole"
        FROM "Company" c
        LEFT JOIN "User" u ON u."companyId" = c.id AND u.role = 'ADMIN'
        ORDER BY c."createdAt" DESC
      `;
    }

    // Transform the data to match the expected format
    const transformedCompanies = (companies as any[]).map(company => ({
      ...company,
      adminUser: company.adminId ? {
        id: company.adminId,
        name: company.adminName,
        email: company.adminEmail,
        role: company.adminRole,
      } : null,
    }));

    return NextResponse.json({
      success: true,
      companies: transformedCompanies,
    });
  } catch (error) {
    console.error("Error fetching pending approvals:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des approbations en attente" },
      { status: 500 }
    );
  }
}
