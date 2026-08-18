# Invariants Visuels Produit Verrouillés (Locked Decisions)

Ce document consigne les décisions de design et d'architecture d'interface validées pour le produit JAAMA.

---

## 1. Systèmes Verrouillés Dans Stitch

### JAAMA APP SHELL V1 — DESIGN LOCKED & ENGINEERING IMPLEMENTED IN JAA-S0-03
- Layout avec barre de navigation latérale (Sidebar) rétractable (`256px` étendue / `80px` réduite) et en-tête supérieur (Topbar) fixe (`64px`).
- Navigation réactive mobile avec en-tête compact et barre de navigation inférieure à 5 destinations (`MobileBottomNav`).
- Persistance de la préférence de réduction de la sidebar dans le `localStorage` (`jaama.sidebar.collapsed`).
- Navigation pilotée par la configuration (`navigationConfig`).
- Sélecteur d'entreprise active (`Diallo Commerce` / `Mali`).
- Fond d'application neutre sémantique (`#F8FAFC`).
- Espacement et compacité maîtrisés pour minimiser le défilement inutile.

### JAAMA DASHBOARD V1 — DESIGN LOCKED & ENGINEERING IMPLEMENTED IN JAA-S0-04
- Cartes KPI synthétiques avec typographie lisible (*Ventes aujourd'hui*, *Nombre de ventes*, *À encaisser*, *Stock à surveiller*).
- Graphiques d'activité épurés SVG sur 7 jours (pas de dégradés agressifs ni de fioritures 3D).
- Panneau *À surveiller* synthétisant les alertes de créances, de stock et de facturation.
- Présentation en grilles réactives adaptées aux terminaux tactiles (Desktop 4-cols, Tablette 2x2, Mobile cartes/listes).
- Gestion native des 4 états UI (*Populated*, *Guided Empty*, *Skeleton Loading*, *Partial Section Error*).

### JAAMA SALES LIST V1 — DESIGN LOCKED & ENGINEERING IMPLEMENTED IN JAA-S0-05
- **Séparation stricte entre Statut de Vente et Statut de Paiement (`SALE != PAYMENT`)** :
  - **STATUT DE VENTE (SALE STATUS)** :
    - `Terminée` (Vente validée et livraison/délivrance effectuée)
    - `Annulée` (Vente annulée)
    - `Remboursée` (Vente intégralement remboursée)
    - `Partiellement remboursée` (Vente ayant fait l'objet d'un remboursement partiel)
  - **STATUT DE PAIEMENT (PAYMENT STATUS)** :
    - `Payée` (Règlement intégral perçu)
    - `Partiellement payée` (Acompte ou paiement partiel perçu)
    - `À encaisser` (Paiement en attente d'encaissement / crédit client)
    - `Remboursée` (Fonds restitués au client)
- **Règle Métier d'Indépendance** : Une vente peut être commercialement `Terminée` tout en ayant un statut de paiement `Partiellement payée` (ex. Total vente : 100 000 FCFA, Encaissé : 70 000 FCFA, Reste à encaisser : 30 000 FCFA -> Statut Vente = `Terminée`, Statut Paiement = `Partiellement payée`).
- Tableau desktop réactif à 10 colonnes canoniques et cartes mobiles adaptées 390px.
- 4 cartes de synthèse financière (`Ventes`, `Montant des ventes`, `Encaissé`, `À encaisser`).
- Filtrage réactif par recherche textuelle, statut de paiement et mode de paiement sans appel backend.
- Prise en charge des clients au comptoir (`Client comptoir`).
- Gestion native des 4 états UI (*Populated*, *Guided Empty*, *No Results*, *Skeleton Loading*, *Section Error*).

### JAAMA NEW SALE / POS V1 — DESIGN LOCKED & ENGINEERING IMPLEMENTED IN JAA-S0-06
- **Terminal de Saisie de Vente & Point de Vente (POS)** : Route `/ventes/nouvelle` héritant de l'AppShell permanent.
- Layout 2 panneaux desktop (Catalogue à gauche, Panier & Règlement à droite) et machine d'état mobile par étapes (`catalog` $\rightarrow$ `cart` $\rightarrow$ `checkout` $\rightarrow$ `success`).
- Recherche locale réactive par nom ou SKU et filtrage tactile par catégories.
- Cartes produits interactives avec indicateurs visuels de stock (`Rupture de stock` désactivée, `Stock faible`, `Stock disponible`).
- Contrôle strict des quantités et protection contre le dépassement du stock disponible.
- Client par défaut `Client comptoir` (vente au comptoir) avec possibilité d'associer un client enregistré.
- Sélection tactile des modes de règlement (`Espèces`, `Wave`, `Orange Money`, `Virement`, `Carte`, `Crédit`, `Mixte`).
- Calcul de monnaie rendue en espèces et soutien des règlements mixtes multi-modes.
- Dérivation automatique du statut de paiement (`Payée`, `Partiellement payée`, `À encaisser`) respectant l'invariant `SALE != PAYMENT`.
- Récapitulatif avant confirmation et écran de confirmation de vente enregistrée (`VTE-0025`).
- Gestion native des états UI (*Ready*, *Empty Catalog*, *Skeleton Loading*, *Local Error*).

---

## 2. Charte Visuelle & Identité

1. **Typographie** : Plus Jakarta Sans (titres affirmés, corps confortable).
2. **Couleur Dominante** : Bleu JAAMA Royal `#002B9A`.
3. **Couleurs Secondaires & Ruptures** : Deep Navy `#0B1936`, Fond Bleu Clair `#F0F4FF`.
4. **Interdictions Absolues** :
   - Pas de dégradés arc-en-ciel ou agressifs.
   - Pas de glassmorphism / néon.
   - Pas de boutons minuscules.
   - Pas de clichés ou stéréotypes graphiques inutiles.

---

## 3. Contrat du Logo Officiel JAAMA

- Le logo officiel doit toujours posséder une présence forte et lisible.
- Ne jamais restituer le logo dans un rectangle blanc/coloré artificiel sur fond sombre : utiliser ou exiger l'asset transparent officiel (`TRANSPARENT OFFICIAL LOGO ASSET REQUIRED`).
- Ne jamais déformer, étirer ou recolorer le logo.
- Ne pas recréer le logo en simple texte lorsque l'asset officiel est requis.

---

## 4. Accessibilité Baseline (P0)

- Navigation complète au clavier (`Tab`, `Shift+Tab`, `Enter`, `Space`).
- Indicateurs de focus visibles (`ring-2 ring-offset-2`).
- Contrastes de couleurs conformes WCAG AA.
- Attributs `aria-invalid`, `aria-label`, `aria-describedby`, `aria-current="page"` appliqués rigoureusement.
- Lien d'évitement accessible (`Passer au contenu principal`).
- Respect de la préférence système `prefers-reduced-motion`.
