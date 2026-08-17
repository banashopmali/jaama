# Spécifications Techniques — JAAMA App Shell V1

Ce document consigne la conception technique et l'architecture fonctionnelle du Shell d'application JAAMA (JAA-S0-03).

---

## 1. Vue d'Ensemble

Le Shell d'application constitue le cadre de navigation persistant de l'application web JAAMA (`apps/web`). Il encadre les futures vues métier (`Dashboard`, `Ventes`, `Produits`, `Stocks`, `Clients`, `Factures`, `Paiements`, `Rapports`, `Paramètres`).

```
+-------------------------------------------------------------------+
|                        MobileHeader (<768px)                      |
+-------------------+-----------------------------------------------+
|                   | Topbar (>=768px)                              |
| Sidebar (>=768px) +-----------------------------------------------+
|  - Logo           |                                               |
|  - Business Select| AppContent Canvas                             |
|  - Modules        |  - Skip link                                  |
|  - Utilities      |  - Page Content                               |
|  - Collapse Ctrl  |                                               |
+-------------------+-----------------------------------------------+
|                     MobileBottomNav (<768px)                      |
+-------------------------------------------------------------------+
```

---

## 2. Décisions d'Architecture & Contrats

### 2.1 Routage & Single Source of Truth
- Le composant `AppShellContext` ne maintient aucun état d'itinéraire réinventé (`activePath`).
- L'URL gérée par le routeur Next.js (`usePathname()`) est la seule source de vérité.
- Le helper canonique `isRouteActive(pathname, href)` régit la détection du statut actif (`aria-current="page"`) :
  - `href = "/"` -> actif uniquement sur la racine exacte `/`.
  - `href = "/ventes"` -> actif sur `/ventes` ainsi que les sous-voies `/ventes/123`.

### 2.2 Isolement des En-têtes & Réactivité Séquentielle
- **Mobile (<768px)** : Seul `MobileHeader` est affiché. L'en-tête `Topbar` possède la classe `hidden md:flex` et est strictement masqué sur mobile.
- **Tablette (768px–1023px)** : La sidebar est automatiquement réduite à `80px` (`w-20 lg:w-64`). Seul le logo compact officiel est affiché. Le contrôle de réduction manuelle est masqué (`hidden lg:block`).
- **Desktop (>=1024px)** : La largeur de la sidebar suit la préférence de réduction de l'utilisateur stockée dans `localStorage` (`jaama.sidebar.collapsed`).

### 2.3 Asset Logo Officiel JAAMA
- Tous les composants (`SidebarHeader`, `MobileHeader`, `JaamaLogo`) consomment l'asset officiel du dépôt (`/assets/jaama_logo.jpeg`).
- Aucune reconstruction manuelle de badge "J", de texte logo redessiné ou de mention "Gestion SaaS" inventée n'est autorisée.
- `TRANSPARENT OFFICIAL JAAMA LOGO ASSET REQUIRED` : L'asset JPEG actuel est conservé sans déformation ni bidouillage CSS dans l'attente du fichier SVG officiel.

### 2.4 Structure de Navigation & Utilitaires Fixes
- **Modules Métier Défilants** : `SidebarNav` gère la zone défilante (`flex-1 overflow-y-auto`) contenant `PRINCIPAL`, `OPÉRATIONS`, `FINANCES` et `ANALYSE` (incluant le module `Plus`).
- **Utilitaires Bas de Page Fixes** : Les liens `Paramètres` et `Aide & support` sont ancrés dans un conteneur fixe au bas de la barre latérale pour éviter qu'une longue liste de modules ne les masque hors écran.
- **Dérivation Mobile** : Les destinations mobiles (`MobileBottomNav`) sont dérivées dynamiquement de la configuration canonique `navigationConfig` via `getMobileBottomNavDestinations()`.

### 2.5 Support Safe-Area Mobile
- `MobileBottomNav` intègre le style `pb-[env(safe-area-inset-bottom,0px)]` pour garantir un espace de navigation confortable de 64px même sur les terminaux munis d'un barreau de balayage (ex. iPhone).

---

## 3. Matrice des Composants

| Composant | Rôle & Responsabilité | Clés d'Accessibilité / Réactivité |
| :--- | :--- | :--- |
| `AppShell` | Conteneur racine avec `AppShellProvider`. | Navigation au clavier, layout flex. |
| `Sidebar` | Barre latérale desktop/tablette (256px / 80px). | `hidden md:flex flex-col h-screen sticky`. |
| `SidebarHeader` | Zone supérieure avec logo officiel JAAMA. | Affichage du logo compact sur tablette. |
| `WorkspaceSwitcher` | Sélecteur d'entreprise active (`Diallo Commerce`). | `role="listbox"`, `aria-expanded`. |
| `SidebarNav` | Zone défilante des modules métier. | `flex-1 overflow-y-auto`, `aria-label`. |
| `SidebarNavItem` | Lien de navigation réutilisable. | `aria-current="page"`, tooltips au survol. |
| `SidebarCollapseButton` | Bascule de réduction desktop uniquement. | `hidden lg:block`, persistance `localStorage`. |
| `Topbar` | En-tête supérieur desktop (64px). | `hidden md:flex`, titre dynamique via `getPageTitle()`. |
| `GlobalSearch` | Raccourci de recherche global avec `Ctrl+K`. | `aria-label`, écouteur de clavier global. |
| `MobileHeader` | En-tête compact mobile (<768px). | `md:hidden`, logo mobile + store badge. |
| `MobileBottomNav` | Barre de navigation inférieure à 5 onglets. | `md:hidden`, onglets dérivés, support safe-area. |
| `AppContent` | Canevas de contenu principal. | Lien d'évitement (`#main-content`), `tabIndex={-1}`. |

---

## 4. Stratégie des Routes Neutres de Démonstration

Pour permettre la validation QA du routage sans développer les écrans métier :
- Des pages neutres sont créées dans `apps/web/src/app/(app)/` (`/ventes`, `/produits`, `/stocks`, `/clients`, `/factures`, `/paiements`, `/rapports`, `/parametres`, `/aide`, `/menu`).
- Chaque page rend le composant `ModulePlaceholder` indiquant `"Module à venir"`.
- Aucun indicateur financier ou faux graphique métier n'est introduit.
