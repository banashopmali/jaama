"use client";

import React, { useState } from "react";
import { Plus, Search, Phone, Mail, Archive } from "lucide-react";
import { Button, Card, Badge, Modal } from "@jaama/ui";
import { formatMoney } from "../../sales/sales.utils";

export interface UICustomer {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  status: "active" | "archived";
  type: "walk_in" | "registered";
  summary: {
    salesCount: number;
    salesTotalMinor: number;
    paidMinor: number;
    outstandingMinor: number;
  };
}

export const mockCustomers: UICustomer[] = [
  {
    id: "cust-001",
    name: "Bakary Diarra",
    phone: "+22375554433",
    email: "bakary.diarra@gmail.com",
    address: "Hamdallaye ACI 2000, Bamako",
    status: "active",
    type: "registered",
    summary: {
      salesCount: 14,
      salesTotalMinor: 145000,
      paidMinor: 125000,
      outstandingMinor: 20000,
    },
  },
  {
    id: "cust-002",
    name: "Oumar Coulibaly",
    phone: "+22370001122",
    email: "oumar@coulibaly.ml",
    address: "Badalabougou, Bamako",
    status: "active",
    type: "registered",
    summary: {
      salesCount: 8,
      salesTotalMinor: 85000,
      paidMinor: 85000,
      outstandingMinor: 0,
    },
  },
  {
    id: "cust-003",
    name: "Client Comptoir",
    phone: null,
    email: null,
    address: null,
    status: "active",
    type: "walk_in",
    summary: {
      salesCount: 120,
      salesTotalMinor: 650000,
      paidMinor: 650000,
      outstandingMinor: 0,
    },
  },
];

