"use client";

import React, { useState } from "react";
import { Search } from "lucide-react";
import { Button, Card, Badge, Modal } from "@jaama/ui";
import { formatMoney } from "../../sales/sales.utils";

export interface UIInvoice {
  id: string;
  reference: string;
  customerName: string;
  issueDate: string;
  dueDate?: string | null;
  totalMinor: number;
  paidMinor: number;
  remainingMinor: number;
  status: "DRAFT" | "ISSUED" | "PARTIALLY_PAID" | "PAID" | "CANCELLED";
  lines: Array<{
    id: string;
    productNameSnapshot: string;
    quantity: number;
    unitPriceMinor: number;
    lineTotalMinor: number;
  }>;
}

export const mockInvoices: UIInvoice[] = [
  {
    id: "inv-001",
    reference: "FAC-2026-0001",
    customerName: "Bakary Diarra",
    issueDate: new Date().toISOString(),
    dueDate: new Date(Date.now() + 864000000).toISOString(),
    totalMinor: 145000,
    paidMinor: 125000,
    remainingMinor: 20000,
    status: "PARTIALLY_PAID",
    lines: [
      {
        id: "l-1",
        productNameSnapshot: "Ordinateur Portable HP",
        quantity: 1,
        unitPriceMinor: 145000,
        lineTotalMinor: 145000,
      },
    ],
  },
  {
    id: "inv-002",
    reference: "FAC-2026-0002",
    customerName: "Oumar Coulibaly",
    issueDate: new Date(Date.now() - 86400000).toISOString(),
    dueDate: new Date(Date.now() + 1728000000).toISOString(),
    totalMinor: 85000,
    paidMinor: 85000,
    remainingMinor: 0,
    status: "PAID",
    lines: [
      {
        id: "l-2",
        productNameSnapshot: "Imprimante Canon",
        quantity: 1,
        unitPriceMinor: 85000,
        lineTotalMinor: 85000,
      },
    ],
  },
];

export const InvoicesView: React.FC = () => {
  const [invoices] = useState<UIInvoice[]>(mockInvoices);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<UIInvoice | null>(null);

  const filteredInvoices = invoices.filter(
    (inv) =>
      inv.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.customerName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-content-primary tracking-tight">Factures Commerciales</h1>
          <p className="text-sm text-content-secondary">
            Suivi des factures émises, des échéances de paiement et des devis convertis.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card variant="default" className="p-4 space-y-1">
          <span className="text-xs font-bold text-content-secondary uppercase">Factures Émises</span>
          <p className="text-2xl font-black text-content-primary">{invoices.length}</p>
        </Card>

        <Card variant="default" className="p-4 space-y-1">
          <span className="text-xs font-bold text-content-brand uppercase">Total Facturé</span>
          <p className="text-2xl font-black text-content-brand">
            {formatMoney(invoices.reduce((acc, i) => acc + i.totalMinor, 0))}
          </p>
        </Card>

        <Card variant="default" className="p-4 space-y-1">
          <span className="text-xs font-bold text-state-warning-fg uppercase">Reste à Encaisser</span>
          <p className="text-2xl font-black text-state-warning-fg">
            {formatMoney(invoices.reduce((acc, i) => acc + i.remainingMinor, 0))}
          </p>
        </Card>
      </div>

      {/* Search Bar */}
      <Card variant="default" className="p-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-content-tertiary" />
          <input
            type="text"
            placeholder="Rechercher par référence de facture ou client..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary bg-surface-default text-content-primary"
          />
        </div>
      </Card>

      {/* Invoices Table */}
      <Card variant="default" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-border-subtle bg-surface-subtle text-xs font-semibold text-content-secondary">
                <th className="py-3 px-4">Référence</th>
                <th className="py-3 px-4">Client</th>
                <th className="py-3 px-4">Date d&apos;émission</th>
                <th className="py-3 px-4 text-right">Montant Total</th>
                <th className="py-3 px-4 text-right">Reste à payer</th>
                <th className="py-3 px-4 text-center">Statut</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {filteredInvoices.map((inv) => (
                <tr
                  key={inv.id}
                  className="hover:bg-surface-hover transition-colors cursor-pointer"
                  onClick={() => setSelectedInvoice(inv)}
                >
                  <td className="py-3.5 px-4 font-mono text-xs font-bold text-content-brand">
                    {inv.reference}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-content-primary">
                    {inv.customerName}
                  </td>
                  <td className="py-3.5 px-4 text-xs text-content-secondary">
                    {new Date(inv.issueDate).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold text-content-primary">
                    {formatMoney(inv.totalMinor)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-extrabold text-state-warning-fg">
                    {formatMoney(inv.remainingMinor)}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    {inv.status === "PAID" ? (
                      <Badge variant="success" size="sm">Payée</Badge>
                    ) : inv.status === "PARTIALLY_PAID" ? (
                      <Badge variant="warning" size="sm">Partielle</Badge>
                    ) : (
                      <Badge variant="info" size="sm">Émise</Badge>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedInvoice(inv);
                      }}
                    >
                      Détails
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <Modal
          isOpen={Boolean(selectedInvoice)}
          onClose={() => setSelectedInvoice(null)}
          title={`Facture : ${selectedInvoice.reference}`}
        >
          <div className="space-y-5 pt-2">
            <div className="grid grid-cols-2 gap-4 text-sm bg-surface-subtle p-4 rounded-lg border border-border-subtle">
              <div>
                <span className="text-xs text-content-tertiary block">Client</span>
                <span className="font-bold text-content-primary">{selectedInvoice.customerName}</span>
              </div>

              <div>
                <span className="text-xs text-content-tertiary block">Date</span>
                <span className="font-semibold text-content-primary">
                  {new Date(selectedInvoice.issueDate).toLocaleDateString("fr-FR")}
                </span>
              </div>

              <div>
                <span className="text-xs text-content-tertiary block">Montant Total</span>
                <span className="font-bold text-content-brand">{formatMoney(selectedInvoice.totalMinor)}</span>
              </div>

              <div>
                <span className="text-xs text-content-tertiary block">Reste à payer</span>
                <span className="font-extrabold text-state-warning-fg">
                  {formatMoney(selectedInvoice.remainingMinor)}
                </span>
              </div>
            </div>

            <div className="border border-border-subtle rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-subtle text-content-tertiary border-b border-border-subtle">
                  <tr>
                    <th className="py-2 px-3">Article</th>
                    <th className="py-2 px-3 text-center">Qté</th>
                    <th className="py-2 px-3 text-right">Prix U.</th>
                    <th className="py-2 px-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {selectedInvoice.lines.map((l) => (
                    <tr key={l.id}>
                      <td className="py-2.5 px-3 font-semibold text-content-primary">
                        {l.productNameSnapshot}
                      </td>
                      <td className="py-2.5 px-3 text-center">{l.quantity}</td>
                      <td className="py-2.5 px-3 text-right">{formatMoney(l.unitPriceMinor)}</td>
                      <td className="py-2.5 px-3 text-right font-bold">{formatMoney(l.lineTotalMinor)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-3 border-t border-border-subtle">
              <Button variant="primary" onClick={() => setSelectedInvoice(null)}>
                Fermer
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
