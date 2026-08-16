# Architecture Monorepo JAAMA (ADR-001)

## 1. Contexte & Motivation
JAAMA est un Operating System de gestion d'entreprise destiné aux PME africaines. Pour maintenir une cohérence d'ingénierie stricte, une sécurité maximale et réutiliser efficacement les composants, le projet est structuré en **Monorepo Production-Grade** géré par `pnpm workspaces` et `Turborepo`.

---

## 2. Structure des Applications (`apps/`)

* **`apps/marketing`** : Landing Page officielle JAAMA (Next.js 14 App Router). Première brique frontend publique validée.
* **`apps/web`** : Future application web SaaS (Tableau de bord PME, facturation, caisse, stocks).
* **`apps/admin`** : Portail d'administration interne et support de la plateforme JAAMA.
* **`apps/api`** : API Backend centrale et microservices de gestion métier.

---

## 3. Structure des Packages Partagés (`packages/`)

* **`packages/ui`** : Design System officiel partagé (composants, tokens de marque `#002B9A`, primitives UI).
* **`packages/config`** : Configurations partagées (ESLint, Tailwind, TypeScript).
* **`packages/types`** : Définitions et contrats de types TypeScript stricts.
* **`packages/validation`** : Schémas et utilitaires de validation serveur (Zero-Trust Input Validation).
* **`packages/testing`** : Harnais de test et utilitaires de mocking (Vitest).
* **`packages/observability`** : Journalisation d'audit de sécurité et métriques.

---

## 4. Règles de Dépendance et d'Isolation

1. **Direction Unidirectionnelle** : `apps → packages`
   - Les applications (`apps/*`) peuvent importer des packages partagés (`packages/*`).
   - Un package partagé ne doit **jamais** importer une application (`apps/*`).
2. **Isolation Marketing / Core API** : `apps/marketing` ne doit pas dépendre des mécanismes internes de la base de données ou de l'API.
3. **Strict TypeScript** : `strict: true` obligatoire dans tout le monorepo.
4. **Security Constitution Compliance** : Référence stricte à [docs/security/JAAMA_SECURITY_CONSTITUTION.md](../security/JAAMA_SECURITY_CONSTITUTION.md).
