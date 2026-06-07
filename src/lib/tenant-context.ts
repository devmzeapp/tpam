/**
 * Multi-Tenant Context and Access Control
 * 
 * Ce module fournit les utilitaires pour l'isolation des données par tenant.
 * Tous les accès aux données doivent passer par ces fonctions.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "./db";
import { UserRole } from "@prisma/client";

// Types
export interface TenantUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  tenantId: string | null;
  companyId: string | null;
}

export interface TenantContext {
  user: TenantUser;
  tenantId: string | null;
  isSuperAdmin: boolean;
  canAccessAllTenants: boolean;
}

// Rôles qui peuvent voir tous les tenants
const GLOBAL_ACCESS_ROLES: UserRole[] = ["SUPER_ADMIN"];

// Rôles qui sont limités à leur propre tenant
const TENANT_LIMITED_ROLES: UserRole[] = ["ADMIN_CLIENT", "ADMIN", "AGENT", "COMPTABLE", "LECTURE"];

// Rôles qui peuvent gérer les utilisateurs dans leur tenant
const USER_MANAGEMENT_ROLES: UserRole[] = ["SUPER_ADMIN", "ADMIN_CLIENT", "ADMIN"];

// Rôles qui peuvent créer/modifier des données
const WRITE_ROLES: UserRole[] = ["SUPER_ADMIN", "ADMIN_CLIENT", "ADMIN", "AGENT", "COMPTABLE"];

// Rôles en lecture seule
const READ_ONLY_ROLES: UserRole[] = ["LECTURE"];

/**
 * Récupère l'utilisateur connecté depuis la session
 */
export async function getSessionUser(request?: NextRequest): Promise<TenantUser | null> {
  try {
    // Récupérer le token ou la session
    const authHeader = request?.headers.get("authorization");
    
    // Pour l'instant, on utilise une requête directe pour obtenir l'utilisateur
    // Dans une vraie app, on utiliserait NextAuth ou un système de token JWT
    
    // Simuler la récupération depuis les headers ou cookies
    // En production, ceci serait remplacé par la vraie logique d'auth
    return null;
  } catch (error) {
    console.error("Error getting session user:", error);
    return null;
  }
}

/**
 * Récupère le contexte tenant complet pour un utilisateur
 */
export async function getUserContext(userId: string): Promise<TenantContext | null> {
  try {
    const user = await db.$queryRaw`
      SELECT id, email, name, role, "tenantId", "companyId"
      FROM "User"
      WHERE id = ${userId}
    ` as any[];

    if (!Array.isArray(user) || user.length === 0) {
      return null;
    }

    const userData = user[0];
    const isSuperAdmin = userData.role === "SUPER_ADMIN";
    
    return {
      user: {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        role: userData.role as UserRole,
        tenantId: userData.tenantId,
        companyId: userData.companyId,
      },
      tenantId: userData.tenantId,
      isSuperAdmin,
      canAccessAllTenants: isSuperAdmin,
    };
  } catch (error) {
    console.error("Error getting user context:", error);
    return null;
  }
}

/**
 * Vérifie si un utilisateur peut accéder à un tenant spécifique
 */
export function canAccessTenant(context: TenantContext, targetTenantId: string | null): boolean {
  // Super admin peut tout voir
  if (context.canAccessAllTenants) {
    return true;
  }
  
  // Si pas de targetTenantId, on autorise (données sans tenant)
  if (!targetTenantId) {
    return true;
  }
  
  // Sinon, l'utilisateur ne peut voir que son propre tenant
  return context.tenantId === targetTenantId;
}

/**
 * Vérifie si un utilisateur a un rôle autorisé
 */
export function hasRole(context: TenantContext, allowedRoles: UserRole[]): boolean {
  return allowedRoles.includes(context.user.role);
}

/**
 * Vérifie si l'utilisateur peut écrire des données
 */
export function canWrite(context: TenantContext): boolean {
  return hasRole(context, WRITE_ROLES);
}

/**
 * Vérifie si l'utilisateur est en lecture seule
 */
export function isReadOnly(context: TenantContext): boolean {
  return hasRole(context, READ_ONLY_ROLES);
}

/**
 * Middleware pour vérifier l'accès tenant
 */
