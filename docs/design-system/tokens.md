# Spécification des Design Tokens JAAMA

Le système de design JAAMA repose sur un ensemble de tokens sémantiques stricts exposés en TypeScript via `jaamaTokens` (`@jaama/ui/tokens`) et en variables CSS custom via `theme.css`.

## 1. Couleurs Officielles & Sémantiques

### Marque (Brand)
- **Primary Royal Navy** : `#002B9A` (Couleur dominante de la marque JAAMA)
- **Primary Hover** : `#00227B` (État de survol pour les CTA)
- **Deep Navy** : `#0B1936` (Ruptures visuelles premium, headers sombres, accents)
- **Surface Light** : `#F0F4FF` (Fond subtil bleu clair)
- **Border Light** : `#C7D7FE` (Bordures légères bleu clair)
- **Canvas Default** : `#F8FAFC` (Fond neutre de l'application SaaS)

### Statuts Métier
- **Success** : Par défaut `#16A34A`, Fond `#DCFCE7`, Texte `#15803D`
- **Warning** : Par défaut `#D97706`, Fond `#FEF3C7`, Texte `#B45309`
- **Danger** : Par défaut `#DC2626`, Fond `#FEE2E2`, Texte `#B91C1C`
- **Info** : Par défaut `#2563EB`, Fond `#EFF6FF`, Texte `#1D4ED8`
- **Neutral** : Par défaut `#64748B`, Fond `#F1F5F9`, Texte `#334155`

## 2. Échelle Typographique

JAAMA utilise exclusivement **Plus Jakarta Sans** (`--font-plus-jakarta`).

| Niveau | Taille | Line Height | Poids | Usage |
| :--- | :--- | :--- | :--- | :--- |
| `display` | 2.25rem (36px) | 2.5rem | 800 | Titres majeurs Hero / Landing |
| `h1` | 1.875rem (30px) | 2.25rem | 700 | Titres de pages principales |
| `h2` | 1.5rem (24px) | 2rem | 700 | Titres de sections & cartes majeures |
| `h3` | 1.25rem (20px) | 1.75rem | 600 | Titres de sous-sections & modales |
| `body` | 1rem (16px) | 1.5rem | 400 | Texte de contenu standard |
| `bodySmall`| 0.875rem (14px)| 1.25rem | 400 | Descriptions secondaires |
| `label` | 0.875rem (14px)| 1.25rem | 600 | Libellés de formulaires & tables |
| `caption` | 0.75rem (12px) | 1rem | 500 | Horodatages & badges compacts |

## 3. Grille d'Espacement (4px Base)

Les espaces sont appliqués sous forme de multiples stricts de 4px :
- `1` : 4px
- `2` : 8px
- `3` : 12px
- `4` : 16px
- `5` : 20px
- `6` : 24px
- `8` : 32px
- `10` : 40px
- `12` : 48px
- `16` : 64px

## 4. Hauteurs de Contrôle Tactiles

Pour répondre à l'usage opérationnel sur smartphone et tablette sur le terrain :
- `sm` : 40px (`2.5rem`)
- `md` : 44px (`2.75rem`) — *Taille standard obligatoire par défaut*
- `lg` : 48px-52px (`3rem`)

## 5. Integrations & Preset Tailwind

Le package `@jaama/ui/tailwind-preset` fournit la configuration partagée Tailwind pour étendre les classes utilitaires sémantiques (`bg-brand-primary`, `text-content-primary`, `border-border-subtle`).
