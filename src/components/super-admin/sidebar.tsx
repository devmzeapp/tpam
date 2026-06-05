"use client";

import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ViewType } from "@/lib/store";
import {
  LayoutDashboard,
  Building2,
  Database,
  Settings,
  LogOut,
  Shield,
  Users,
  TrendingUp,
} from "lucide-react";

const superAdminMenuItems: { id: ViewType; label: string; icon: React.ReactNode }[] = [
  { id: "dashboard", label: "Tableau de bord", icon: <LayoutDashboard className="h-5 w-5" /> },
  { id: "companies", label: "Entreprises", icon: <Building2 className="h-5 w-5" /> },
  { id: "users", label: "Utilisateurs", icon: <Users className="h-5 w-5" /> },
  { id: "reports", label: "Statistiques", icon: <TrendingUp className="h-5 w-5" /> },
  { id: "backup", label: "Sauvegarde", icon: <Database className="h-5 w-5" /> },
  { id: "settings", label: "Paramètres", icon: <Settings className="h-5 w-5" /> },
];

export function SuperAdminSidebar() {
  const { currentView, setCurrentView, user, logout, sidebarOpen } = useAppStore();

  if (!sidebarOpen) return null;

  return (
    <aside className="w-64 bg-gradient-to-b from-slate-900 to-slate-800 text-white border-r flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500 flex items-center justify-center">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-amber-400">TPAM Admin</h1>
            <p className="text-xs text-slate-400">Super Administrateur</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1">
        <nav className="p-2 space-y-1">
          {superAdminMenuItems.map((item) => (
            <Button
              key={item.id}
              variant={currentView === item.id ? "secondary" : "ghost"}
              className={`w-full justify-start gap-3 ${
                currentView === item.id 
                  ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30" 
                  : "text-slate-300 hover:bg-slate-700 hover:text-white"
              }`}
              onClick={() => setCurrentView(item.id)}
            >
              {item.icon}
              {item.label}
            </Button>
          ))}
        </nav>
      </ScrollArea>

      {/* User Info */}
      <div className="p-4 border-t border-slate-700">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-9 w-9 bg-amber-500">
            <AvatarFallback className="bg-amber-500 text-white">
              {user?.name?.[0] || "S"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <p className="text-xs text-slate-400 truncate">{user?.email}</p>
          </div>
        </div>
        <Button 
          variant="outline" 
          className="w-full justify-start gap-2 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white" 
          onClick={logout}
        >
          <LogOut className="h-4 w-4" />
          Déconnexion
        </Button>
      </div>
    </aside>
  );
}
