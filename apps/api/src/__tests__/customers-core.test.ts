import { describe, it, expect, beforeEach } from "vitest";
import { prisma, seedPostgresDatabase } from "@jaama/database";
import { UserContext } from "@jaama/types";
import { CustomersService } from "../customers/customers.service";

describe("JAA-S1-03 — Customer CRM Core Integration Tests against PostgreSQL", () => {
  const customersService = new CustomersService();

  const adminContextOrgA: UserContext = {
    actorId: "user-hamidou",
    organizationId: "org-diallo",
    membershipId: "org-diallo:user-hamidou",
    permissions: ["customers.read", "customers.manage"],
  };

  const adminContextOrgB: UserContext = {
    actorId: "user-hamidou",
    organizationId: "org-b",
    membershipId: "org-b:user-hamidou",
    permissions: ["customers.read", "customers.manage"],
  };

  beforeEach(async () => {
    await seedPostgresDatabase(prisma);

    await prisma.organization.upsert({
      where: { id: "org-b" },
      update: { status: "active" },
      create: { id: "org-b", name: "Org B", slug: "org-b", status: "active" },
    });
  });

  it("creates registered customer record and supports walk-in representation", async () => {
    const customer = await customersService.createCustomer(adminContextOrgA, {
      name: "Oumar Coulibaly",
      phone: "+22370001122",
      email: "oumar@coulibaly.ml",
      address: "Bamako Coura, Rue 12",
    });

    expect(customer.id).toBeDefined();
    expect(customer.name).toBe("Oumar Coulibaly");
    expect(customer.type).toBe("registered");
    expect(customer.status).toBe("active");
  });

  it("strictly prevents cross-tenant customer retrieval and mutation", async () => {
    const customerOrgA = await customersService.createCustomer(adminContextOrgA, {
      name: "Fatoumata Keita",
      phone: "+22366112233",
    });

    // Org B attempts access -> 404 NotFound
    await expect(
      customersService.getCustomerDetail(adminContextOrgB, customerOrgA.id)
    ).rejects.toThrow("Client introuvable.");

    await expect(
      customersService.updateCustomer(adminContextOrgB, customerOrgA.id, { name: "Hack Name" })
    ).rejects.toThrow("Client introuvable.");
  });

  it("derives accurate read-only business summaries for customer (salesCount, outstandingMinor)", async () => {
    const customer = await customersService.createCustomer(adminContextOrgA, {
      name: "Bakary Diarra",
      phone: "+22375554433",
    });

    // Create 2 Sales for this customer: 1 paid (10,000 FCFA), 1 partially paid (Total 15,000, Paid 5,000, Remaining 10,000)
    await prisma.sale.create({
      data: {
        id: "sale-cust-001",
        organizationId: "org-diallo",
        reference: "VTE-CUST-001",
        customerId: customer.id,
        sellerUserId: "user-hamidou",
        subtotalMinor: 10000,
        discountMinor: 0,
        totalMinor: 10000,
        paidMinor: 10000,
        remainingMinor: 0,
        saleStatus: "COMPLETED",
        paymentStatus: "PAID",
      },
    });

    await prisma.sale.create({
      data: {
        id: "sale-cust-002",
        organizationId: "org-diallo",
        reference: "VTE-CUST-002",
        customerId: customer.id,
        sellerUserId: "user-hamidou",
        subtotalMinor: 15000,
        discountMinor: 0,
        totalMinor: 15000,
        paidMinor: 5000,
        remainingMinor: 10000,
        saleStatus: "COMPLETED",
        paymentStatus: "PARTIALLY_PAID",
      },
    });

    const detail = await customersService.getCustomerDetail(adminContextOrgA, customer.id);

    expect(detail.summary.salesCount).toBe(2);
    expect(detail.summary.salesTotalMinor).toBe(25000);
    expect(detail.summary.paidMinor).toBe(15000);
    expect(detail.summary.outstandingMinor).toBe(10000);
    expect(detail.recentSales.length).toBe(2);
  });

  it("archives customer without destroying historical sale history", async () => {
    const customer = await customersService.createCustomer(adminContextOrgA, {
      name: "Client à Archiver",
    });

    await prisma.sale.create({
      data: {
        id: "sale-cust-hist",
        organizationId: "org-diallo",
        reference: "VTE-CUST-HIST",
        customerId: customer.id,
        sellerUserId: "user-hamidou",
        subtotalMinor: 5000,
        discountMinor: 0,
        totalMinor: 5000,
        paidMinor: 5000,
        remainingMinor: 0,
        saleStatus: "COMPLETED",
        paymentStatus: "PAID",
      },
    });

    const archived = await customersService.archiveCustomer(adminContextOrgA, customer.id);
    expect(archived.status).toBe("archived");

    // Sale record still links to customer.id!
    const sale = await prisma.sale.findUniqueOrThrow({
      where: { organizationId_id: { organizationId: "org-diallo", id: "sale-cust-hist" } },
    });
    expect(sale.customerId).toBe(customer.id);
  });
});
