import type { Metadata } from "next";
import "../globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "TPAM - Application de Gestion",
  description: "Application de gestion du planning et de la comptabilité pour le transport touristique au Maroc.",
  icons: {
    icon: "/tpam-logo.png",
  },
};

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <Providers>
      {children}
      <Toaster />
    </Providers>
  );
}
