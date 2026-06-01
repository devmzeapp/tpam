/**
 * TPAM Super Administrator Configuration
 * 
 * This file contains the hardcoded super admin credentials.
 * The super admin has access to all companies using the application.
 */

export const SUPER_ADMIN_CONFIG = {
  email: "marketing@mozartevents.ma",
  password: "Marketing@@2030+",
  name: "Super Admin TPAM",
  role: "SUPER_ADMIN" as const,
};

/**
 * Check if the provided credentials match the super admin
 */
export function isSuperAdmin(email: string, password: string): boolean {
  return (
    email === SUPER_ADMIN_CONFIG.email &&
    password === SUPER_ADMIN_CONFIG.password
  );
}

/**
 * Get super admin user object
 */
export function getSuperAdminUser() {
  return {
    id: "super-admin-001",
    email: SUPER_ADMIN_CONFIG.email,
    name: SUPER_ADMIN_CONFIG.name,
    role: SUPER_ADMIN_CONFIG.role,
    active: true,
  };
}
