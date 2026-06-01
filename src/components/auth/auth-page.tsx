"use client";

import { useState } from "react";
import { User } from "@/lib/store";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Moon, Sun, Globe, MessageCircle } from "lucide-react";

interface AuthPageProps {
  onLogin: (user: User) => void;
}

export function AuthPage({ onLogin }: AuthPageProps) {
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [language, setLanguage] = useState<"fr" | "en">("fr");

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register form state
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerCompanyName, setRegisterCompanyName] = useState("");
  const [registerPhone, setRegisterPhone] = useState("");

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erreur de connexion");
      }

      if (data.user) {
        onLogin(data.user);
        toast({
          title: language === "fr" ? "Connexion réussie" : "Login successful",
          description: language === "fr" 
            ? `Bienvenue, ${data.user.name}!` 
            : `Welcome, ${data.user.name}!`,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Email ou mot de passe incorrect";
      setError(message);
      toast({
        title: language === "fr" ? "Erreur de connexion" : "Login error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: registerName,
          email: registerEmail,
          password: registerPassword,
          companyName: registerCompanyName,
          phone: registerPhone,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de l'inscription");
      }

      if (data.user) {
        onLogin(data.user);
        toast({
          title: language === "fr" ? "Inscription réussie" : "Registration successful",
          description: language === "fr"
            ? `Bienvenue, ${data.user.name}! Votre entreprise ${registerCompanyName} a été créée.`
            : `Welcome, ${data.user.name}! Your company ${registerCompanyName} has been created.`,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur lors de l'inscription";
      setError(message);
      toast({
        title: language === "fr" ? "Erreur d'inscription" : "Registration error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsAppSupport = () => {
    window.open("https://wa.me/212600000000?text=Bonjour, j'ai besoin d'aide avec TPAM", "_blank");
  };

  const texts = {
    fr: {
      title: "TPAM",
      subtitle: "Transportation Planning & Accounting Management",
      login: "Connexion",
      register: "Inscription",
      email: "Email",
      password: "Mot de passe",
      emailPlaceholder: "votre@email.com",
      passwordPlaceholder: "••••••••",
      loginButton: "Se connecter",
      registerButton: "Créer mon compte",
      fullName: "Nom complet",
      companyName: "Nom de l'entreprise",
      phone: "Téléphone (optionnel)",
      phonePlaceholder: "+212 6XX-XXXXXX",
    },
    en: {
      title: "TPAM",
      subtitle: "Transportation Planning & Accounting Management",
      login: "Login",
      register: "Register",
      email: "Email",
      password: "Password",
      emailPlaceholder: "your@email.com",
      passwordPlaceholder: "••••••••",
      loginButton: "Sign in",
      registerButton: "Create my account",
      fullName: "Full name",
      companyName: "Company name",
      phone: "Phone (optional)",
      phonePlaceholder: "+212 6XX-XXXXXX",
    },
  };

  const t = texts[language];

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-4 transition-colors duration-300 ${
      theme === "dark" 
        ? "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" 
        : "bg-gradient-to-br from-slate-50 via-white to-slate-100"
    }`}>
      {/* Top Bar */}
      <div className="fixed top-4 right-4 flex items-center gap-2 z-10">
        {/* Language Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLanguage(language === "fr" ? "en" : "fr")}
          className={theme === "dark" ? "text-white hover:bg-white/10" : ""}
        >
          <Globe className="h-5 w-5" />
        </Button>

        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className={theme === "dark" ? "text-white hover:bg-white/10" : ""}
        >
          {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
        </Button>

        {/* WhatsApp Support */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleWhatsAppSupport}
          className={theme === "dark" ? "text-white hover:bg-white/10" : ""}
          title="Support WhatsApp"
        >
          <MessageCircle className="h-5 w-5 text-green-500" />
        </Button>
      </div>

      {/* Logo and Card */}
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className={`w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg ${
            theme === "dark" ? "bg-white/10" : "bg-white"
          }`}>
            <svg width="60" height="60" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
              <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="36" fontWeight="bold">
                <tspan fill="#003366">T</tspan><tspan fill="#003366">P</tspan><tspan fill="#FF6600">A</tspan><tspan fill="#CC0000">M</tspan>
              </text>
            </svg>
          </div>
        </div>

        {/* Auth Card */}
        <Card className={`border-0 shadow-2xl ${theme === "dark" ? "bg-slate-800/50 border-slate-700" : ""}`}>
          <CardHeader className="text-center pb-2">
            <CardTitle className={`text-2xl font-bold ${theme === "dark" ? "text-white" : ""}`}>
              {t.title}
            </CardTitle>
            <CardDescription>{t.subtitle}</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "login" | "register")}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">{t.login}</TabsTrigger>
                <TabsTrigger value="register">{t.register}</TabsTrigger>
              </TabsList>

              {/* Login Tab */}
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="login-email">{t.email}</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder={t.emailPlaceholder}
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                      className={theme === "dark" ? "bg-slate-700 border-slate-600" : ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">{t.password}</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder={t.passwordPlaceholder}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                      className={theme === "dark" ? "bg-slate-700 border-slate-600" : ""}
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-[#003366] to-[#004080] hover:from-[#004080] hover:to-[#005599]"
                    disabled={loading}
                  >
                    {loading ? (language === "fr" ? "Connexion..." : "Signing in...") : t.loginButton}
                  </Button>
                </form>
              </TabsContent>

              {/* Register Tab */}
              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4">
                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="register-name">{t.fullName}</Label>
                    <Input
                      id="register-name"
                      type="text"
                      placeholder={language === "fr" ? "Votre nom complet" : "Your full name"}
                      value={registerName}
                      onChange={(e) => setRegisterName(e.target.value)}
                      required
                      className={theme === "dark" ? "bg-slate-700 border-slate-600" : ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-company">{t.companyName}</Label>
                    <Input
                      id="register-company"
                      type="text"
                      placeholder={language === "fr" ? "Nom de votre entreprise" : "Your company name"}
                      value={registerCompanyName}
                      onChange={(e) => setRegisterCompanyName(e.target.value)}
                      required
                      className={theme === "dark" ? "bg-slate-700 border-slate-600" : ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-email">{t.email}</Label>
                    <Input
                      id="register-email"
                      type="email"
                      placeholder={t.emailPlaceholder}
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      required
                      className={theme === "dark" ? "bg-slate-700 border-slate-600" : ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-phone">{t.phone}</Label>
                    <Input
                      id="register-phone"
                      type="tel"
                      placeholder={t.phonePlaceholder}
                      value={registerPhone}
                      onChange={(e) => setRegisterPhone(e.target.value)}
                      className={theme === "dark" ? "bg-slate-700 border-slate-600" : ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password">{t.password}</Label>
                    <Input
                      id="register-password"
                      type="password"
                      placeholder={t.passwordPlaceholder}
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      required
                      className={theme === "dark" ? "bg-slate-700 border-slate-600" : ""}
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-[#FF6600] to-[#FF8833] hover:from-[#FF8833] hover:to-[#FFAA55]"
                    disabled={loading}
                  >
                    {loading ? (language === "fr" ? "Création..." : "Creating...") : t.registerButton}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className={`text-center text-sm mt-6 ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
          © 2025 TPAM - Transportation Planning & Accounting Management
        </p>
      </div>

      {/* Floating WhatsApp Button */}
      <Button
        className="fixed bottom-6 right-6 rounded-full w-14 h-14 bg-green-500 hover:bg-green-600 shadow-lg"
        onClick={handleWhatsAppSupport}
        size="icon"
      >
        <MessageCircle className="h-6 w-6 text-white" />
      </Button>
    </div>
  );
}
