"use client";

import React from "react";
import Link from "next/link";
import { PackagePlus, ShoppingBag, CheckCircle2, ArrowRight } from "lucide-react";
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent } from "@jaama/ui";

export interface DashboardEmptyStateProps {
  userFirstName: string;
  businessName: string;
}

export const DashboardEmptyState: React.FC<DashboardEmptyStateProps> = ({
  userFirstName,
  businessName,
}) => {
  return (
    <div className="space-y-6">
      {/* Greeting Banner */}
      <div className="border-b border-border-subtle pb-5">
        <h1 className="text-2xl md:text-3xl font-bold text-content-primary tracking-tight font-sans">
          Bienvenue dans JAAMA, {userFirstName} ! 👋
        </h1>
        <p className="text-sm text-content-secondary mt-1">
          Votre espace de gestion pour <span className="font-semibold text-content-primary">{businessName}</span> est prêt.
        </p>
      </div>

      {/* Guided Onboarding Hero Card */}
      <Card variant="default" className="p-6 md:p-8 border-border-brand-subtle bg-surface-default shadow-sm">
        <div className="max-w-2xl space-y-6">
          <div className="space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-surface-brand-subtle text-content-brand font-bold text-xl flex items-center justify-center border border-border-brand-subtle mb-4">
              J
            </div>
            <h2 className="text-xl font-bold text-content-primary tracking-tight">
              Démarrez l&apos;activité de votre entreprise en 3 étapes simples
            </h2>
            <p className="text-xs sm:text-sm text-content-secondary leading-relaxed">
              Pour alimenter votre tableau de bord et suivre vos ventes en temps réel, commencez par ajouter vos produits ou enregistrer votre première transaction.
            </p>
          </div>

          {/* Checklist */}
          <div className="space-y-3 py-2 border-y border-border-subtle">
            <div className="flex items-center gap-3 text-xs font-semibold text-content-primary">
              <CheckCircle2 className="w-4 h-4 text-status-success shrink-0" />
              <span>1. Espace d&apos;entreprise configuré ({businessName})</span>
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold text-content-primary">
              <div className="w-4 h-4 rounded-full border-2 border-brand-primary flex items-center justify-center shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
              </div>
              <span>2. Ajouter vos premiers articles au catalogue</span>
            </div>
            <div className="flex items-center gap-3 text-xs font-medium text-content-secondary">
              <div className="w-4 h-4 rounded-full border border-border-default shrink-0" />
              <span>3. Enregistrer votre première vente ou encaissement</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
            <Link href="/produits">
              <Button
                variant="primary"
                size="md"
                leftIcon={<PackagePlus className="w-4 h-4" />}
                className="w-full sm:w-auto"
              >
                Ajouter mes produits
              </Button>
            </Link>

            <Link href="/ventes">
              <Button
                variant="secondary"
                size="md"
                leftIcon={<ShoppingBag className="w-4 h-4" />}
                className="w-full sm:w-auto"
              >
                Créer ma première vente
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      {/* Guidance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card variant="subtle" className="p-5 space-y-2">
          <h3 className="text-sm font-bold text-content-primary">
            Gestion du Catalogue &amp; Stock
          </h3>
          <p className="text-xs text-content-secondary leading-relaxed">
            Saisissez vos produits avec leurs prix et vos niveaux de stock pour suivre automatiquement les alertes de réapprovisionnement.
          </p>
          <Link
            href="/produits"
            className="inline-flex items-center gap-1 text-xs font-bold text-content-brand pt-2 hover:underline"
          >
            <span>Accéder au catalogue</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </Card>

        <Card variant="subtle" className="p-5 space-y-2">
          <h3 className="text-sm font-bold text-content-primary">
            Encaissements &amp; Suivi des Créances
          </h3>
          <p className="text-xs text-content-secondary leading-relaxed">
            Enregistrez les paiements comptants ou à crédit. Le tableau de bord distinguera automatiquement les montants payés des montants à encaisser.
          </p>
          <Link
            href="/ventes"
            className="inline-flex items-center gap-1 text-xs font-bold text-content-brand pt-2 hover:underline"
          >
            <span>Enregistrer un encaissement</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </Card>
      </div>
    </div>
  );
};