export function withTenantAccess(
  handler: (request: NextRequest, context: TenantContext) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      // Récupérer l'userId depuis les headers, cookies, ou query params
      const userId = request.headers.get("x-user-id") || 
                     request.nextUrl.searchParams.get("userId");
      
      if (!userId) {
        return NextResponse.json(
          { error: "Non authentifié" },
          { status: 401 }
        );
      }

      const context = await getUserContext(userId);
      
      if (!context) {
        return NextResponse.json(
          { error: "Utilisateur non trouvé" },
          { status: 404 }
        );
      }

      return handler(request, context);
    } catch (error) {
      console.error("Tenant access error:", error);
      return NextResponse.json(
        { error: "Erreur d'authentification" },
        { status: 500 }
      );
    }
  };
}

/**
 * Génère la clause WHERE pour filtrer par tenant
 */
export function getTenantWhereClause(context: TenantContext, alias?: string): any {
  if (context.canAccessAllTenants) {
    return {}; // Pas de filtre pour super admin
  }
  
  const field = alias ? `${alias}."tenantId"` : '"tenantId"';
  return { tenantId: context.tenantId };
}

/**
 * Génère la clause WHERE en SQL brut
 */
export function getTenantWhereSQL(context: TenantContext, alias?: string): string {
  if (context.canAccessAllTenants) {
    return "1=1"; // Pas de filtre
  }
  
  const field = alias ? `${alias}."tenantId"` : '"tenantId"';
  const tenantId = context.tenantId?.replace(/'/g, "''") || "";
  return `${field} = '${tenantId}'`;
}

/**
 * Ajoute le tenantId aux données de création
 */
export function withTenantData(data: Record<string, any>, context: TenantContext): Record<string, any> {
  if (context.canAccessAllTenants) {
    return data; // Super admin peut créer sans tenant (rare)
  }
  
  return {
    ...data,
    tenantId: context.tenantId,
  };
}

/**
 * Vérifie qu'un enregistrement appartient au tenant de l'utilisateur
 */
export async function requireTenantAccess(
  context: TenantContext,
  table: string,
  recordId: string
): Promise<{ allowed: boolean; record?: any; error?: string }> {
  if (context.canAccessAllTenants) {
    // Super admin - vérifier juste que l'enregistrement existe
    try {
      const record = await db.$queryRawUnsafe(
        `SELECT * FROM "${table}" WHERE id = $1`,
        recordId
      );
      return { allowed: true, record: Array.isArray(record) ? record[0] : record };
    } catch (error) {
      return { allowed: false, error: "Enregistrement non trouvé" };
    }
  }

  try {
    const record = await db.$queryRawUnsafe(
      `SELECT * FROM "${table}" WHERE id = $1 AND "tenantId" = $2`,
      recordId,
      context.tenantId
    );

    if (!Array.isArray(record) || record.length === 0) {
      return { allowed: false, error: "Accès non autorisé à cet enregistrement" };
    }

    return { allowed: true, record: record[0] };
  } catch (error) {
    console.error("Error checking tenant access:", error);
    return { allowed: false, error: "Erreur de vérification d'accès" };
  }
}

/**
 * Liste tous les tenants (pour super admin uniquement)
 */
export async function listAllTenants(context: TenantContext) {
  if (!context.canAccessAllTenants) {
    return [];
  }

  try {
    return await db.$queryRaw`
      SELECT id, name, slug, email, plan, active, approved, blocked, "createdAt"
      FROM "TenantAccount"
      ORDER BY "createdAt" DESC
    `;
  } catch (error) {
    console.error("Error listing tenants:", error);
    return [];
  }
}

/**
 * Récupère les informations d'un tenant
 */
export async function getTenantInfo(tenantId: string) {
  try {
    const tenant = await db.$queryRaw`
      SELECT id, name, slug, email, phone, address, city, ice, rc, if, cnss,
             logo, stamp, signature, plan, active, approved, blocked
      FROM "TenantAccount"
      WHERE id = ${tenantId}
    `;
    
    return Array.isArray(tenant) && tenant.length > 0 ? tenant[0] : null;
  } catch (error) {
    console.error("Error getting tenant info:", error);
    return null;
  }
}

/**
 * Compte les enregistrements par table pour un tenant
 */
export async function getTenantStats(tenantId: string) {
  try {
    const [users, vehicles, drivers, clients, services, invoices, payments, manifests] = await Promise.all([
      db.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "User" WHERE "tenantId" = $1`, tenantId),
      db.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "Vehicle" WHERE "tenantId" = $1`, tenantId),
      db.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "Driver" WHERE "tenantId" = $1`, tenantId),
      db.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "Client" WHERE "tenantId" = $1`, tenantId),
      db.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "Service" WHERE "tenantId" = $1`, tenantId),
      db.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "Invoice" WHERE "tenantId" = $1`, tenantId),
      db.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "Payment" WHERE "tenantId" = $1`, tenantId),
      db.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "Manifest" WHERE "tenantId" = $1`, tenantId),
    ]);

    return {
      users: (users as any)[0]?.count || 0,
      vehicles: (vehicles as any)[0]?.count || 0,
      drivers: (drivers as any)[0]?.count || 0,
      clients: (clients as any)[0]?.count || 0,
      services: (services as any)[0]?.count || 0,
      invoices: (invoices as any)[0]?.count || 0,
      payments: (payments as any)[0]?.count || 0,
      manifests: (manifests as any)[0]?.count || 0,
    };
  } catch (error) {
    console.error("Error getting tenant stats:", error);
    return {
      users: 0,
      vehicles: 0,
      drivers: 0,
      clients: 0,
      services: 0,
      invoices: 0,
      payments: 0,
      manifests: 0,
    };
  }
}

