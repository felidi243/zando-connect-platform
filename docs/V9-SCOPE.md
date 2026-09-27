# Zando Connect V9 — Production hardening

## Objectif
Transformer le noyau V8 en base plus proche d'un environnement déployable, sans prétendre que les fournisseurs réels sont déjà branchés.

## Ajouts
- rate limiting HTTP de base;
- notifications persistantes client/coursier;
- audit logs administratifs;
- webhook de paiement signé HMAC (`PAYMENT_WEBHOOK_SECRET`);
- recherche de paiement par référence fournisseur;
- couche de routing interchangeable;
- estimation distance/ETA géographique sans fournisseur externe;
- endpoint de route d'une livraison;
- schéma PostgreSQL pour notifications et audit logs;
- conservation des fonctions V2→V8.

## Limites explicites
- le routing `straight_line` n'est pas un itinéraire routier réel;
- les fournisseurs Mobile Money/cartes réels et leurs webhooks doivent être configurés et testés;
- le GPS temps réel nécessite encore WebSocket/SSE et un client mobile/background robuste;
- PostgreSQL réel doit être testé dans l'environnement de déploiement;
- les notifications push/SMS nécessitent un fournisseur externe.

## Passage V10
- application mobile/worker coursier;
- WebSocket/SSE temps réel;
- routing routier + ETA réel;
- push/SMS;
- remboursements/litiges;
- reversements marchands;
- observabilité, CI/CD et tests de charge;
- anti-fraude avancée;
- multi-marchands et découpage logistique avancé.
