import { create } from "zustand";

export type UserRole = "SUPER_ADMIN" | "ADMIN_CLIENT" | "ADMIN" | "AGENT" | "COMPTABLE" | "LECTURE";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  // Tenant information
  tenantId?: string;
  tenantName?: string;
  // Helper flags
  isSuperAdmin?: boolean;
  isAdminClient?: boolean;
}

export type ViewType = 
  | "dashboard" 
  | "planning" 
  | "services" 
  | "vehicles" 
  | "drivers" 
  | "clients" 
  | "invoices" 
  | "payments" 
  | "debtors"
  | "manifests" 
  | "reports"
  | "users"
  | "companies"
  | "tenants"      // Nouveau: gestion des tenants (super admin)
  | "tenant-users" // Nouveau: gestion des utilisateurs du tenant (admin client)
  | "backup"
  | "settings";

interface AppState {
  // Auth
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  logout: () => void;

  // Navigation
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;

  // UI State
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  
  // Theme
  theme: "light" | "dark";
  setTheme: (theme: "light" | "dark") => void;
  toggleTheme: () => void;
  
  // Tenant context (pour le filtrage automatique)
  currentTenantId: string | null;
  setCurrentTenantId: (id: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Auth
  user: null,
  isAuthenticated: false,
  setUser: (user) => set({ 
    user, 
    isAuthenticated: !!user,
    currentTenantId: user?.tenantId || null,
  }),
  logout: () => set({ 
    user: null, 
    isAuthenticated: false, 
    currentView: "dashboard",
    currentTenantId: null,
  }),

  // Navigation
  currentView: "dashboard",
  setCurrentView: (view) => set({ currentView: view }),

  // UI State
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  
  // Theme
  theme: "light",
  setTheme: (theme) => set({ theme }),
  toggleTheme: () => set((state) => ({ theme: state.theme === "light" ? "dark" : "light" })),
  
  // Tenant context
  currentTenantId: null,
  setCurrentTenantId: (id) => set({ currentTenantId: id }),
}));