/**
 * Exporte les données d'un tenant en format spécifié
 */
export async function exportTenantData(
  tenantId: string,
  format: "json" | "csv",
  tables?: string[]
): Promise<{ data: any; filename: string; contentType: string }> {
  const defaultTables = ["users", "vehicles", "drivers", "clients", "services", "invoices", "payments", "manifests"];
  const tablesToExport = tables || defaultTables;
  
  const exportData: Record<string, any[]> = {};
  
  for (const table of tablesToExport) {
    try {
      let result: any[];
      
      switch (table) {
        case "users":
          result = await db.$queryRawUnsafe(
            `SELECT id, email, name, role, active, approved, "createdAt" FROM "User" WHERE "tenantId" = $1`,
            tenantId
          ) as any[];
          break;
        case "vehicles":
          result = await db.$queryRawUnsafe(
            `SELECT id, brand, model, registration, capacity, type, status FROM "Vehicle" WHERE "tenantId" = $1`,
            tenantId
          ) as any[];
          break;
        case "drivers":
          result = await db.$queryRawUnsafe(
            `SELECT id, "firstName", "lastName", phone, email, available FROM "Driver" WHERE "tenantId" = $1`,
            tenantId
          ) as any[];
          break;
        case "clients":
          result = await db.$queryRawUnsafe(
            `SELECT id, name, "contactName", email, phone, city FROM "Client" WHERE "tenantId" = $1`,
            tenantId
          ) as any[];
          break;
        case "services":
          result = await db.$queryRawUnsafe(
            `SELECT id, type, description, date, "departurePlace", "arrivalPlace", price, status FROM "Service" WHERE "tenantId" = $1`,
            tenantId
          ) as any[];
          break;
        case "invoices":
          result = await db.$queryRawUnsafe(
            `SELECT id, number, type, status, "issueDate", total, currency FROM "Invoice" WHERE "tenantId" = $1`,
            tenantId
          ) as any[];
          break;
        case "payments":
          result = await db.$queryRawUnsafe(
            `SELECT id, amount, currency, method, "paymentDate", reference FROM "Payment" WHERE "tenantId" = $1`,
            tenantId
          ) as any[];
          break;
        case "manifests":
          result = await db.$queryRawUnsafe(
            `SELECT id, date, "departurePlace", "arrivalPlace", "passengerCount" FROM "Manifest" WHERE "tenantId" = $1`,
            tenantId
          ) as any[];
          break;
        default:
          result = [];
      }
      
      exportData[table] = Array.isArray(result) ? result : [];
    } catch (error) {
      console.error(`Error exporting table ${table}:`, error);
      exportData[table] = [];
    }
  }
  
  const tenant = await getTenantInfo(tenantId);
  const tenantName = (tenant as any)?.name || "tenant";
  const date = new Date().toISOString().split("T")[0];
  
  if (format === "json") {
    return {
      data: JSON.stringify(exportData, null, 2),
      filename: `export_${tenantName}_${date}.json`,
      contentType: "application/json",
    };
  } else {
    // Format CSV - chaque table comme section
    let csvContent = "";
    
    for (const [table, records] of Object.entries(exportData)) {
      if (records.length === 0) continue;
      
      csvContent += `\n# ${table.toUpperCase()}\n`;
      
      // Headers
      const headers = Object.keys(records[0]);
      csvContent += headers.join(",") + "\n";
      
      // Rows
      for (const record of records) {
        csvContent += headers.map(h => {
          const val = record[h];
          if (val === null || val === undefined) return "";
          if (typeof val === "string" && val.includes(",")) return `"${val}"`;
          return String(val);
        }).join(",") + "\n";
      }
    }
    
    return {
      data: csvContent,
      filename: `export_${tenantName}_${date}.csv`,
      contentType: "text/csv",
    };
  }
}
