"use client";

import React from "react";
import {
  WifiOff,
  Smartphone,
  Globe2,
  Headphones,
  ShieldCheck,
  CheckCircle,
} from "lucide-react";

export function AfricanMarketFit() {
  const advantages = [
    {
      icon: WifiOff,
      title: "Mode Offline & Connexion Instable",
      description:
        "Ne stoppez jamais vos ventes en cas de coupure Internet ou réseau. JAAMA enregistre vos encaissements en local et se synchronise automatiquement dès le retour du réseau.",
    },
    {
      icon: Smartphone,
      title: "Mobile Money Intégré en Natif",
      description:
        "Encaissez vos clients via Wave, Orange Money, MTN MoMo et Moov sans matériel coûteux. Recevez directement l'argent sur votre compte marchant avec reçus SMS automatiques.",
    },
    {
      icon: Globe2,
      title: "Multi-devises & Normes Locales (XOF, XAF, GHS)",
      description:
        "Prenez en charge le Franc CFA (UEMOA & CEMAC), le Cedi ghanéen, le Dollar et l'Euro. Gestion fluide de la TVA locale et exports comptables conformes SYSCOHADA.",
    },
    {
      icon: Headphones,
      title: "Accompagnement & Support WhatsApp Local",
      description:
        "Notre équipe basée à Dakar, Abidjan, Douala et Casablanca vous assiste en français et dans vos langues locales par téléphone et direct WhatsApp.",
    },
  ];

  return (
    <section id="afrique" className="py-20 bg-slate-900 text-white relative overflow-hidden">
      
      {/* Decorative Background Gradients */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-jaama-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-bold uppercase tracking-wider text-jaama-400 bg-jaama-950 px-3 py-1 rounded-full border border-jaama-800">
            Conçu Spécialement pour l'Afrique
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Un Business Operating System adapté aux réalités du continent
          </h2>
          <p className="mt-4 text-base text-slate-300">
            Contrairement aux logiciels occidentaux complexes et inadaptés, JAAMA a été construit sur le terrain pour répondre aux vrais défis des PME africaines.
          </p>
        </div>

        {/* Advantage Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {advantages.map((adv, idx) => {
            const IconComp = adv.icon;
            return (
              <div
                key={idx}
                className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 hover:border-jaama-500 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-jaama-600/20 border border-jaama-500/30 text-jaama-400 flex items-center justify-center mb-5">
                    <IconComp className="w-6 h-6" />
                  </div>

                  <h3 className="text-lg font-bold text-white mb-2">{adv.title}</h3>

                  <p className="text-xs text-slate-300 leading-relaxed">{adv.description}</p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-700/60 flex items-center gap-1.5 text-xs font-semibold text-jaama-400">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Garantie 100% Fonctionnel</span>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
