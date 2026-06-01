"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Truck,
  Calendar,
  FileText,
  Users,
  BarChart3,
  Shield,
  Zap,
  Globe,
  ChevronRight,
  CheckCircle,
  ArrowRight,
  Menu,
  X,
  Phone,
  Mail,
  MapPin,
  Star,
  Clock,
  TrendingUp,
  LayoutDashboard,
  CreditCard,
  ClipboardList,
  Car,
  DollarSign,
} from "lucide-react";
import Link from "next/link";
import { VERSION } from "@/lib/version";

export function LandingPage() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const features = [
    {
      icon: <Calendar className="h-8 w-8" />,
      title: "Planning Intelligent",
      description: "Gérez vos prestations avec un calendrier interactif et une vue planning optimisée pour une organisation sans faille.",
    },
    {
      icon: <Truck className="h-8 w-8" />,
      title: "Gestion des Véhicules",
      description: "Suivez votre flotte en temps réel, gérez la disponibilité et optimisez l'utilisation de vos véhicules.",
    },
    {
      icon: <Users className="h-8 w-8" />,
      title: "Gestion des Chauffeurs",
      description: "Assignez les missions, suivez la disponibilité et gérez les informations de vos chauffeurs efficacement.",
    },
    {
      icon: <FileText className="h-8 w-8" />,
      title: "Facturation Automatisée",
      description: "Générez factures, proformas et manifestes en quelques clics. Export PDF et suivi des paiements intégrés.",
    },
    {
      icon: <BarChart3 className="h-8 w-8" />,
      title: "Rapports & Analytics",
      description: "Tableaux de bord interactifs et rapports détaillés pour une vision claire de votre activité.",
    },
    {
      icon: <Shield className="h-8 w-8" />,
      title: "Sécurisé & Fiable",
      description: "Vos données sont protégées avec les meilleures pratiques de sécurité. Sauvegarde automatique incluse.",
    },
  ];

  const stats = [
    { value: "500+", label: "Entreprises" },
    { value: "10K+", label: "Prestations/mois" },
    { value: "99.9%", label: "Disponibilité" },
    { value: "24/7", label: "Support" },
  ];

  const pricingPlans = [
    {
      name: "Starter",
      price: "299",
      description: "Pour les petites entreprises",
      features: [
        "Jusqu'à 5 véhicules",
        "Jusqu'à 10 chauffeurs",
        "Facturation basique",
        "Support email",
      ],
      popular: false,
    },
    {
      name: "Professional",
      price: "599",
      description: "Pour les entreprises en croissance",
      features: [
        "Véhicules illimités",
        "Chauffeurs illimités",
        "Facturation avancée",
        "Rapports détaillés",
        "Support prioritaire",
        "Multi-utilisateurs",
      ],
      popular: true,
    },
    {
      name: "Enterprise",
      price: "Sur devis",
      description: "Pour les grandes flottes",
      features: [
        "Tout inclus dans Professional",
        "API personnalisée",
        "Intégrations sur mesure",
        "Account manager dédié",
        "Formation sur site",
      ],
      popular: false,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? "bg-white/95 backdrop-blur-md shadow-lg border-b border-border"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center shadow-lg">
                <Truck className="h-7 w-7 text-white" />
              </div>
              <div>
                <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                  TPAM
                </span>
                <Badge variant="secondary" className="ml-2 text-xs">
                  v{VERSION}
                </Badge>
              </div>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors font-medium">
                Fonctionnalités
              </a>
              <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors font-medium">
                Tarifs
              </a>
              <a href="#contact" className="text-muted-foreground hover:text-foreground transition-colors font-medium">
                Contact
              </a>
              <Link href="/app">
                <Button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg">
                  Accéder à l'app
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t shadow-lg">
            <div className="px-4 py-6 space-y-4">
              <a href="#features" className="block text-lg font-medium">Fonctionnalités</a>
              <a href="#pricing" className="block text-lg font-medium">Tarifs</a>
              <a href="#contact" className="block text-lg font-medium">Contact</a>
              <Link href="/app" className="block">
                <Button className="w-full bg-gradient-to-r from-blue-600 to-blue-700">
                  Accéder à l'app
                </Button>
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-orange-50" />
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-blue-100/50 to-transparent" />
        
        {/* Decorative Elements */}
        <div className="absolute top-40 left-10 w-72 h-72 bg-blue-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-orange-200/20 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 rounded-full text-blue-700 font-medium">
                <Zap className="h-4 w-4" />
                Nouveau: Version {VERSION} disponible
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
                Gérez votre flotte de transport{" "}
                <span className="bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                  en toute simplicité
                </span>
              </h1>
              
              <p className="text-xl text-muted-foreground leading-relaxed">
                TPAM est la solution complète de gestion pour les entreprises de transport touristique. 
                Planning, facturation, chauffeurs, véhicules - tout en un seul endroit.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/app">
                  <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-xl text-lg px-8 py-6">
                    Commencer maintenant
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg px-8 py-6">
                  Voir la démo
                </Button>
              </div>

              <div className="flex items-center gap-6 pt-4">
                <div className="flex -space-x-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 border-2 border-white flex items-center justify-center text-white text-sm font-medium"
                    >
                      {String.fromCharCode(64 + i)}
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground">+500 entreprises nous font confiance</p>
                </div>
              </div>
            </div>

            {/* Right Content - App Preview */}
            <div className="relative">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border bg-white">
                <div className="bg-gradient-to-r from-blue-600 to-blue-800 h-12 flex items-center px-4 gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="p-4 bg-gray-50">
                  {/* Mini Dashboard Preview */}
                  <div className="grid grid-cols-4 gap-2 mb-4">
                    {[
                      { icon: Truck, label: "Prestations", value: "12" },
                      { icon: Car, label: "Véhicules", value: "8" },
                      { icon: Users, label: "Chauffeurs", value: "15" },
                      { icon: DollarSign, label: "Revenus", value: "45K" },
                    ].map((item, i) => (
                      <div key={i} className="bg-white rounded-lg p-3 shadow-sm">
                        <item.icon className="h-4 w-4 text-blue-600 mb-1" />
                        <div className="text-xs text-muted-foreground">{item.label}</div>
                        <div className="text-lg font-bold">{item.value}</div>
                      </div>
                    ))}
                  </div>
                  {/* Calendar Preview */}
                  <div className="bg-white rounded-lg p-3 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Planning - Juin 2025</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-xs text-center">
                      {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
                        <div key={i} className="text-muted-foreground">{d}</div>
                      ))}
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].map((d) => (
                        <div
                          key={d}
                          className={`p-1 rounded ${
                            d === 1 ? "bg-blue-600 text-white" : "hover:bg-blue-100"
                          }`}
                        >
                          {d}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Floating Cards */}
              <div className="absolute -left-8 top-1/3 bg-white rounded-xl shadow-xl p-4 border animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold">Facture #1245</p>
                    <p className="text-sm text-green-600">Payée</p>
                  </div>
                </div>
              </div>

              <div className="absolute -right-4 bottom-20 bg-white rounded-xl shadow-xl p-4 border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Truck className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold">Mission en cours</p>
                    <p className="text-sm text-muted-foreground">Casablanca → Marrakech</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-blue-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-white mb-2">{stat.value}</div>
                <div className="text-blue-200 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">Fonctionnalités</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Tout ce dont vous avez besoin pour gérer votre flotte
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Une solution complète conçue pour les professionnels du transport touristique
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="group hover:shadow-xl transition-all duration-300 border-0 bg-white hover:-translate-y-1"
              >
                <CardContent className="p-8">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center mb-6 group-hover:from-blue-600 group-hover:to-blue-800 transition-colors">
                    <div className="text-blue-600 group-hover:text-white transition-colors">
                      {feature.icon}
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">Comment ça marche</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Démarrez en quelques minutes
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Créez votre compte",
                description: "Inscription rapide et gratuite. Configurez votre entreprise en quelques clics.",
                icon: <Users className="h-6 w-6" />,
              },
              {
                step: "02",
                title: "Ajoutez vos ressources",
                description: "Enregistrez vos véhicules, chauffeurs et clients dans le système.",
                icon: <Truck className="h-6 w-6" />,
              },
              {
                step: "03",
                title: "Gérez vos prestations",
                description: "Planifiez, facturez et suivez toutes vos opérations en temps réel.",
                icon: <LayoutDashboard className="h-6 w-6" />,
              },
            ].map((item, index) => (
              <div key={index} className="relative">
                <div className="text-8xl font-bold text-blue-100 absolute -top-4 left-0">{item.step}</div>
                <div className="relative pt-8 pl-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white mb-4">
                    {item.icon}
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                  <p className="text-muted-foreground">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">Tarifs</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Des offres adaptées à vos besoins
            </h2>
            <p className="text-xl text-muted-foreground">
              Choisissez le plan qui correspond à votre activité
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {pricingPlans.map((plan, index) => (
              <Card
                key={index}
                className={`relative ${
                  plan.popular
                    ? "border-2 border-blue-600 shadow-xl scale-105"
                    : "border shadow-lg"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="bg-blue-600 text-white px-4 py-1">Plus populaire</Badge>
                  </div>
                )}
                <CardContent className="p-8">
                  <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
                  <p className="text-muted-foreground mb-4">{plan.description}</p>
                  <div className="mb-6">
                    {plan.price === "Sur devis" ? (
                      <span className="text-3xl font-bold">{plan.price}</span>
                    ) : (
                      <>
                        <span className="text-4xl font-bold">{plan.price}</span>
                        <span className="text-muted-foreground"> MAD/mois</span>
                      </>
                    )}
                  </div>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-3">
                        <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className={`w-full ${
                      plan.popular
                        ? "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                        : ""
                    }`}
                    variant={plan.popular ? "default" : "outline"}
                  >
                    {plan.price === "Sur devis" ? "Nous contacter" : "Commencer"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-r from-blue-600 to-blue-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Prêt à transformer votre gestion de flotte ?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Rejoignez les centaines d'entreprises qui font confiance à TPAM pour gérer leur activité de transport.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/app">
              <Button size="lg" className="bg-white text-blue-700 hover:bg-blue-50 text-lg px-8 py-6">
                Essayer gratuitement
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 text-lg px-8 py-6">
              Demander une démo
            </Button>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16">
            <div>
              <Badge variant="secondary" className="mb-4">Contact</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Parlons de votre projet
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Notre équipe est à votre disposition pour répondre à toutes vos questions et vous accompagner dans la mise en place de TPAM.
              </p>
              
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                    <Phone className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">Téléphone</p>
                    <p className="text-muted-foreground">+212 5XX-XXXXXX</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                    <Mail className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">Email</p>
                    <p className="text-muted-foreground">contact@tpam.ma</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                    <MapPin className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">Adresse</p>
                    <p className="text-muted-foreground">Casablanca, Maroc</p>
                  </div>
                </div>
              </div>
            </div>

            <Card className="shadow-xl">
              <CardContent className="p-8">
                <form className="space-y-6">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Nom</label>
                      <input
                        type="text"
                        className="w-full px-4 py-3 rounded-lg border border-input bg-background focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                        placeholder="Votre nom"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Email</label>
                      <input
                        type="email"
                        className="w-full px-4 py-3 rounded-lg border border-input bg-background focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                        placeholder="votre@email.com"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Entreprise</label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 rounded-lg border border-input bg-background focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                      placeholder="Nom de votre entreprise"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Message</label>
                    <textarea
                      rows={4}
                      className="w-full px-4 py-3 rounded-lg border border-input bg-background focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all resize-none"
                      placeholder="Comment pouvons-nous vous aider ?"
                    />
                  </div>
                  <Button className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800" size="lg">
                    Envoyer le message
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
                  <Truck className="h-6 w-6 text-white" />
                </div>
                <span className="text-xl font-bold">TPAM</span>
              </div>
              <p className="text-gray-400 mb-4">
                La solution complète de gestion pour les entreprises de transport touristique au Maroc.
              </p>
              <div className="flex gap-4">
                {["facebook", "twitter", "linkedin"].map((social) => (
                  <div
                    key={social}
                    className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-blue-600 transition-colors cursor-pointer"
                  >
                    <Globe className="h-5 w-5" />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Produit</h4>
              <ul className="space-y-3 text-gray-400">
                <li className="hover:text-white cursor-pointer transition-colors">Fonctionnalités</li>
                <li className="hover:text-white cursor-pointer transition-colors">Tarifs</li>
                <li className="hover:text-white cursor-pointer transition-colors">Intégrations</li>
                <li className="hover:text-white cursor-pointer transition-colors">API</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Entreprise</h4>
              <ul className="space-y-3 text-gray-400">
                <li className="hover:text-white cursor-pointer transition-colors">À propos</li>
                <li className="hover:text-white cursor-pointer transition-colors">Blog</li>
                <li className="hover:text-white cursor-pointer transition-colors">Carrières</li>
                <li className="hover:text-white cursor-pointer transition-colors">Contact</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-3 text-gray-400">
                <li className="hover:text-white cursor-pointer transition-colors">Centre d'aide</li>
                <li className="hover:text-white cursor-pointer transition-colors">Documentation</li>
                <li className="hover:text-white cursor-pointer transition-colors">Statut système</li>
                <li className="hover:text-white cursor-pointer transition-colors">Termes d'utilisation</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-gray-400">
              © 2025 TPAM. Tous droits réservés.
            </p>
            <div className="flex items-center gap-2 text-gray-400">
              <Badge variant="outline" className="border-gray-600 text-gray-400">
                v{VERSION}
              </Badge>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
