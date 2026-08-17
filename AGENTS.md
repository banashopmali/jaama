# AGENTS.md — Contrat Global pour les Agents IA JAAMA

Ce document constitue le contrat d'ingénierie et de sécurité obligatoire pour tout agent IA travaillant sur le repository JAAMA.

---

## CONTRATS AUTORITATIFS

Avant toute modification ou implémentation, vous devez obligatoirement lire et vous conformer à :
1. [GEMINI.md](./GEMINI.md) — Règle de fidélité visuelle et conventions projet.
2. [docs/security/JAAMA_SECURITY_CONSTITUTION.md](./docs/security/JAAMA_SECURITY_CONSTITUTION.md) — Contrat d'architecture de sécurité P0 non-négociable.

---

## RÈGLES INTERDITES (NEVER)

- **NEVER** bypass tenant isolation (`tenant_id`).
- **NEVER** weaken authentication or authorization.
- **NEVER** trust `organizationId` or `tenantId` supplied by the frontend.
- **NEVER** trust roles or permissions supplied by the frontend.
- **NEVER** expose secrets in frontend code, mobile bundles, Git or logs.
- **NEVER** remove failing tests to make CI green.
- **NEVER** disable TypeScript strict mode (`strict: true`).
- **NEVER** weaken security rules for implementation convenience.
- **NEVER** modify database schema without migration once database exists.
- **NEVER** use floating point arithmetic for money.
- **NEVER** bypass architectural dependency rules (`apps → packages`).
- **NEVER** redesign validated UI without explicit authorization.

---

## RÈGLES OBLIGATOIRES (ALWAYS)

- **ALWAYS** read relevant JAAMA contracts before implementation.
- **ALWAYS** preserve tenant isolation.
- **ALWAYS** validate server-side (Zero-Trust Input Validation).
- **ALWAYS** use strict TypeScript.
- **ALWAYS** run `pnpm lint`.
- **ALWAYS** run `pnpm typecheck`.
- **ALWAYS** run `pnpm test`.
- **ALWAYS** run `pnpm build`.
- **ALWAYS** document significant architectural decisions.
- **ALWAYS** keep changes scoped to the active ticket.
