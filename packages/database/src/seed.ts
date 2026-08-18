// Development / Testing Fixture Seed Script
import { InMemoryDatabase } from "./repositories";

export function seedInMemoryDatabase(db: InMemoryDatabase = new InMemoryDatabase()): InMemoryDatabase {
  // 1. Organization (Diallo Commerce)
  const org = {
    id: "org-diallo",
    name: "Diallo Commerce",
    slug: "diallo-commerce",
    status: "active" as const,
    createdAt: new Date("2026-08-01T00:00:00Z"),
  };
  db.organizations.set(org.id, org);

  // 2. Reference User (Hamidou)
  const user = {
    id: "user-hamidou",
    email: "hamidou@diallo.com",
    name: "Hamidou Diallo",
    status: "active" as const,
    createdAt: new Date("2026-08-01T00:00:00Z"),
  };
  db.users.set(user.id, user);

  // 3. Credential (Password hash for Hamidou)
  db.credentials.set(user.id, {
    userId: user.id,
    // Pre-calculated hash for "Password123!"
    passwordHash: "$argon2id$v=19$m=65536,t=3,p=4$c2FsdHNhbHQ$hashhashhash",
  });

  // 4. Membership (Owner / Admin)
  const membership = {
    id: "mem-hamidou-diallo",
    organizationId: org.id,
    userId: user.id,
    role: "admin" as const,
    status: "active" as const,
    createdAt: new Date("2026-08-01T00:00:00Z"),
  };
  db.memberships.set(`${org.id}:${user.id}`, membership);

  // 5. Customers
  const walkIn = {
    id: "cust-walk-in",
    organizationId: org.id,
    name: "Client comptoir",
    type: "walk_in" as const,
  };
  db.customers.set(`${org.id}:${walkIn.id}`, walkIn);

  const awa = {
    id: "cust-awa",
    organizationId: org.id,
    name: "Awa Traoré",
    phone: "+223 70 00 11 22",
    type: "registered" as const,
  };
  db.customers.set(`${org.id}:${awa.id}`, awa);

  // 6. Products & Inventory
  const products = [
    { id: "prod-001", sku: "COC-50", name: "Coca-Cola 50cl", category: "Boissons", unitPriceMinor: 500, stock: 24 },
    { id: "prod-002", sku: "EAU-15", name: "Eau minérale 1.5L", category: "Boissons", unitPriceMinor: 750, stock: 32 },
    { id: "prod-003", sku: "NID-400", name: "Lait Nido 400g", category: "Alimentation", unitPriceMinor: 4500, stock: 3 },
    { id: "prod-004", sku: "RIZ-5K", name: "Riz Parfumé 5kg", category: "Alimentation", unitPriceMinor: 6500, stock: 12 },
    { id: "prod-005", sku: "HUI-1L", name: "Huile de Tournesol 1L", category: "Alimentation", unitPriceMinor: 1500, stock: 8 },
  ];

  for (const p of products) {
    const product = {
      id: p.id,
      organizationId: org.id,
      sku: p.sku,
      name: p.name,
      category: p.category,
      unitPriceMinor: p.unitPriceMinor,
      status: "active" as const,
    };
    db.products.set(`${org.id}:${p.id}`, product);

    const balance = {
      id: `bal-${p.id}`,
      organizationId: org.id,
      productId: p.id,
      availableQuantity: p.stock,
      reservedQuantity: 0,
    };
    db.inventoryBalances.set(`${org.id}:${p.id}`, balance);
  }

  return db;
}
