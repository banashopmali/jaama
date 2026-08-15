# JAAMA — Security Constitution & Architectural Contract (P0)

> **IMPORTANT**: Ce document constitue un contrat d'architecture de sécurité de priorité zéro (P0) non-négociable pour le produit JAAMA. Toute implémentation en conflit avec cette constitution est considérée comme invalide et rejetée.

---

## 1. RÈGLE FONDAMENTALE — ZERO-TRUST INPUT VALIDATION

> **Toute donnée reçue du front-end, d’un client mobile, d’un webhook ou d’un système externe est considérée comme non fiable jusqu’à validation côté serveur.**

1. **Incompatibilité de la validation client uniquement** :
   - Les validations effectuées dans le navigateur ou le client mobile (HTML5, formulaires React, validation Flutter/Dart) ne servent qu'à l'expérience utilisateur (UX) et ne constituent en aucun cas une barrière de sécurité.
   - Le serveur (API / Server Actions / Middleware) doit obligatoirement ré-exécuter l'intégralité de la validation avant tout traitement ou stockage.

2. **Validation stricte par Schémas (Strict Schema Enforcement)** :
   - Chaque point d'entrée serveur (endpoint API, webhook, action serveur) doit valider le type, la longueur, la structure, la plage de valeurs et le format des données entrantes.
   - Les identifiants (`id`, `organizationId`, `tenantId`, `userId`, `roleId`), objets et données de charges utiles envoyés par le client sont toujours considérés comme non fiables et doivent être validés.
   - Les entrées inattendues ou non déclarées dans le schéma doivent être automatiquement rejetées (fail-closed).

3. **Assainissement des Données (Sanitization)** :
   - Neutralisation systématique des caractères et séquences dangereuses (prévention XSS, SQLi, Command Injection).

---

## 2. GESTION DES VARIABLES D'ENVIRONNEMENT ET DES SECRETS (STANDARD ENVIRONMENT VARIABLES & SECRETS)

1. **Séparation Stricte entre Variables Publiques et Secrets Serveur** :
   - **PUBLIC VARIABLES** : Variables explicitement conçues pour être exposées au navigateur ou au client mobile (ex. Next.js : `NEXT_PUBLIC_*`). Elles sont considérées comme PUBLIQUES par définition. Ne jamais y placer d'information sensible.
   - **SERVER-ONLY VARIABLES** : Toute variable sans préfixe public contenant notamment :
     - Database credentials
     - Service-role keys (ex. Supabase service_role, Admin SDKs)
     - Payment provider secrets (Wave, Orange Money, MTN, Stripe API keys & webhook secrets)
     - JWT private keys / signing secrets
     - Webhook signing secrets
     - Redis / Cache credentials
     - Encryption keys / Master keys
     - SMTP / Email provider credentials
     - Cloud storage private credentials (S3, Cloudinary private keys)
     doit rester exclusivement accessible au code exécuté côté serveur.

