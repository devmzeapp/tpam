import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// Approve or reject a company and its admin user
export async function POST(request: NextRequest) {
  try {
    const { companyId, userId, approved, action } = await request.json();

    if (!action || !["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "Action invalide. Utilisez 'approve' ou 'reject'" },
        { status: 400 }
      );
    }

    const isApproved = action === "approve";

    // If approving/rejecting a company
    if (companyId) {
      const company = await db.company.findUnique({
        where: { id: companyId },
        include: { users: true }
      });

      if (!company) {
        return NextResponse.json(
          { error: "Entreprise non trouvée" },
          { status: 404 }
        );
      }

      // Update company approval status
      await db.company.update({
        where: { id: companyId },
        data: { 
          approved: isApproved,
          active: isApproved 
        }
      });

      // Also update the admin user(s) of this company
      await db.user.updateMany({
        where: { companyId: companyId },
        data: { 
          approved: isApproved,
          active: isApproved 
        }
      });

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
      const user = await db.user.findUnique({
        where: { id: userId },
        include: { company: true }
      });

      if (!user) {
        return NextResponse.json(
          { error: "Utilisateur non trouvé" },
          { status: 404 }
        );
      }

      // Update user approval status
      await db.user.update({
        where: { id: userId },
        data: { 
          approved: isApproved,
          active: isApproved 
        }
      });

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
      { error: "Erreur lors du processus d'approbation" },
      { status: 500 }
    );
  }
}

// Get pending approvals
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "pending"; // pending, approved, all

    let whereClause: any = {};
    
    if (status === "pending") {
      whereClause = { approved: false };
    } else if (status === "approved") {
      whereClause = { approved: true };
    }

    // Get pending companies with their admin users
    const companies = await db.company.findMany({
      where: whereClause,
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            approved: true,
            phone: true,
            createdAt: true,
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    // Also get pending users not associated with pending companies
    const pendingUsers = await db.user.findMany({
      where: {
        approved: status === "pending" ? false : status === "approved" ? true : undefined,
        role: { not: "SUPER_ADMIN" }
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            approved: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return NextResponse.json({
      success: true,
      companies: companies.map(company => ({
        id: company.id,
        name: company.name,
        email: company.email,
        phone: company.phone,
        address: company.address,
        city: company.city,
        ice: company.ice,
        approved: company.approved,
        active: company.active,
        plan: company.plan,
        createdAt: company.createdAt,
        adminUser: company.users.find(u => u.role === "ADMIN"),
        usersCount: company.users.length
      })),
      users: pendingUsers
    });
  } catch (error) {
    console.error("Error fetching pending approvals:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des approbations en attente" },
      { status: 500 }
    );
  }
}
