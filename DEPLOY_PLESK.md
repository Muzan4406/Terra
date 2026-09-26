# Déploiement sur Plesk avec Node.js

## Valeurs dans la page Node.js de Plesk

- **Version Node.js :** 20.x (version utilisée pour vérifier le build du projet).
- **Racine de l’application :** le dossier du projet, celui qui contient `package.json`.
- **URL de l’application :** `/` pour servir le site à la racine du domaine. Le client utilise des URL absolues (`/api/...`) et n’est pas prévu pour un sous-dossier.
- **Fichier de démarrage :** `dist/index.cjs`.
- **Mode de l’application :** production.
- **Port :** laisser Plesk attribuer le port, ou saisir le port indiqué par Plesk. Le serveur écoute `process.env.PORT` et se lie à `0.0.0.0`.

Ne configurez pas le domaine pour servir uniquement `dist/public` comme un site statique : les appels `/api/...` et les routes de navigation React doivent aussi être transmis au serveur Node.js.

## Préparer les fichiers

Depuis le dossier du projet, installez les dépendances et générez le build :

```bash
npm install
npm run build
```

Le build produit `dist/index.cjs` et les fichiers du site dans `dist/public`. Redémarrez ensuite l’application depuis la page Node.js de Plesk. Le script `npm start` lance le même fichier en mode production.

## Variables d’environnement Node.js

Configurez ces variables dans Plesk, sans les inscrire dans le dépôt :

- `NODE_ENV=production`
- `DATABASE_URL` : URL d’une base **PostgreSQL** accessible depuis le serveur Plesk. Ce projet n’utilise pas MySQL.
- `SESSION_SECRET` : valeur aléatoire longue, réservée à cette installation.
- `PORT` : seulement si Plesk demande de la définir manuellement; utilisez alors le port attribué par Plesk et non un port choisi au hasard.

Le site doit être servi en **HTTPS** : les cookies de session sont configurés `Secure` en production. Le serveur fait confiance au proxy HTTPS de Plesk pour détecter les requêtes sécurisées.

Les sessions sont stockées dans PostgreSQL, dans la table `session`, créée automatiquement si elle n’existe pas. Cela évite de perdre les connexions utilisateur à chaque redémarrage de l’application.

## Base de données

Créez ou choisissez la base PostgreSQL qui servira à Plesk, configurez son URL dans `DATABASE_URL`, puis exécutez une fois :

```bash
npm run db:push
```

Vérifiez que `DATABASE_URL` pointe vers la base Plesk voulue avant cette commande. Faites une sauvegarde préalable si la base contient déjà des données.

## Routage

Les routes `/api/...` sont enregistrées avant les fichiers statiques. En production, Express sert `dist/public` et renvoie `index.html` pour les autres chemins : les URL React comme `/customer-service/chat` ou `/admin/support` fonctionnent donc après actualisation sans règle `.htaccess` dédiée, tant que l’URL de l’application Plesk est `/`.

Les pièces jointes de support peuvent atteindre environ 20 Mo au total (4 images de 5 Mo). Si Plesk ou son proxy renvoie `413 Request Entity Too Large`, augmentez la limite de taille de requête côté proxy Plesk à environ `25M`.