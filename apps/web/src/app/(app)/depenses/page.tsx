"use client";

import React, { useState, useEffect } from "react";
import { useWorkspace } from "@/context/WorkspaceContext";

export default function ExpensesPage() {
  const { apiFetch } = useWorkspace();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showModal, setShowModal] = useState<boolean>(false);

  // Form state
  const [category, setCategory] = useState<string>("Loyer & Charges");
  const [amount, setAmount] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadExpenses = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/v1/expenses");
      setExpenses(res.data || []);
    } catch {
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const amountNum = Math.round(Number(amount));
    if (isNaN(amountNum) || amountNum <= 0) {
      setError("Le montant doit être supérieur à zéro.");
      return;
    }

    setSubmitting(true);
    try {
      await apiFetch("/api/v1/expenses", {
        method: "POST",
        body: JSON.stringify({
          category,
          amountMinor: amountNum,
          notes,
        }),
      });
      setShowModal(false);
      setAmount("");
      setNotes("");
      loadExpenses();
    } catch (err: any) {
      setError(err?.message || "Échec de l'enregistrement de la dépense.");
    } finally {
      setSubmitting(false);
    }
  };

  const totalAmount = expenses.reduce((acc, e) => acc + (e.amountMinor || 0), 0);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Dépenses</h1>
          <p className="text-sm text-gray-500 mt-1">
            Suivi des charges d&apos;exploitation et sorties de caisse
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center px-4 py-2 bg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg shadow-sm transition-colors"
        >
          + Nouvelle dépense
        </button>
      </div>

      {/* Summary KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Total Dépenses
          </p>
          <p className="text-2xl font-extrabold text-gray-900 mt-2">
            {totalAmount.toLocaleString("fr-FR")} FCFA
          </p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Nombre d&apos;opérations
          </p>
          <p className="text-2xl font-extrabold text-blue-600 mt-2">{expenses.length}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Chargement des dépenses...</div>
        ) : expenses.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Aucune dépense enregistrée.</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-gray-500 font-medium">
              <tr>
                <th className="px-6 py-3 text-left">Date</th>
                <th className="px-6 py-3 text-left">Catégorie</th>
                <th className="px-6 py-3 text-left">Description / Notes</th>
                <th className="px-6 py-3 text-right">Montant</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-gray-700">
              {expenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    {new Date(exp.occurredAt || exp.createdAt).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-6 py-4 font-semibold text-gray-900">{exp.category}</td>
                  <td className="px-6 py-4">{exp.notes || "—"}</td>
                  <td className="px-6 py-4 text-right font-bold text-red-600">
                    -{(exp.amountMinor || 0).toLocaleString("fr-FR")} FCFA
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Create Expense */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h2 className="text-lg font-bold text-gray-900">Enregistrer une dépense</h2>
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg">{error}</div>
            )}
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Catégorie
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Loyer & Charges">Loyer &amp; Charges</option>
                  <option value="Electricité & Eau">Electricité &amp; Eau</option>
                  <option value="Transport & Carburant">Transport &amp; Carburant</option>
                  <option value="Salaires & Prime">Salaires &amp; Prime</option>
                  <option value="Fournitures de bureau">Fournitures de bureau</option>
                  <option value="Divers">Divers</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Montant (FCFA)
                </label>
                <input
                  type="number"
                  required
                  placeholder="ex: 15000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Notes / Motif
                </label>
                <textarea
                  rows={2}
                  placeholder="Précisez le motif..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg disabled:opacity-50"
                >
                  {submitting ? "Enregistrement..." : "Valider"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
