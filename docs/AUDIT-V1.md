# Audit V1

## Constats
La V1 avait une bonne séparation conceptuelle des modules, mais plusieurs répertoires étaient encore vides et les scripts racine ne lançaient aucune application réelle.

## Corrections apportées en V2
- backend exécutable
- route `/api/health`
- API catalogue versionnée sous `/api/v1`
- repository isolé de la couche HTTP
- données de démonstration
- validations des paramètres
- interface web réelle
- tests Node natifs
- préparation PostgreSQL sans rendre PostgreSQL obligatoire pour les tests

## Décision technique
Le mode mémoire est le mode par défaut de développement. PostgreSQL devient la persistance dès que `DATABASE_URL` est fournie et que le schéma est appliqué.

Cette stratégie évite de bloquer le développement mobile/local sur une base distante tout en gardant une trajectoire de production propre.
