"use client";

import React, { useState, useEffect } from "react";
import { useWorkspace } from "@/context/WorkspaceContext";

export default function PurchasesPage() {
  const { apiFetch } = useWorkspace();
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadPurchases = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/v1/purchases");
      setPurchases(res.data || []);
    } catch {
      setPurchases([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPurchases();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Achats &amp; Commandes Fournisseurs</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestion des bons de commande et réceptions en stock
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Chargement des commandes d&apos;achat...</div>
        ) : purchases.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Aucune commande d&apos;achat enregistrée.</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-gray-500 font-medium">
              <tr>
                <th className="px-6 py-3 text-left">Référence</th>
                <th className="px-6 py-3 text-left">Fournisseur</th>
                <th className="px-6 py-3 text-left">Date Commande</th>
                <th className="px-6 py-3 text-right">Montant Total</th>
                <th className="px-6 py-3 text-center">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-gray-700">
              {purchases.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-bold text-blue-600">{p.reference}</td>
                  <td className="px-6 py-4 font-medium">{p.supplier?.name || "—"}</td>
                  <td className="px-6 py-4">
                    {new Date(p.orderDate || p.createdAt).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-gray-900">
                    {(p.totalMinor || 0).toLocaleString("fr-FR")} FCFA
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                        p.status === "RECEIVED"
                          ? "bg-green-100 text-green-800"
                          : p.status === "PARTIALLY_RECEIVED"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
