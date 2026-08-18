# Spécifications Techniques — JAAMA Sales List V1

Ce document consigne la conception technique, l'architecture fonctionnelle et la hiérarchie d'information du module de Liste des Ventes officiel de JAAMA (JAA-S0-05).

---

## 1. Objectif Produit & Règle des 5 Secondes

Le module Liste des Ventes (route `/ventes`) est l'**interface opérationnelle d'exploitation commerciale** de JAAMA. En moins de 5 secondes, l'entrepreneur répond aux questions essentielles :

1. **Combien ai-je vendu ?** -> Synthèse : *Montant des ventes* (`1 425 000 FCFA`)
2. **Combien a réellement été perçu ?** -> Synthèse : *Encaissé* (`1 050 000 FCFA`)
3. **Combien reste-t-il à percevoir ?** -> Synthèse : *À encaisser* (`375 000 FCFA`)
4. **Quelles sont les ventes impayées ou partielles ?** -> Tableau & cartes avec badges et montants restants explicites.
5. **Où est la transaction cherchée ?** -> Champ de recherche instantané par référence ou nom de client.
6. **Comment démarrer une nouvelle vente ?** -> Bouton CTA principal `+ Nouvelle vente` (`/ventes/nouvelle`).

---

## 2. Invariant Métier Fondamental (`SALE != PAYMENT`)

Le statut de vente (*Terminée*, *Annulée*, *Remboursée*) est **strictement indépendant** du statut de paiement (*Payée*, *Partiellement payée*, *À encaisser*, *Remboursée*).

- Une vente `Terminée` peut posséder un statut de paiement `Partiellement payée` (ex. Total : 75 000 FCFA, Perçu : 50 000 FCFA, Reste : 25 000 FCFA).
- Une vente `Terminée` peut posséder un statut de paiement `À encaisser` (ex. Vente à crédit de 35 000 FCFA, Perçu : 0 FCFA).
- **Ventes Annulées (`Annulée`)** : Une vente annulée ne présente **aucun montant restant à encaisser** (`remainingAmount === 0`). Elle ne constitue pas une créance active.
- Le modèle de données ne fusionne **jamais** les statuts de vente et de paiement.

---

## 3. Contrat Visuel Desktop (10 Colonnes Canoniques)

Le tableau desktop (écrans >=768px) comporte les **10 colonnes obligatoires** suivantes :
1. **Référence** (ex. `VTE-0023`)
2. **Date / heure** (ex. `17/08/2026 12:15`)
3. **Client** (ex. `Awa Traoré` ou `Client comptoir`)
4. **Articles** (ex. `4 articles`)
5. **Montant** (ex. `75 000 FCFA`)
6. **Encaissé** (ex. `50 000 FCFA` avec mention `Reste : 25 000 FCFA`)
7. **Mode de paiement** (ex. `Wave`)
8. **Statut paiement** (Badge *Partiellement payée*)
9. **Vendeur** (ex. `Hamidou`)
10. **Actions** (Bouton d'action désactivé avec message d'indisponibilité temporaire *"Détail de la vente VTE-0023 bientôt disponible"*)

---

## 4. Expérience Tactile Mobile (390px)

Sur mobile, le tableau desktop laisse place à une liste de cartes optimisées pour la manipulation à une main, selon l'ordre de priorité visuelle :
1. Référence & Date/heure
2. Nom du client & nombre d'articles
3. Montant total & badges de statut
4. Bloc d'encaissement (Encaissé / Reste)
5. Mode de paiement, vendeur & bouton d'action

---

## 5. Architecture Serveur / Isolâts Clients

- **Page serveur (`apps/web/src/app/(app)/ventes/page.tsx`)** : Rendu RSC résolvant `searchParams.salesState`.
- **`SalesListView.tsx`** : Composant serveur orchestrant l'en-tête, les cartes de synthèse globales et les différents états d'affichage.
- **`SalesListInteractiveSection.tsx`** : **Isolât client unique** (`"use client"`) gérant l'état local de recherche, les sélecteurs de filtre et le filtrage réactif du jeu de données.
- **Composants de présentation réutilisables** (`SalesHeader`, `SalesSummary`, `SalesTable`, `SalesMobileList`, `PaymentStatusBadge`, `SalesEmptyState`, `SalesLoading`, `SalesListError`) : Conçus comme des **composants de présentation compatibles serveur**. Lorsqu'ils sont rendus au sein d'un isolât client (`SalesListInteractiveSection`), ils s'exécutent comme descendants rendus côté client sans imposer la directive `"use client"` dans leurs propres fichiers sources.

---

## 6. Matrice des États UI

| État | Déclenchement QA | Rendu Visuel |
| :--- | :--- | :--- |
| **POPULATED** | Par défaut | Synthèse des 4 métriques, filtres actifs, tableau desktop 10 colonnes et cartes mobiles. |
| **EMPTY** | `?salesState=empty` | Carte d'accueil "Aucune vente pour le moment" avec CTA "Créer ma première vente". Pas de cartes KPI pleines de zéros. |
| **NO-RESULTS** | Filtres sans correspondance | Message "Aucune vente ne correspond à vos filtres" avec bouton "Réinitialiser les filtres". |
| **LOADING** | `?salesState=loading` | Layout d'éléments `Skeleton` reproduisant exactement la géométrie du tableau des ventes. |
| **ERROR** | `?salesState=error` | Alerte d'erreur locale "Impossible de charger les ventes" avec bouton accessible `Réessayer` (`/ventes`) sans casser l'AppShell. |
