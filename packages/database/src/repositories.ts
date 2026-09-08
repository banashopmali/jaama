import {
  Organization,
  User,
  Membership,
  Customer,
  Product,
  InventoryBalance,
  StockMovement,
  Sale,
  Payment,
  AuditEvent,
  OutboxEvent,
  IdempotencyRecord,
} from "@jaama/types";

// Authoritative Database Repository Ports (JAA-S0-08)

export interface OrganizationRepository {
  findById(id: string): Promise<Organization | null>;
  findBySlug(slug: string): Promise<Organization | null>;
  save(org: Organization): Promise<Organization>;
}

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  save(user: User): Promise<User>;
}

export interface MembershipRepository {
  findByOrgAndUser(organizationId: string, userId: string): Promise<Membership | null>;
  listByUser(userId: string): Promise<Membership[]>;
  listByOrg(organizationId: string): Promise<Membership[]>;
  save(membership: Membership): Promise<Membership>;
}

export interface CustomerRepository {
  findById(organizationId: string, id: string): Promise<Customer | null>;
  listByOrg(organizationId: string): Promise<Customer[]>;
  save(customer: Customer): Promise<Customer>;
}

export interface ProductRepository {
  findById(organizationId: string, id: string): Promise<Product | null>;
  findBySku(organizationId: string, sku: string): Promise<Product | null>;
  listByOrg(organizationId: string): Promise<Product[]>;
  save(product: Product): Promise<Product>;
}

export interface InventoryRepository {
  getBalance(organizationId: string, productId: string): Promise<InventoryBalance | null>;
  decrementStock(organizationId: string, productId: string, quantity: number): Promise<InventoryBalance>;
  recordMovement(movement: StockMovement): Promise<StockMovement>;
}

export interface SaleRepository {
  findById(organizationId: string, saleId: string): Promise<Sale | null>;
  findByReference(organizationId: string, reference: string): Promise<Sale | null>;
  listByOrg(organizationId: string): Promise<Sale[]>;
  saveAtomicSale(sale: Sale, payments: Payment[], stockMovements: StockMovement[], audit?: AuditEvent, outbox?: OutboxEvent): Promise<Sale>;
}

export interface AuditRepository {
  recordEvent(event: AuditEvent): Promise<AuditEvent>;
}

export interface OutboxRepository {
  recordEvent(event: OutboxEvent): Promise<OutboxEvent>;
}

export interface IdempotencyRepository {
  findRecord(organizationId: string, operation: string, idempotencyKey: string): Promise<IdempotencyRecord | null>;
  saveRecord(record: IdempotencyRecord): Promise<IdempotencyRecord>;
}

// In-Memory Transactional Database Store for Unit & Integration Testing

export class InMemoryDatabase {
  public organizations = new Map<string, Organization>();
  public users = new Map<string, User>();
  public credentials = new Map<string, { userId: string; passwordHash: string }>();
  public sessions = new Map<string, { token: string; userId: string; expiresAt: Date }>();
  public memberships = new Map<string, Membership>();
  public customers = new Map<string, Customer>();
  public products = new Map<string, Product>();
  public inventoryBalances = new Map<string, InventoryBalance>();
  public stockMovements: StockMovement[] = [];
  public sales = new Map<string, Sale>();
  public payments: Payment[] = [];
  public auditEvents: AuditEvent[] = [];
  public outboxEvents: OutboxEvent[] = [];
  public idempotencyRecords = new Map<string, IdempotencyRecord>();

  public clear() {
    this.organizations.clear();
    this.users.clear();
    this.credentials.clear();
    this.sessions.clear();
    this.memberships.clear();
    this.customers.clear();
    this.products.clear();
    this.inventoryBalances.clear();
    this.stockMovements = [];
    this.sales.clear();
    this.payments = [];
    this.auditEvents = [];
    this.outboxEvents = [];
    this.idempotencyRecords.clear();
  }
}

export function seedInMemoryDatabase(): InMemoryDatabase {
  const db = new InMemoryDatabase();

  db.organizations.set("org-diallo", {
    id: "org-diallo",
    name: "Diallo Commerce",
    slug: "diallo-commerce",
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  db.users.set("user-hamidou", {
    id: "user-hamidou",
    email: "hamidou@diallo.com",
    name: "Hamidou Diallo",
    status: "active",
    createdAt: new Date(),
  });

  db.credentials.set("user-hamidou", {
    userId: "user-hamidou",
    passwordHash: "8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92:4f3a71b29c8e401b",
  });

  db.memberships.set("org-diallo:user-hamidou", {
    id: "mem-hamidou",
    organizationId: "org-diallo",
    userId: "user-hamidou",
    role: "admin",
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const products: Product[] = [
    {
      id: "prod-001",
      organizationId: "org-diallo",
      sku: "SUC-100",
      name: "Sucre Blanc 1kg",
      category: "Épicerie",
      unitPriceMinor: 500,
      currencyCode: "XOF",
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "prod-002",
      organizationId: "org-diallo",
      sku: "HUI-200",
      name: "Huile Dinor 1L",
      category: "Épicerie",
      unitPriceMinor: 1200,
      currencyCode: "XOF",
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "prod-003",
      organizationId: "org-diallo",
      sku: "NID-300",
      name: "Lait Nido 400g",
      category: "Épicerie",
      unitPriceMinor: 4500,
      currencyCode: "XOF",
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "prod-004",
      organizationId: "org-diallo",
      sku: "RIZ-400",
      name: "Riz Parfumé 5kg",
      category: "Sacs",
      unitPriceMinor: 6500,
      currencyCode: "XOF",
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  for (const p of products) {
    db.products.set(p.id, p);
    db.products.set(`org-diallo:${p.id}`, p);
    db.inventoryBalances.set(`org-diallo:${p.id}`, {
      id: `ib-${p.id}`,
      organizationId: "org-diallo",
      productId: p.id,
      availableQuantity: p.id === "prod-001" ? 45 : p.id === "prod-002" ? 18 : p.id === "prod-003" ? 3 : 12,
      reservedQuantity: 0,
      updatedAt: new Date(),
    });
  }

  return db;
}
