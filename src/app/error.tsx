"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <html lang="fr">
      <body className="bg-background">
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
              <CardTitle className="text-xl">Erreur de l'application</CardTitle>
              <CardDescription>
                Une erreur inattendue s'est produite. Veuillez rafraîchir la page.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error.message && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground font-mono break-all">
                    {error.message}
                  </p>
                </div>
              )}
              <Button onClick={() => reset()} className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Rafraîchir la page
              </Button>
            </CardContent>
          </Card>
        </div>
      </body>
    </html>
  );
}
