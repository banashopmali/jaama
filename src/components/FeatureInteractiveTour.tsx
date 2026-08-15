"use client";

import React, { useState } from "react";
import {
  FileCheck,
  QrCode,
  Smartphone,
  Sparkles,
  Store,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  Shield,
  Zap,
} from "lucide-react";

export function FeatureInteractiveTour() {
  const [activeTab, setActiveTab] = useState<number>(0);

  const features = [
    {
      id: 0,
      title: "Facturation Conforme & Relances Auto",
      badge: "Zéro impayé",
      icon: FileCheck,
      headline: "Générez des factures professionnelles et collectez l'argent plus vite",
      description:
        "Fini le temps perdu à saisir des factures sur Word ou Excel. Créez vos factures en FCFA/USD en quelques clics avec QR Code de paiement Mobile Money. JAAMA relance automatiquement vos clients en retard par SMS et WhatsApp.",
      points: [
        "Conforme aux exigences fiscales et comptables locales",
        "Envoi instantané par WhatsApp avec lien de paiement direct",
        "Suivi précis des échéances et statut de paiement en temps réel",
        "Conversion facile d'un devis accepté en facture officielle",
      ],
      mockupData: {
        title: "Facture N° FAC-2026-104",
        client: "Entreprise TRAORE & Frères (Bamako)",
        amount: "5 400 000 FCFA",
        status: "Relance WhatsApp envoyée",
        statusColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
        items: [
          { name: "Fourniture Ordinateurs Portables i7", qty: "4 unités", price: "2 800 000 FCFA" },
          { name: "Imprimantes Réseau Multifonctions", qty: "2 unités", price: "1 200 000 FCFA" },
          { name: "Licences Logiciels & Maintenance", qty: "1 an", price: "1 400 000 FCFA" },
        ],
      },
    },
    {
      id: 1,
      title: "Gestion de Stock & Anti-Vol",
      badge: "Visibilité 100%",
      icon: QrCode,
      headline: "Contrôlez vos marchandises sur smartphone et ordinateur",
      description:
        "Scannez vos produits avec votre caméra de téléphone ou douchette. Soyez averti dès qu'un produit atteint son seuil de réapprovisionnement et évitez les fuites de stock.",
      points: [
        "Gestion multi-magasins et transferts de marchandises tracés",
        "Scan de codes-barres avec appareil photo de téléphone",
        "Alertes de péremption et de stock critique",
        "Valorisation instantanée de votre stock aux prix d'achat/vente",
      ],
      mockupData: {
        title: "Gestionnaire de Stock • Magasin Abidjan Cocody",
        client: "Entrepôt Principal",
        amount: "840 Références actives",
        status: "Inventaire à jour (Scan à 14h)",
        statusColor: "bg-blue-50 text-blue-700 border-blue-200",
        items: [
          { name: "Riz Parfumé 25kg Luxe", qty: "142 sacs en stock", price: "18 500 FCFA / sac" },
          { name: "Huile Végétale 5L Dynastie", qty: "88 bidons en stock", price: "7 200 FCFA / bidon" },
          { name: "Sucre En Poudre 1kg (Alerte)", qty: "12 paquets restants", price: "850 FCFA / paquet" },
        ],
      },
    },
    {
      id: 2,
      title: "Mobile Money & Caisse Enregistreuse",
      badge: "Rapprochement Instantané",
      icon: Smartphone,
      headline: "Acceptez Wave, Orange Money et MTN directement au comptoir",
      description:
        "Offrez la liberté de paiement à vos clients. Lorsqu'un client paye via Wave ou Orange Money, la caisse valide automatiquement la transaction sans saisie manuelle.",
      points: [
        "Intégration directe des APIs Wave, Orange, MTN et Moov",
        "Zéro erreur de caisse et réconciliation automatique des comptes",
        "Mode caisse rapide pour épiceries, boutiques et quincailleries",
        "Impression de tickets ou envoi de reçu par SMS",
      ],
      mockupData: {
        title: "Caisse Enregistreuse POS • Terminal N°2",
        client: "Vente au comptoir - Client N°492",
        amount: "48 500 FCFA (Reçu Wave)",
        status: "Paiement Confirmé en 1.8s",
        statusColor: "bg-sky-50 text-sky-700 border-sky-200",
        items: [
          { name: "Paiement reçu via Wave Mobile", qty: "Trans ID: WV-92841", price: "48 500 FCFA" },
          { name: "Caisse physique clôturée", qty: "Écart de caisse: 0 FCFA", price: "Conforme" },
        ],
      },
    },
    {
      id: 3,
      title: "Assistant IA Copilote d'Entreprise",
      badge: "IA Intelligente",
      icon: Sparkles,
      headline: "Laissez l'intelligence artificielle analyser vos ventes et vous conseiller",
      description:
        "JAAMA intègre une IA spécialement configurée pour le commerce et la gestion PME en Afrique. Elle identifie vos produits les plus rentables, détecte les anomalies de prix et prépare vos e-mails professionnels.",
      points: [
        "Analyse prédictive des tendances de consommation de vos clients",
        "Rédaction automatique de devis, e-mails et promotions WhatsApp",
        "Détection des hausses anormales de dépenses opérationnelles",
        "Conseil en stratégie de prix pour maximiser vos marges",
      ],
      mockupData: {
        title: "Rapport d'Analyse IA JAAMA",
        client: "Conseil automatisé de la semaine",
        amount: "Gain estimé : +450 000 FCFA",
        status: "IA Active & Opérationnelle",
        statusColor: "bg-purple-50 text-purple-700 border-purple-200",
        items: [
          { name: "Produit Phare : Ciment 50kg", qty: "Ventes +28% le vendredi", price: "Recommandation: Réapprovisionner le jeudi" },
          { name: "Client Inactif : Cabinet Diop", qty: "Aucun achat depuis 45j", price: "Action: Envoyer offre WhatsApp relance" },
        ],
      },
    },
    {
      id: 4,
      title: "Boutique Web Synchronisée 1-Clic",
      badge: "Vente 24h/24",
      icon: Store,
      headline: "Transformez vos produits en site e-commerce en quelques minutes",
      description:
        "Déployez votre vitrine ou boutique en ligne sans aucune compétence technique. Vos clients passent commande, vous recevez une notification sur votre téléphone et le stock est mis à jour.",
      points: [
        "Lien de boutique partageable sur Instagram, Facebook et WhatsApp",
        "Gestion automatique du panier et sélection du mode de livraison",
        "Paiement Mobile Money directement sur le site marchand",
        "Synchronisation directe avec votre inventaire magazin",
      ],
      mockupData: {
        title: "Boutique En Ligne • monentreprise.jaama.app",
        client: "Commande Web N° WEB-882",
        amount: "125 000 FCFA",
        status: "Prête pour expédition",
        statusColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
        items: [
          { name: "Paire Chaussures Cuir Artisanales", qty: "2 paires", price: "70 000 FCFA" },
          { name: "Ceinture Cuir Assortie", qty: "1 unité", price: "25 000 FCFA" },
          { name: "Frais de livraison Dakar Plateau", qty: "Expédition Express", price: "3 000 FCFA" },
        ],
      },
    },
  ];

  const current = features[activeTab];

  return (
    <section id="demo" className="py-20 bg-white border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Title */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-jaama-600 bg-jaama-50 px-3 py-1 rounded-full border border-jaama-200">
            Démonstration Fonctionnelle
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Découvrez la simplicité d'utilisation de JAAMA
          </h2>
          <p className="mt-3 text-base text-slate-600">
            Cliquez sur un module ci-dessous pour voir comment JAAMA simplifie la gestion de votre activité au quotidien.
          </p>
        </div>

        {/* Tabs Bar */}
        <div className="flex items-center justify-start lg:justify-center gap-2 overflow-x-auto pb-4 custom-scrollbar mb-10">
          {features.map((feat) => {
            const IconComp = feat.icon;
            const isActive = activeTab === feat.id;
            return (
              <button
                key={feat.id}
                onClick={() => setActiveTab(feat.id)}
                className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs font-bold transition-all shrink-0 border ${
                  isActive
                    ? "bg-jaama-600 text-white border-jaama-600 shadow-md shadow-jaama-600/20"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <IconComp className={`w-4 h-4 ${isActive ? "text-white" : "text-jaama-600"}`} />
                <span>{feat.title}</span>
              </button>
            );
          })}
        </div>

        {/* Feature Detail Showcase Card */}
        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 lg:p-10 shadow-xs">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left Content */}
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-white border border-slate-200 text-jaama-700 text-xs font-bold shadow-2xs">
                <span>{current.badge}</span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight">
                {current.headline}
              </h3>

              <p className="text-sm text-slate-600 leading-relaxed">
                {current.description}
              </p>

              <div className="space-y-3 pt-2">
                {current.points.map((pt, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-jaama-100 text-jaama-700 flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-semibold text-slate-800">{pt}</span>
                  </div>
                ))}
              </div>

              <div className="pt-4">
                <a
                  href="#essai"
                  className="inline-flex items-center gap-2 bg-jaama-600 hover:bg-jaama-700 text-white font-bold text-xs px-6 py-3 rounded-xl shadow-sm transition-all"
                >
                  <span>Essayer cette fonctionnalité gratuitement</span>
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Right Mockup Display Card */}
            <div className="lg:col-span-6">
              <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-lg space-y-4">
                
                {/* Header Mockup */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <div className="font-bold text-slate-900 text-sm">{current.mockupData.title}</div>
                    <div className="text-xs text-slate-500">{current.mockupData.client}</div>
                  </div>
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${current.mockupData.statusColor}`}>
                    {current.mockupData.status}
                  </span>
                </div>

                {/* Amount Banner */}
                <div className="bg-slate-50 p-3 rounded-lg flex items-center justify-between border border-slate-100">
                  <span className="text-xs font-semibold text-slate-500">Valeur associée :</span>
                  <span className="text-lg font-extrabold text-jaama-700">{current.mockupData.amount}</span>
                </div>

                {/* Table / List Items */}
                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Détail du flux opérationnel
                  </div>
                  {current.mockupData.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 bg-white text-xs">
                      <div>
                        <div className="font-bold text-slate-800">{item.name}</div>
                        <div className="text-[11px] text-slate-500">{item.qty}</div>
                      </div>
                      <div className="font-bold text-slate-900">{item.price}</div>
                    </div>
                  ))}
                </div>

                <div className="pt-2 text-center text-[11px] text-slate-400 font-mono">
                  JAAMA OS Secure Transaction Engine • End-to-End Encrypted
                </div>

              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
