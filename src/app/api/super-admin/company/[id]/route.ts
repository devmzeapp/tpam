import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET - Get company details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const company = await db.company.findUnique({
      where: { id },
      include: {
        users: true
      }
    });

    if (!company) {
      return NextResponse.json({ error: "Entreprise non trouvée" }, { status: 404 });
    }

    // Get stats
    const userIds = company.users.map(u => u.id);
    const [servicesCount, invoicesCount, clientsCount] = await Promise.all([
      db.service.count({ where: { createdById: { in: userIds } } }),
      db.invoice.count({ where: { createdById: { in: userIds } } }),
      db.client.count({ where: { id: { in: userIds } } })
    ]);

    return NextResponse.json({
      success: true,
      company: {
        ...company,
        stats: {
          services: servicesCount,
          invoices: invoicesCount,
          clients: clientsCount
        }
      }
    });
  } catch (error) {
    console.error("Error fetching company:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// PATCH - Update company (block/unblock, change plan)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action, plan } = body;

    const company = await db.company.findUnique({
      where: { id },
      include: { users: true }
    });

    if (!company) {
      return NextResponse.json({ error: "Entreprise non trouvée" }, { status: 404 });
    }

    let updateData: any = {};

    switch (action) {
      case "block":
        updateData = { active: false, approved: false };
        // Also block all users
        await db.user.updateMany({
          where: { companyId: id },
          data: { active: false }
        });
        break;
      
      case "unblock":
        updateData = { active: true, approved: true };
        // Also unblock all users
        await db.user.updateMany({
          where: { companyId: id },
          data: { active: true }
        });
        break;
      
      case "changePlan":
        if (!plan) {
          return NextResponse.json({ error: "Plan requis" }, { status: 400 });
        }
        updateData = { plan };
        break;
      
      default:
        return NextResponse.json({ error: "Action invalide" }, { status: 400 });
    }

    const updatedCompany = await db.company.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json({
      success: true,
      message: action === "block" 
        ? "Entreprise bloquée avec succès" 
        : action === "unblock" 
          ? "Entreprise débloquée avec succès"
          : "Plan mis à jour avec succès",
      company: updatedCompany
    });
  } catch (error) {
    console.error("Error updating company:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// DELETE - Delete company and all its data
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const company = await db.company.findUnique({
      where: { id },
      include: { users: true }
    });

    if (!company) {
      return NextResponse.json({ error: "Entreprise non trouvée" }, { status: 404 });
    }

    // Delete in transaction to ensure data integrity
    await db.$transaction(async (tx) => {
      const userIds = company.users.map(u => u.id);

      // Delete invoices and related items
      const invoices = await tx.invoice.findMany({
        where: { createdById: { in: userIds } }
      });
      const invoiceIds = invoices.map(i => i.id);

      await tx.invoiceItem.deleteMany({
        where: { invoiceId: { in: invoiceIds } }
      });
      await tx.payment.deleteMany({
        where: { invoiceId: { in: invoiceIds } }
      });
      await tx.invoice.deleteMany({
        where: { id: { in: invoiceIds } }
      });

      // Delete manifests
      await tx.manifest.deleteMany({
        where: { createdById: { in: userIds } }
      });

      // Delete services
      await tx.service.deleteMany({
        where: { createdById: { in: userIds } }
      });

      // Delete users
      await tx.user.deleteMany({
        where: { companyId: id }
      });

      // Delete company
      await tx.company.delete({
        where: { id }
      });
    });

    return NextResponse.json({
      success: true,
      message: `Entreprise "${company.name}" supprimée avec succès`
    });
  } catch (error) {
    console.error("Error deleting company:", error);
    return NextResponse.json({ error: "Erreur lors de la suppression" }, { status: 500 });
  }
}
