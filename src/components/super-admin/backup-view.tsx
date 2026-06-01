"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download, Upload, AlertCircle, CheckCircle, Database } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export function BackupView() {
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importing, setImporting] = useState(false);
  const queryClient = useQueryClient();

  const handleExport = async () => {
    try {
      const res = await fetch("/api/super-admin/backup");
      const data = await res.json();
      
      if (data.success) {
        const blob = new Blob([JSON.stringify(data.backup, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `tpam-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast({ title: "Succès", description: "Sauvegarde exportée avec succès" });
      } else {
        toast({ title: "Erreur", description: data.error, variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Erreur", description: "Erreur lors de l'export", variant: "destructive" });
    }
  };

  const handleImport = async (file: File) => {
    setImporting(true);
    try {
      const text = await file.text();
      const backup = JSON.parse(text);
      
      const res = await fetch("/api/super-admin/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ backup }),
      });
      
      const data = await res.json();
      if (data.success) {
        toast({ title: "Succès", description: "Sauvegarde importée avec succès" });
        queryClient.invalidateQueries({ queryKey: ["companies"] });
        setShowImportDialog(false);
      } else {
        toast({ title: "Erreur", description: data.error, variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Erreur", description: "Fichier de sauvegarde invalide", variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Sauvegarde & Restauration</h2>
        <p className="text-muted-foreground">Gérez les sauvegardes de votre base de données</p>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Important</AlertTitle>
        <AlertDescription>
          Les sauvegardes contiennent toutes les données de la plateforme. Gardez-les dans un endroit sécurisé.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Export Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5 text-blue-500" />
              Exporter une sauvegarde
            </CardTitle>
            <CardDescription>
              Téléchargez une copie complète de toutes les données de la plateforme
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Le fichier exporté contiendra :
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Toutes les entreprises</li>
                <li>Tous les utilisateurs</li>
                <li>Tous les clients</li>
                <li>Toutes les prestations</li>
                <li>Toutes les factures</li>
              </ul>
            </p>
            <Button onClick={handleExport} className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Télécharger la sauvegarde
            </Button>
          </CardContent>
        </Card>

        {/* Import Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-green-500" />
              Importer une sauvegarde
            </CardTitle>
            <CardDescription>
              Restaurez les données à partir d'un fichier de sauvegarde
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Attention : L'importation ajoutera ou mettra à jour les données existantes.
              Les données existantes ne seront pas supprimées.
            </p>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => setShowImportDialog(true)}
            >
              <Upload className="h-4 w-4 mr-2" />
              Sélectionner un fichier
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Backup History */}
      <Card>
        <CardHeader>
          <CardTitle>Informations sur les sauvegardes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
              <Database className="h-10 w-10 text-muted-foreground" />
              <div>
                <p className="font-medium">Format de sauvegarde</p>
                <p className="text-sm text-muted-foreground">JSON - Compatible avec toutes les versions de TPAM</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
              <CheckCircle className="h-10 w-10 text-green-500" />
              <div>
                <p className="font-medium">Données incluses</p>
                <p className="text-sm text-muted-foreground">Entreprises, utilisateurs, clients, prestations, factures, paiements, manifestes</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importer une sauvegarde</DialogTitle>
            <DialogDescription>
              Sélectionnez un fichier de sauvegarde JSON à importer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <input
              type="file"
              accept=".json"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleImport(file);
                }
              }}
              className="w-full"
              disabled={importing}
            />
            {importing && (
              <p className="text-sm text-muted-foreground">Importation en cours...</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportDialog(false)}>
              Annuler
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
