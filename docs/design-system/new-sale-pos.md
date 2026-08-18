# Spécifications Techniques — JAAMA New Sale / POS V1

Ce document consigne la conception technique, l'architecture fonctionnelle et le contrat d'interface du terminal de saisie de vente et point de vente (POS) officiel de JAAMA (JAA-S0-06).

---

## 1. Objectif Produit & Parcours Vendeur

Le module Point de Vente (route `/ventes/nouvelle`) est l'**interface de création de vente et d'encaissement** de JAAMA. Il permet au vendeur d'exécuter le parcours commercial rapide :

1. **Rechercher & Sélectionner** les articles dans le catalogue tactile.
2. **Ajuster les Quantités** et appliquer une remise éventuelle sur le panier.
3. **Associer un Client** (`Client comptoir` par défaut ou client enregistré).
4. **Sélectionner le Mode de Règlement** (Espèces, Wave, Orange Money, Virement, Carte, Crédit, Mixte).
5. **Définir le Montant Perçu** et calculer la monnaie à rendre ou le solde restant.
6. **Récapituler & Confirmer** la vente sous forme de simulation frontend déterministe (`VTE-0025`).

---

## 2. Invariant Métier Fondamental (`SALE != PAYMENT`)

La création de vente génère un événement commercial (`saleStatus: "Terminée"`) et dérive son statut de paiement indépendamment :

- **Paiement Intégral (`Payée`)** : Total 25 000 FCFA, Perçu 25 000 FCFA, Reste 0 FCFA.
- **Paiement Partiel (`Partiellement payée`)** : Total 75 000 FCFA, Perçu 50 000 FCFA, Reste 25 000 FCFA.
- **Vente à Crédit (`À encaisser`)** : Total 35 000 FCFA, Perçu 0 FCFA, Mode Crédit, Reste 35 000 FCFA.

La confirmation de vente ne présume **jamais** un paiement intégral automatique.

---

## 3. Dispositions Ergonomiques & Responsive

- **Desktop (>=1024px)** : Layout 2 panneaux côte à côte :
  - Gauche (60–65%) : Catalogue produits toujours visible.
  - Droite (35–40%) : Panier sticky, puis bascule vers la caisse/règlement.
- **Mobile (<1024px — 390px)** : Machine d'état par étapes totalement étanche (`catalog` $\rightarrow$ `cart` $\rightarrow$ `checkout` $\rightarrow$ `success`) sans superposition ni fuite visuelle de catalogue lors du panier ou du règlement.

---

## 4. Modèle de Données, Intégrité du Paiement & Calculs Financiers

- **Montants Entiers XOF** : Tous les prix et montants sont stockés sous forme d'entiers numériques (FCFA) sans représentation flottante.
- **Source Unique de Vérité (`calculateAppliedPaidAmount`)** :
  - **Espèces (`cash`)** : Les espèces perçues (`cashReceivedInput`) peuvent dépasser le total pour calculer la monnaie à rendre (`changeDue`), mais le montant perçu appliqué à la vente est plafonné au total (`totalAmount`).
  - **Non-Espèces (Wave, OM, Carte, Virement)** : Le montant encaissé ne peut pas dépasser le total de la vente (rejet avec alerte d'erreur inline).
  - **Crédit (`credit`)** : Représente le solde non perçu initial (montant encaissé perçu = 0 FCFA). Le crédit n'est PAS un mode d'allocation d'encaissement mixte.
  - **Règlement Mixte (`mixed`)** : Restreint aux modes d'encaissement réels (`cash`, `wave`, `orange_money`, `bank_transfer`, `card`). Le total distribué ne peut dépasser le total de la vente et chaque allocation doit être > 0 FCFA.
- **Référence Déterministe Mock** : `VTE-0025` pour toute confirmation frontend S0-06 avec mention explicite *SIMULATION FRONTEND — AUCUNE PERSISTANCE SERVEUR*.

---

## 5. Architecture Serveur / Isolât Client & Accessibilité

- **Page serveur (`apps/web/src/app/(app)/ventes/nouvelle/page.tsx`)** : Route RSC résolvant le paramètre d'assurance qualité `searchParams.posState`.
- **`PosView.tsx`** : Composant serveur d'orchestration.
- **`PosInteractiveSection.tsx`** : **Isolât client unique** (`"use client"`) basé sur un réducteur d'état (`useReducer`) centralisant la navigation du catalogue, la gestion du panier et l'étape de règlement.
- **Accessibilité ProductCard** : Les cartes produits ne contiennent aucun contrôle interactif imbriqué. La carte est de présentation et le bouton d'ajout constitue le seul contrôle réactif accessible au clavier.

---

## 6. Matrice des États UI (QA Params)

| État | Déclenchement QA | Rendu Visuel |
| :--- | :--- | :--- |
| **READY** | Par défaut | Catalogue produits complet, panier réactif, sélection de mode de règlement et confirmation. |
| **EMPTY-CATALOG** | `?posState=empty-catalog` | Carte d'accueil "Aucun produit disponible dans le catalogue" avec CTA vers `/produits`. |
| **LOADING** | `?posState=loading` | Layout squelette `Skeleton` reproduisant la géométrie 2 panneaux du POS. |
| **ERROR** | `?posState=error` | Alerte d'erreur locale "Impossible de charger le point de vente" avec bouton accessible `Réessayer` (`/ventes/nouvelle`). |

---

## 7. Note sur les Fondations Futures (JAA-S0-07 à JAA-S0-17)

Cette étape (JAA-S0-06) implémente l'expérience produit et la logique interactive côté frontend. L'exécution autoritaire serveur, la persistance PostgreSQL, la résolution multi-tenant, la mutation réelle des stocks, les intégrations avec les prestataires de paiement (Wave/OM) et le moteur de reçu seront introduits lors des tickets d'architecture suivants (JAA-S0-07 à JAA-S0-17).
