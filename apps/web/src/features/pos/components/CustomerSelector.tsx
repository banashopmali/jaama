import React from "react";
import { User, UserPlus } from "lucide-react";
import { mockPosCustomers } from "../pos.mock";
import { PosCustomer } from "../pos.types";

export interface CustomerSelectorProps {
  selectedCustomer: PosCustomer;
  onSelectCustomer: (customer: PosCustomer) => void;
}

export const CustomerSelector: React.FC<CustomerSelectorProps> = ({
  selectedCustomer,
  onSelectCustomer,
}) => {
  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const custId = e.target.value;
    const found = mockPosCustomers.find((c) => (c.id || c.name) === custId);
    if (found) {
      onSelectCustomer(found);
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label
          htmlFor="pos-customer-select"
          className="text-xs font-bold text-content-primary flex items-center gap-1.5"
        >
          <User className="w-3.5 h-3.5 text-content-brand" />
          <span>Client associé</span>
        </label>

        <button
          type="button"
          disabled
          title="Création de client disponible prochainement"
          className="text-[11px] font-semibold text-content-muted flex items-center gap-1 cursor-not-allowed opacity-70"
          aria-label="Nouveau client (bientôt disponible)"
        >
          <UserPlus className="w-3 h-3" />
          <span>+ Nouveau client</span>
        </button>
      </div>

      <select
        id="pos-customer-select"
        value={selectedCustomer.id || selectedCustomer.name}
        onChange={handleSelectChange}
        aria-label="Sélectionner un client pour la vente"
        className="w-full h-10 px-3 py-2 rounded-lg bg-surface-default border border-border-default hover:border-border-brand-subtle text-xs font-semibold text-content-primary shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
      >
        {mockPosCustomers.map((cust) => (
          <option key={cust.id || cust.name} value={cust.id || cust.name}>
            {cust.name} {cust.type === "walk_in" ? "(Vente au comptoir)" : ""}
          </option>
        ))}
      </select>
    </div>
  );
};
