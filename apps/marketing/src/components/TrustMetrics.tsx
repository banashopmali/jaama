"use client";

import React from "react";
import { Building2, ShieldCheck, Zap, Globe2, Smartphone } from "lucide-react";

export function TrustMetrics() {
  return (
    <section className="py-12 bg-white border-y border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Mobile Money & Payment Methods Supported Banner */}
        <div className="mb-10 text-center">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
            Paiements locaux & Mobile Money intégrés en natif
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 opacity-90">
            <div className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-sky-700 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500" /> Wave Digital Finance
            </div>
            <div className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-orange-600 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500" /> Orange Money
            </div>
            <div className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-amber-600 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> MTN MoMo
            </div>
            <div className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-blue-700 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600" /> Moov Africa Money
            </div>
            <div className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-700" /> Carte VISA / Mastercard
            </div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 pt-6 border-t border-slate-100">
          
          <div className="text-center p-4">
            <div className="text-3xl sm:text-4xl font-extrabold text-jaama-600 tracking-tight">
              +10 000
            </div>
            <div className="mt-1 text-sm font-bold text-slate-900">PME & Entrepreneurs</div>
            <p className="mt-0.5 text-xs text-slate-500">Utilisent JAAMA au quotidien</p>
          </div>

          <div className="text-center p-4">
            <div className="text-3xl sm:text-4xl font-extrabold text-jaama-600 tracking-tight">
              99.9%
            </div>
            <div className="mt-1 text-sm font-bold text-slate-900">Disponibilité système</div>
            <p className="mt-0.5 text-xs text-slate-500">Mode hors-ligne synchronisé</p>
          </div>

          <div className="text-center p-4">
            <div className="text-3xl sm:text-4xl font-extrabold text-jaama-600 tracking-tight">
              +50 Millions
            </div>
            <div className="mt-1 text-sm font-bold text-slate-900">Factures & Ventes</div>
            <p className="mt-0.5 text-xs text-slate-500">Traitées en toute sécurité</p>
          </div>

          <div className="text-center p-4">
            <div className="text-3xl sm:text-4xl font-extrabold text-jaama-600 tracking-tight">
              100%
            </div>
            <div className="mt-1 text-sm font-bold text-slate-900">Conforme Fiscalité</div>
            <p className="mt-0.5 text-xs text-slate-500">Normes UEMOA & CEMAC</p>
          </div>

        </div>
      </div>
    </section>
  );
}