2. **Règles Obligatoires de Sécurisation des Secrets** :
   - **Aucun secret dans le frontend** (web, SPA, React components).
   - **Aucun secret dans l'application mobile Flutter**.
   - **Aucun secret dans un bundle navigateur** ou fichier statique compilé.
   - **Aucun secret dans Git** (code source, commits, issues, PRs).
   - **Aucun secret dans les logs** (d'exécution, d'erreur ou d'audit).
   - Fichiers `.env.local`, `.env.production` et tous fichiers contenant de vrais secrets ne doivent jamais être commités.
   - Fichier `.env.example` ne doit contenir aucune vraie valeur ni secret réel.
   - Le code serveur accède aux secrets exclusivement via l'environnement d'exécution ou un Secret Manager sécurisé.
   - Le simple fait qu'une valeur soit dans `.env.local` ne signifie PAS qu'elle est sécurisée si elle est ensuite référencée ou exposée dans du code client.
   - Validation centralisée obligatoire des variables d'environnement au démarrage du serveur (ex. via Zod / schema validator).
   - En production, privilégier l'utilisation du Secret Management natif de la plateforme d'exécution (Vercel, AWS Secrets Manager, Vault).
   - Secret scanning obligatoire automatisé dans le pipeline CI/CD.
   - **Interdiction absolue** : Ne jamais déplacer un secret vers une variable publique (`NEXT_PUBLIC_*`) pour résoudre un problème d'implémentation ou de configuration.

---

## 3. PIPELINE DE SÉCURITÉ DES REQUÊTES (JAAMA SECURITY REQUEST PIPELINE)

Tout traitement de requête entrante au sein de JAAMA doit obligatoirement suivre la séquence de sécurité P0 suivante :

```
Request
  ↓
Edge Protection / Rate Limiting
  ↓
Authentication
  ↓
Tenant Resolution
  ↓
Membership Validation
  ↓
RBAC / Permission
  ↓
Resource Ownership
  ↓
Input Validation
  ↓
Business Invariants
  ↓
Transaction / Idempotency / Concurrency Control (lorsque applicable)
  ↓
Audit / Domain Event
  ↓
Response
```

**Directives du Pipeline P0** :
1. **Non-substituabilité** : Aucune étape ne remplace ni ne dispense de l'exécution de la suivante.
2. **Authentification vs Autorisation** : Un utilisateur authentifié n'est pas automatiquement autorisé à exécuter une action ou accéder à une ressource.
3. **Isolation Tenant** : Un token valide n'autorise jamais l'accès à une ressource appartenant à un autre tenant/organisation.
4. **Limites du Middleware Global** : Un middleware global d'authentification constitue uniquement la première barrière de sécurité. Il ne remplace jamais :
   - L'isolation multi-tenant (`tenant_id`)
   - La validation de l'appartenance à l'organisation (membership validation)
   - Le contrôle d'accès basé sur les rôles (RBAC)
   - L'autorisation au niveau objet (object-level authorization / resource ownership)
   - Les règles métier et invariants de domaine.

---

## 4. AUTHENTICATION & AUTHENTICATION MIDDLEWARE

1. **Couche d'Authentification Centralisée** :
   - Les routes privées doivent être protégées par une couche d'authentification centralisée lorsque l'architecture le permet.
   - Cette couche doit :
     - Vérifier la validité de la session ou du token JWT ;
     - Rejeter les credentials absents (HTTP 401 Unauthorized) ;
     - Rejeter les credentials invalides ou altérés (HTTP 401 Unauthorized) ;
     - Rejeter les sessions expirées ou révoquées (HTTP 401 Unauthorized) ;
     - Construire un **Authentication Context** serveur fiable.

2. **Construction du Contexte d'Authentification Serveur** :
   - Le contexte serveur doit déterminer de manière autoritative :
     - `actorId` (Identifiant de l'utilisateur authentifié)
     - `organizationId` (Identifiant vérifié de l'organisation active)
     - `membershipId` (Statut d'appartenance à l'organisation)
     - `permissions` (Liste vérifiée des permissions accordées)
   - **Règle absolue** : Les valeurs de `tenant`, `organizationId`, `role`, ou `permissions` envoyées par le client (dans le body, query params ou headers non signés) ne sont **jamais autoritatives**.

3. **Gestion des Secrets et Mots de Passe** :
   - Aucun mot de passe en clair dans la base de données ou les logs.
   - Hachage obligatoire via **Argon2id** ou **bcrypt** avec facteur de coût conforme aux recommandations OWASP.

4. **Stockage et Transport des Tokens** :
   - Les tokens de session et JWT doivent être transportés exclusivement dans des cookies sécurisés `HttpOnly`, `Secure`, `SameSite=Strict`.
   - Durée de vie minimale recommandée pour les tokens d'accès avec mécanisme de rafraîchissement (refresh token rotation).

---

## 5. STRATÉGIE DE RATE LIMITING ET ANTI-BRUTE-FORCE (RISK-BASED RATE LIMITING)

1. **Stratégie Basée sur le Risque (Risk-Based Strategy)** :
   - Ne pas appliquer une règle universelle simpliste et arbitraire (telle que 5 requêtes/minute/IP pour toute l'application).
   - Construire une stratégie de rate limiting adaptée au niveau de risque et à la nature de chaque endpoint.

2. **Combinaisons de Limitation** :
   - Les endpoints sensibles doivent pouvoir être limités selon une combinaison dynamique de :
     - Adresse IP
     - Compte / adresse email
     - Acteur authentifié (`actorId`)
     - Organisation / Tenant (`organizationId`)
     - Endpoint / Action spécifique
     - Clé d'API (API key) lorsque applicable.

3. **Politiques Adaptées par Domaine** :
   - Politiques renforcées obligatoires pour :
     - Connexion (login)
     - Inscription (registration)
     - Réinitialisation de mot de passe (password reset)
     - Codes OTP / SMS / Email
     - Invitations d'utilisateurs
     - APIs publiques
     - Endpoints de paiement (Wave, Orange Money, MTN, Stripe)
     - Exports de données (CSV, PDF, rapports)
     - Endpoints de Webhooks.

4. **Contrôles Avancés et Protection contre l'Énumération** :
   - Implémentation d'un **progressive backoff** (délai d'attente croissant) pour les tentatives répétées d'échec.
   - Empêcher qu'un attaquant contourne la protection en changeant simplement d'adresse IP (ex. croisement IP + Email).
   - Les réponses de rate limiting (HTTP 429 Too Many Requests) ne doivent jamais permettre l'énumération des comptes ou révéler l'existence d'une adresse email.

---

## 6. ISOLATION MULTI-TENANT, AUTORISATION & PRÉVENTION IDOR

1. **Principe Fondamental** :
   > **Authentication != Authorization**

2. **Équation d'Autorisation Obligatoire pour chaque ressource Tenant-Scoped** :
   Pour toute opération sur une ressource limitée à une organisation, le serveur doit valider :
   ```
   resource exists
   AND resource belongs to active tenant
   AND actor belongs to active tenant
   AND actor possesses required permission
   AND operation is valid for current resource state
   ```

3. **Protection contre l'Accès Direct aux Objets (IDOR / BOLA)** :
   - Les identifiants (`id`) fournis par le client sont toujours considérés comme non fiables.
   - Toute requête en base de données doit inclure explicitement la clause de filtrage du `tenant_id` de l'organisation active vérifiée dans l'Authentication Context.
   - **Stratégie d'erreur canonique** : Une tentative d'accès cross-tenant (tentative d'accès à une ressource d'un autre tenant) ne doit jamais révéler l'existence de la ressource. Le serveur doit répondre par le statut canonique défini (HTTP 404 Not Found ou HTTP 403 Forbidden selon le contrat d'erreur JAAMA sans fuite d'information).

4. **Moindre Privilège (RBAC / ABAC)** :
   - Chaque rôle (Administrateur, Caissier, Comptable, Vendeur) dispose uniquement des autorisations minimales requises.

---

## 7. SÉCURITÉ DES WEBHOOKS ET TRANSACTIONS FINANCIÈRES

1. **Vérification Cryptographique des Webhooks** :
   - Tout webhook entrant (Wave, Orange Money, MTN Mobile Money, Stripe) doit faire l'objet d'une vérification de signature HMAC-SHA256 côté serveur avant tout traitement.

2. **Prévention des Attaques par Rejeu (Replay Attacks)** :
   - Horodatage obligatoire des webhooks (fenêtre de tolérance maximale de 5 minutes).
   - Traitement strictement idempotent des transactions financières via clés d'idempotence uniques.

3. **Contrôle de Concurrence et Surpaiement** :
   - Gestion transactionnelle des états de paiement avec verrouillage optimiste/pessimiste pour prévenir les doubles débits, surpaiements ou conditions de course (race conditions).

---

## 8. PROTECTION CONTRE LES ATTAQUES COURANTES (OWASP TOP 10)

1. **SQL / NoSQL Injection** :
   - Utilisation obligatoire de requêtes paramétrées / préparées via ORM ou Query Builder sécurisé.
   - Interdiction absolue de la concaténation de chaînes dans les requêtes SQL.

2. **Cross-Site Scripting (XSS)** :
   - Échappement automatique de toute donnée dynamique affichée dans le HTML.
   - Configuration d'en-têtes HTTP de sécurité stricts (Content Security Policy (CSP), X-Content-Type-Options, Referrer-Policy, Strict-Transport-Security).

3. **Cross-Site Request Forgery (CSRF)** :
   - Validation des origines (Same-Origin) et utilisation de tokens anti-CSRF pour les requêtes modifiant l'état.

---

## 9. JOURNALISATION, TRAÇABILITÉ ET AUDIT LOGS

1. **Traçabilité des Actions Sensibles** :
   - Les événements majeurs (tentatives de connexion, modifications de droits, suppressions, paiements, anomalies) doivent être enregistrés dans un journal d'audit immuable.

2. **Confidentialité des Logs** :
   - Masquage / Rédaction automatique des données sensibles dans les journaux d'exécution (clés d'API, tokens, numéros de carte, mots de passe, téléphones).

---

## 10. TESTS DE SÉCURITÉ OBLIGATOIRES ET AUTOMATISATION CI/CD (SECURITY TESTING & CI-GATED)

1. **Tests Obligatoires pour les Routes Sensibles** :
   Chaque route d'API ou action serveur sensible doit obligatoirement posséder des tests automatisés vérifiant :
   - Rejet des requêtes non authentifiées (`unauthenticated request`)
   - Rejet des tokens/sessions invalides (`invalid token/session`)
   - Rejet des sessions expirées ou révoquées (`expired/revoked session`)
   - Rejet lors de permission manquante (`missing permission`)
   - Rejet d'accès à une ressource d'un autre tenant (`foreign tenant resource`)
   - Rejet des falsifications d'organisation (`forged organizationId`)
   - Rejet des falsifications de rôle/permission (`forged role/permission`)
   - Rejet des payloads invalides ou malformés (`invalid payload`)
   - Respect des seuils de rate-limiting (`rate-limit threshold`)
   - Comportement face aux attaques brute-force (`brute-force behavior`).

2. **Tests Obligatoires pour les Opérations Financières** :
   Pour tous les modules de paiement et de facturation :
   - Traitement des requêtes dupliquées (`duplicate request`)
   - Idempotence (`idempotency`)
   - Concurrence et conditions de course (`concurrency`)
   - Annulation et restauration transactionnelle (`rollback`)
   - Prévention du surpaiement (`overpayment`)
   - Détection des accès cross-tenant (`cross-tenant`)
   - Refus de permission (`permission denial`).

3. **Automatisation CI-Gated** :
   - Tous les tests P0 de sécurité ci-dessus doivent être automatisés et exécutés dans le pipeline CI/CD. Aucun déploiement ne peut être validé si un test de sécurité échoue.

---

## 11. DISCIPLINE DE DÉVELOPPEMENT, RÈGLES AGENTS IA & NON-CONTOURNEMENT

1. **Règle d'Architecture Globale (Security Architecture Rule)** :
   > **Interdiction absolue d'utiliser le modèle : `middleware authenticated = request trusted`**
   
   La règle d'architecture JAAMA obligatoire est :
   ```
   authenticate centrally
   authorize contextually
   validate server-side
   scope by tenant
   enforce invariants transactionally
   audit sensitive operations
   ```

2. **Directives Strictes pour les Agents IA (AI Agent Rule)** :
   > **Never weaken security to make implementation easier.**
   
   Tout agent IA (ou développeur) travaillant sur le projet JAAMA a l'interdiction stricte de :
   - Exposer un secret (variable d'environnement serveur) pour résoudre un problème de configuration/environnement ;
   - Désactiver l'authentification pour corriger une route ou accélérer un développement ;
   - Supprimer ou contourner l'autorisation pour faire passer un test ;
   - Faire confiance à `organizationId` ou `tenantId` provenant du frontend ;
   - Faire confiance aux rôles ou permissions déclarés par le frontend ;
   - Augmenter ou désactiver les limites de rate-limiting pour faire passer des tests ;
   - Supprimer des tests de sécurité pour verdir le pipeline CI ;
   - Contourner l'isolation multi-tenant (`tenant_id`) ;
   - Désactiver le secret scanning ;
   - Inventer des hypothèses ou raccourcis de sécurité non documentés par JAAMA.

3. **Règle d'Arbitrage Absolu** :
   > **Si une exigence de sécurité entre en conflit avec la commodité d'implémentation : SECURITY WINS.**
