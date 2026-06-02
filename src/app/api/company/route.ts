import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET - Get current user's company
export async function GET(request: NextRequest) {
  try {
    // Get company ID from query params (in a real app, this would come from session)
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId");

    if (!companyId) {
      return NextResponse.json(
        { error: "ID entreprise requis" },
        { status: 400 }
      );
    }

    const companyResult = await db.$queryRaw`
      SELECT id, name, email, phone, address, city, ice, rc, "if", cnss, logo, stamp, signature
      FROM "Company"
      WHERE id = ${companyId}
    `;

    if (!Array.isArray(companyResult) || companyResult.length === 0) {
      return NextResponse.json(
        { error: "Entreprise non trouvée" },
        { status: 404 }
      );
    }

    return NextResponse.json(companyResult[0]);
  } catch (error) {
    console.error("Get company error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération de l'entreprise" },
      { status: 500 }
    );
  }
}

// PUT - Update company settings
export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();
    const { id, name, email, phone, address, city, ice, rc, if: ifValue, cnss, logo, stamp, signature } = data;

    if (!id) {
      return NextResponse.json(
        { error: "ID entreprise requis" },
        { status: 400 }
      );
    }

    // Update company using raw SQL
    await db.$executeRaw`
      UPDATE "Company"
      SET 
        name = ${name || null},
        email = ${email || null},
        phone = ${phone || null},
        address = ${address || null},
        city = ${city || null},
        ice = ${ice || null},
        rc = ${rc || null},
        "if" = ${ifValue || null},
        cnss = ${cnss || null},
        logo = ${logo || null},
        stamp = ${stamp || null},
        signature = ${signature || null},
        "updatedAt" = NOW()
      WHERE id = ${id}
    `;

    // Fetch and return updated company
    const companyResult = await db.$queryRaw`
      SELECT id, name, email, phone, address, city, ice, rc, "if", cnss, logo, stamp, signature
      FROM "Company"
      WHERE id = ${id}
    `;

    return NextResponse.json(companyResult[0]);
  } catch (error) {
    console.error("Update company error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour de l'entreprise" },
      { status: 500 }
    );
  }
}
