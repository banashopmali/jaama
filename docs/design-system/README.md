# JAAMA Design System — Hub de Documentation

Bienvenue dans le Hub de Documentation du Système de Design Engineering JAAMA (`@jaama/ui`).

## Architecture & Documents Offciels

1. **[Design Tokens & Variables Sémantiques](./tokens.md)**  
   Spécifications des couleurs officielles (Bleu JAAMA `#002B9A`), échelle typographique Plus Jakarta Sans, espacements (grille 4px), hauteurs de contrôle et ombres.

2. **[Primitives UI & API des Composants](./components.md)**  
   Documentation technique des 14 primitives UI partagées de `@jaama/ui` (Button, IconButton, Input, Textarea, Label, Checkbox, Radio, Badge, Alert, Card, Skeleton, Spinner, Separator, Container).

3. **[Handoff Process — Stitch to Code](./stitch-to-code.md)**  
   Processus rigoureux de conversion des designs verrouillés Stitch en composants d'ingénierie sans réinterprétation graphique arbitraire.

4. **[Décisions Visuelles Verrouillées (Locked Invariants)](./locked-decisions.md)**  
   Liste des invariants visuels de produit verrouillés (App Shell V1, Dashboard V1, Sales List V1, règles du logo officiel, accessibilité P0).

## Visual QA / Preview Route

L'application `@jaama/web` embarque une route interne réservée à l'assurance qualité d'ingénierie visuelle :

```bash
pnpm --filter @jaama/web dev
```

Consulter : `http://localhost:3001/design-system`
