"use client";

import React from "react";
import { Globe, Monitor, Smartphone } from "lucide-react";

export function HowItWorksAndAvailability() {
  const steps = [
    {
      num: "1",
      title: "Créez votre compte",
      desc: "Inscrivez-vous gratuitement en moins de 60 secondes.",
    },
    {
      num: "2",
      title: "Configurez votre entreprise",
      desc: "Ajoutez vos articles, clients et paramètres d'encaissement.",
    },
    {
      num: "3",
      title: "Commencez à vendre",
      desc: "Gérez vos encaissements, factures et stocks en toute sérénité.",
    },
  ];

  return (
    <section className="py-20 bg-slate-50/70 border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        
        {/* Stepper Workflow */}
        <div>
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-[#002B9A] bg-[#F0F4FF] px-3 py-1 rounded-full border border-[#C7D7FE]">
              COMMENT ÇA MARCHE ?
            </span>
            <h2 className="mt-4 text-3xl font-extrabold text-slate-900 tracking-tight">
              Commencez en 3 étapes simples
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {steps.map((s, idx) => (
              <div key={idx} className="bg-white rounded-xl p-6 border border-slate-200 shadow-card text-center flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-[#F0F4FF] border border-[#C7D7FE] text-[#002B9A] font-bold text-sm flex items-center justify-center mb-4">
                  {s.num}
                </div>
                <h3 className="font-bold text-slate-900 text-base mb-1">{s.title}</h3>
                <p className="text-xs text-slate-600 font-normal leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Availability Banner */}
        <div className="bg-white rounded-xl border border-slate-200 p-8 lg:p-10 shadow-card">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            <div className="lg:col-span-6 space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-[#002B9A] bg-[#F0F4FF] px-3 py-1 rounded-full border border-[#C7D7FE]">
                DISPONIBLE PARTOUT
              </span>

              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Travaillez où que vous soyez
              </h2>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                JAAMA s'adapte à vos habitudes de travail et se synchronise automatiquement sur ordinateur, tablette et smartphone.
              </p>

              <div className="flex flex-wrap gap-3 pt-2">
                
                {/* Official App Store Button */}
                <button className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-all shadow-xs border border-slate-800">
                  <svg className="w-5 h-5 fill-current text-white shrink-0" viewBox="0 0 384 512">
                    <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 52.3-15 69.5-34.3z"/>
                  </svg>
                  <div className="text-left leading-none">
                    <div className="text-[9px] text-slate-300 font-medium tracking-wide">Télécharger sur</div>
                    <div className="font-bold text-xs mt-1 tracking-tight">App Store</div>
                  </div>
                </button>

                {/* Official Google Play Button */}
                <button className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-all shadow-xs border border-slate-800">
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 512 512">
                    <path fill="#4285F4" d="M32.5 14.7C24.1 23.3 19 36.3 19 53.6v404.8c0 17.3 5.1 30.3 13.5 38.9l2.4 2.4 226.7-226.7v-5.7L34.9 12.3l-2.4 2.4z"/>
                    <path fill="#34A853" d="M338 344l-76.4-76.4v-5.7L338 185.5l2.7 1.5 90.5 51.4c25.8 14.7 25.8 38.7 0 53.4L340.7 342.5l-2.7 1.5z"/>
                    <path fill="#FBBC05" d="M340.7 342.5L261.6 263.4 34.9 490.1c8.4 8.9 22.3 10.1 38.4 1l267.4-148.6"/>
                    <path fill="#EA4335" d="M340.7 184L73.3 35.4c-16.1-9.1-30-.1-38.4 8.9l226.7 226.7 79.1-87z"/>
                  </svg>
                  <div className="text-left leading-none">
                    <div className="text-[9px] text-slate-300 font-medium tracking-wide">DISPONIBLE SUR</div>
                    <div className="font-bold text-xs mt-1 tracking-tight">Google Play</div>
                  </div>
                </button>

                {/* Web App Button */}
                <button className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-100 text-slate-800 border border-slate-300 text-xs font-semibold hover:bg-slate-200 transition-all shadow-2xs">
                  <Globe className="w-5 h-5 text-[#002B9A] shrink-0" />
                  <div className="text-left leading-none">
                    <div className="text-[9px] text-slate-500 font-medium">APPLICATION WEB</div>
                    <div className="font-bold text-xs mt-1 tracking-tight">Accéder en ligne</div>
                  </div>
                </button>

              </div>
            </div>

            <div className="lg:col-span-6 flex justify-center">
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 text-center w-full max-w-md">
                <div className="flex justify-center items-center gap-4">
                  <Monitor className="w-16 h-16 text-[#002B9A]" />
                  <Smartphone className="w-10 h-10 text-slate-700" />
                </div>
                <div className="mt-3 text-xs font-semibold text-slate-700">
                  Synchronisation cloud sécurisée en temps réel
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
