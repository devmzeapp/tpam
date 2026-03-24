"use client";

import { useState, useEffect } from "react";
import { useAppStore, User, ViewType } from "@/lib/store";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isSameDay, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";

// Icons
import {
  Truck,
  Users,
  FileText,
  DollarSign,
  BarChart3,
  CalendarDays,
  Settings,
  LogOut,
  Menu,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Filter,
  Download,
  Printer,
  Eye,
  Edit,
  Trash2,
  MoreHorizontal,
  Car,
  UserCheck,
  Building2,
  Receipt,
  CreditCard,
  FileSpreadsheet,
  LayoutDashboard,
  Moon,
  Sun,
  Bell,
  Clock,
  MapPin,
  Phone,
  Mail,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Wallet,
  Package,
  Route,
  FileCheck,
  ArrowRight,
  ClipboardList,
  Banknote,
  Link2,
  Unlink,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ==================== TYPES ====================

interface Vehicle {
  id: string;
  brand: string;
  model: string;
  registration: string;
  capacity: number;
  type?: string;
  status: string;
  notes?: string;
}

interface Driver {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  licenseNumber?: string;
  available: boolean;
  notes?: string;
}

interface Client {
  id: string;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  ice?: string;
  cnss?: string;
  if?: string;
  rc?: string;
  notes?: string;
  _count?: { services: number; invoices: number };
}

interface Service {
  id: string;
  clientId: string;
  vehicleId: string;
  driverId: string;
  type: string;
  description?: string;
  date: string;
  endTime?: string;
  departurePlace: string;
  arrivalPlace: string;
  passengerCount: number;
  passengerNames?: string;
  price: number;
  currency: string;
  status: string;
  notes?: string;
  client: Client;
  vehicle: Vehicle;
  driver: Driver;
}

interface Invoice {
  id: string;
  number: string;
  clientId: string;
  type: string;
  status: string;
  issueDate: string;
  dueDate?: string;
  paidDate?: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  currency: string;
  notes?: string;
  client: Client;
  items: InvoiceItem[];
  payments?: Payment[];
}

interface InvoiceItem {
  id: string;
  serviceId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  service?: Service;
}

interface Payment {
  id: string;
  clientId: string;
  invoiceId?: string;
  amount: number;
  currency: string;
  method: string;
  reference?: string;
  paymentDate: string;
  notes?: string;
  client?: Client;
  invoice?: Invoice;
}

interface Manifest {
  id: string;
  serviceId: string;
  vehicleId: string;
  driverId: string;
  date: string;
  departurePlace: string;
  arrivalPlace: string;
  departureTime?: string;
  arrivalTime?: string;
  passengerCount: number;
  passengerList?: string;
  remarks?: string;
  service: Service & { client: Client };
  vehicle: Vehicle;
  driver: Driver;
}

interface DashboardStats {
  todayServices: number;
  vehiclesInMission: number;
  pendingInvoices: number;
  todayRevenue: number;
  unpaidAmount: number;
}

// ==================== API FUNCTIONS ====================

const api = {
  // Auth
  login: async (email: string, password: string): Promise<{ user: User }> => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Login failed");
    return data;
  },

  // Dashboard
  getDashboard: async () => {
    const res = await fetch("/api/dashboard");
    return res.json();
  },

  // Vehicles
  getVehicles: async (): Promise<Vehicle[]> => {
    const res = await fetch("/api/vehicles");
    return res.json();
  },
  createVehicle: async (data: Partial<Vehicle>): Promise<Vehicle> => {
    const res = await fetch("/api/vehicles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // Drivers
  getDrivers: async (): Promise<Driver[]> => {
    const res = await fetch("/api/drivers");
    return res.json();
  },
  createDriver: async (data: Partial<Driver>): Promise<Driver> => {
    const res = await fetch("/api/drivers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // Clients
  getClients: async (): Promise<Client[]> => {
    const res = await fetch("/api/clients");
    return res.json();
  },
  createClient: async (data: Partial<Client>): Promise<Client> => {
    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // Services
  getServices: async (params?: Record<string, string>): Promise<Service[]> => {
    const url = new URL("/api/services", window.location.origin);
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v && v !== "all") url.searchParams.set(k, v);
      });
    }
    const res = await fetch(url.toString());
    return res.json();
  },
  createService: async (data: Partial<Service>): Promise<Service> => {
    const res = await fetch("/api/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // Invoices
  getInvoices: async (params?: Record<string, string>): Promise<Invoice[]> => {
    const url = new URL("/api/invoices", window.location.origin);
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v && v !== "all") url.searchParams.set(k, v);
      });
    }
    const res = await fetch(url.toString());
    return res.json();
  },
  createInvoice: async (data: Partial<Invoice>): Promise<Invoice> => {
    const res = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  updateInvoiceStatus: async (id: string, status: string): Promise<Invoice> => {
    const res = await fetch(`/api/invoices/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    return res.json();
  },

  // Payments
  getPayments: async (params?: Record<string, string>): Promise<Payment[]> => {
    const url = new URL("/api/payments", window.location.origin);
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v && v !== "all") url.searchParams.set(k, v);
      });
    }
    const res = await fetch(url.toString());
    return res.json();
  },
  createPayment: async (data: Partial<Payment>): Promise<Payment> => {
    const res = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // Manifests
  getManifests: async (params?: Record<string, string>): Promise<Manifest[]> => {
    const url = new URL("/api/manifests", window.location.origin);
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v && v !== "all") url.searchParams.set(k, v);
      });
    }
    const res = await fetch(url.toString());
    return res.json();
  },
  createManifest: async (data: Partial<Manifest>): Promise<Manifest> => {
    const res = await fetch("/api/manifests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // Reports
  getReports: async (params?: Record<string, string>) => {
    const url = new URL("/api/reports", window.location.origin);
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v) url.searchParams.set(k, v);
      });
    }
    const res = await fetch(url.toString());
    return res.json();
  },

  // Users
  getUsers: async () => {
    const res = await fetch("/api/users");
    return res.json();
  },

  // Seed
  seed: async () => {
    const res = await fetch("/api/seed");
    return res.json();
  },
};

// ==================== LOGIN COMPONENT ====================

function LoginPage() {
  const [email, setEmail] = useState("admin@tpam.ma");
  const [password, setPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const setUser = useAppStore((s) => s.setUser);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error?.includes("non trouvé")) {
          const seedRes = await fetch("/api/seed");
          if (seedRes.ok) {
            const retryRes = await fetch("/api/auth/login", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email, password }),
            });
            const retryData = await retryRes.json();
            
            if (retryRes.ok && retryData.user) {
              setUser(retryData.user);
              toast({ title: "Connexion réussie", description: `Bienvenue, ${retryData.user.name}!` });
              return;
            }
          }
        }
        throw new Error(data.error || "Erreur de connexion");
      }

      if (data.user) {
        setUser(data.user);
        toast({ title: "Connexion réussie", description: `Bienvenue, ${data.user.name}!` });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Email ou mot de passe incorrect";
      setError(message);
      toast({ title: "Erreur de connexion", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="w-full max-w-md">
        <Card className="border-0 shadow-2xl">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-4">
              <div className="w-24 h-24 rounded-xl overflow-hidden bg-white shadow-lg">
                <img src="/tpam-logo.png" alt="TPAM Logo" className="w-full h-full object-contain" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">TPAM</CardTitle>
            <CardDescription>Transportation Planning & Accounting Management</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@tpam.ma"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Connexion..." : "Se connecter"}
              </Button>
            </form>
            <div className="mt-6 text-center text-sm text-muted-foreground">
              <p className="font-medium mb-2">Comptes de démonstration:</p>
              <div className="space-y-1 text-xs">
                <p><Badge variant="outline" className="mr-2">Admin</Badge> admin@tpam.ma / admin123</p>
                <p><Badge variant="outline" className="mr-2">Agent</Badge> agent@tpam.ma / agent123</p>
                <p><Badge variant="outline" className="mr-2">Comptable</Badge> compta@tpam.ma / compta123</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ==================== SIDEBAR COMPONENT ====================

function Sidebar() {
  const { currentView, setCurrentView, user, logout, sidebarOpen } = useAppStore();

  const menuItems: { id: ViewType; label: string; icon: React.ReactNode; roles?: string[] }[] = [
    { id: "dashboard", label: "Tableau de bord", icon: <LayoutDashboard className="h-5 w-5" /> },
    { id: "planning", label: "Planning", icon: <CalendarDays className="h-5 w-5" /> },
    { id: "services", label: "Prestations", icon: <Truck className="h-5 w-5" /> },
    { id: "vehicles", label: "Véhicules", icon: <Car className="h-5 w-5" /> },
    { id: "drivers", label: "Chauffeurs", icon: <UserCheck className="h-5 w-5" /> },
    { id: "clients", label: "Clients", icon: <Building2 className="h-5 w-5" /> },
    { id: "invoices", label: "Factures", icon: <Receipt className="h-5 w-5" /> },
    { id: "debtors", label: "Comptes Débiteurs", icon: <Wallet className="h-5 w-5" />, roles: ["ADMIN", "COMPTABLE"] },
    { id: "payments", label: "Paiements", icon: <CreditCard className="h-5 w-5" />, roles: ["ADMIN", "COMPTABLE"] },
    { id: "manifests", label: "Manifestes", icon: <ClipboardList className="h-5 w-5" /> },
    { id: "reports", label: "Rapports", icon: <BarChart3 className="h-5 w-5" /> },
    { id: "users", label: "Utilisateurs", icon: <Users className="h-5 w-5" />, roles: ["ADMIN"] },
  ];

  const filteredItems = menuItems.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role))
  );

  if (!sidebarOpen) return null;

  return (
    <aside className="w-64 bg-card border-r flex flex-col h-full">
      <div className="p-4 border-b">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg overflow-hidden bg-white shadow">
            <img src="/tpam-logo.png" alt="TPAM" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="font-bold text-lg">TPAM</h1>
            <p className="text-xs text-muted-foreground">Transport Management</p>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <nav className="p-2 space-y-1">
          {filteredItems.map((item) => (
            <Button
              key={item.id}
              variant={currentView === item.id ? "secondary" : "ghost"}
              className="w-full justify-start gap-3"
              onClick={() => setCurrentView(item.id)}
            >
              {item.icon}
              {item.label}
            </Button>
          ))}
        </nav>
      </ScrollArea>

      <div className="p-4 border-t">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback>{user?.name?.[0] || "U"}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
        <Button variant="outline" className="w-full justify-start gap-2" onClick={logout}>
          <LogOut className="h-4 w-4" />
          Déconnexion
        </Button>
      </div>
    </aside>
  );
}

// ==================== HEADER COMPONENT ====================

function Header() {
  const { toggleSidebar, currentView } = useAppStore();

  const viewTitles: Record<ViewType, string> = {
    dashboard: "Tableau de bord",
    planning: "Planning",
    services: "Prestations",
    vehicles: "Véhicules",
    drivers: "Chauffeurs",
    clients: "Clients",
    invoices: "Factures",
    payments: "Paiements",
    debtors: "Comptes Débiteurs",
    manifests: "Manifestes",
    reports: "Rapports",
    users: "Utilisateurs",
    settings: "Paramètres",
  };

  return (
    <header className="h-16 border-b bg-card px-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={toggleSidebar}>
          <Menu className="h-5 w-5" />
        </Button>
        <h2 className="text-xl font-semibold">{viewTitles[currentView]}</h2>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}

// ==================== DASHBOARD VIEW ====================

function DashboardView() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: api.getDashboard,
  });

  const setCurrentView = useAppStore((s) => s.setCurrentView);

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Chargement...</div>;
  }

  const stats = data?.stats as DashboardStats;
  const recentServices = data?.recentServices as Service[];
  const pendingInvoices = data?.pendingInvoicesList as Invoice[];

  return (
    <div className="p-6 space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setCurrentView("services")}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Prestations du jour</p>
                <p className="text-3xl font-bold">{stats?.todayServices || 0}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Truck className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setCurrentView("vehicles")}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Véhicules en mission</p>
                <p className="text-3xl font-bold">{stats?.vehiclesInMission || 0}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
                <Car className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setCurrentView("debtors")}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Factures en attente</p>
                <p className="text-3xl font-bold">{stats?.pendingInvoices || 0}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                <Receipt className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Chiffre du jour</p>
                <p className="text-3xl font-bold">{stats?.todayRevenue?.toLocaleString() || 0} MAD</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Access */}
      <Card>
        <CardHeader>
          <CardTitle>Accès rapide</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => setCurrentView("planning")}>
              <CalendarDays className="h-6 w-6" />
              Planning
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => setCurrentView("services")}>
              <Truck className="h-6 w-6" />
              Prestations
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => setCurrentView("debtors")}>
              <Wallet className="h-6 w-6" />
              Comptes Débiteurs
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => setCurrentView("reports")}>
              <BarChart3 className="h-6 w-6" />
              Rapports
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Services */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Prestations récentes</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setCurrentView("services")}>
              Voir tout
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentServices?.slice(0, 5).map((service) => (
                <div key={service.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">{service.client?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {service.departurePlace} → {service.arrivalPlace}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{service.price?.toLocaleString()} MAD</p>
                    <Badge variant={service.status === "FACTUREE" ? "default" : service.status === "PRO_FORMA" ? "secondary" : "outline"}>
                      {service.status === "FACTUREE" ? "Facturée" : service.status === "PRO_FORMA" ? "Pro forma" : "Non déclarée"}
                    </Badge>
                  </div>
                </div>
              ))}
              {(!recentServices || recentServices.length === 0) && (
                <p className="text-center text-muted-foreground py-4">Aucune prestation récente</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pending Invoices */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Factures en attente</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setCurrentView("debtors")}>
              Voir tout
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingInvoices?.slice(0, 5).map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">{invoice.number}</p>
                    <p className="text-sm text-muted-foreground">{invoice.client?.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-red-600">{invoice.total?.toLocaleString()} MAD</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(invoice.issueDate), "dd/MM/yyyy", { locale: fr })}
                    </p>
                  </div>
                </div>
              ))}
              {(!pendingInvoices || pendingInvoices.length === 0) && (
                <p className="text-center text-muted-foreground py-4">Aucune facture en attente</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Unpaid Amount Alert */}
      {stats?.unpaidAmount > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Montant impayé</AlertTitle>
          <AlertDescription>
            Vous avez <strong>{stats.unpaidAmount.toLocaleString()} MAD</strong> de factures impayées.{" "}
            <Button variant="link" className="p-0 h-auto" onClick={() => setCurrentView("debtors")}>
              Gérer les comptes débiteurs
            </Button>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

// ==================== PLANNING VIEW ====================

function PlanningView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"month" | "week">("month");
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  const { data: services, isLoading } = useQuery({
    queryKey: ["services", "planning"],
    queryFn: () => api.getServices(),
  });

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });

  const generateCalendarDays = () => {
    const days: Date[] = [];
    let day = view === "month" ? calendarStart : weekStart;
    const end = view === "month" ? calendarEnd : weekEnd;

    while (day <= end) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  };

  const getServicesForDay = (date: Date) => {
    return services?.filter((s) => isSameDay(parseISO(s.date), date)) || [];
  };

  const days = generateCalendarDays();
  const weekDays = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Chargement...</div>;
  }

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => setCurrentDate(view === "month" ? subMonths(currentDate, 1) : addDays(currentDate, -7))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-xl font-semibold min-w-[200px] text-center">
            {format(currentDate, view === "month" ? "MMMM yyyy" : "'Semaine' w 'de' yyyy", { locale: fr })}
          </h3>
          <Button variant="outline" size="icon" onClick={() => setCurrentDate(view === "month" ? addMonths(currentDate, 1) : addDays(currentDate, 7))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={view} onValueChange={(v) => setView(v as "month" | "week")}>
            <TabsList>
              <TabsTrigger value="month">Mois</TabsTrigger>
              <TabsTrigger value="week">Semaine</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button onClick={() => setCurrentDate(new Date())}>Aujourd&apos;hui</Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-0">
          {/* Week days header */}
          <div className="grid grid-cols-7 border-b">
            {weekDays.map((day) => (
              <div key={day} className="p-3 text-center font-medium text-sm border-r last:border-r-0 bg-muted/50">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7">
            {days.map((day, idx) => {
              const dayServices = getServicesForDay(day);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isToday = isSameDay(day, new Date());

              return (
                <div
                  key={idx}
                  className={cn(
                    "min-h-[120px] border-r border-b p-2 last:border-r-0",
                    !isCurrentMonth && "bg-muted/30",
                    isToday && "bg-primary/5"
                  )}
                >
                  <div className={cn("text-sm font-medium mb-1", isToday && "text-primary")}>
                    {format(day, "d")}
                  </div>
                  <div className="space-y-1">
                    {dayServices.slice(0, 3).map((service) => (
                      <div
                        key={service.id}
                        className="text-xs p-1 rounded bg-primary/10 cursor-pointer hover:bg-primary/20 truncate"
                        onClick={() => setSelectedService(service)}
                      >
                        {service.client?.name}
                      </div>
                    ))}
                    {dayServices.length > 3 && (
                      <div className="text-xs text-muted-foreground">
                        +{dayServices.length - 3} autres
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Service Detail Dialog */}
      <Dialog open={!!selectedService} onOpenChange={() => setSelectedService(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Détail de la prestation</DialogTitle>
          </DialogHeader>
          {selectedService && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Client</Label>
                  <p className="font-medium">{selectedService.client?.name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Type</Label>
                  <p className="font-medium">{selectedService.type}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Date</Label>
                  <p className="font-medium">{format(new Date(selectedService.date), "dd/MM/yyyy HH:mm", { locale: fr })}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Prix</Label>
                  <p className="font-medium">{selectedService.price?.toLocaleString()} MAD</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Départ</Label>
                  <p className="font-medium">{selectedService.departurePlace}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Arrivée</Label>
                  <p className="font-medium">{selectedService.arrivalPlace}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Véhicule</Label>
                  <p className="font-medium">{selectedService.vehicle?.brand} {selectedService.vehicle?.model}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Chauffeur</Label>
                  <p className="font-medium">{selectedService.driver?.firstName} {selectedService.driver?.lastName}</p>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Statut</Label>
                <Badge className="mt-1">{selectedService.status}</Badge>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== SERVICES VIEW WITH DOCUMENT GENERATION ====================

function ServicesView() {
  const [filters, setFilters] = useState({
    status: "",
    clientId: "",
    vehicleId: "",
    driverId: "",
  });
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [showDocDialog, setShowDocDialog] = useState(false);
  const [docType, setDocType] = useState<"manifest" | "proforma" | "invoice">("invoice");

  const queryClient = useQueryClient();

  const { data: services, isLoading } = useQuery({
    queryKey: ["services", filters],
    queryFn: () => api.getServices(filters),
  });

  const { data: clients } = useQuery({
    queryKey: ["clients"],
    queryFn: api.getClients,
  });

  const { data: vehicles } = useQuery({
    queryKey: ["vehicles"],
    queryFn: api.getVehicles,
  });

  const { data: drivers } = useQuery({
    queryKey: ["drivers"],
    queryFn: api.getDrivers,
  });

  const createMutation = useMutation({
    mutationFn: api.createService,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setShowAddDialog(false);
      toast({ title: "Prestation créée", description: "La prestation a été créée avec succès" });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible de créer la prestation", variant: "destructive" });
    },
  });

  const createInvoiceMutation = useMutation({
    mutationFn: api.createInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setShowDocDialog(false);
      setSelectedServices([]);
      toast({ title: "Document créé", description: "Le document a été généré avec succès" });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible de créer le document", variant: "destructive" });
    },
  });

  const createManifestMutation = useMutation({
    mutationFn: api.createManifest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manifests"] });
      queryClient.invalidateQueries({ queryKey: ["services"] });
      setShowDocDialog(false);
      setSelectedServices([]);
      toast({ title: "Manifeste créé", description: "Le manifeste a été généré avec succès" });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible de créer le manifeste", variant: "destructive" });
    },
  });

  const handleGenerateDocuments = () => {
    if (selectedServices.length === 0) {
      toast({ title: "Erreur", description: "Sélectionnez au moins une prestation", variant: "destructive" });
      return;
    }

    const selectedData = services?.filter((s) => selectedServices.includes(s.id)) || [];
    const clientIds = [...new Set(selectedData.map((s) => s.clientId))];
    
    if (clientIds.length > 1 && docType !== "manifest") {
      toast({ title: "Erreur", description: "Toutes les prestations doivent être du même client pour une facture", variant: "destructive" });
      return;
    }

    if (docType === "manifest") {
      // Create manifests for each service
      selectedData.forEach((service) => {
        createManifestMutation.mutate({
          serviceId: service.id,
          vehicleId: service.vehicleId,
          driverId: service.driverId,
          date: service.date,
          departurePlace: service.departurePlace,
          arrivalPlace: service.arrivalPlace,
          passengerCount: service.passengerCount,
          passengerList: service.passengerNames,
        });
      });
    } else {
      // Create invoice
      const items = selectedData.map((service) => ({
        serviceId: service.id,
        description: `${service.departurePlace} → ${service.arrivalPlace} (${format(new Date(service.date), "dd/MM/yyyy")})`,
        quantity: 1,
        unitPrice: service.price,
      }));

      createInvoiceMutation.mutate({
        clientId: clientIds[0],
        type: docType === "proforma" ? "PRO_FORMA" : "FINALE",
        items,
        taxRate: 0,
      });
    }
  };

  const toggleServiceSelection = (serviceId: string) => {
    setSelectedServices((prev) =>
      prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "FACTUREE":
        return <Badge className="bg-green-500">Facturée</Badge>;
      case "PRO_FORMA":
        return <Badge variant="secondary">Pro Forma</Badge>;
      default:
        return <Badge variant="outline">Non déclarée</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={filters.status} onValueChange={(v) => setFilters((f) => ({ ...f, status: v }))}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="NON_DECLAREE">Non déclarée</SelectItem>
              <SelectItem value="PRO_FORMA">Pro Forma</SelectItem>
              <SelectItem value="FACTUREE">Facturée</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.clientId} onValueChange={(v) => setFilters((f) => ({ ...f, clientId: v }))}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Client" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les clients</SelectItem>
              {clients?.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          {selectedServices.length > 0 && (
            <Dialog open={showDocDialog} onOpenChange={setShowDocDialog}>
              <DialogTrigger asChild>
                <Button variant="default">
                  <FileCheck className="h-4 w-4 mr-2" />
                  Générer document ({selectedServices.length})
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Générer un document</DialogTitle>
                  <DialogDescription>
                    Choisissez le type de document à générer pour {selectedServices.length} prestation(s)
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <Card 
                      className={cn("cursor-pointer transition-all", docType === "manifest" && "ring-2 ring-primary")}
                      onClick={() => setDocType("manifest")}
                    >
                      <CardContent className="flex flex-col items-center gap-2 py-4">
                        <ClipboardList className="h-8 w-8 text-primary" />
                        <span className="font-medium">Manifeste</span>
                      </CardContent>
                    </Card>
                    <Card 
                      className={cn("cursor-pointer transition-all", docType === "proforma" && "ring-2 ring-primary")}
                      onClick={() => setDocType("proforma")}
                    >
                      <CardContent className="flex flex-col items-center gap-2 py-4">
                        <FileText className="h-8 w-8 text-orange-500" />
                        <span className="font-medium">Pro Forma</span>
                      </CardContent>
                    </Card>
                    <Card 
                      className={cn("cursor-pointer transition-all", docType === "invoice" && "ring-2 ring-primary")}
                      onClick={() => setDocType("invoice")}
                    >
                      <CardContent className="flex flex-col items-center gap-2 py-4">
                        <Receipt className="h-8 w-8 text-green-500" />
                        <span className="font-medium">Facture</span>
                      </CardContent>
                    </Card>
                  </div>
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {docType === "manifest" && "Un manifeste sera créé pour chaque prestation sélectionnée."}
                      {docType === "proforma" && "Une facture Pro Forma sera créée (sans infos fiscales)."}
                      {docType === "invoice" && "Une facture finale sera créée (avec infos fiscales)."}
                    </AlertDescription>
                  </Alert>
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-sm font-medium mb-2">Prestations sélectionnées:</p>
                    <div className="space-y-1 max-h-32 overflow-auto">
                      {services?.filter((s) => selectedServices.includes(s.id)).map((s) => (
                        <div key={s.id} className="text-sm flex justify-between">
                          <span>{s.client?.name} - {s.departurePlace} → {s.arrivalPlace}</span>
                          <span className="font-medium">{s.price.toLocaleString()} MAD</span>
                        </div>
                      ))}
                    </div>
                    <div className="border-t mt-2 pt-2 flex justify-between font-semibold">
                      <span>Total</span>
                      <span>{services?.filter((s) => selectedServices.includes(s.id)).reduce((sum, s) => sum + s.price, 0).toLocaleString()} MAD</span>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowDocDialog(false)}>Annuler</Button>
                  <Button onClick={handleGenerateDocuments} disabled={createInvoiceMutation.isPending || createManifestMutation.isPending}>
                    {createInvoiceMutation.isPending || createManifestMutation.isPending ? "Génération..." : "Générer"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle prestation
              </Button>
            </DialogTrigger>
            <ServiceFormDialog
              clients={clients || []}
              vehicles={vehicles || []}
              drivers={drivers || []}
              onSubmit={(data) => createMutation.mutate(data)}
              isLoading={createMutation.isPending}
            />
          </Dialog>
        </div>
      </div>

      {/* Services Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={selectedServices.length === services?.length && services?.length > 0}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedServices(services?.map((s) => s.id) || []);
                      } else {
                        setSelectedServices([]);
                      }
                    }}
                  />
                </TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Trajet</TableHead>
                <TableHead>Véhicule</TableHead>
                <TableHead>Chauffeur</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    Chargement...
                  </TableCell>
                </TableRow>
              ) : services?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    Aucune prestation trouvée
                  </TableCell>
                </TableRow>
              ) : (
                services?.map((service) => (
                  <TableRow key={service.id} className={selectedServices.includes(service.id) ? "bg-primary/5" : ""}>
                    <TableCell>
                      <Checkbox
                        checked={selectedServices.includes(service.id)}
                        onCheckedChange={() => toggleServiceSelection(service.id)}
                      />
                    </TableCell>
                    <TableCell>
                      {format(new Date(service.date), "dd/MM/yyyy", { locale: fr })}
                    </TableCell>
                    <TableCell className="font-medium">{service.client?.name}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <span>{service.departurePlace}</span>
                        <ArrowRight className="h-3 w-3 mx-1 inline" />
                        <span>{service.arrivalPlace}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {service.vehicle?.brand} {service.vehicle?.model}
                    </TableCell>
                    <TableCell>
                      {service.driver?.firstName} {service.driver?.lastName}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {service.price?.toLocaleString()} MAD
                    </TableCell>
                    <TableCell>{getStatusBadge(service.status)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuLabel>Générer document</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => {
                            setSelectedServices([service.id]);
                            setDocType("manifest");
                            setShowDocDialog(true);
                          }}>
                            <ClipboardList className="h-4 w-4 mr-2" />
                            Manifeste
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setSelectedServices([service.id]);
                            setDocType("proforma");
                            setShowDocDialog(true);
                          }}>
                            <FileText className="h-4 w-4 mr-2" />
                            Pro Forma
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setSelectedServices([service.id]);
                            setDocType("invoice");
                            setShowDocDialog(true);
                          }}>
                            <Receipt className="h-4 w-4 mr-2" />
                            Facture
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>
                            <Eye className="h-4 w-4 mr-2" />
                            Détails
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="h-4 w-4 mr-2" />
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== SERVICE FORM DIALOG ====================

function ServiceFormDialog({
  clients,
  vehicles,
  drivers,
  onSubmit,
  isLoading,
}: {
  clients: Client[];
  vehicles: Vehicle[];
  drivers: Driver[];
  onSubmit: (data: Record<string, unknown>) => void;
  isLoading: boolean;
}) {
  const [form, setForm] = useState({
    clientId: "",
    vehicleId: "",
    driverId: "",
    type: "TRANSFERT",
    date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    departurePlace: "",
    arrivalPlace: "",
    passengerCount: 1,
    price: 0,
    notes: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...form,
      price: Number(form.price),
      passengerCount: Number(form.passengerCount),
      date: new Date(form.date).toISOString(),
    });
  };

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>Nouvelle prestation</DialogTitle>
        <DialogDescription>
          Créez une nouvelle prestation de transport
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Client *</Label>
            <Select value={form.clientId} onValueChange={(v) => setForm((f) => ({ ...f, clientId: v }))} required>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TRANSFERT">Transfert</SelectItem>
                <SelectItem value="EXCURSION">Excursion</SelectItem>
                <SelectItem value="LOCATION">Location</SelectItem>
                <SelectItem value="TRANSPORT">Transport</SelectItem>
                <SelectItem value="AUTRE">Autre</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Véhicule *</Label>
            <Select value={form.vehicleId} onValueChange={(v) => setForm((f) => ({ ...f, vehicleId: v }))} required>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un véhicule" />
              </SelectTrigger>
              <SelectContent>
                {vehicles.map((v) => (
                  <SelectItem key={v.id} value={v.id}>{v.brand} {v.model} ({v.registration})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Chauffeur *</Label>
            <Select value={form.driverId} onValueChange={(v) => setForm((f) => ({ ...f, driverId: v }))} required>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un chauffeur" />
              </SelectTrigger>
              <SelectContent>
                {drivers.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.firstName} {d.lastName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Date et heure *</Label>
            <Input
              type="datetime-local"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Nombre de passagers</Label>
            <Input
              type="number"
              value={form.passengerCount}
              onChange={(e) => setForm((f) => ({ ...f, passengerCount: Number(e.target.value) }))}
              min={1}
            />
          </div>
          <div className="space-y-2">
            <Label>Lieu de départ *</Label>
            <Input
              value={form.departurePlace}
              onChange={(e) => setForm((f) => ({ ...f, departurePlace: e.target.value }))}
              placeholder="Ex: Aéroport Casablanca"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Lieu d&apos;arrivée *</Label>
            <Input
              value={form.arrivalPlace}
              onChange={(e) => setForm((f) => ({ ...f, arrivalPlace: e.target.value }))}
              placeholder="Ex: Hôtel Atlas Marrakech"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Prix (MAD) *</Label>
            <Input
              type="number"
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))}
              min={0}
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Notes</Label>
          <Textarea
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder="Informations complémentaires..."
          />
        </div>
        <DialogFooter>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Création..." : "Créer la prestation"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

// ==================== DEBTORS VIEW (COMPTES DÉBITEURS) ====================

function DebtorsView() {
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>("ESPECES");
  const [paymentReference, setPaymentReference] = useState("");

  const queryClient = useQueryClient();

  const { data: clients } = useQuery({
    queryKey: ["clients"],
    queryFn: api.getClients,
  });

  const { data: invoices, isLoading } = useQuery({
    queryKey: ["invoices", { status: "SENT" }],
    queryFn: () => api.getInvoices({ status: "SENT" }),
  });

  const { data: allInvoices } = useQuery({
    queryKey: ["invoices", "all"],
    queryFn: () => api.getInvoices(),
  });

  const { data: payments } = useQuery({
    queryKey: ["payments"],
    queryFn: api.getPayments,
  });

  const createPaymentMutation = useMutation({
    mutationFn: api.createPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setShowPaymentDialog(false);
      setSelectedInvoice(null);
      setPaymentAmount(0);
      setPaymentReference("");
      toast({ title: "Paiement enregistré", description: "Le paiement a été enregistré et lettré avec la facture" });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible d'enregistrer le paiement", variant: "destructive" });
    },
  });

  // Calculate client debts
  const clientDebts = clients?.map((client) => {
    const clientInvoices = invoices?.filter((inv) => inv.clientId === client.id) || [];
    const clientPayments = payments?.filter((p) => p.clientId === client.id) || [];
    
    const totalInvoiced = clientInvoices.reduce((sum, inv) => sum + inv.total, 0);
    const totalPaid = clientPayments.reduce((sum, p) => sum + p.amount, 0);
    const balance = totalInvoiced - totalPaid;
    
    return {
      ...client,
      invoices: clientInvoices,
      payments: clientPayments,
      totalInvoiced,
      totalPaid,
      balance,
    };
  }).filter((c) => c.balance > 0 || c.invoices.length > 0) || [];

  const filteredDebts = selectedClient
    ? clientDebts.filter((c) => c.id === selectedClient)
    : clientDebts;

  const totalDebt = clientDebts.reduce((sum, c) => sum + c.balance, 0);

  const handlePayment = () => {
    if (!selectedInvoice || paymentAmount <= 0) {
      toast({ title: "Erreur", description: "Montant invalide", variant: "destructive" });
      return;
    }

    createPaymentMutation.mutate({
      clientId: selectedInvoice.clientId,
      invoiceId: selectedInvoice.id,
      amount: paymentAmount,
      method: paymentMethod,
      reference: paymentReference,
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-red-50 border-red-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600">Total impayé</p>
                <p className="text-3xl font-bold text-red-700">{totalDebt.toLocaleString()} MAD</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-red-200 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600">Factures en attente</p>
                <p className="text-3xl font-bold text-orange-700">{invoices?.length || 0}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-orange-200 flex items-center justify-center">
                <Receipt className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600">Clients débiteurs</p>
                <p className="text-3xl font-bold text-green-700">{clientDebts.length}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-200 flex items-center justify-center">
                <Users className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-4">
        <Select value={selectedClient} onValueChange={setSelectedClient}>
          <SelectTrigger className="w-[300px]">
            <SelectValue placeholder="Filtrer par client" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les clients</SelectItem>
            {clients?.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Client Debts List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-8">Chargement...</div>
        ) : filteredDebts.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <p>Aucun compte débiteur en cours</p>
            </CardContent>
          </Card>
        ) : (
          filteredDebts.map((client) => (
            <Card key={client.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback>{client.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle>{client.name}</CardTitle>
                      <CardDescription>{client.city || "Ville non spécifiée"}</CardDescription>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Solde débiteur</p>
                    <p className={cn("text-2xl font-bold", client.balance > 0 ? "text-red-600" : "text-green-600")}>
                      {client.balance.toLocaleString()} MAD
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 mb-4 text-center">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Total facturé</p>
                    <p className="font-semibold">{client.totalInvoiced.toLocaleString()} MAD</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Total payé</p>
                    <p className="font-semibold text-green-600">{client.totalPaid.toLocaleString()} MAD</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Factures en attente</p>
                    <p className="font-semibold">{client.invoices.length}</p>
                  </div>
                </div>

                {/* Invoices Table */}
                {client.invoices.length > 0 && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>N° Facture</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Montant TTC</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="w-[120px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {client.invoices.map((invoice) => {
                        const invoicePayments = payments?.filter((p) => p.invoiceId === invoice.id) || [];
                        const paid = invoicePayments.reduce((sum, p) => sum + p.amount, 0);
                        const remaining = invoice.total - paid;

                        return (
                          <TableRow key={invoice.id}>
                            <TableCell className="font-mono">{invoice.number}</TableCell>
                            <TableCell>{format(new Date(invoice.issueDate), "dd/MM/yyyy")}</TableCell>
                            <TableCell>
                              <div>
                                <p className="font-semibold">{invoice.total.toLocaleString()} MAD</p>
                                {paid > 0 && (
                                  <p className="text-xs text-green-600">Payé: {paid.toLocaleString()} MAD</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {remaining <= 0 ? (
                                <Badge className="bg-green-500">Payée</Badge>
                              ) : paid > 0 ? (
                                <Badge variant="secondary">Partiel ({remaining.toLocaleString()} MAD)</Badge>
                              ) : (
                                <Badge variant="destructive">Impayée</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedInvoice(invoice);
                                  setPaymentAmount(remaining);
                                  setShowPaymentDialog(true);
                                }}
                                disabled={remaining <= 0}
                              >
                                <Banknote className="h-4 w-4 mr-1" />
                                Paiement
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enregistrer un paiement</DialogTitle>
            <DialogDescription>
              Lettrer le paiement avec la facture {selectedInvoice?.number}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <div className="flex justify-between mb-2">
                <span className="text-muted-foreground">Client</span>
                <span className="font-medium">{selectedInvoice?.client?.name}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-muted-foreground">Montant facture</span>
                <span className="font-medium">{selectedInvoice?.total.toLocaleString()} MAD</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Reste à payer</span>
                <span className="text-red-600">{selectedInvoice && (selectedInvoice.total - (payments?.filter((p) => p.invoiceId === selectedInvoice.id).reduce((sum, p) => sum + p.amount, 0) || 0)).toLocaleString()} MAD</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Montant du paiement (MAD) *</Label>
                <Input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  min={0}
                />
              </div>
              <div className="space-y-2">
                <Label>Mode de paiement</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ESPECES">Espèces</SelectItem>
                    <SelectItem value="VIREMENT">Virement</SelectItem>
                    <SelectItem value="CHEQUE">Chèque</SelectItem>
                    <SelectItem value="CARTE">Carte bancaire</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Référence</Label>
              <Input
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder="N° de chèque, réf. virement..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handlePayment} disabled={createPaymentMutation.isPending}>
              {createPaymentMutation.isPending ? "Enregistrement..." : "Enregistrer le paiement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== VEHICLES VIEW ====================

function VehiclesView() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const queryClient = useQueryClient();

  const { data: vehicles, isLoading } = useQuery({
    queryKey: ["vehicles"],
    queryFn: api.getVehicles,
  });

  const createMutation = useMutation({
    mutationFn: api.createVehicle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      setShowAddDialog(false);
      toast({ title: "Véhicule créé", description: "Le véhicule a été ajouté avec succès" });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible de créer le véhicule", variant: "destructive" });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "available":
        return <Badge className="bg-green-500">Disponible</Badge>;
      case "in_mission":
        return <Badge className="bg-orange-500">En mission</Badge>;
      case "maintenance":
        return <Badge variant="destructive">Maintenance</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Gestion des véhicules</h3>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau véhicule
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouveau véhicule</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target as HTMLFormElement);
                createMutation.mutate({
                  brand: formData.get("brand"),
                  model: formData.get("model"),
                  registration: formData.get("registration"),
                  capacity: Number(formData.get("capacity")),
                  type: formData.get("type"),
                  status: "available",
                });
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Marque *</Label>
                  <Input name="brand" placeholder="Ex: Mercedes" required />
                </div>
                <div className="space-y-2">
                  <Label>Modèle *</Label>
                  <Input name="model" placeholder="Ex: Sprinter" required />
                </div>
                <div className="space-y-2">
                  <Label>Immatriculation *</Label>
                  <Input name="registration" placeholder="Ex: A-1234-MA" required />
                </div>
                <div className="space-y-2">
                  <Label>Capacité</Label>
                  <Input name="capacity" type="number" placeholder="Ex: 16" min={1} />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Type</Label>
                  <Select name="type" defaultValue="Van">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Van">Van</SelectItem>
                      <SelectItem value="Bus">Bus</SelectItem>
                      <SelectItem value="Berline">Berline</SelectItem>
                      <SelectItem value="SUV">SUV</SelectItem>
                      <SelectItem value="Minibus">Minibus</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Création..." : "Créer"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full text-center py-8">Chargement...</div>
        ) : vehicles?.length === 0 ? (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            Aucun véhicule enregistré
          </div>
        ) : (
          vehicles?.map((vehicle) => (
            <Card key={vehicle.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {vehicle.brand} {vehicle.model}
                  </CardTitle>
                  {getStatusBadge(vehicle.status)}
                </div>
                <CardDescription>{vehicle.registration}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {vehicle.capacity} places
                  </div>
                  {vehicle.type && (
                    <Badge variant="outline">{vehicle.type}</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

// ==================== DRIVERS VIEW ====================

function DriversView() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const queryClient = useQueryClient();

  const { data: drivers, isLoading } = useQuery({
    queryKey: ["drivers"],
    queryFn: api.getDrivers,
  });

  const createMutation = useMutation({
    mutationFn: api.createDriver,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      setShowAddDialog(false);
      toast({ title: "Chauffeur créé", description: "Le chauffeur a été ajouté avec succès" });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible de créer le chauffeur", variant: "destructive" });
    },
  });

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Gestion des chauffeurs</h3>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau chauffeur
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouveau chauffeur</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target as HTMLFormElement);
                createMutation.mutate({
                  firstName: formData.get("firstName"),
                  lastName: formData.get("lastName"),
                  phone: formData.get("phone"),
                  email: formData.get("email"),
                  licenseNumber: formData.get("licenseNumber"),
                  available: true,
                });
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Prénom *</Label>
                  <Input name="firstName" required />
                </div>
                <div className="space-y-2">
                  <Label>Nom *</Label>
                  <Input name="lastName" required />
                </div>
                <div className="space-y-2">
                  <Label>Téléphone *</Label>
                  <Input name="phone" type="tel" required />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input name="email" type="email" />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Numéro de permis</Label>
                  <Input name="licenseNumber" />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Création..." : "Créer"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full text-center py-8">Chargement...</div>
        ) : drivers?.length === 0 ? (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            Aucun chauffeur enregistré
          </div>
        ) : (
          drivers?.map((driver) => (
            <Card key={driver.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback>
                      {driver.firstName[0]}{driver.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <CardTitle className="text-lg">
                      {driver.firstName} {driver.lastName}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {driver.phone}
                    </CardDescription>
                  </div>
                  <Badge variant={driver.available ? "default" : "secondary"}>
                    {driver.available ? "Disponible" : "Indisponible"}
                  </Badge>
                </div>
              </CardHeader>
              {driver.licenseNumber && (
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Permis: {driver.licenseNumber}
                  </p>
                </CardContent>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

// ==================== CLIENTS VIEW ====================

function ClientsView() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const queryClient = useQueryClient();

  const { data: clients, isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: api.getClients,
  });

  const createMutation = useMutation({
    mutationFn: api.createClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setShowAddDialog(false);
      toast({ title: "Client créé", description: "Le client a été ajouté avec succès" });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible de créer le client", variant: "destructive" });
    },
  });

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Gestion des clients</h3>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau client
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Nouveau client</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target as HTMLFormElement);
                createMutation.mutate({
                  name: formData.get("name"),
                  contactName: formData.get("contactName"),
                  email: formData.get("email"),
                  phone: formData.get("phone"),
                  address: formData.get("address"),
                  city: formData.get("city"),
                  ice: formData.get("ice"),
                  if: formData.get("if"),
                  rc: formData.get("rc"),
                  cnss: formData.get("cnss"),
                });
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nom / Raison sociale *</Label>
                  <Input name="name" required />
                </div>
                <div className="space-y-2">
                  <Label>Contact principal</Label>
                  <Input name="contactName" />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input name="email" type="email" />
                </div>
                <div className="space-y-2">
                  <Label>Téléphone</Label>
                  <Input name="phone" type="tel" />
                </div>
                <div className="space-y-2">
                  <Label>Adresse</Label>
                  <Input name="address" />
                </div>
                <div className="space-y-2">
                  <Label>Ville</Label>
                  <Input name="city" />
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label className="text-base">Informations fiscales (Maroc)</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>ICE</Label>
                    <Input name="ice" placeholder="Identifiant Commun de l'Entreprise" />
                  </div>
                  <div className="space-y-2">
                    <Label>IF</Label>
                    <Input name="if" placeholder="Identifiant Fiscal" />
                  </div>
                  <div className="space-y-2">
                    <Label>RC</Label>
                    <Input name="rc" placeholder="Registre de Commerce" />
                  </div>
                  <div className="space-y-2">
                    <Label>CNSS</Label>
                    <Input name="cnss" />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Création..." : "Créer"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Ville</TableHead>
                <TableHead>ICE</TableHead>
                <TableHead>Prestations</TableHead>
                <TableHead>Factures</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Chargement...
                  </TableCell>
                </TableRow>
              ) : clients?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Aucun client enregistré
                  </TableCell>
                </TableRow>
              ) : (
                clients?.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">{client.name}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {client.contactName && <p>{client.contactName}</p>}
                        {client.phone && <p className="text-muted-foreground">{client.phone}</p>}
                      </div>
                    </TableCell>
                    <TableCell>{client.city || "-"}</TableCell>
                    <TableCell className="font-mono text-sm">{client.ice || "-"}</TableCell>
                    <TableCell>{client._count?.services || 0}</TableCell>
                    <TableCell>{client._count?.invoices || 0}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== INVOICES VIEW ====================

interface InvoiceItem {
  id: string;
  serviceId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  service?: Service;
}

interface InvoiceWithItems {
  id: string;
  number: string;
  clientId: string;
  createdById: string;
  type: string;
  status: string;
  issueDate: string;
  dueDate?: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  currency: string;
  notes?: string;
  client?: Client;
  items?: InvoiceItem[];
}

function InvoicesView() {
  const [filters, setFilters] = useState({ type: "", status: "" });
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceWithItems | null>(null);
  const [showPrintDialog, setShowPrintDialog] = useState(false);

  const { data: invoices, isLoading } = useQuery({
    queryKey: ["invoices", filters],
    queryFn: () => api.getInvoices(filters),
  });

  const handlePrintInvoice = (invoice: InvoiceWithItems) => {
    setSelectedInvoice(invoice);
    setShowPrintDialog(true);
  };

  const printInvoice = () => {
    if (!selectedInvoice) return;
    
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${selectedInvoice.type === 'PRO_FORMA' ? 'Facture Pro Forma' : 'Facture'} ${selectedInvoice.number}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
          .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #333; padding-bottom: 20px; }
          .logo { font-size: 36px; font-weight: bold; color: #2563eb; }
          .title { font-size: 24px; margin-top: 10px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
          .info-box { }
          .info-box h3 { margin: 0 0 10px 0; color: #666; font-size: 14px; }
          .info-box p { margin: 5px 0; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          th { background: #f5f5f5; }
          .totals { text-align: right; margin-top: 20px; }
          .totals p { margin: 5px 0; }
          .total-final { font-size: 20px; font-weight: bold; border-top: 2px solid #333; padding-top: 10px; }
          .footer { margin-top: 50px; text-align: center; color: #666; font-size: 12px; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">TPAM</div>
          <div class="title">${selectedInvoice.type === 'PRO_FORMA' ? 'FACTURE PRO FORMA' : 'FACTURE'}</div>
          <div>N° ${selectedInvoice.number}</div>
          <div>Date: ${format(new Date(selectedInvoice.issueDate), 'dd/MM/yyyy')}</div>
        </div>
        
        <div class="info-grid">
          <div class="info-box">
            <h3>ÉMETTEUR</h3>
            <p><strong>TPAM - Transport Planning & Accounting</strong></p>
            <p>Adresse: Casablanca, Maroc</p>
            <p>Tél: +212 5 22 00 00 00</p>
            <p>Email: contact@tpam.ma</p>
          </div>
          <div class="info-box">
            <h3>CLIENT</h3>
            <p><strong>${selectedInvoice.client?.name || 'N/A'}</strong></p>
            <p>${selectedInvoice.client?.address || ''}</p>
            <p>${selectedInvoice.client?.city || ''}</p>
            <p>${selectedInvoice.client?.phone || ''}</p>
            ${selectedInvoice.client?.ice ? `<p>ICE: ${selectedInvoice.client.ice}</p>` : ''}
          </div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th style="text-align: center;">Qté</th>
              <th style="text-align: right;">Prix unitaire</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${selectedInvoice.items?.map(item => `
              <tr>
                <td>${item.description}</td>
                <td style="text-align: center;">${item.quantity}</td>
                <td style="text-align: right;">${item.unitPrice.toLocaleString()} MAD</td>
                <td style="text-align: right;">${item.total.toLocaleString()} MAD</td>
              </tr>
            `).join('') || ''}
          </tbody>
        </table>
        
        <div class="totals">
          <p>Sous-total: ${selectedInvoice.subtotal?.toLocaleString() || 0} MAD</p>
          ${selectedInvoice.taxRate > 0 ? `<p>TVA (${selectedInvoice.taxRate}%): ${selectedInvoice.taxAmount?.toLocaleString() || 0} MAD</p>` : ''}
          <p class="total-final">Total TTC: ${selectedInvoice.total?.toLocaleString() || 0} MAD</p>
        </div>
        
        ${selectedInvoice.notes ? `<p style="margin-top: 30px;"><strong>Notes:</strong> ${selectedInvoice.notes}</p>` : ''}
        
        <div class="footer">
          <p>Merci pour votre confiance !</p>
          <p>TPAM - Transportation Planning & Accounting Management</p>
        </div>
      </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PAID":
        return <Badge className="bg-green-500">Payée</Badge>;
      case "SENT":
        return <Badge className="bg-orange-500">Envoyée</Badge>;
      case "CANCELLED":
        return <Badge variant="destructive">Annulée</Badge>;
      default:
        return <Badge variant="secondary">Brouillon</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    return type === "PRO_FORMA" ? (
      <Badge variant="outline">Pro Forma</Badge>
    ) : (
      <Badge className="bg-primary">Finale</Badge>
    );
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Select value={filters.type} onValueChange={(v) => setFilters((f) => ({ ...f, type: v }))}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              <SelectItem value="PRO_FORMA">Pro Forma</SelectItem>
              <SelectItem value="FINALE">Finale</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.status} onValueChange={(v) => setFilters((f) => ({ ...f, status: v }))}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="DRAFT">Brouillon</SelectItem>
              <SelectItem value="SENT">Envoyée</SelectItem>
              <SelectItem value="PAID">Payée</SelectItem>
              <SelectItem value="CANCELLED">Annulée</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N° Facture</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Montant TTC</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Chargement...
                  </TableCell>
                </TableRow>
              ) : invoices?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Aucune facture trouvée
                  </TableCell>
                </TableRow>
              ) : (
                invoices?.map((invoice: InvoiceWithItems) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-mono font-medium">{invoice.number}</TableCell>
                    <TableCell>{invoice.client?.name}</TableCell>
                    <TableCell>{getTypeBadge(invoice.type)}</TableCell>
                    <TableCell>
                      {format(new Date(invoice.issueDate), "dd/MM/yyyy", { locale: fr })}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {invoice.total?.toLocaleString()} MAD
                    </TableCell>
                    <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => handlePrintInvoice(invoice)}>
                            <Printer className="h-4 w-4 mr-2" />
                            Imprimer
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Eye className="h-4 w-4 mr-2" />
                            Voir détails
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Print Dialog */}
      <Dialog open={showPrintDialog} onOpenChange={setShowPrintDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {selectedInvoice?.type === 'PRO_FORMA' ? 'Facture Pro Forma' : 'Facture'} {selectedInvoice?.number}
            </DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Client</p>
                  <p className="font-medium">{selectedInvoice.client?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium">{format(new Date(selectedInvoice.issueDate), 'dd/MM/yyyy')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total TTC</p>
                  <p className="font-bold text-lg">{selectedInvoice.total?.toLocaleString()} MAD</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Statut</p>
                  {getStatusBadge(selectedInvoice.status)}
                </div>
              </div>
              
              {selectedInvoice.items && selectedInvoice.items.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-center">Qté</TableHead>
                      <TableHead className="text-right">Prix</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedInvoice.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.description}</TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell className="text-right">{item.unitPrice.toLocaleString()} MAD</TableCell>
                        <TableCell className="text-right">{item.total.toLocaleString()} MAD</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPrintDialog(false)}>Fermer</Button>
            <Button onClick={printInvoice}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== PAYMENTS VIEW ====================

function PaymentsView() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const queryClient = useQueryClient();

  const { data: payments, isLoading } = useQuery({
    queryKey: ["payments"],
    queryFn: api.getPayments,
  });

  const { data: clients } = useQuery({
    queryKey: ["clients"],
    queryFn: api.getClients,
  });

  const createMutation = useMutation({
    mutationFn: api.createPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setShowAddDialog(false);
      toast({ title: "Paiement enregistré", description: "Le paiement a été enregistré avec succès" });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible d'enregistrer le paiement", variant: "destructive" });
    },
  });

  const getMethodBadge = (method: string) => {
    switch (method) {
      case "ESPECES":
        return <Badge variant="outline">Espèces</Badge>;
      case "VIREMENT":
        return <Badge variant="secondary">Virement</Badge>;
      case "CHEQUE":
        return <Badge variant="outline">Chèque</Badge>;
      case "CARTE":
        return <Badge className="bg-primary">Carte</Badge>;
      default:
        return <Badge variant="outline">{method}</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Historique des paiements</h3>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau paiement
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Enregistrer un paiement</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target as HTMLFormElement);
                createMutation.mutate({
                  clientId: formData.get("clientId"),
                  amount: Number(formData.get("amount")),
                  method: formData.get("method"),
                  reference: formData.get("reference"),
                  notes: formData.get("notes"),
                });
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label>Client *</Label>
                <Select name="clientId" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Montant (MAD) *</Label>
                  <Input name="amount" type="number" min={0} required />
                </div>
                <div className="space-y-2">
                  <Label>Mode de paiement</Label>
                  <Select name="method" defaultValue="ESPECES">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ESPECES">Espèces</SelectItem>
                      <SelectItem value="VIREMENT">Virement</SelectItem>
                      <SelectItem value="CHEQUE">Chèque</SelectItem>
                      <SelectItem value="CARTE">Carte bancaire</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Référence</Label>
                <Input name="reference" placeholder="N° de chèque, réf. virement..." />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea name="notes" />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Enregistrement..." : "Enregistrer"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Référence</TableHead>
                <TableHead>Facture lettrée</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Chargement...
                  </TableCell>
                </TableRow>
              ) : payments?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Aucun paiement enregistré
                  </TableCell>
                </TableRow>
              ) : (
                payments?.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      {format(new Date(payment.paymentDate), "dd/MM/yyyy", { locale: fr })}
                    </TableCell>
                    <TableCell className="font-medium">{payment.client?.name || "-"}</TableCell>
                    <TableCell className="font-semibold text-green-600">
                      +{payment.amount?.toLocaleString()} MAD
                    </TableCell>
                    <TableCell>{getMethodBadge(payment.method)}</TableCell>
                    <TableCell className="font-mono text-sm">{payment.reference || "-"}</TableCell>
                    <TableCell>
                      {payment.invoice ? (
                        <div className="flex items-center gap-1">
                          <Link2 className="h-3 w-3 text-green-500" />
                          <span className="font-mono">{payment.invoice.number}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== MANIFESTS VIEW ====================

interface ManifestData {
  id: string;
  serviceId: string;
  vehicleId: string;
  driverId: string;
  createdById: string;
  date: string;
  departurePlace: string;
  arrivalPlace: string;
  departureTime?: string;
  arrivalTime?: string;
  passengerCount: number;
  passengerList?: string;
  remarks?: string;
  vehicle?: Vehicle;
  driver?: Driver;
  service?: { client?: Client };
}

function ManifestsView() {
  const { data: manifests, isLoading } = useQuery({
    queryKey: ["manifests"],
    queryFn: api.getManifests,
  });

  const printManifest = (manifest: ManifestData) => {
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Manifeste de Voyage - ${manifest.departurePlace} → ${manifest.arrivalPlace}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
          .logo { font-size: 36px; font-weight: bold; color: #2563eb; }
          .title { font-size: 24px; margin-top: 10px; }
          .route { font-size: 18px; color: #666; margin-top: 5px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
          .info-box { background: #f5f5f5; padding: 15px; border-radius: 8px; }
          .info-box h3 { margin: 0 0 10px 0; color: #666; font-size: 12px; text-transform: uppercase; }
          .info-box p { margin: 5px 0; font-size: 14px; }
          .section { margin-bottom: 30px; }
          .section h2 { font-size: 16px; border-bottom: 1px solid #ddd; padding-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          th { background: #f5f5f5; }
          .signature-area { margin-top: 50px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
          .signature-box { border-top: 1px solid #333; padding-top: 10px; text-align: center; }
          .footer { margin-top: 50px; text-align: center; color: #666; font-size: 12px; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">TPAM</div>
          <div class="title">MANIFESTE DE VOYAGE</div>
          <div class="route">${manifest.departurePlace} → ${manifest.arrivalPlace}</div>
          <div style="margin-top: 10px;">Date: ${format(new Date(manifest.date), 'EEEE dd MMMM yyyy', { locale: fr })}</div>
        </div>
        
        <div class="info-grid">
          <div class="info-box">
            <h3>VÉHICULE</h3>
            <p><strong>${manifest.vehicle?.brand || ''} ${manifest.vehicle?.model || ''}</strong></p>
            <p>Immatriculation: ${manifest.vehicle?.registration || 'N/A'}</p>
            <p>Capacité: ${manifest.vehicle?.capacity || 0} places</p>
          </div>
          <div class="info-box">
            <h3>CHAUFFEUR</h3>
            <p><strong>${manifest.driver?.firstName || ''} ${manifest.driver?.lastName || ''}</strong></p>
            <p>Tél: ${manifest.driver?.phone || 'N/A'}</p>
            <p>Permis: ${manifest.driver?.licenseNumber || 'N/A'}</p>
          </div>
        </div>
        
        <div class="info-grid">
          <div class="info-box">
            <h3>CLIENT</h3>
            <p><strong>${manifest.service?.client?.name || 'N/A'}</strong></p>
            <p>${manifest.service?.client?.phone || ''}</p>
          </div>
          <div class="info-box">
            <h3>VOYAGE</h3>
            <p><strong>Départ:</strong> ${manifest.departurePlace} ${manifest.departureTime ? `à ${manifest.departureTime}` : ''}</p>
            <p><strong>Arrivée:</strong> ${manifest.arrivalPlace} ${manifest.arrivalTime ? `à ${manifest.arrivalTime}` : ''}</p>
            <p><strong>Passagers:</strong> ${manifest.passengerCount}</p>
          </div>
        </div>
        
        <div class="section">
          <h2>Liste des passagers</h2>
          <table>
            <thead>
              <tr>
                <th style="width: 50px;">N°</th>
                <th>Nom et Prénom</th>
                <th style="width: 150px;">Téléphone</th>
              </tr>
            </thead>
            <tbody>
              ${manifest.passengerList ? manifest.passengerList.split('\n').map((p, i) => `
                <tr>
                  <td style="text-align: center;">${i + 1}</td>
                  <td>${p}</td>
                  <td></td>
                </tr>
              `).join('') : Array(manifest.passengerCount).fill(0).map((_, i) => `
                <tr>
                  <td style="text-align: center;">${i + 1}</td>
                  <td></td>
                  <td></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        
        ${manifest.remarks ? `
          <div class="section">
            <h2>Remarques</h2>
            <p>${manifest.remarks}</p>
          </div>
        ` : ''}
        
        <div class="signature-area">
          <div class="signature-box">
            <p>Signature du Chauffeur</p>
          </div>
          <div class="signature-box">
            <p>Signature du Responsable</p>
          </div>
        </div>
        
        <div class="footer">
          <p>TPAM - Transportation Planning & Accounting Management</p>
          <p>Document généré le ${format(new Date(), 'dd/MM/yyyy à HH:mm')}</p>
        </div>
      </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Manifestes de voyage</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isLoading ? (
          <div className="col-span-full text-center py-8">Chargement...</div>
        ) : manifests?.length === 0 ? (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            Aucun manifeste créé. Générez des manifestes à partir des prestations.
          </div>
        ) : (
          manifests?.map((manifest: ManifestData) => (
            <Card key={manifest.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {manifest.departurePlace} → {manifest.arrivalPlace}
                  </CardTitle>
                  <Button variant="outline" size="sm" onClick={() => printManifest(manifest)}>
                    <Printer className="h-4 w-4 mr-2" />
                    Imprimer
                  </Button>
                </div>
                <CardDescription>
                  {format(new Date(manifest.date), "EEEE dd MMMM yyyy", { locale: fr })}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Car className="h-4 w-4 text-muted-foreground" />
                    {manifest.vehicle?.brand} {manifest.vehicle?.model}
                  </div>
                  <div className="flex items-center gap-1">
                    <UserCheck className="h-4 w-4 text-muted-foreground" />
                    {manifest.driver?.firstName} {manifest.driver?.lastName}
                  </div>
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  {manifest.passengerCount} passager(s)
                </div>
                {manifest.service?.client && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Client: </span>
                    {manifest.service.client.name}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

// ==================== REPORTS VIEW ====================

function ReportsView() {
  const [reportType, setReportType] = useState("planning");
  const [dateRange, setDateRange] = useState({
    startDate: format(startOfMonth(new Date()), "yyyy-MM-dd"),
    endDate: format(endOfMonth(new Date()), "yyyy-MM-dd"),
  });
  const [generatedReport, setGeneratedReport] = useState<{ type: string; generatedAt: string; data: unknown } | null>(null);

  const { refetch, isLoading } = useQuery({
    queryKey: ["reports", reportType, dateRange],
    queryFn: () => api.getReports({ type: reportType, ...dateRange }),
    enabled: false,
  });

  const handleGenerate = async () => {
    const result = await refetch();
    if (result.data) {
      setGeneratedReport(result.data);
    }
  };

  const printReport = () => {
    if (!generatedReport) return;
    
    const reportData = generatedReport.data as Service[];
    const reportTitle = reportType === 'planning' ? 'Planning des prestations' :
                        reportType === 'vehicle' ? 'Rapport par véhicule' :
                        reportType === 'driver' ? 'Rapport par chauffeur' :
                        reportType === 'combined' ? 'Rapport combiné' :
                        'Comptes débiteurs';

    const tableRows = Array.isArray(reportData) ? reportData.map((item: Service) => `
      <tr>
        <td>${format(new Date(item.date), 'dd/MM/yyyy')}</td>
        <td>${item.client?.name || 'N/A'}</td>
        <td>${item.departurePlace} → ${item.arrivalPlace}</td>
        <td>${item.vehicle?.brand || ''} ${item.vehicle?.model || ''}</td>
        <td>${item.driver?.firstName || ''} ${item.driver?.lastName || ''}</td>
        <td style="text-align: right;">${item.price?.toLocaleString() || 0} MAD</td>
      </tr>
    `).join('') : '';

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${reportTitle} - TPAM</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; max-width: 1000px; margin: 0 auto; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
          .logo { font-size: 36px; font-weight: bold; color: #2563eb; }
          .title { font-size: 24px; margin-top: 10px; }
          .period { color: #666; margin-top: 5px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 12px; }
          th { background: #f5f5f5; font-weight: bold; }
          .footer { margin-top: 50px; text-align: center; color: #666; font-size: 12px; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">TPAM</div>
          <div class="title">${reportTitle.toUpperCase()}</div>
          <div class="period">Période: ${dateRange.startDate} au ${dateRange.endDate}</div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Client</th>
              <th>Trajet</th>
              <th>Véhicule</th>
              <th>Chauffeur</th>
              <th style="text-align: right;">Montant</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
        
        <div class="footer">
          <p>TPAM - Transportation Planning & Accounting Management</p>
          <p>Rapport généré le ${format(new Date(), 'dd/MM/yyyy à HH:mm')}</p>
        </div>
      </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const reportTypes = [
    { value: "planning", label: "Planning", icon: <CalendarDays className="h-5 w-5" /> },
    { value: "vehicle", label: "Par véhicule", icon: <Car className="h-5 w-5" /> },
    { value: "driver", label: "Par chauffeur", icon: <UserCheck className="h-5 w-5" /> },
    { value: "combined", label: "Combiné", icon: <BarChart3 className="h-5 w-5" /> },
    { value: "debtors", label: "Comptes débiteurs", icon: <Wallet className="h-5 w-5" /> },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Report Type Selection */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {reportTypes.map((type) => (
          <Card
            key={type.value}
            className={cn(
              "cursor-pointer hover:shadow-lg transition-shadow",
              reportType === type.value && "ring-2 ring-primary"
            )}
            onClick={() => setReportType(type.value)}
          >
            <CardContent className="flex flex-col items-center gap-2 py-4">
              {type.icon}
              <span className="text-sm font-medium">{type.label}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtres</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label>Date début</Label>
              <Input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange((d) => ({ ...d, startDate: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Date fin</Label>
              <Input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange((d) => ({ ...d, endDate: e.target.value }))}
              />
            </div>
            <Button onClick={handleGenerate} disabled={isLoading}>
              {isLoading ? "Génération..." : "Générer le rapport"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Report Results */}
      {generatedReport && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Résultats du rapport</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={printReport}>
                <Printer className="h-4 w-4 mr-2" />
                Imprimer
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <pre className="text-sm bg-muted p-4 rounded-lg overflow-auto max-h-96">
              {JSON.stringify(generatedReport, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ==================== USERS VIEW ====================

function UsersView() {
  const { data: users, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: api.getUsers,
  });

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "ADMIN":
        return <Badge className="bg-primary">Administrateur</Badge>;
      case "AGENT":
        return <Badge variant="secondary">Agent</Badge>;
      case "COMPTABLE":
        return <Badge variant="outline">Comptable</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Gestion des utilisateurs</h3>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nouvel utilisateur
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Créé le</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    Chargement...
                  </TableCell>
                </TableRow>
              ) : users?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Aucun utilisateur
                  </TableCell>
                </TableRow>
              ) : (
                users?.map((user: { id: string; name: string; email: string; role: string; active: boolean; createdAt: string }) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{getRoleBadge(user.role)}</TableCell>
                    <TableCell>
                      <Badge variant={user.active ? "default" : "secondary"}>
                        {user.active ? "Actif" : "Inactif"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(user.createdAt), "dd/MM/yyyy", { locale: fr })}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== MAIN APP COMPONENT ====================

export default function TPAMApp() {
  const { isAuthenticated, currentView } = useAppStore();

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const renderView = () => {
    switch (currentView) {
      case "dashboard":
        return <DashboardView />;
      case "planning":
        return <PlanningView />;
      case "services":
        return <ServicesView />;
      case "vehicles":
        return <VehiclesView />;
      case "drivers":
        return <DriversView />;
      case "clients":
        return <ClientsView />;
      case "invoices":
        return <InvoicesView />;
      case "payments":
        return <PaymentsView />;
      case "debtors":
        return <DebtorsView />;
      case "manifests":
        return <ManifestsView />;
      case "reports":
        return <ReportsView />;
      case "users":
        return <UsersView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 overflow-auto">{renderView()}</main>
      </div>
      <Toaster />
    </div>
  );
}
