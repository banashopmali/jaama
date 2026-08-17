# `@jaama/ui` — Design System Engineering Foundation

Package de composants et de tokens de design partagés pour l'écosystème d'applications JAAMA.

## Architecture de Consommation par les Sources (Source-Consumed Package)

Dans l'architecture monorepo JAAMA, `@jaama/ui` est intentionnellement configuré comme un **package privé consommé à la source** (Source-Consumed Workspace Package) :
- Les applications (`@jaama/web`, `@jaama/marketing`, etc.) importent directement le code source TypeScript (`.ts` / `.tsx`) via la résolution pnpm workspace et `"exports": { ".": "./src/index.ts" }`.
- Les bundlers d'application (Next.js / Turborepo) compilent le JSX/TSX de manière transparente sans nécessiter d'étape intermédiaire d'émission de fichiers `dist/` compilés.
- La commande `pnpm build` au niveau du package `@jaama/ui` exécute `tsc --noEmit` pour garantir l'absence totale d'erreurs de typage sans émettre d'artefacts superflus.

## Commandes de Qualité

```bash
pnpm --filter @jaama/ui lint        # Validation ESLint stricte du code source
pnpm --filter @jaama/ui typecheck   # Validation TypeScript sans émission (tsc --noEmit)
pnpm --filter @jaama/ui test        # Exécution des tests de comportement avec Vitest + Testing Library + jsdom
pnpm --filter @jaama/ui build       # Validation d'intégration TypeScript (tsc --noEmit)
```

## Primitives & Tokens

- **Design Tokens** : `jaamaTokens` (`@jaama/ui/tokens`) & `theme.css` (`@jaama/ui/theme.css`)
- **Tailwind Preset** : `@jaama/ui/tailwind-preset`
- **Composants Primitives** : `Button`, `IconButton`, `Input`, `Textarea`, `Label`, `Checkbox`, `Radio`, `Badge`, `Alert`, `Card`, `Skeleton`, `Spinner`, `Separator`, `Container`, `cn`.
