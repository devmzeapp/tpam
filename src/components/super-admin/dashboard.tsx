"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Building2,
  Users,
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle,
  XCircle,
  Activity,
  Database,
  Settings,
} from "lucide-react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

// Colors for charts
const COLORS = ['#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6', '#ec4899'];

// Platform statistics API
async function fetchPlatformStats() {
  const res = await fetch("/api/super-admin/stats");
  return res.json();
}

export function SuperAdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["platform-stats"],
    queryFn: fetchPlatformStats,
  });

  const stats = data?.stats || {};
  const registrationTrend = data?.registrationTrend || [];
  const revenueByCompany = data?.revenueByCompany || [];
  const planDistribution = data?.planDistribution || [];

  // Default data for charts when no data
  const defaultTrend = [
    { month: "Jan", companies: 2, users: 5 },
    { month: "Fév", companies: 3, users: 8 },
    { month: "Mar", companies: 1, users: 4 },
    { month: "Avr", companies: 4, users: 12 },
    { month: "Mai", companies: 2, users: 7 },
    { month: "Juin", companies: 3, users: 10 },
  ];

  const defaultPlanDistribution = [
    { name: "Trial", value: 60, color: "#f59e0b" },
    { name: "Starter", value: 20, color: "#10b981" },
    { name: "Professional", value: 15, color: "#3b82f6" },
    { name: "Enterprise", value: 5, color: "#8b5cf6" },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Tableau de bord Administrateur</h2>
          <p className="text-muted-foreground">Vue d'ensemble de la plateforme TPAM</p>
        </div>
        <Button variant="outline" onClick={() => window.location.reload()}>
          <Activity className="h-4 w-4 mr-2" />
          Actualiser
        </Button>
      </div>

      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-100 text-sm">Total Entreprises</p>
                <p className="text-3xl font-bold">{stats.totalCompanies || 0}</p>
              </div>
              <Building2 className="h-12 w-12 text-amber-200" />
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4" />
              <span>+{stats.newCompaniesThisMonth || 0} ce mois</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Total Utilisateurs</p>
                <p className="text-3xl font-bold">{stats.totalUsers || 0}</p>
              </div>
              <Users className="h-12 w-12 text-blue-200" />
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4" />
              <span>+{stats.newUsersThisMonth || 0} ce mois</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Entreprises Actives</p>
                <p className="text-3xl font-bold">{stats.activeCompanies || 0}</p>
              </div>
              <CheckCircle className="h-12 w-12 text-green-200" />
            </div>
            <div className="mt-4 text-sm text-green-100">
              {stats.activePercentage || 0}% du total
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-sm">En attente d'approbation</p>
                <p className="text-3xl font-bold">{stats.pendingApprovals || 0}</p>
              </div>
              <AlertCircle className="h-12 w-12 text-red-200" />
            </div>
            <div className="mt-4 text-sm text-red-100">
              Nécessite une action
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Registration Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Tendance des inscriptions</CardTitle>
            <CardDescription>Évolution mensuelle des entreprises et utilisateurs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={registrationTrend.length > 0 ? registrationTrend : defaultTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="companies" 
                    stackId="1"
                    stroke="#f59e0b" 
                    fill="#f59e0b" 
                    fillOpacity={0.6}
                    name="Entreprises"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="users" 
                    stackId="2"
                    stroke="#3b82f6" 
                    fill="#3b82f6" 
                    fillOpacity={0.6}
                    name="Utilisateurs"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Plan Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Répartition des plans</CardTitle>
            <CardDescription>Distribution des types d'abonnement</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={planDistribution.length > 0 ? planDistribution : defaultPlanDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {(planDistribution.length > 0 ? planDistribution : defaultPlanDistribution).map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Companies Status */}
        <Card>
          <CardHeader>
            <CardTitle>État des entreprises</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>Actives</span>
              </div>
              <span className="font-bold">{stats.activeCompanies || 0}</span>
            </div>
            <Progress value={stats.activeCompanies ? (stats.activeCompanies / stats.totalCompanies) * 100 : 0} className="h-2" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-500" />
                <span>En attente</span>
              </div>
              <span className="font-bold">{stats.pendingApprovals || 0}</span>
            </div>
            <Progress value={stats.pendingApprovals ? (stats.pendingApprovals / stats.totalCompanies) * 100 : 0} className="h-2 bg-amber-100 [&>div]:bg-amber-500" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-500" />
                <span>Bloquées</span>
              </div>
              <span className="font-bold">{stats.blockedCompanies || 0}</span>
            </div>
            <Progress value={stats.blockedCompanies ? (stats.blockedCompanies / stats.totalCompanies) * 100 : 0} className="h-2 bg-red-100 [&>div]:bg-red-500" />
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Activité récente</CardTitle>
            <CardDescription>Les dernières actions sur la plateforme</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(stats.recentActivity || [
                { type: "registration", message: "Nouvelle entreprise inscrite", time: "Il y a 2h" },
                { type: "approval", message: "Entreprise approuvée", time: "Il y a 5h" },
                { type: "block", message: "Entreprise bloquée", time: "Hier" },
              ]).map((activity: any, index: number) => (
                <div key={index} className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                  <div className={`w-2 h-2 rounded-full ${
                    activity.type === "registration" ? "bg-blue-500" :
                    activity.type === "approval" ? "bg-green-500" :
                    activity.type === "block" ? "bg-red-500" : "bg-gray-500"
                  }`} />
                  <div className="flex-1">
                    <p className="font-medium">{activity.message}</p>
                    <p className="text-sm text-muted-foreground">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Actions rapides</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => window.location.href = "/app?view=companies"}>
              <Building2 className="h-6 w-6" />
              Gérer les entreprises
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => window.location.href = "/app?view=users"}>
              <Users className="h-6 w-6" />
              Gérer les utilisateurs
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => window.location.href = "/app?view=backup"}>
              <Database className="h-6 w-6" />
              Sauvegarder
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => window.location.href = "/app?view=settings"}>
              <Settings className="h-6 w-6" />
              Paramètres
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
