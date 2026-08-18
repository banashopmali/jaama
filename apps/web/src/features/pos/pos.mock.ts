import { PosCustomer, PosProduct } from "./pos.types";

export const mockPosProducts: PosProduct[] = [
  {
    id: "prod-001",
    sku: "COC-50",
    name: "Coca-Cola 50cl",
    category: "Boissons",
    unitPrice: 500,
    stock: { available: 24, status: "available" },
  },
  {
    id: "prod-002",
    sku: "EAU-15",
    name: "Eau minérale 1.5L",
    category: "Boissons",
    unitPrice: 750,
    stock: { available: 32, status: "available" },
  },
  {
    id: "prod-003",
    sku: "NID-400",
    name: "Lait Nido 400g",
    category: "Alimentation",
    unitPrice: 4500,
    stock: { available: 3, status: "low" },
  },
  {
    id: "prod-004",
    sku: "RIZ-5K",
    name: "Riz Parfumé 5kg",
    category: "Alimentation",
    unitPrice: 6500,
    stock: { available: 12, status: "available" },
  },
  {
    id: "prod-005",
    sku: "HUI-1L",
    name: "Huile de Tournesol 1L",
    category: "Alimentation",
    unitPrice: 1500,
    stock: { available: 8, status: "available" },
  },
  {
    id: "prod-006",
    sku: "SUC-1K",
    name: "Sucre en Morceaux 1kg",
    category: "Alimentation",
    unitPrice: 850,
    stock: { available: 18, status: "available" },
  },
  {
    id: "prod-007",
    sku: "SAV-200",
    name: "Savon de Marseille 200g",
    category: "Hygiène",
    unitPrice: 600,
    stock: { available: 45, status: "available" },
  },
  {
    id: "prod-008",
    sku: "BIS-100",
    name: "Biscuits Chocolat 100g",
    category: "Alimentation",
    unitPrice: 1000,
    stock: { available: 0, status: "out" }, // Rupture de stock
  },
  {
    id: "prod-009",
    sku: "JUS-1L",
    name: "Jus d'Orange 1L",
    category: "Boissons",
    unitPrice: 1250,
    stock: { available: 2, status: "low" },
  },
  {
    id: "prod-010",
    sku: "DEN-100",
    name: "Dentifrice Fraîcheur 100ml",
    category: "Hygiène",
    unitPrice: 1100,
    stock: { available: 14, status: "available" },
  },
  {
    id: "prod-011",
    sku: "JAV-1L",
    name: "Eau de Javel 1L",
    category: "Maison",
    unitPrice: 900,
    stock: { available: 0, status: "out" }, // Rupture de stock
  },
  {
    id: "prod-012",
    sku: "AMP-12W",
    name: "Ampoule LED 12W",
    category: "Maison",
    unitPrice: 1800,
    stock: { available: 10, status: "available" },
  },
];

export const mockPosCustomers: PosCustomer[] = [
  { id: "cust-0", name: "Client comptoir", type: "walk_in" },
  { id: "cust-1", name: "Awa Traoré", type: "registered" },
  { id: "cust-2", name: "Moussa Diallo", type: "registered" },
  { id: "cust-3", name: "Oumou Coulibaly", type: "registered" },
];

export const posCategories = ["Tous", "Boissons", "Alimentation", "Hygiène", "Maison"];
