import { create } from "zustand";

export type UserRole = "ADMIN" | "AGENT" | "COMPTABLE";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
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
}));
