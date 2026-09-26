# Déploiement sur Plesk avec Node.js

## Valeurs dans la page Node.js de Plesk

- **Version Node.js :** 20.x si disponible (version vérifiée). Le script de déploiement accepte Node.js 20 ou plus récent; si Plesk ne propose que 26.x, lancez le build avant le redémarrage.
- **Racine de l’application :** le dossier du projet, celui qui contient `package.json`.
- **Document Root :** `dist/public` sous la racine de l’application. Pour une racine `/terra.site`, Plesk doit afficher `/terra.site/dist/public`. Ce dossier apparaît après le build.
- **URL de l’application :** `/` pour servir le site à la racine du domaine. Le client utilise des URL absolues (`/api/...`) et n’est pas prévu pour un sous-dossier.
- **Fichier de démarrage :** `dist/index.cjs`.
- **Mode de l’application :** production.
- **Port :** laisser Plesk attribuer le port, ou saisir le port indiqué par Plesk. Le serveur écoute `process.env.PORT` et se lie à `0.0.0.0`.

Ne définissez pas le Document Root sur `server` ni sur la racine contenant le code du projet. Gardez Node.js activé : les appels `/api/...` et les routes React sans fichier statique doivent continuer à être transmis à Express.

## Déploiement depuis GitHub avec Plesk

Dans les actions de déploiement du dépôt Git Plesk, ajoutez la commande :

```bash
npm run deploy:plesk
```

Après **Pull + Deploy Now**, Plesk exécute cette action : elle installe exactement les dépendances du `package-lock.json`, construit `dist/index.cjs` et `dist/public`, puis retire les dépendances de développement. Elle ne modifie pas la base de données et ne relance pas la migration des données. Cliquez ensuite sur **Restart** dans la page Node.js de Plesk.

Pour une première installation sans action Git configurée, exécutez `npm run deploy:plesk` depuis la racine de l’application Plesk. Le script exige Node.js 20 ou plus récent et s’arrête en cas d’erreur de dépendances ou de build. `npm start` lance le fichier de démarrage construit.

Le fichier `dist/index.cjs` n’existe qu’après le build. Si Plesk indique que le fichier de démarrage est introuvable, vérifiez que le dernier code Git est bien déployé et que `npm run deploy:plesk` s’est terminé avec succès; vérifiez aussi dans File Manager la présence de `dist/index.cjs` et `dist/public/index.html` avant de redémarrer.

## Variables d’environnement Node.js

Configurez ces variables dans Plesk, sans les inscrire dans le dépôt :

- `NODE_ENV=production`
- `DATABASE_URL` : URL d’une base **PostgreSQL** accessible depuis le serveur Plesk. Ce projet n’utilise pas MySQL.
- `SESSION_SECRET` : valeur aléatoire longue, réservée à cette installation.
- `PORT` : seulement si Plesk demande de la définir manuellement; utilisez alors le port attribué par Plesk et non un port choisi au hasard.

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

La variable Replit `SUPABASE_DATABASE_URL` sert à appliquer les changements de schéma depuis Replit avec `npm run db:push:supabase`. En production, Plesk utilise `DATABASE_URL`. Ne mettez ni `db:push` ni la migration initiale dans l’action de déploiement Git : un pull ne doit pas modifier le schéma ou recopier les données.

## Routage

Les routes `/api/...` sont enregistrées avant les fichiers statiques. En production, Express sert `dist/public` et renvoie `index.html` pour les autres chemins : les URL React comme `/customer-service/chat` ou `/admin/support` fonctionnent donc après actualisation sans règle `.htaccess` dédiée, tant que l’URL de l’application Plesk est `/`.

Les pièces jointes de support peuvent atteindre environ 20 Mo au total (4 images de 5 Mo). Si Plesk ou son proxy renvoie `413 Request Entity Too Large`, augmentez la limite de taille de requête côté proxy Plesk à environ `25M`.

Avant d’ouvrir le domaine au public, sécurisez également le compte administrateur intégré et vérifiez que son mot de passe n’est pas celui fourni par défaut.