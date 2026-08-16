# JAAMA — Operating System de Gestion d'Entreprise pour PME Africaines

## 1. Présentation

JAAMA est une plateforme tout-en-un permettant aux entrepreneurs et PME africaines de gérer leurs ventes, factures, stocks, encaissements mobile money et boutique en ligne depuis une interface moderne et hautement sécurisée.

---

## 2. Architecture du Monorepo

```
jaama/
├── apps/
│   ├── marketing/      # Landing Page officielle JAAMA (Next.js 14 App Router)
│   ├── web/            # Future application web SaaS PME (Placeholder)
│   ├── admin/          # Futur portail d'administration interne (Placeholder)
│   └── api/            # Futur service API backend central (Placeholder)
├── packages/
│   ├── ui/             # Design System officiel et composants partagés (@jaama/ui)
│   ├── config/         # Configurations partagées (@jaama/config)
│   ├── types/          # Contrats de types TypeScript (@jaama/types)
│   ├── validation/     # Schémas et règles de validation serveur (@jaama/validation)
│   ├── testing/        # Utilitaires de test et mocking (@jaama/testing)
│   └── observability/  # Audit logs et observabilité (@jaama/observability)
├── docs/               # Architecture, Sécurité (Security Constitution P0), Domaine
├── tooling/            # Outillage TypeScript, ESLint, Vitest
└── .github/workflows/  # Pipelines CI/CD automatisés
```

---

## 3. Prérequis

- **Node.js** >= 20.x
- **pnpm** >= 11.x

---

## 4. Installation et Développement Local

```bash
# 1. Cloner le dépôt
git clone https://github.com/banashopmali/jaama.git
cd jaama

# 2. Installer les dépendances du workspace
pnpm install

# 3. Lancer la Landing Page marketing
pnpm dev:marketing
```

---

## 5. Commandes Principales du Monorepo

| Commande | Description |
| :--- | :--- |
| `pnpm dev` | Lancer le mode développement sur tous les projets |
| `pnpm dev:marketing` | Lancer la Landing Page uniquement (`http://localhost:3000`) |
| `pnpm build` | Compiler la totalité des applications et packages |
| `pnpm lint` | Lancer le linter sur l'ensemble du monorepo |
| `pnpm typecheck` | Exécuter la vérification des types TypeScript (`strict: true`) |
| `pnpm test` | Exécuter la suite de tests automatisés |

---

## 6. Conventions Git & Governance

- Branche principale : `main`
- Branches de fonctionnalités : `feat/jaa-sX-YY-description`
- **Contrat d'architecture de sécurité P0** : [docs/security/JAAMA_SECURITY_CONSTITUTION.md](docs/security/JAAMA_SECURITY_CONSTITUTION.md)
- **Contrat pour les Agents IA** : [AGENTS.md](AGENTS.md)
- **Visual Source of Truth** : [GEMINI.md](GEMINI.md)
