# Déploiement sur Plesk avec Node.js

## Valeurs dans la page Node.js de Plesk

- **Version Node.js :** 20.x si disponible (version vérifiée).
- **Racine de l’application :** le dossier du projet, celui qui contient `package.json`.
- **Document Root :** `dist/public` sous la racine de l’application. Ce dossier est inclus dans le dépôt après le build.
- **URL de l’application :** `/` pour servir le site à la racine du domaine. Le client utilise des URL absolues (`/api/...`) et n’est pas prévu pour un sous-dossier.
- **Fichier de démarrage :** `app.js` à la racine du projet. Ce fichier charge le serveur compilé `dist/index.cjs`.
- **Mode de l’application :** production.
- **Port :** laisser Plesk attribuer le port, ou saisir le port indiqué par Plesk. Le serveur écoute `process.env.PORT` et se lie à `0.0.0.0`.

Ne définissez pas le Document Root sur `server` ni sur la racine contenant le code du projet. Gardez Node.js activé : les appels `/api/...` et les routes React sans fichier statique doivent continuer à être transmis à Express.

## Préparer puis déployer depuis GitHub

Avant chaque push, construisez le projet depuis la racine du dépôt :

```bash
npm run build
```

Le dossier `dist/` est volontairement inclus dans Git pour que Plesk reçoive déjà le serveur compilé et le dossier public. Après le build, poussez les changements, puis cliquez sur **Pull + Deploy Now** et **Restart** dans Plesk. À la toute première installation, cliquez une fois sur **NPM install** pour installer les dépendances de production; répétez-le si `package-lock.json` change.

Le fichier `app.js` est présent à la racine et correspond au nom de démarrage déjà affiché dans Plesk. Le Document Root reste un réglage Plesk : choisissez `dist/public` sous l’Application Root. Si Plesk indique encore que `app.js` est absent, le dernier push n’a pas encore été tiré.

## Variables d’environnement Node.js

Configurez ces variables dans Plesk, sans les inscrire dans le dépôt :

- `NODE_ENV=production`
- `DATABASE_URL` : URL d’une base **PostgreSQL** accessible depuis le serveur Plesk. Ce projet n’utilise pas MySQL.
- `SESSION_SECRET` : valeur aléatoire longue, réservée à cette installation.
- `PORT` : seulement si Plesk demande de la définir manuellement; utilisez alors le port attribué par Plesk et non un port choisi au hasard.

Pour compatibilité, `app.js` reprend `SUPABASE_DATABASE_URL` si `DATABASE_URL` est absent. Configurez néanmoins `DATABASE_URL` directement dans Plesk de préférence.

Le site doit être servi en **HTTPS** : les cookies de session sont configurés `Secure` en production. Le serveur fait confiance au proxy HTTPS de Plesk pour détecter les requêtes sécurisées.

Les sessions sont stockées dans PostgreSQL, dans la table `session`, créée automatiquement lors de sa première utilisation si elle n’existe pas. L’utilisateur PostgreSQL doit pouvoir créer des tables. Cela évite de perdre les connexions utilisateur à chaque redémarrage de l’application.

## Base de données

### Utiliser Supabase

1. Créez un projet Supabase et récupérez l’URI de connexion **PostgreSQL** depuis les paramètres de connexion de la base.
2. Choisissez une connexion directe si le serveur Plesk peut l’atteindre. Si la connexion directe n’est pas accessible depuis l’hébergement (par exemple à cause de la compatibilité réseau), utilisez l’URI de pooler fournie par Supabase et suivez son réglage recommandé pour un serveur Node.js persistant.
3. Dans les variables d’environnement Node.js de Plesk, définissez `DATABASE_URL` avec cette URI. Conservez les paramètres SSL fournis par Supabase.
4. L’application se connecte directement à PostgreSQL avec `pg` : elle n’a pas besoin de `SUPABASE_URL`, de clé `anon` ou de clé `service_role`. Ne placez jamais l’URI de base dans le code du navigateur ni dans le dépôt.

### Créer le schéma

Pour une nouvelle migration de la base de développement Replit vers Supabase, configurez le secret Replit `SUPABASE_DATABASE_URL`, puis exécutez depuis le dépôt :

```bash
npm run db:migrate:supabase
```

Cette commande crée le schéma depuis `shared/schema.ts`, puis copie les lignes de la base Replit dans l’ordre des clés étrangères. Elle vérifie que les tables et colonnes correspondent, que les tables de destination sont vides et que les nombres de lignes concordent. La copie des lignes est transactionnelle et la base source n’est pas supprimée. C’est une migration initiale : elle refuse de recopier les lignes si les tables Supabase ne sont plus vides.

La migration initiale de ce projet a été effectuée et vérifiée : **18 tables et 18 lignes** copiées. Pour l’application sur Plesk, configurez ensuite `DATABASE_URL` dans la page Node.js avec la même URI PostgreSQL Supabase. Ne relancez pas la migration initiale.

La variable Replit `SUPABASE_DATABASE_URL` cible la base Supabase; en production, Plesk utilise `DATABASE_URL` avec la même URI. Ne lancez ni `db:push` ni la migration initiale pendant un déploiement Git : un pull ne doit pas modifier le schéma ou recopier les données.

**Attention :** `npm run db:push:supabase` a détecté la table `public.session`, créée automatiquement par le stockage des sessions mais absente de `shared/schema.ts`, et a proposé de la supprimer. Refusez toute synchronisation qui propose de supprimer cette table : cela déconnecterait les utilisateurs. Examinez le plan avant toute future synchronisation et préservez cette table.

