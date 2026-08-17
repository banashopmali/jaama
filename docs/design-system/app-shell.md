# JAAMA App Shell V1 — Spécification d'Ingénierie & Architecture

Document de référence pour le composant racine `AppShell` et la structure d'application réactive du produit JAAMA (`JAA-S0-03`).

---

## 1. Vue d'Ensemble & Architecture Réactive

Le Shell App V1 constitue le cadre permanent de l'application Web JAAMA (`apps/web`). Il encadre toutes les futures pages produit authentifiées (`Accueil`, `Ventes`, `Produits`, `Stocks`, `Clients`, `Factures`, `Paiements`, `Rapports`, `Paramètres`).

### Modèle Responsive Multi-Terminaux
- **Desktop (>= 1024px)** :
  - Barre latérale fixe à gauche (Sidebar) : `256px` étendue / `80px` réduite.
  - En-tête supérieur fixe (Topbar) : hauteur `64px`.
  - Zone de contenu principal (Canvas) : fond neutre sémantique `#F8FAFC`, défilement autonome.
- **Tablette (768px – 1023px)** :
  - Barre latérale réduite par défaut (`80px`).
  - Topbar préservée avec contrôles essentiels.
- **Mobile (< 768px)** :
  - Masquage de la barre latérale desktop.
  - En-tête mobile compact (`MobileHeader`) avec logo et contexte entreprise.
  - Barre de navigation inférieure fixe (`MobileBottomNav`) à 5 destinations avec bouton central d'action rapide global.

---

## 2. Découpage des Composants (`apps/web/src/components/app-shell`)

| Composant | Rôle |
| :--- | :--- |
| `AppShell.tsx` | Conteneur principal assemblant Sidebar, Topbar, Canvas et Mobile Navigation. |
| `AppShellContext.tsx` | Gestionnaire d'état réactif (mode réduit/étendu, tiroir mobile, route active, persistance localStorage `jaama.sidebar.collapsed`). |
| `Sidebar.tsx` | Sidebar desktop/tablette réactive (`256px` / `80px`). |
| `SidebarHeader.tsx` | En-tête de la sidebar avec logo officiel JAAMA et identité de produit. |
| `WorkspaceSwitcher.tsx` | Déclencheur et popover de sélection de l'entreprise active (`Diallo Commerce` / `Mali`). |
| `SidebarNav.tsx` | Liste de navigation pilotée par la configuration (`navigationConfig`). |
| `SidebarNavItem.tsx` | Composant d'élément de nav réutilisable (états actif, survol, focus, tooltip en mode réduit, `aria-current="page"`). |
| `SidebarCollapseButton.tsx` | Bouton accessible de réduction/développement avec libellés dynamiques. |
| `Topbar.tsx` | En-tête supérieur avec titre de contexte, recherche globale, bouton `+ Nouveau`, notifications et profil utilisateur. |
| `GlobalSearch.tsx` | Champ de recherche globale avec raccourci clavier `Ctrl+K` / `Cmd+K`. |
| `NotificationsButton.tsx` | Bouton cloche avec indicateur de notifications non lues. |
| `UserMenuTrigger.tsx` | Déclencheur du menu utilisateur avec avatar initiales (`HB`) et popover d'options. |
| `MobileHeader.tsx` | En-tête mobile compact avec logo et sélecteur d'entreprise simplifié. |
| `MobileBottomNav.tsx` | Navigation inférieure mobile à 5 destinations et bouton central de création. |
| `AppContent.tsx` | Zone de contenu principal avec lien d'évitement accessible (`Passer au contenu principal`). |

---

## 3. Configuration de la Navigation (`navigation.config.ts`)

La navigation est entièrement pilotée par la configuration typée :
- **GROUPES** : `PRINCIPAL`, `OPÉRATIONS`, `FINANCES`, `ANALYSE`, `CONFIGURATION`.
- **MODULES ACTIFS SIMULÉS** : `Accueil`, `Ventes`, `Produits`, `Stocks`, `Clients`, `Factures & devis`, `Paiements`, `Rapports`, `Paramètres`, `Aide & support`.
- **NAV MOBILE** : 5 destinations max (`Accueil`, `Ventes`, `Produits`, `Clients`, `Plus`).

---

## 4. Contrats d'Accessibilité P0

1. **Lien d'évitement (Skip Link)** : Présent en haut de page, visible au focus clavier (`Passer au contenu principal` ciblant `#main-content`).
2. **Repères sémantiques (Landmarks)** : `<aside>`, `<header>`, `<nav>`, `<main id="main-content">`.
3. **Indicateurs d'état** : Attribut `aria-current="page"` sur l'élément de navigation actif.
4. **Interactions clavier** : Focus visible (`ring-2 ring-brand-primary`), gestion de la touche `Escape` sur les menus popovers, raccourci `Ctrl+K` pour la recherche.
5. **Iconographie** : Tous les boutons d'icônes possèdent un attribut `aria-label` descriptif.

---

## 5. Invariant du Logo Officiel & Note d'Asset

- L'intégration utilise l'asset de logo officiel pour le rendu visuel.
- **Exigence d'Asset Transparent** : `TRANSPARENT OFFICIAL LOGO ASSET REQUIRED`. Ne pas appliquer de bordures ou fonds rectangulaires artificiels autour du logo.

---

## 6. Guide d'Intégration des Futures Pages Produit

Toutes les nouvelles pages authentifiées ajoutées dans la route group `apps/web/src/app/(app)/` héritent automatiquement du `AppShell` sans duplication.