export const CustomersView: React.FC = () => {
  const [customers, setCustomers] = useState<UICustomer[]>(mockCustomers);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<UICustomer | null>(null);

  // Create Form State
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newAddress, setNewAddress] = useState("");

  const filteredCustomers = customers.filter(
    (c) =>
      c.status !== "archived" &&
      (c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.phone && c.phone.includes(searchQuery)) ||
        (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const created: UICustomer = {
      id: `cust-${Date.now()}`,
      name: newName.trim(),
      phone: newPhone.trim() || null,
      email: newEmail.trim() || null,
      address: newAddress.trim() || null,
      status: "active",
      type: "registered",
      summary: {
        salesCount: 0,
        salesTotalMinor: 0,
        paidMinor: 0,
        outstandingMinor: 0,
      },
    };

    setCustomers([created, ...customers]);
    setIsCreateModalOpen(false);
    setNewName("");
    setNewPhone("");
    setNewEmail("");
    setNewAddress("");
  };

  const handleArchiveCustomer = (id: string) => {
    setCustomers(customers.map((c) => (c.id === id ? { ...c, status: "archived" } : c)));
    setSelectedCustomer(null);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-content-primary tracking-tight">Fichier Clients & CRM</h1>
          <p className="text-sm text-content-secondary">
            Consultez les informations clients, leur historique d&apos;achats et les créances à recouvrir.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => setIsCreateModalOpen(true)}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Nouveau client
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card variant="default" className="p-4 space-y-1">
          <span className="text-xs font-bold text-content-secondary uppercase">Clients Actifs</span>
          <p className="text-2xl font-black text-content-primary">
            {customers.filter((c) => c.status === "active").length}
          </p>
        </Card>

        <Card variant="default" className="p-4 space-y-1">
          <span className="text-xs font-bold text-content-secondary uppercase">Total Ventes Clients</span>
          <p className="text-2xl font-black text-content-brand">
            {formatMoney(customers.reduce((acc, c) => acc + c.summary.salesTotalMinor, 0))}
          </p>
        </Card>

        <Card variant="default" className="p-4 space-y-1">
          <span className="text-xs font-bold text-state-warning-fg uppercase">Créances Clients Globales</span>
          <p className="text-2xl font-black text-state-warning-fg">
            {formatMoney(customers.reduce((acc, c) => acc + c.summary.outstandingMinor, 0))}
          </p>
        </Card>
      </div>

      {/* Search Bar */}
      <Card variant="default" className="p-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-content-tertiary" />
          <input
            type="text"
            placeholder="Rechercher par nom, téléphone ou email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary bg-surface-default text-content-primary"
          />
        </div>
      </Card>

      {/* Customers Table */}
      <Card variant="default" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-border-subtle bg-surface-subtle text-xs font-semibold text-content-secondary">
                <th className="py-3 px-4">Client</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Coordonnées</th>
                <th className="py-3 px-4 text-center">Ventes</th>
                <th className="py-3 px-4 text-right">Total Achats</th>
                <th className="py-3 px-4 text-right">Solde à payer</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {filteredCustomers.map((customer) => {
                const hasReceivable = customer.summary.outstandingMinor > 0;
                return (
                  <tr
                    key={customer.id}
                    className="hover:bg-surface-hover transition-colors cursor-pointer"
                    onClick={() => setSelectedCustomer(customer)}
                  >
                    <td className="py-3.5 px-4 font-semibold text-content-primary">
                      {customer.name}
                    </td>
                    <td className="py-3.5 px-4">
                      {customer.type === "walk_in" ? (
                        <Badge variant="neutral" size="sm">Client Comptoir</Badge>
                      ) : (
                        <Badge variant="brand" size="sm">Enregistré</Badge>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-content-secondary space-y-0.5">
                      {customer.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-content-tertiary" />
                          <span>{customer.phone}</span>
                        </div>
                      )}
                      {customer.email && (
                        <div className="flex items-center gap-1">
                          <Mail className="w-3 h-3 text-content-tertiary" />
                          <span>{customer.email}</span>
                        </div>
                      )}
                      {!customer.phone && !customer.email && (
                        <span className="text-content-tertiary font-italic">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-content-primary">
                      {customer.summary.salesCount}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-content-primary">
                      {formatMoney(customer.summary.salesTotalMinor)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span
                        className={`font-extrabold ${
                          hasReceivable ? "text-state-warning-fg" : "text-content-secondary"
                        }`}
                      >
                        {formatMoney(customer.summary.outstandingMinor)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCustomer(customer);
                        }}
                      >
                        Fiche Client
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create Customer Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Ajouter un nouveau client"
      >
        <form onSubmit={handleCreateCustomer} className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-bold text-content-primary mb-1">
              Nom complet du client *
            </label>
            <input
              type="text"
              required
              placeholder="ex: Bakary Diarra"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border-subtle rounded-lg bg-surface-default text-content-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-content-primary mb-1">
                Téléphone
              </label>
              <input
                type="text"
                placeholder="+223 70 00 00 00"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border-subtle rounded-lg bg-surface-default text-content-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-content-primary mb-1">
                Email
              </label>
              <input
                type="email"
                placeholder="client@domaine.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border-subtle rounded-lg bg-surface-default text-content-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-content-primary mb-1">
              Adresse physique
            </label>
            <input
              type="text"
              placeholder="ex: ACI 2000, Bamako"
              value={newAddress}
              onChange={(e) => setNewAddress(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border-subtle rounded-lg bg-surface-default text-content-primary"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border-subtle">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Annuler
            </Button>
            <Button variant="primary" type="submit">
              Créer le client
            </Button>
          </div>
        </form>
      </Modal>

      {/* Customer Detail Modal */}
      {selectedCustomer && (
        <Modal
          isOpen={Boolean(selectedCustomer)}
          onClose={() => setSelectedCustomer(null)}
          title={`Fiche Client : ${selectedCustomer.name}`}
        >
          <div className="space-y-5 pt-2">
            <div className="grid grid-cols-2 gap-4 text-sm bg-surface-subtle p-4 rounded-lg border border-border-subtle">
              <div>
                <span className="text-xs text-content-tertiary block">Nom</span>
                <span className="font-bold text-content-primary">{selectedCustomer.name}</span>
              </div>

              <div>
                <span className="text-xs text-content-tertiary block">Téléphone</span>
                <span className="font-semibold text-content-primary">{selectedCustomer.phone || "—"}</span>
              </div>

              <div>
                <span className="text-xs text-content-tertiary block">Achats cumulés</span>
                <span className="font-bold text-content-brand">
                  {formatMoney(selectedCustomer.summary.salesTotalMinor)}
                </span>
              </div>

              <div>
                <span className="text-xs text-content-tertiary block">Solde dû (Créances)</span>
                <span className="font-extrabold text-state-warning-fg">
                  {formatMoney(selectedCustomer.summary.outstandingMinor)}
                </span>
              </div>
            </div>

            {selectedCustomer.type !== "walk_in" && (
              <div className="flex justify-between items-center pt-4 border-t border-border-subtle">
                <Button
                  variant="secondary"
                  onClick={() => handleArchiveCustomer(selectedCustomer.id)}
                  leftIcon={<Archive className="w-4 h-4 text-state-danger-fg" />}
                >
                  Archiver le client
                </Button>

                <Button variant="primary" onClick={() => setSelectedCustomer(null)}>
                  Fermer
                </Button>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
