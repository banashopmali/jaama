# Spécifications Techniques — JAAMA Dashboard V1

Ce document consigne la conception technique, l'architecture fonctionnelle et la hiérarchie d'information du Tableau de Bord officiel de JAAMA (JAA-S0-04).

---

## 1. Objectif Produit & Règle des 5 Secondes

Le Tableau de Bord JAAMA V1 n'est pas un écran analytique décoratif mais une **interface d'exploitation opérationnelle**. Il doit répondre en environ 5 secondes aux 5 questions fondamentales de l'entrepreneur :

1. **Combien ai-je vendu ?** -> KPI 1 (*Ventes aujourd'hui : 425 000 FCFA*)
2. **Est-ce que ça monte ou ça baisse ?** -> KPI 1 & Graphique 7 jours (*+12,5 % vs hier*)
3. **Qu'est-ce qui demande mon attention ?** -> Panneau *À surveiller* (*Stock faible, créances, factures en retard*)
4. **Combien d'argent reste à encaisser ?** -> KPI 3 (*À encaisser : 175 000 FCFA*)
5. **Quelle est la prochaine action utile ?** -> Raccourcis *Actions rapides* & boutons d'action des alertes

---

## 2. Invariants Métier Non Négociables

### 2.1 Règle d'Indépendance Vente vs Paiement (`SALE != PAYMENT`)
- Le statut de vente (*Terminée*, *Annulée*, *Remboursée*) est strictement indépendant du statut de paiement (*Payée*, *Partiellement payée*, *À encaisser*, *Remboursée*).
- Une vente peut être commercialement `Terminée` tout en ayant un statut de paiement `Partiellement payée` (ex. Total : 75 000 FCFA, Encaissé : 50 000 FCFA, Reste à encaisser : 25 000 FCFA).
- Le Tableau de Bord ne conclut **jamais** qu'une vente terminée équivaut à un paiement perçu.

### 2.2 Représentation des Montants Financiers
- Tous les montants financiers dans le modèle sont représentés en unités entières FCFA (ex. `425000` et non `425000.00`).
- Le formatage UI est centralisé via la fonction `formatMoney(amount, currency)`.
- Aucun montant financier n'est qualifié de "bénéfice" ou "trésorerie disponible" en l'absence de données comptables d'engagement réelles.

---

## 3. Architecture Fonctionnelle & Composants

L'implémentation est structurée dans `apps/web/src/features/dashboard/` :

```
apps/web/src/features/dashboard/
├── dashboard.types.ts       # Interfaces du domaine (Snapshot, Metrics, Trends, Sales)
├── dashboard.utils.ts       # Formateur monétaire formatMoney()
├── dashboard.mock.ts        # Données de démonstration (Populated et Empty)
├── index.ts                 # Exportations publiques
└── components/
    ├── DashboardView.tsx          # Orchestrateur principal des états UI
    ├── DashboardHeader.tsx        # Message de bienvenue & sélecteur de période
    ├── DashboardMetrics.tsx       # Grille réactive des 4 cartes KPI
    ├── MetricCard.tsx             # Carte KPI unifiée avec tokens sémantiques
    ├── SalesTrendCard.tsx         # Graphique SVG 7 jours & résumé textuel sémantique
    ├── AttentionPanel.tsx         # Panneau d'alertes "À surveiller"
    ├── AttentionItem.tsx          # Carte d'alerte individuelle avec bouton d'action
    ├── RecentSales.tsx            # Conteneur des ventes récentes (Table / Liste)
    ├── RecentSalesTable.tsx       # Vue tableau desktop des ventes
    ├── RecentSalesMobileList.tsx  # Vue liste mobile des ventes
    ├── QuickActions.tsx           # Raccourcis contextuels d'exploitation
    ├── DashboardEmptyState.tsx    # Accueil guidé pour nouvelle entreprise
    ├── DashboardLoading.tsx       # Squelettes d'attente préservant la géométrie
    └── DashboardSectionError.tsx  # Alerte locale d'erreur de section avec réessai
```

---

## 4. Matrice des 4 États Obligatoires

| État | Déclenchement QA | Rendu Visuel |
| :--- | :--- | :--- |
| **POPULATED** | Mode par défaut | En-tête avec prénom et entreprise, 4 cartes KPI, graphique d'évolution 7j, panneau d'alertes, tableau des ventes récentes et 4 actions rapides. |
| **EMPTY** | `?dashboardState=empty` | Carte d'accueil guidée "Bienvenue dans JAAMA", liste d'étapes de démarrage et boutons principaux "Ajouter mes produits" et "Créer ma première vente". Pas de mer de cartes à zéro ! |
| **LOADING** | `?dashboardState=loading` | Layout complet composé d'éléments `Skeleton` reproduisant exactement la géométrie du tableau de bord pour éviter les saut de mise en page (*CLS*). |
| **PARTIAL-ERROR** | `?dashboardState=partial-error` | Les KPI, le panneau d'attention, les ventes récentes et les actions rapides restent opérationnels. Seule la section graphique affiche une alerte locale avec bouton "Réessayer". |

---

## 5. Ergonomie Réactive & Accessibilité P0

- **Desktop (>=1024px)** : Grille 4 colonnes pour les KPI, répartition 2/3 (Graphique) et 1/3 (Panneau À surveiller), tableau complet des ventes récentes.
- **Tablette (768px–1023px)** : Grille 2x2 pour les KPI, empilement équilibré des panneaux analytiques.
- **Mobile (<768px)** : Priorisation de l'attention ! Le panneau *À surveiller* apparaît avant le graphique. Les ventes récentes sont présentées sous forme de cartes d'encaissement évitant le défilement horizontal.
- **Accessibilité** :
  - Structure de titres hiérarchisée (`h1`, `h2`, `h3`, `h4`).
  - Graphique SVG muni d'un `role="img"` et d'une description textuelle complète pour les lecteurs d'écran.
  - Attributs ARIA sémantiques et indicateurs de focus visibles (`focus-visible:ring-2`).
