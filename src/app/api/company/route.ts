import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserContext, canWrite } from "@/lib/tenant-context";

// GET - Get current user's company (TenantAccount)
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

    // Si l'utilisateur n'a pas de tenantId, retourner une erreur
    if (!context.tenantId && !context.canAccessAllTenants) {
      return NextResponse.json(
        { error: "Aucun espace associé à cet utilisateur" },
        { status: 404 }
      );
    }

    // Si c'est un super admin sans tenantId spécifique
    if (context.canAccessAllTenants && !context.tenantId) {
      const tenantIdParam = request.nextUrl.searchParams.get("tenantId");
      if (!tenantIdParam) {
        return NextResponse.json(
          { error: "ID tenant requis pour super admin" },
          { status: 400 }
        );
      }
      
      const tenant = await db.$queryRaw`
        SELECT id, name, slug, email, phone, address, city, ice, rc, "if", cnss, 
               logo, stamp, signature, plan, active, approved
        FROM "TenantAccount"
        WHERE id = ${tenantIdParam}
      `;
      
      return NextResponse.json(Array.isArray(tenant) && tenant.length > 0 ? tenant[0] : null);
    }

    // Récupérer les informations du tenant
    const tenant = await db.$queryRaw`
      SELECT id, name, slug, email, phone, address, city, ice, rc, "if", cnss, 
             logo, stamp, signature, plan, active, approved
      FROM "TenantAccount"
      WHERE id = ${context.tenantId}
    `;

    if (!Array.isArray(tenant) || tenant.length === 0) {
      // Si pas de TenantAccount, essayer avec Company (ancien modèle)
      const company = await db.$queryRaw`
        SELECT id, name, email, phone, address, city, ice, rc, "if", cnss, logo, stamp, signature
        FROM "Company"
        WHERE id = ${context.companyId}
      `;
      
      if (!Array.isArray(company) || company.length === 0) {
        return NextResponse.json(
          { error: "Entreprise non trouvée" },
          { status: 404 }
        );
      }
      
      return NextResponse.json(company[0]);
    }

    return NextResponse.json(tenant[0]);
  } catch (error) {
    console.error("Get company error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération de l'entreprise" },
      { status: 500 }
    );
  }
}

// PUT - Update company/tenant settings
export async function PUT(request: NextRequest) {
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

    // Vérifier les droits d'écriture
    if (!canWrite(context)) {
      return NextResponse.json({ error: "Accès en écriture non autorisé" }, { status: 403 });
    }

    const data = await request.json();
    const { id, name, email, phone, address, city, ice, rc, if: ifValue, cnss, logo, stamp, signature } = data;

    // Déterminer l'ID du tenant à mettre à jour
    let tenantId = id;
    
    if (context.canAccessAllTenants) {
      if (!tenantId) {
        return NextResponse.json(
          { error: "ID entreprise requis" },
          { status: 400 }
        );
      }
    } else {
      // Vérifier que l'ID correspond au tenant de l'utilisateur
      if (id && id !== context.tenantId) {
        return NextResponse.json(
          { error: "Non autorisé à modifier cette entreprise" },
          { status: 403 }
        );
      }
      tenantId = context.tenantId;
    }

    // Vérifier si c'est un TenantAccount ou une Company
    const tenantExists = await db.$queryRawUnsafe(`
      SELECT id FROM "TenantAccount" WHERE id = '${tenantId}'
    `);

    if (Array.isArray(tenantExists) && tenantExists.length > 0) {
      // Mettre à jour le TenantAccount
      await db.$executeRawUnsafe(`
        UPDATE "TenantAccount"
        SET 
          name = ${name ? `'${name.replace(/'/g, "''")}'` : 'NULL'},
          email = ${email ? `'${email}'` : 'NULL'},
          phone = ${phone ? `'${phone}'` : 'NULL'},
          address = ${address ? `'${address.replace(/'/g, "''")}'` : 'NULL'},
          city = ${city ? `'${city.replace(/'/g, "''")}'` : 'NULL'},
          ice = ${ice ? `'${ice}'` : 'NULL'},
          rc = ${rc ? `'${rc}'` : 'NULL'},
          "if" = ${ifValue ? `'${ifValue}'` : 'NULL'},
          cnss = ${cnss ? `'${cnss}'` : 'NULL'},
          logo = ${logo ? `'${logo}'` : 'NULL'},
          stamp = ${stamp ? `'${stamp}'` : 'NULL'},
          signature = ${signature ? `'${signature}'` : 'NULL'},
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE id = '${tenantId}'
      `);

      const updated = await db.$queryRawUnsafe(`
        SELECT id, name, slug, email, phone, address, city, ice, rc, "if", cnss, logo, stamp, signature
        FROM "TenantAccount"
        WHERE id = '${tenantId}'
      `);

      return NextResponse.json(Array.isArray(updated) && updated.length > 0 ? updated[0] : null);
    } else {
      // Essayer avec Company (ancien modèle)
      await db.$executeRawUnsafe(`
        UPDATE "Company"
        SET 
          name = ${name ? `'${name.replace(/'/g, "''")}'` : 'NULL'},
          email = ${email ? `'${email}'` : 'NULL'},
          phone = ${phone ? `'${phone}'` : 'NULL'},
          address = ${address ? `'${address.replace(/'/g, "''")}'` : 'NULL'},
          city = ${city ? `'${city.replace(/'/g, "''")}'` : 'NULL'},
          ice = ${ice ? `'${ice}'` : 'NULL'},
          rc = ${rc ? `'${rc}'` : 'NULL'},
          "if" = ${ifValue ? `'${ifValue}'` : 'NULL'},
          cnss = ${cnss ? `'${cnss}'` : 'NULL'},
          logo = ${logo ? `'${logo}'` : 'NULL'},
          stamp = ${stamp ? `'${stamp}'` : 'NULL'},
          signature = ${signature ? `'${signature}'` : 'NULL'},
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE id = '${tenantId}'
      `);

      const updated = await db.$queryRawUnsafe(`
        SELECT id, name, email, phone, address, city, ice, rc, "if", cnss, logo, stamp, signature
        FROM "Company"
        WHERE id = '${tenantId}'
      `);

      return NextResponse.json(Array.isArray(updated) && updated.length > 0 ? updated[0] : null);
    }
  } catch (error) {
    console.error("Update company error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour de l'entreprise" },
      { status: 500 }
    );
  }
}
