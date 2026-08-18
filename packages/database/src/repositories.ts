import {
  Organization,
  User,
  Membership,
  Customer,
  Product,
  InventoryBalance,
  StockMovement,
  Sale,
  SaleLine,
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
