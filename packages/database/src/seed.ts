import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function seedPostgresDatabase(client: PrismaClient = prisma) {
  // Execute clean seeding in a single database transaction
  await client.$transaction(async (tx) => {
    await tx.idempotencyRecord.deleteMany();
    await tx.outboxEvent.deleteMany();
    await tx.auditEvent.deleteMany();
    await tx.payment.deleteMany();
    await tx.saleLine.deleteMany();
    await tx.sale.deleteMany();
    await tx.stockMovement.deleteMany();
    await tx.inventoryBalance.deleteMany();
    await tx.product.deleteMany();
    await tx.customer.deleteMany();
    await tx.membership.deleteMany();
    await tx.session.deleteMany();
    await tx.credential.deleteMany();
    await tx.user.deleteMany();
    await tx.organization.deleteMany();

    // 1. Create Organization: Diallo Commerce
    const dialloOrg = await tx.organization.create({
      data: {
        id: "org-diallo",
        name: "Diallo Commerce",
        slug: "diallo-commerce",
        status: "active",
      },
    });

    // 2. Create User: Hamidou Diallo
    const hamidouUser = await tx.user.create({
      data: {
        id: "user-hamidou",
        email: "hamidou@diallo.com",
        name: "Hamidou Diallo",
        status: "active",
      },
    });

    // 3. Create Password Credential for Hamidou
    const passwordHash = "8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92:4f3a71b29c8e401b";
    await tx.credential.create({
      data: {
        id: "cred-hamidou",
        userId: hamidouUser.id,
        passwordHash,
      },
    });

    // 4. Create Membership: Hamidou is Admin of Diallo Commerce
    await tx.membership.create({
      data: {
        id: "org-diallo:user-hamidou",
        organizationId: dialloOrg.id,
        userId: hamidouUser.id,
        role: "admin",
        status: "active",
      },
    });

    // 5. Seed Products First
    const products = [
      {
        id: "prod-001",
        organizationId: dialloOrg.id,
        sku: "SUC-100",
        name: "Sucre Blanc 1kg",
        category: "Épicerie",
        unitPriceMinor: 500,
        stock: 45,
      },
      {
        id: "prod-002",
        organizationId: dialloOrg.id,
        sku: "HUI-200",
        name: "Huile Dinor 1L",
        category: "Épicerie",
        unitPriceMinor: 1200,
        stock: 18,
      },
      {
        id: "prod-003",
        organizationId: dialloOrg.id,
        sku: "NID-300",
        name: "Lait Nido 400g",
        category: "Épicerie",
        unitPriceMinor: 5000,
        stock: 10,
      },
      {
        id: "prod-004",
        organizationId: dialloOrg.id,
        sku: "RIZ-400",
        name: "Riz Parfumé 5kg",
        category: "Sacs",
        unitPriceMinor: 6500,
        stock: 20,
      },
    ];

    for (const p of products) {
      await tx.product.create({
        data: {
          id: p.id,
          organizationId: p.organizationId,
          sku: p.sku,
          name: p.name,
          category: p.category,
          unitPriceMinor: p.unitPriceMinor,
          status: "active",
        },
      });
    }

    // 6. Seed Inventory Balances Second
    for (const p of products) {
      await tx.inventoryBalance.create({
        data: {
          id: `ib-${p.id}`,
          organizationId: p.organizationId,
          productId: p.id,
          availableQuantity: p.stock,
          reservedQuantity: 0,
        },
      });
    }
  });

  console.log("PostgreSQL Database successfully seeded!");
}

if (require.main === module) {
  seedPostgresDatabase()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
