import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserContext, exportTenantData } from "@/lib/tenant-context";

/**
 * Export tenant data in CSV or JSON format
 * 
 * Query parameters:
 * - format: 'csv' or 'json' (default: 'json')
 * - tables: comma-separated list of tables to export (optional)
 * 
 * Example: /api/export?format=csv&tables=users,clients,services
 */
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

    // Vérifier que l'utilisateur a un tenant
    if (!context.tenantId && !context.canAccessAllTenants) {
      return NextResponse.json(
        { error: "Aucun espace associé à cet utilisateur" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const format = (searchParams.get("format") || "json") as "csv" | "json";
    const tablesParam = searchParams.get("tables");
    const tables = tablesParam ? tablesParam.split(",") : undefined;

    // Pour les super admins, on peut spécifier un tenantId
    let exportTenantId = context.tenantId;
    
    if (context.canAccessAllTenants) {
      const tenantIdParam = searchParams.get("tenantId");
      if (tenantIdParam) {
        exportTenantId = tenantIdParam;
      } else {
        return NextResponse.json(
          { error: "tenantId requis pour l'export en tant que super admin" },
          { status: 400 }
        );
      }
    }

    if (!exportTenantId) {
      return NextResponse.json(
        { error: "Impossible de déterminer le tenant à exporter" },
        { status: 400 }
      );
    }

    // Exporter les données
    const result = await exportTenantData(exportTenantId, format, tables);

    // Retourner le fichier
    return new NextResponse(result.data, {
      status: 200,
      headers: {
        "Content-Type": result.contentType,
        "Content-Disposition": `attachment; filename="${result.filename}"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'export des données" },
      { status: 500 }
    );
  }
}

/**
 * Export all data for a tenant (admin function)
 * Creates a full backup including all related data
 */
export async function POST(request: NextRequest) {
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

    // Seuls les admins et super admins peuvent faire un export complet
    if (!context.canAccessAllTenants && context.user.role !== "ADMIN_CLIENT" && context.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Non autorisé à exporter les données" },
        { status: 403 }
      );
    }

    const data = await request.json();
    const format = (data.format || "json") as "csv" | "json";

    // Déterminer le tenant à exporter
    let exportTenantId = context.tenantId;
    
    if (context.canAccessAllTenants && data.tenantId) {
      exportTenantId = data.tenantId;
    }

    if (!exportTenantId) {
      return NextResponse.json(
        { error: "Impossible de déterminer le tenant à exporter" },
        { status: 400 }
      );
    }

    // Tables à exporter
    const tables = data.tables || [
      "users", "vehicles", "drivers", "clients", 
      "services", "invoices", "payments", "manifests"
    ];

    // Exporter les données
    const result = await exportTenantData(exportTenantId, format, tables);

    // Retourner le fichier
    return new NextResponse(result.data, {
      status: 200,
      headers: {
        "Content-Type": result.contentType,
        "Content-Disposition": `attachment; filename="${result.filename}"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'export des données" },
      { status: 500 }
    );
  }
}
