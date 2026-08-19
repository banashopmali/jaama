# JAAMA Business Glossary & Vocabulary

Authoritative definition of terms used across JAAMA domain, backend API, database, and frontend UI.

---

| Term | Definition | Key Properties |
| :--- | :--- | :--- |
| **Organization** | The canonical multi-tenant business aggregate. | `id`, `name`, `slug`, `status` |
| **User** | A global identity account. | `id`, `email`, `name`, `status` |
| **Membership** | The link associating a User with an Organization with a specific role. | `id`, `organizationId`, `userId`, `role`, `status` |
| **Role** | Organizational authority level (`owner`, `admin`, `employe`, `comptable`, `vendeur`). | Mapped to granular permissions. |
| **Permission** | Fine-grained capability string (e.g. `sales.create`, `inventory.adjust`). | Evaluated server-side. |
| **Customer** | A client associated with an organization. Can be walk-in (`customerId = null`). | `id`, `organizationId`, `name`, `type` |
| **Product** | Catalog item owned by an organization. | `id`, `organizationId`, `sku`, `name`, `unitPriceMinor` |
| **InventoryBalance** | Current physical stock count for a product in an organization. | `productId`, `availableQuantity`, `reservedQuantity` |
| **StockMovement** | Immutable ledger record of stock change (`SALE_OUT`, `PURCHASE_IN`, etc.). | `productId`, `movementType`, `quantityDelta` |
| **Sale** | Executed commercial transaction for sold line items. | `id`, `organizationId`, `reference`, `saleStatus`, `paymentStatus` |
| **SaleLine** | Itemized product snapshot inside a sale. | `productId`, `productNameSnapshot`, `skuSnapshot`, `unitPriceMinor` |
| **Payment** | Financial transaction recording money received towards a sale. | `id`, `saleId`, `method`, `amountMinor`, `status` |
| **SaleStatus** | Execution state of the sale (`COMPLETED`, `CANCELLED`). | Independent of `PaymentStatus`. |
| **PaymentStatus** | Settlement state (`TO_COLLECT`, `PARTIALLY_PAID`, `PAID`). | Derived from `totalMinor` vs `paidMinor`. |
