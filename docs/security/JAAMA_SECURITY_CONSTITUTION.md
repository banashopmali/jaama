# JAAMA — Security Constitution & Architectural Contract (P0)

> **IMPORTANT**: Ce document constitue un contrat d'architecture de sécurité de priorité zéro (P0) non-négociable pour le produit JAAMA. Toute implémentation en conflit avec cette constitution est considérée comme invalide et rejetée.

---

## 1. RÈGLE FONDAMENTALE — ZERO-TRUST INPUT VALIDATION

> **Toute donnée reçue du front-end, d’un client mobile, d’un webhook ou d’un système externe est considérée comme non fiable jusqu’à validation côté serveur.**

1. **Incompatibilité de la validation client uniquement** :
   - Les validations effectuées dans le navigateur (HTML5, formulaires React, JS) ne servent qu'à l'UX et ne constituent en aucun cas une barrière de sécurité.
   - Le serveur (API / Server Actions / Middleware) doit obligatoirement ré-exécuter l'intégralité de la validation avant tout traitement ou stockage.

2. **Validation stricte par Schémas (Strict Schema Enforcement)** :
   - Chaque point d'entrée serveur (endpoint API, webhook, action serveur) doit valider le type, la longueur, la structure, la plage de valeurs et le format des données entrantes.
   - Les entrées inattendues ou non déclarées dans le schéma doivent être automatiquement rejetées (fail-closed).

3. **Assainissement des Données (Sanitization)** :
   - Neutralisation systématique des caractères et séquences dangereuses (prévention XSS, SQLi, Command Injection).

---

## 2. AUTHENTIFICATION & GESTION DES SESSIONS

1. **Gestion des Secrets et Mots de Passe** :
   - Aucun mot de passe en clair dans la base de données ou les logs.
   - Hachage obligatoire via **Argon2id** ou **bcrypt** avec facteur de coût conforme aux recommandations OWASP.

2. **Stockage et Transports des Tokens** :
   - Les tokens de session et JWT doivent être transportés exclusivement dans des cookies sécurisés `HttpOnly`, `Secure`, `SameSite=Strict`.
   - Durée de vie minimale recommandée pour les tokens d'accès avec mécanisme de rafraîchissement (refresh token rotation).

3. **Protection contre la Force Brute** :
   - Rate limiting (limitation de débit) strict sur tous les endpoints d'authentification et de réinitialisation de mot de passe.

---

## 3. ISOLATION MULTI-TENANT & CONTRÔLE D'ACCÈS (RBAC / ABAC)

1. **Isolation Stricte des Données Entreprises (Tenants)** :
   - Toute requête en base de données doit inclure explicitement et vérifier le contexte du `tenant_id` de l'utilisateur authentifié.
   - Empêcher l'accès direct aux objets (**IDOR / BOLA**) : la possession d'un identifiant de ressource ne suffit pas ; l'appartenance à l'entreprise doit être formellement validée côté serveur.

2. **Moindre Privilège** :
   - Chaque rôle (Administrateur, Caissier, Comptable, Vendeur) dispose uniquement des autorisations minimales nécessaires à ses fonctions.

---

## 4. SÉCURITÉ DES WEBHOOKS & PAIEMENTS (MOBILE MONEY)

1. **Vérification Cryptographique des Webhooks** :
   - Tout webhook entrant (Wave, Orange Money, MTN Mobile Money, Stripe) doit faire l'objet d'une vérification de signature HMAC-SHA256 côté serveur avant tout traitement.

2. **Prévention contre les Attaques par Rejeu (Replay Attacks)** :
   - Horodatage obligatoire des webhooks (fenêtre de tolérance maximale de 5 minutes).
   - Traitement strictement idempotent des transactions financières via clés d'idempotence uniques.

---

## 5. PROTECTION CONTRE LES ATTAQUES COURANTES (OWASP TOP 10)

1. **SQL / NoSQL Injection** :
   - Utilisation obligatoire de requêtes paramétrées / préparées via ORM ou Query Builder sécurisé.
   - Interdiction absolue de la concaténation de chaînes dans les requêtes SQL.

2. **Cross-Site Scripting (XSS)** :
   - Échappement automatique de toute donnée dynamique affichée dans le HTML.
   - Configuration d'en-têtes HTTP de sécurité stricts (CSP, X-Content-Type-Options, Referrer-Policy).

3. **Cross-Site Request Forgery (CSRF)** :
   - Validation des origines et utilisation de tokens anti-CSRF pour les requêtes modifiant l'état.

---

## 6. JOURNALISATION & AUDIT SECURITY LOGS

1. **Traçabilité des Actions Sensibles** :
   - Les événements majeurs (tentatives de connexion, modifications de droits, suppressions, paiements, anomalies) doivent être enregistrés dans un journal d'audit immuable.

2. **Confidentialité des Logs** :
   - Masquage / Rédaction automatique des données sensibles dans les journaux d'exécution (clés d'API, tokens, numéros de carte, mots de passe, téléphones).

---

## 7. DISCIPLINE DE DÉVELOPPEMENT & NON-CONTOURNEMENT

1. **Interdiction de contournement** :
   - Il est strictement interdit de désactiver, supprimer ou affaiblir un contrôle de sécurité ou un test de sécurité dans le seul but de faire passer un build ou une intégration.
2. **Priorité Sécurité** :
   - Si une fonctionnalité entre en conflit avec cette constitution, l'implémentation est considérée comme incorrecte et doit être révisée.
