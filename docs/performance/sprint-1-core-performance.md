# JAAMA — Sprint 1 Core Performance & Low-Bandwidth Specification

## 1. Executive Summary
This document specifies the mandatory performance standards, network efficiency strategies, and client-side optimization patterns for the **JAAMA Core Business Operating System (Sprint 1)** under West-African network realities (3G/4G, mobile latency, high packet loss).

---

## 2. Server-Side Pagination & Payload Constraints

| Entity | Default Limit | Maximum Limit | Search Debounce (Frontend) |
|---|---|---|---|
| Products (`/api/v1/products`) | 20 | 100 | 300ms |
| Inventory Balances (`/api/v1/inventory`) | 20 | 100 | 300ms |
| Customers (`/api/v1/customers`) | 20 | 100 | 300ms |
| Sales (`/api/v1/sales`) | 20 | 100 | 300ms |
| Invoices (`/api/v1/invoices`) | 20 | 100 | 300ms |
| Purchases (`/api/v1/purchases`) | 20 | 100 | 300ms |
| Receivables (`/api/v1/payments/receivables`) | 20 | 100 | 300ms |

---

## 3. Low-Bandwidth Optimizations
- **No Unused Metadata**: Endpoints return strictly required fields and pre-calculated totals.
- **Form State Preservation**: On network disconnection or HTTP 5xx error, form inputs are retained in React local state so the merchant never loses data.
- **Fail-Closed POS**: Network failure during POS checkout triggers explicit offline notification without corrupting ledger state.
