"use client";

import React from "react";

export function StatsBar() {
  const stats = [
    { value: "50 000+", label: "Entreprises actives" },
    { value: "2 M+", label: "Factures émises / mois" },
    { value: "120 M+", label: "Transactions / an" },
    { value: "99,99%", label: "Uptime garanti" },
  ];

  return (
    <section className="bg-[#002B9A] text-white py-12 border-y border-[#00227B]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {stats.map((s, idx) => (
            <div key={idx} className="space-y-1">
              <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                {s.value}
              </div>
              <div className="text-xs sm:text-sm font-medium text-blue-100">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
