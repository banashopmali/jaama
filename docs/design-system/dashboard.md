# Spécifications Techniques — JAAMA Dashboard V1

Ce document consigne la conception technique, l'architecture fonctionnelle et la hiérarchie d'information du Tableau de Bord officiel de JAAMA (JAA-S0-04).

---

## 1. Objectif Produit & Règle des 5 Secondes

Le Tableau de Bord JAAMA V1 est une **interface d'exploitation opérationnelle**. Il répond en environ 5 secondes aux 5 questions fondamentales de l'entrepreneur :

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
- Le Tableau de Bord ne présente **jamais** la création d'une vente comme un encaissement direct (ex. action rapide : *"Enregistrer une nouvelle vente"*).

### 2.2 Tableau Desktop des Ventes Récentes (Contrat des 6 Colonnes Canoniques)
Le tableau desktop comporte obligatoirement les six colonnes d'exploitation suivantes :
1. **Référence** (ex. `VTE-0023`)
2. **Client** (ex. `Awa Traoré`)
3. **Montant** (ex. `75 000 FCFA`)
4. **Encaissé** (ex. `50 000 FCFA` avec mention secondaire `Reste : 25 000 FCFA`)
5. **Statut paiement** (Badge *Partiellement payée*)
6. **Heure** (ex. `12:15`)

### 2.3 Données de Tendance Numériques
Les valeurs de tendance dans le modèle de données sont numériques (`value: 12.5` ou `value: 3`). La mise en forme (`+12,5 %`, `+3`) est assurée par le formateur de présentation `formatTrend(trend)`.

---

## 3. Architecture Serveur / Isolâts Clients

Le composant principal `DashboardView` et la page `app/(app)/page.tsx` sont rendus côté serveur (RSC) :

```
Server Page (page.tsx)
    │  (résout searchParams.dashboardState)
    ▼
DashboardView (Server Component)
    ├── DashboardHeader (Server Component)
    │     └── PeriodSelector (Client Island - isolât dropdown)
    ├── DashboardMetrics (Server Component)
    ├── SalesTrendSection (Client Island - isolât réessai erreur partielle)
    ├── AttentionPanel (Server Component)
    ├── RecentSales (Server Component)
    └── QuickActions (Server Component)
```

---

## 4. Matrice des 4 États UI

| État | Déclenchement QA | Rendu Visuel |
| :--- | :--- | :--- |
| **POPULATED** | Mode par défaut | En-tête avec prénom et entreprise, 4 cartes KPI avec tendances numériques formatées, graphique 7j, panneau d'alertes, tableau 6 colonnes et 4 actions rapides. |
| **EMPTY** | `?dashboardState=empty` | Carte d'accueil guidée "Bienvenue dans JAAMA", liste d'étapes et boutons "Ajouter mes produits" et "Créer ma première vente". Aucune fausse marque [J] dessinée. |
| **LOADING** | `?dashboardState=loading` | Layout composé d'éléments `Skeleton` reproduisant la géométrie exacte du tableau de bord. |
| **PARTIAL-ERROR** | `?dashboardState=partial-error` | Les KPI, le panneau d'attention et le tableau 6 colonnes restent fonctionnels. Seul le graphique affiche une alerte avec bouton "Réessayer". |
