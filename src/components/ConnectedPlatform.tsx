"use client";

import React from "react";
import { CheckCircle2 } from "lucide-react";
import connexionReseauImg from "@/assets/connexion_reseau_transparent.png";

export function ConnectedPlatform() {
  const bulletPoints = [
    "Données synchronisées en temps réel",
    "Travaillez en équipe efficacement",
    "Gagnez du temps et réduisez les erreurs",
    "Prenez de meilleures décisions stratégiques",
  ];

  return (
    <section className="py-20 bg-[#0B1936] text-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Content */}
          <div className="lg:col-span-6 space-y-6">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 bg-cyan-950/80 px-3 py-1 rounded-full border border-cyan-800">
              TOUT EST CONNECTÉ
            </span>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
              Une seule plateforme. <br />
              Toute votre entreprise.
            </h2>

            <p className="text-sm text-slate-300 font-normal leading-relaxed">
              Tous les modules de JAAMA sont interconnectés nativement pour vous offrir une expérience fluide, rapide et centralisée.
            </p>

            <div className="space-y-3 pt-2">
              {bulletPoints.map((pt, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#002B9A] flex items-center justify-center shrink-0 border border-blue-400/40">
                    <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-slate-200">{pt}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Enlarged Image without Background */}
          <div className="lg:col-span-6 relative flex justify-center items-center py-4">
            <div className="relative w-full max-w-2xl lg:max-w-3xl transform lg:scale-110 flex justify-center items-center">
              <img
                src={connexionReseauImg.src}
                alt="Interconnexion du réseau JAAMA"
                className="w-full h-auto object-contain drop-shadow-2xl transition-transform duration-500 hover:scale-[1.02]"
              />
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
