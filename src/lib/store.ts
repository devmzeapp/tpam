import { create } from "zustand";

export type UserRole = "SUPER_ADMIN" | "ADMIN" | "AGENT" | "COMPTABLE";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  companyId?: string;
  companyName?: string;
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
}

export const useAppStore = create<AppState>((set) => ({
  // Auth
  user: null,
  isAuthenticated: false,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  logout: () => set({ user: null, isAuthenticated: false, currentView: "dashboard" }),

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
}));
