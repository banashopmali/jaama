# Primitives UI & Composants Partagés `@jaama/ui`

Ce document spécifie les contrats d'ingénierie et l'API des 14 primitives UI réutilisables du package `@jaama/ui`.

## 1. Button

Bouton principal avec tailles généreuses et gestion des états asynchrones.

### Props Principal
- `variant` : `"primary"` | `"secondary"` | `"outline"` | `"ghost"` | `"destructive"` (défaut: `"primary"`)
- `size` : `"sm"` (40px) | `"md"` (44px) | `"lg"` (48px) (défaut: `"md"`)
- `isLoading` : `boolean` (Affiche un spinner inline et désactive les clics multiples)
- `leftIcon` / `rightIcon` : `React.ReactNode`

## 2. IconButton

Bouton d'icône exigeant obligatoirement un `aria-label` pour l'accessibilité.

### Props Principal
- `aria-label` : `string` (Obligatoire)
- `icon` : `React.ReactNode` (Obligatoire)
- `variant` / `size` / `isLoading`

## 3. Input

Champ de saisie texte pour formulaires avec étiquette sémantique et aide à la validation.

### Props Principal
- `label` : `string`
- `helperText` : `string`
- `error` : `string`
- `isInvalid` : `boolean` (`aria-invalid="true"`)
- `leftSlot` / `rightSlot` : `React.ReactNode`

## 4. Textarea

Zone de saisie texte multi-lignes alignée sur la charte Input.

## 5. Label

Étiquette sémantique de formulaire supportant l'indicateur d'obligation (`required`).

## 6. Checkbox

Case à cocher native accessible avec indicateur visuel personnalisé et support du clavier.

## 7. Radio

Bouton radio natif accessible pour la sélection exclusive.

## 8. Badge

Indicateur sémantique compact de statut (neutral, info, success, warning, danger, brand).

## 9. Alert

Notification sémantique de statut retenue, n'inondant pas visuellement l'application.

## 10. Card

Conteneur structurel composable (`Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`).

## 11. Skeleton

Placeholder de chargement avec animation de pulsation subtile (soumis à `prefers-reduced-motion`).

## 12. Spinner

Indicateur SVG circulaire inline pour les opérations locales.

## 13. Separator

Ligne de séparation horizontale ou verticale sémantique ou décorative (`role="separator"` / `role="none"`).

## 14. Container

Conteneur de mise en page réactif avec contrainte de largeur maximale (`sm`, `md`, `lg`, `xl`, `full`).
