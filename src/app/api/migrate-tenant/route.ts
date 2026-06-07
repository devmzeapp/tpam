import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Migration Multi-Tenant
 * 
 * Ce script ajoute les colonnes tenant_id à toutes les tables existantes
 * et migre les données vers le nouveau modèle.
 */
export async function POST(request: NextRequest) {
  try {
    const results: string[] = [];
    
    // 1. Créer la table TenantAccount si elle n'existe pas
    results.push("=== Étape 1: Vérification/Création de la table TenantAccount ===");
    
    const tenantTableExists = await db.$queryRaw`
      SELECT table_name FROM information_schema.tables WHERE table_name = 'TenantAccount'
    `;
    
    if (!Array.isArray(tenantTableExists) || tenantTableExists.length === 0) {
      await db.$executeRaw`
        CREATE TABLE "TenantAccount" (
          "id" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "slug" TEXT NOT NULL UNIQUE,
          "email" TEXT NOT NULL UNIQUE,
          "phone" TEXT,
          "address" TEXT,
          "city" TEXT,
          "ice" TEXT,
          "rc" TEXT,
          "if" TEXT,
          "cnss" TEXT,
          "logo" TEXT,
          "stamp" TEXT,
          "signature" TEXT,
          "plan" TEXT NOT NULL DEFAULT 'trial',
          "active" BOOLEAN NOT NULL DEFAULT true,
          "approved" BOOLEAN NOT NULL DEFAULT false,
          "blocked" BOOLEAN NOT NULL DEFAULT false,
          "blockReason" TEXT,
          "trialEndsAt" TIMESTAMP(3),
          "subscriptionEndsAt" TIMESTAMP(3),
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "TenantAccount_pkey" PRIMARY KEY ("id")
        )
      `;
      results.push("✓ Table TenantAccount créée");
    } else {
      results.push("✓ Table TenantAccount existe déjà");
    }
    
    // 2. Migrer les Company vers TenantAccount
    results.push("=== Étape 2: Migration des Company vers TenantAccount ===");
    
    const companies = await db.$queryRaw`
      SELECT id, name, email, phone, address, city, ice, rc, if, cnss, 
             logo, stamp, signature, plan, active, approved, blocked, 
             "blockReason", "createdAt", "updatedAt"
      FROM "Company"
    ` as any[];
    
    for (const company of companies) {
      // Générer un slug
      const baseSlug = company.name
        ?.toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 50) || 'tenant';
      
      let slug = baseSlug;
      let counter = 1;
      
      // Vérifier l'unicité
      while (true) {
        const existing = await db.$queryRaw`
          SELECT id FROM "TenantAccount" WHERE slug = ${slug}
        `;
        if (!Array.isArray(existing) || existing.length === 0) break;
        slug = `${baseSlug}-${counter}`;
        counter++;
      }
      
      // Vérifier si le tenant existe déjà
      const existingTenant = await db.$queryRaw`
        SELECT id FROM "TenantAccount" WHERE id = ${company.id}
      `;
      
      if (!Array.isArray(existingTenant) || existingTenant.length === 0) {
        await db.$executeRaw`
          INSERT INTO "TenantAccount" (
            id, name, slug, email, phone, address, city, ice, rc, if, cnss,
            logo, stamp, signature, plan, active, approved, blocked, 
            "blockReason", "createdAt", "updatedAt"
          ) VALUES (
            ${company.id}, ${company.name}, ${slug}, ${company.email},
            ${company.phone}, ${company.address}, ${company.city},
            ${company.ice}, ${company.rc}, ${company.if}, ${company.cnss},
            ${company.logo}, ${company.stamp}, ${company.signature},
            ${company.plan}, ${company.active}, ${company.approved},
            ${company.blocked}, ${company.blockReason},
            ${company.createdAt}, ${company.updatedAt}
          )
        `;
        results.push(`✓ Tenant créé pour Company: ${company.name}`);
      }
    }
    
    // 3. Ajouter tenantId aux utilisateurs
    results.push("=== Étape 3: Ajout de tenantId aux utilisateurs ===");
    
    const userTenantColExists = await db.$queryRaw`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'User' AND column_name = 'tenantId'
    `;
    
    if (!Array.isArray(userTenantColExists) || userTenantColExists.length === 0) {
      await db.$executeRaw`ALTER TABLE "User" ADD COLUMN "tenantId" TEXT`;
      results.push("✓ Colonne tenantId ajoutée à User");
      
      // Migrer les données depuis companyId
      await db.$executeRaw`
        UPDATE "User" SET "tenantId" = "companyId" WHERE "companyId" IS NOT NULL
      `;
      results.push("✓ Données companyId migrées vers tenantId");
    }
    
    // 4. Créer les tables avec tenantId
    results.push("=== Étape 4: Ajout de tenantId aux autres tables ===");
    
    const tablesToAddTenant = [
      'Vehicle', 'Driver', 'Client', 'Service', 'Invoice', 'Payment', 'Manifest'
    ];
    
    for (const table of tablesToAddTenant) {
      const colExists = await db.$queryRaw`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = ${table} AND column_name = 'tenantId'
      `;
      
      if (!Array.isArray(colExists) || colExists.length === 0) {
        try {
          await db.$executeRawUnsafe(`ALTER TABLE "${table}" ADD COLUMN "tenantId" TEXT`);
          results.push(`✓ Colonne tenantId ajoutée à ${table}`);
        } catch (e: any) {
          results.push(`⚠ Erreur ajout tenantId à ${table}: ${e.message}`);
        }
      } else {
        results.push(`✓ Colonne tenantId existe déjà dans ${table}`);
      }
    }
    
    // 5. Peupler tenantId pour les services (via l'utilisateur créateur)
    results.push("=== Étape 5: Peuplement de tenantId dans les tables ===");
    
    // Services
    await db.$executeRaw`
      UPDATE "Service" s
      SET "tenantId" = u."tenantId"
      FROM "User" u
      WHERE s."createdById" = u.id AND s."tenantId" IS NULL AND u."tenantId" IS NOT NULL
    `;
    results.push("✓ tenantId peuplé dans Service");
    
    // Invoices
    await db.$executeRaw`
      UPDATE "Invoice" i
      SET "tenantId" = u."tenantId"
      FROM "User" u
      WHERE i."createdById" = u.id AND i."tenantId" IS NULL AND u."tenantId" IS NOT NULL
    `;
    results.push("✓ tenantId peuplé dans Invoice");
    
    // Manifests
    await db.$executeRaw`
      UPDATE "Manifest" m
      SET "tenantId" = u."tenantId"
      FROM "User" u
      WHERE m."createdById" = u.id AND m."tenantId" IS NULL AND u."tenantId" IS NOT NULL
    `;
    results.push("✓ tenantId peuplé dans Manifest");
    
    // Payments
    await db.$executeRaw`
      UPDATE "Payment" p
      SET "tenantId" = c."tenantId"
      FROM "Client" c
      WHERE p."clientId" = c.id AND p."tenantId" IS NULL AND c."tenantId" IS NOT NULL
    `;
    results.push("✓ tenantId peuplé dans Payment");
    
    // 6. Créer un tenant par défaut pour les données sans tenant
    results.push("=== Étape 6: Création du tenant par défaut ===");
    
    const defaultTenantExists = await db.$queryRaw`
      SELECT id FROM "TenantAccount" WHERE slug = 'default'
    `;
    
    let defaultTenantId: string | null = null;
    
    if (!Array.isArray(defaultTenantExists) || defaultTenantExists.length === 0) {
      const id = `default_${Date.now()}`;
      await db.$executeRaw`
        INSERT INTO "TenantAccount" (
          id, name, slug, email, active, approved, "createdAt", "updatedAt"
        ) VALUES (
          ${id}, 'Défaut', 'default', 'default@tpam.local', true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
      `;
      defaultTenantId = id;
      results.push("✓ Tenant par défaut créé");
    } else {
      defaultTenantId = (defaultTenantExists[0] as any).id;
      results.push("✓ Tenant par défaut existe déjà");
    }
    
    // Assigner les données orphelines au tenant par défaut
    if (defaultTenantId) {
      await db.$executeRawUnsafe(`UPDATE "User" SET "tenantId" = '${defaultTenantId}' WHERE "tenantId" IS NULL AND role != 'SUPER_ADMIN'`);
      await db.$executeRawUnsafe(`UPDATE "Vehicle" SET "tenantId" = '${defaultTenantId}' WHERE "tenantId" IS NULL`);
      await db.$executeRawUnsafe(`UPDATE "Driver" SET "tenantId" = '${defaultTenantId}' WHERE "tenantId" IS NULL`);
      await db.$executeRawUnsafe(`UPDATE "Client" SET "tenantId" = '${defaultTenantId}' WHERE "tenantId" IS NULL`);
      await db.$executeRawUnsafe(`UPDATE "Service" SET "tenantId" = '${defaultTenantId}' WHERE "tenantId" IS NULL`);
      await db.$executeRawUnsafe(`UPDATE "Invoice" SET "tenantId" = '${defaultTenantId}' WHERE "tenantId" IS NULL`);
      await db.$executeRawUnsafe(`UPDATE "Payment" SET "tenantId" = '${defaultTenantId}' WHERE "tenantId" IS NULL`);
      await db.$executeRawUnsafe(`UPDATE "Manifest" SET "tenantId" = '${defaultTenantId}' WHERE "tenantId" IS NULL`);
      results.push("✓ Données orphelines assignées au tenant par défaut");
    }
    
    // 7. Ajouter le rôle ADMIN_CLIENT
    results.push("=== Étape 7: Ajout du rôle ADMIN_CLIENT ===");
    
    try {
      const adminClientExists = await db.$queryRaw`
        SELECT EXISTS (
          SELECT 1 FROM pg_enum 
          WHERE enumlabel = 'ADMIN_CLIENT' 
          AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'UserRole')
        )
      `;
      
      const hasAdminClient = Array.isArray(adminClientExists) && 
        adminClientExists.length > 0 && 
        (adminClientExists[0] as any)?.exists === true;
      
      if (!hasAdminClient) {
        await db.$executeRaw`ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'ADMIN_CLIENT'`;
        results.push("✓ Rôle ADMIN_CLIENT ajouté");
      } else {
        results.push("✓ Rôle ADMIN_CLIENT existe déjà");
      }
    } catch (e: any) {
      results.push(`⚠ Erreur ajout rôle ADMIN_CLIENT: ${e.message}`);
    }
    
    // 8. Créer la table TenantSetting
    results.push("=== Étape 8: Création de la table TenantSetting ===");
    
    const tenantSettingExists = await db.$queryRaw`
      SELECT table_name FROM information_schema.tables WHERE table_name = 'TenantSetting'
    `;
    
    if (!Array.isArray(tenantSettingExists) || tenantSettingExists.length === 0) {
      await db.$executeRaw`
        CREATE TABLE "TenantSetting" (
          "id" TEXT NOT NULL,
          "tenantId" TEXT NOT NULL,
          "key" TEXT NOT NULL,
          "value" TEXT NOT NULL,
          "description" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "TenantSetting_pkey" PRIMARY KEY ("id"),
          CONSTRAINT "TenantSetting_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "TenantAccount"("id") ON DELETE CASCADE
        )
      `;
      await db.$executeRaw`CREATE UNIQUE INDEX "TenantSetting_tenantId_key_idx" ON "TenantSetting"("tenantId", "key")`;
      results.push("✓ Table TenantSetting créée");
    } else {
      results.push("✓ Table TenantSetting existe déjà");
    }
    
    // 9. Créer les index pour optimiser les requêtes
    results.push("=== Étape 9: Création des index ===");
    
    const indexes = [
      { table: 'User', column: 'tenantId' },
      { table: 'Vehicle', column: 'tenantId' },
      { table: 'Driver', column: 'tenantId' },
      { table: 'Client', column: 'tenantId' },
      { table: 'Service', column: 'tenantId' },
      { table: 'Invoice', column: 'tenantId' },
      { table: 'Payment', column: 'tenantId' },
      { table: 'Manifest', column: 'tenantId' },
    ];
    
    for (const { table, column } of indexes) {
      try {
        await db.$executeRawUnsafe(
          `CREATE INDEX IF NOT EXISTS "${table}_${column}_idx" ON "${table}"("${column}")`
        );
        results.push(`✓ Index créé: ${table}_${column}_idx`);
      } catch (e: any) {
        results.push(`⚠ Index ${table}_${column}_idx: ${e.message}`);
      }
    }
    
    results.push("=== Migration terminée avec succès ===");
    
    return NextResponse.json({
      success: true,
      message: "Migration multi-tenant terminée",
      results,
    });
  } catch (error) {
    console.error("Migration error:", error);
    return NextResponse.json(
      { 
        error: "Erreur lors de la migration", 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // Vérifier le statut de la migration
  try {
    const status: any = {};
    
    // Vérifier les tables
    const tables = ['TenantAccount', 'TenantSetting', 'User', 'Vehicle', 'Driver', 'Client', 'Service', 'Invoice', 'Payment', 'Manifest'];
    
    for (const table of tables) {
      const exists = await db.$queryRaw`
        SELECT table_name FROM information_schema.tables WHERE table_name = ${table}
      `;
      status[`table_${table}`] = Array.isArray(exists) && exists.length > 0;
    }
    
    // Vérifier les colonnes tenantId
    const tenantTables = ['User', 'Vehicle', 'Driver', 'Client', 'Service', 'Invoice', 'Payment', 'Manifest'];
    
    for (const table of tenantTables) {
      const colExists = await db.$queryRaw`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = ${table} AND column_name = 'tenantId'
      `;
      status[`column_${table}_tenantId`] = Array.isArray(colExists) && colExists.length > 0;
    }
    
    // Compter les tenants
    const tenantCount = await db.$queryRaw`SELECT COUNT(*) as count FROM "TenantAccount"`;
    status.tenantCount = (tenantCount as any)[0]?.count || 0;
    
    return NextResponse.json({ status });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
