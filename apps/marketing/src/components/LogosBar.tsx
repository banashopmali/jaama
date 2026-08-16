"use client";

import React from "react";
import { Utensils, ShoppingBag, PlusCircle, Car, Scissors, GraduationCap, Building2 } from "lucide-react";

export function LogosBar() {
  const clients = [
    { icon: Utensils, label: "RESTAURANT", name: "LE BON GOÛT" },
    { icon: ShoppingBag, label: "BOUTIQUE", name: "AWA MODE" },
    { icon: PlusCircle, label: "PHARMACIE", name: "SAINT RAPHAËL" },
    { icon: Car, label: "GARAGE", name: "SPEED AUTO" },
    { icon: Scissors, label: "SALON", name: "BEAUTY HAIR" },
    { icon: GraduationCap, label: "ÉCOLE", name: "LA RÉUSSITE" },
    { icon: Building2, label: "CABINET", name: "EXPERTISE PLUS" },
  ];

  return (
    <section className="py-8 bg-white border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-center text-xs font-semibold text-slate-500 mb-5 uppercase tracking-wider">
          Ils utilisent JAAMA au quotidien :
        </p>

        <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8">
          {clients.map((c, i) => {
            const IconComp = c.icon;
            return (
              <div
                key={i}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg border border-slate-200/80 bg-slate-50/50 text-slate-700 font-semibold text-xs transition-colors hover:border-slate-300"
              >
                <IconComp className="w-4 h-4 text-[#002B9A] shrink-0" />
                <div className="flex flex-col text-left leading-tight">
                  <span className="text-[9px] text-slate-400 font-medium">{c.label}</span>
                  <span className="font-bold text-[#002B9A]">{c.name}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
