"use client";

import React from "react";
import {
  FileText,
  PackageCheck,
  Smartphone,
  Users,
  ShoppingBag,
  Sparkles,
  ShieldAlert,
  BarChart3,
  CheckCircle,
  ArrowRight,
} from "lucide-react";

export function ModulesGrid() {
  const modules = [
    {
      icon: FileText,
      title: "Facturation & Devis Instantanés",
      tagline: "Devis, factures et relances automatiques",
      description:
        "Éditez des factures professionnelles normées en 10 secondes. Envoyez-les directement par WhatsApp ou SMS avec option de paiement Mobile Money.",
      highlights: ["Logo & En-tête personnalisables", "Calcul automatique TVA / Centimes", "Export PDF & WhatsApp 1-clic"],
      color: "bg-blue-50 text-blue-600 border-blue-200",
    },
    {
      icon: PackageCheck,
      title: "Gestion des Stocks & Multi-Magasins",
      tagline: "Inventaire en temps réel sans erreurs",
      description:
        "Suivez les entrées, sorties et mouvements de stock entre vos différents points de vente ou entrepôts avec alertes automatiques de rupture.",
      highlights: ["Alertes seuil critique", "Codes-barres & Scan mobile", "Multi-emplacements"],
      color: "bg-amber-50 text-amber-600 border-amber-200",
    },
    {
      icon: Smartphone,
      title: "Caisse & Paiements Mobile Money",
      tagline: "Wave, Orange Money, MTN MoMo & Espèces",
      description:
        "Encassez rapidement au comptoir ou à distance. Les paiements Mobile Money sont automatiquement rapprochés de vos factures et de votre caisse.",
      highlights: ["Lien de paiement Wave/Orange", "Caisse enregistreuse tactile", "Ticket de caisse digital"],
      color: "bg-emerald-50 text-emerald-600 border-emerald-200",
    },
    {
      icon: ShoppingBag,
      title: "Boutique en Ligne Clé en Main",
      tagline: "Votre catalogue synchronisé 24/7",
      description:
        "Créez votre site marchand ou catalogue produit en un clic. Vos clients commandent en ligne et votre stock local se met à jour automatiquement.",
      highlights: ["Synchro stock local & web", "Commandes WhatsApp", "Nom de domaine personnalisé"],
      color: "bg-indigo-50 text-indigo-600 border-indigo-200",
    },
    {
      icon: Sparkles,
      title: "Assistant IA Business JAAMA",
      tagline: "Intelligence Artificielle de gestion",
      description:
        "Bénéficiez de prévisions de ventes, de recommandations de réapprovisionnement et de la rédaction automatique de vos messages commerciaux.",
      highlights: ["Prévisions de ventes", "Rédaction de devis & fiches", "Détection d'anomalies de caisse"],
      color: "bg-purple-50 text-purple-600 border-purple-200",
    },
    {
      icon: Users,
      title: "CRM Client & Suivi des Crédits",
      tagline: "Maîtrisez vos créances & carnet d'adresses",
      description:
        "Gérez l'historique complet d'achats de vos clients, suivez les carnets de dette/crédit et programmez des relances automatiques pour réduire les impayés.",
      highlights: ["Carnet de dette client", "Historique d'achats", "Relances impayés"],
      color: "bg-sky-50 text-sky-600 border-sky-200",
    },
    {
      icon: ShieldAlert,
      title: "Gestion d'Équipe & Rôles",
      tagline: "Caissiers, gérants et comptables",
      description:
        "Attribuez des permissions granulaires à vos employés. Contrôlez qui peut annuler une vente, modifier un prix ou voir le chiffre d'affaires global.",
      highlights: ["Rôles prédéfinis", "Journal d'audit des actions", "Accès sécurisé par PIN/Pass"],
      color: "bg-rose-50 text-rose-600 border-rose-200",
    },
    {
      icon: BarChart3,
      title: "Rapports & Synthèse Comptable",
      tagline: "Vision 360° sur votre rentabilité",
      description:
        "Consultez à tout moment votre résultat net, votre marge par produit, vos dépenses opérationnelles et vos synthèses pour votre comptable.",
      highlights: ["Bilan de rentabilité direct", "Export comptable Excel/SYSCOHADA", "Statistiques par caissier"],
      color: "bg-cyan-50 text-cyan-600 border-cyan-200",
    },
  ];

  return (
    <section id="modules" className="py-20 bg-slate-50 border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-bold uppercase tracking-wider text-jaama-600 bg-jaama-50 px-3 py-1 rounded-full border border-jaama-200">
            Modules d'Entreprise Centralisés
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Tout ce dont votre entreprise a besoin dans un seul système
          </h2>
          <p className="mt-4 text-base text-slate-600">
            Fini la multiplication des logiciels incompatibles et des cahiers papier. JAAMA regroupe tous vos outils métiers essentiels.
          </p>
        </div>

        {/* Modules Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {modules.map((mod, idx) => {
            const IconComp = mod.icon;
            return (
              <div
                key={idx}
                className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs hover:shadow-md hover:border-jaama-300 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${mod.color} mb-5 group-hover:scale-105 transition-transform`}>
                    <IconComp className="w-6 h-6" />
                  </div>

                  <span className="text-[11px] font-bold text-jaama-600 uppercase tracking-wide">
                    {mod.tagline}
                  </span>

                  <h3 className="text-lg font-bold text-slate-900 mt-1 mb-3 group-hover:text-jaama-600 transition-colors">
                    {mod.title}
                  </h3>

                  <p className="text-xs text-slate-600 leading-relaxed mb-6">
                    {mod.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-2">
                  {mod.highlights.map((h, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs font-medium text-slate-700">
                      <CheckCircle className="w-3.5 h-3.5 text-jaama-600 shrink-0" />
                      <span>{h}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Banner */}
        <div className="mt-12 text-center">
          <a
            href="#essai"
            className="inline-flex items-center gap-2 text-sm font-bold text-jaama-600 hover:text-jaama-700 hover:underline"
          >
            <span>Tester tous ces modules gratuitement pendant 14 jours</span>
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>

      </div>
    </section>
  );
}
