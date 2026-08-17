# Invariants Visuels Produit Verrouillés (Locked Decisions)

Ce document consigne les décisions de design et d'architecture d'interface validées pour le produit JAAMA.

---

## 1. Systèmes Verrouillés Dans Stitch

### JAAMA APP SHELL V1 — LOCKED
- Layout avec barre de navigation latérale (Sidebar) rétractable et en-tête supérieur (Topbar) fixe.
- Fond d'application neutre `#F8FAFC`.
- Espacement et compacité maîtrisés pour minimiser le défilement inutile.

### JAAMA DASHBOARD V1 — LOCKED
- Cartes KPI synthétiques avec typographie lisible.
- Graphiques d'activité épurés (pas de dégradés agressifs ni de fioritures 3D).
- Présentation en grilles réactives adaptées aux terminaux tactiles.

### JAAMA SALES LIST V1 — LOCKED DESIGN REFERENCE
- Liste des ventes avec filtres rapides par période et statut de paiement (Payé, En attente, Annulé).
- Badges de statut sémantiques discrets.
- Actions rapides (Imprimer la facture, Envoyer par WhatsApp/SMS).

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
- Ne jamais restituer le logo dans un rectangle blanc/coloré artificiel sur fond sombre : utiliser ou exiger l'asset transparent officiel.
- Ne jamais déformer, étirer ou recolorer le logo.
- Ne pas recréer le logo en simple texte lorsque l'asset officiel est requis.

---

## 4. Accessibilité Baseline (P0)

- Navigation complète au clavier (`Tab`, `Shift+Tab`, `Enter`, `Space`).
- Indicateurs de focus visibles (`ring-2 ring-offset-2`).
- Contrastes de couleurs conformes WCAG AA.
- Attributs `aria-invalid`, `aria-label`, `aria-describedby` appliqués rigoureusement.
- Respect de la préférence système `prefers-reduced-motion`.
