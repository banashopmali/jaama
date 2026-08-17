# Processus de Handoff — Stitch vers Code

Ce document définit le workflow obligatoire de passage des maquettes validées dans **Stitch** au code d'ingénierie frontend dans le monorepo JAAMA.

## 1. Principe Fondamental

> **Stitch fournit la direction visuelle et l'intention produit validées. Antigravity et les ingénieurs frontend ne réinterprètent pas librement les écrans verrouillés.**

## 2. Étapes du Handoff

```
MAQUETTE STITCH VERROUILLÉE
         ↓
ANALYSE DU DÉCOUPAGE PRIMITIVES vs FEATURE
         ↓
VALIDATION DES DESIGN TOKENS SÉMANTIQUES
         ↓
IMPLÉMENTATION PRIMITIVES DANS @jaama/ui
         ↓
IMPLÉMENTATION ÉCRANS APPS / FEATURES
         ↓
VISUAL QA ROUTE (/design-system)
         ↓
PIPELINE CI (LINT / TYPECHECK / TEST / BUILD)
```

## 3. Règles de Découpage

1. **Primitives Réutilisables** (`packages/ui`) :  
   Un composant appartient à `@jaama/ui` s'il est visuellement générique et indépendant du domaine métier (ex. `Button`, `Input`, `Badge`, `Card`, `Alert`).

2. **Composants Métier** (`apps/web` ou packages de domaines) :  
   Un composant contenant de la logique métier (ex. `SalesListTable`, `PaymentMethodSelector`, `StockAlertBanner`) appartient à l'application ou à un package métier, et consomme les primitives de `@jaama/ui`.

## 4. Invariants de Fidélité Visuelle

- Ne jamais réduire artificiellement les tailles de boutons ou de polices.
- Ne jamais ajouter de dégradés ou d'effets néon non présents dans la spécification.
- Toujours vérifier le rendu réactif (Desktop, Tablette, Mobile) avant de déclarer un composant validé.