Pour cette version, la seule modification de schéma nécessaire au chat a été appliquée de façon additive : `support_messages.read_at` est nullable avec `DEFAULT now()`, donc les messages déjà présents sont considérés comme lus. La colonne et la présence de la table `session` ont été vérifiées. Il n’est pas nécessaire de relancer `db:push:supabase` pour cette version; construisez le projet, poussez-le sur GitHub, puis faites **Pull + Deploy Now** et **Restart** dans Plesk.

### Soldes distincts, gains à échéance et preuves de retrait

Avant de déployer le code qui utilise ces fonctions en production :

1. Faites une sauvegarde PostgreSQL.
2. Appliquez manuellement `migrations/20261003_dual_balances_and_withdrawal_proofs.sql` à la base Supabase utilisée par Plesk.
3. Vérifiez les nouvelles colonnes et la table `public.withdrawal_proofs`, puis déployez le code.

Cette migration est additive. Elle conserve chaque valeur historique de `users.balance`, désormais traitée comme le solde dépôt, et initialise le nouveau solde retrait à zéro. Elle ajoute aussi la catégorie des produits, les gains en attente jusqu’à l’échéance et la table des preuves quotidiennes. N’exécutez pas `db:push:supabase` pour cette mise à jour et refusez tout plan qui propose de supprimer `public.session`. La migration de production n’a pas été exécutée pendant cette session.

### Lancements Activité et conditions figées à l’achat

Avant de déployer le code correspondant sur Plesk :

1. Faites une sauvegarde PostgreSQL.
2. Appliquez manuellement `migrations/20261004_product_purchase_rules.sql` à la base Supabase utilisée par Plesk.
3. Vérifiez `products.activity_available_at`, `user_products.product_snapshot` et `user_products.activity_launch_version`. Vérifiez aussi que les achats existants liés aux produits ont reçu leur instantané.
4. Déployez ensuite le code; ne lancez pas `db:push:supabase` et ne relancez pas la migration initiale.

La migration copie les conditions actuelles des produits dans les achats existants sans modifier les soldes, l’état des investissements ni leurs paiements en attente. Elle attribue aussi le lancement initial aux achats Activité payés déjà liés à un produit, sans compter les produits attribués par un administrateur. Elle ajoute la date GMT d’ouverture et le compteur de lancement partagé. Elle doit être appliquée avant le nouveau code; `public.session` doit rester intacte.

**Statut de production (2026-10-05) :** cette migration a été appliquée à la base Supabase utilisée par Plesk, dans une transaction. Les vérifications ont confirmé les colonnes attendues, `public.session` intacte, `/api/health` en `200 ok` et `/api/auth/me` en `401` sans session. Les deux mises à jour de rétro-remplissage n’ont modifié aucune ligne.

## AshTech Pay — Direct API Mobile Money

Avant d’activer un pays dans **Administration → Moyens de paiement**, appliquez une fois ces colonnes additives à la base PostgreSQL utilisée par Plesk :

```sql
ALTER TABLE public.deposits
  ADD COLUMN IF NOT EXISTS ashtech_transaction_id text,
  ADD COLUMN IF NOT EXISTS ashtech_reference text;
```

Ne lancez pas `db:push:supabase` pour cette modification. Configurez ensuite dans les variables d’environnement Node.js de Plesk :

- `ASHTECH_API_KEY` : clé Direct API AshTech Pay;
- `ASHTECH_USER_ID` : identifiant du profil marchand AshTech Pay associé à cette clé; ne mettez pas l’identifiant d’un client Beko;
- `ASHTECH_WEBHOOK_SECRET` : facultatif; configurez-le seulement si le compte AshTech fournit une signature `whsec_...`;
- `APP_PUBLIC_URL` : origine HTTPS publique, par exemple `https://votre-domaine.tld` (sans chemin).

L’URL webhook à enregistrer chez AshTech Pay est `https://votre-domaine.tld/api/webhooks/ashtechpay`. Les identifiants restent côté serveur et ne doivent pas être commités. Si le compte n’envoie pas de signature, le webhook sert uniquement à déclencher une vérification Direct API côté serveur; il ne suffit jamais à créditer le portefeuille. Le panneau des moyens de paiement n’autorise l’activation que pour les pays et opérateurs présents dans le catalogue AshTech actif.

En production, le serveur retente aussi la vérification des dépôts AshTech en attente toutes les minutes; ce contrôle est limité aux dépôts ayant déjà un identifiant de transaction. Il s’exécute uniquement avec `NODE_ENV=production` et `ASHTECH_API_KEY` configurée. Après une mise à jour, faites **Pull + Deploy Now** puis **Restart** dans Plesk. Aucun changement de schéma de base n’est requis pour cette reprise.

## Routage

Les routes `/api/...` sont enregistrées avant les fichiers statiques. En production, Express sert `dist/public` et renvoie `index.html` pour les autres chemins : les URL React comme `/customer-service/chat` ou `/admin/support` fonctionnent donc après actualisation sans règle `.htaccess` dédiée, tant que l’URL de l’application Plesk est `/`.

Les pièces jointes de support peuvent atteindre environ 20 Mo au total (4 images de 5 Mo). Si Plesk ou son proxy renvoie `413 Request Entity Too Large`, augmentez la limite de taille de requête côté proxy Plesk à environ `25M`.

Avant d’ouvrir le domaine au public, sécurisez également le compte administrateur intégré et vérifiez que son mot de passe n’est pas celui fourni par défaut.