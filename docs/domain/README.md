# JAAMA Domain Architecture & Business Invariants

This directory contains the authoritative domain documentation, business glossary, and architectural invariants for JAAMA.

---

## 1. Non-Negotiable Business Invariants

- **`SALE != PAYMENT`**: A Sale represents the transfer of goods/services. A Payment represents financial settlement. A sale may have zero, one, or multiple payments.
- **`ORDER != SALE`**: An Order is an intent. A Sale is an executed commercial transaction.
- **`PAYMENT != INVOICE`**: An Invoice is a formal billing document. A Payment is cash or electronic money flow.
- **`BUSINESS/ORGANIZATION != USER`**: An Organization is a legal tenant entity. A User is an identity.
- **`USER != EMPLOYEE`**: A User can hold a Membership (acting as an employee/seller) inside one or more Organizations.
- **`MEMBERSHIP != IDENTITY`**: Identity is global. Membership is organization-scoped.
- **`TENANT ACCESS != AUTHENTICATION`**: Authenticated proves identity. Tenant access validates active organization membership.
- **`AUTHENTICATED != AUTHORIZED`**: Authentication identifies the actor. Authorization enforces role/permission policies.
- **`OUTSTANDING != OVERDUE`**: Outstanding means remaining unpaid balance. Overdue means past payment due date.
- **`CONFIRMED SALE != FULL PAYMENT`**: A sale can be `COMPLETED` while its payment status remains `PARTIALLY_PAID` or `TO_COLLECT`.

---

## 2. Money Semantics

- **Authoritative Storage**: Stored as integer minor units (`amountMinor`) with an explicit currency code (`XOF`).
- **Zero Floating-Point**: Floating-point operations for money are strictly forbidden.
- **Display Locale**: Formatted for presentation as `75 000 FCFA` (XOF).

---

## 3. Multi-Tenancy Aggregate Boundaries

- **Canonical Tenant**: `Organization` is the single authoritative tenant boundary.
- **Scoped Queries**: Every tenant-owned aggregate (`Sale`, `Product`, `Customer`, `Payment`, `InventoryBalance`, `StockMovement`) must be scoped by `organizationId`.
