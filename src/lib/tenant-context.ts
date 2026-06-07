/**
 * Multi-Tenant Context
 * 
 * Ce module gère l'isolation des données par tenant (client_id).
 * Toutes les requêtes doivent être filtrées automatiquement par tenant.
 */

import { Request } from 'next/server';
import { db } from './db';
import { UserRole } from '@prisma/client';

// Interface pour le contexte utilisateur
export interface UserContext {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  tenantId: string | null;
  isSuperAdmin: boolean;
  isAdminClient: boolean;
}

// Cache pour les requêtes
const userCache = new Map<string, { user: UserContext; timestamp: number }>();
const CACHE_TTL = 60 * 1000; // 1 minute

/**
 * Récupère le contexte utilisateur à partir de l'email (depuis le header ou session)
 */
export async function getUserContext(request?: Request): Promise<UserContext | null> {
  try {
    // Essayer de récupérer l'email depuis le header d'autorisation
    let email: string | null = null;
    
    if (request) {
      // Récupérer depuis le header x-user-email (pour les tests et API)
      email = request.headers.get('x-user-email');
      
      // Sinon, essayer de récupérer depuis l'autorisation basic
      if (!email) {
        const authHeader = request.headers.get('authorization');
        if (authHeader?.startsWith('Basic ')) {
          const base64 = authHeader.slice(6);
          const decoded = Buffer.from(base64, 'base64').toString();
          email = decoded.split(':')[0];
        }
      }
    }
    
    if (!email) {
      return null;
    }
    
    // Vérifier le cache
    const cached = userCache.get(email);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      return cached.user;
    }
    
    // Récupérer l'utilisateur depuis la base
    const user = await db.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        tenantId: true,
      },
    });
    
    if (!user) {
      return null;
    }
    
    const userContext: UserContext = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as UserRole,
      tenantId: user.tenantId,
      isSuperAdmin: user.role === 'SUPER_ADMIN',
      isAdminClient: user.role === 'ADMIN_CLIENT' || user.role === 'ADMIN',
    };
    
    // Mettre en cache
    userCache.set(email, { user: userContext, timestamp: Date.now() });
    
    return userContext;
  } catch (error) {
    console.error('Error getting user context:', error);
    return null;
  }
}

/**
 * Vérifie si l'utilisateur a accès à une ressource spécifique
 */
export function canAccessTenant(user: UserContext, tenantId: string | null): boolean {
  // Super admin peut tout accéder
  if (user.isSuperAdmin) {
    return true;
  }
  
  // Les autres utilisateurs ne peuvent accéder qu'à leur propre tenant
  return user.tenantId === tenantId;
}

/**
 * Génère le filtre WHERE pour les requêtes Prisma
 * Utilise ceci dans toutes les requêtes pour filtrer par tenant
 */
export function getTenantFilter(user: UserContext): { tenantId: string } | {} {
  // Super admin n'a pas besoin de filtre
  if (user.isSuperAdmin) {
    return {};
  }
  
  // Les autres utilisateurs sont filtrés par leur tenant
  if (!user.tenantId) {
    throw new Error('User has no tenant assigned');
  }
  
  return { tenantId: user.tenantId };
}

/**
 * Génère le filtre WHERE avec inclusion des relations
 */
export function getTenantFilterWithRelations(
  user: UserContext,
  relations: Record<string, { tenantId: string } | {}> = {}
): Record<string, unknown> {
  const baseFilter = getTenantFilter(user);
  
  return {
    ...baseFilter,
    ...relations,
  };
}

/**
 * Vérifie qu'un utilisateur peut effectuer une action sur une ressource
 */
export async function validateTenantAccess(
  user: UserContext,
  resourceType: 'vehicle' | 'driver' | 'client' | 'service' | 'invoice' | 'payment' | 'manifest',
  resourceId: string
): Promise<boolean> {
  // Super admin peut tout accéder
  if (user.isSuperAdmin) {
    return true;
  }
  
  if (!user.tenantId) {
    return false;
  }
  
  // Vérifier que la ressource appartient au tenant de l'utilisateur
  const tableName = resourceType.charAt(0).toUpperCase() + resourceType.slice(1);
  
  try {
    const resource = await (db as any)[resourceType].findUnique({
      where: { id: resourceId },
      select: { tenantId: true },
    });
    
    return resource?.tenantId === user.tenantId;
  } catch (error) {
    console.error(`Error validating tenant access for ${resourceType}:`, error);
    return false;
  }
}

/**
 * Middleware pour vérifier l'accès tenant dans les routes API
 */
export function withTenantAccess<T>(
  handler: (request: Request, context: UserContext, tenantFilter: Record<string, unknown>) => Promise<T>
) {
  return async (request: Request): Promise<T | Response> => {
    const userContext = await getUserContext(request);
    
    if (!userContext) {
      return new Response(
        JSON.stringify({ error: 'Non autorisé' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Vérifier que l'utilisateur est approuvé
    if (!userContext.isSuperAdmin) {
      // Pour les non-super-admin, vérifier qu'ils ont un tenant
      if (!userContext.tenantId) {
        return new Response(
          JSON.stringify({ error: 'Utilisateur sans tenant assigné' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }
    
    const tenantFilter = getTenantFilter(userContext);
    
    return handler(request, userContext, tenantFilter);
  };
}

/**
 * Crée un nouveau tenant avec les paramètres par défaut
 */
export async function createTenant(data: {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  ice?: string;
}): Promise<{ id: string; slug: string }> {
  // Générer un slug unique
  const baseSlug = data.name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50);
  
  let slug = baseSlug;
  let counter = 1;
  
  // Vérifier l'unicité du slug
  while (true) {
    const existing = await db.tenantAccount.findUnique({
      where: { slug },
    });
    
    if (!existing) break;
    
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  
  const tenant = await db.tenantAccount.create({
    data: {
      name: data.name,
      slug,
      email: data.email,
      phone: data.phone,
      address: data.address,
      city: data.city,
      ice: data.ice,
      active: true,
      approved: false, // Nécessite approbation du super_admin
    },
  });
  
  return { id: tenant.id, slug: tenant.slug };
}

/**
 * Crée un utilisateur admin_client pour un tenant
 */
export async function createTenantAdmin(
  tenantId: string,
  data: {
    email: string;
    password: string;
    name: string;
  }
): Promise<{ id: string; email: string }> {
  const user = await db.user.create({
    data: {
      email: data.email,
      password: data.password, // Note: le mot de passe doit être hashé avant
      name: data.name,
      role: 'ADMIN_CLIENT',
      tenantId,
      active: true,
      approved: true, // Admin du tenant est auto-approuvé
    },
  });
  
  return { id: user.id, email: user.email };
}

/**
 * Nettoie le cache utilisateur (à appeler lors de la déconnexion ou changement de rôle)
 */
export function clearUserCache(email?: string): void {
  if (email) {
    userCache.delete(email);
  } else {
    userCache.clear();
  }
}
