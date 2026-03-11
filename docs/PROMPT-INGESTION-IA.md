# Prompt — Synthèse de documents pour ingestion dans le Dashboard PM

## Objectif

Ce prompt est à utiliser avec Claude (claude.ai ou API) **avant** d'uploader un document dans le dashboard.
Il permet de synthétiser un ou plusieurs documents bruts en un document structuré unique, optimisé pour que l'IA du dashboard détecte toutes les informations à 90-100% de confiance.

---

## Comment l'utiliser

1. Ouvre une conversation Claude
2. Copie le **bloc prompt** ci-dessous
3. Joins tous tes documents en pièces jointes (devis, CR, emails, transcripts, planning, etc.)
4. Envoie — Claude produit le document structuré
5. Copie le résultat dans un fichier `.txt` ou `.docx`
6. Upload ce fichier dans le dashboard → Section **Documents**

---

## Prompt à copier

```
Tu es un expert en gestion de projets consulting. Je te fournis un ensemble de documents relatifs à un projet (devis, compte-rendus, emails, transcripts de réunions, plannings, etc.).

Ton objectif : produire UN SEUL document texte structuré, clair et complet, qui synthétise toutes les informations du projet de façon à être parfaitement analysé par un outil de gestion de projet.

---

INFORMATIONS À EXTRAIRE ET STRUCTURER :

## 1. PROJET
- Nom du projet (précis, pas générique)
- Nom du client (entreprise)
- Date de début (format JJ/MM/AAAA)
- Date de fin prévue (format JJ/MM/AAAA)
- Budget total en euros (chiffre uniquement)
- Statut : Planifié / En cours
- Description courte (2-3 phrases sur l'objectif du projet)

## 2. ÉQUIPE / CONSULTANTS
Pour chaque consultant impliqué :
- Prénom Nom
- Email professionnel (si disponible)
- Rôle sur le projet (Chef de projet / Consultant / Expert / etc.)

## 3. ÉTAPES DU PROJET
Pour chaque phase ou étape :
- Nom de l'étape (court et clair : ex. "Cadrage", "Audit", "Développement", "Recette", "Déploiement")
- Ordre (1, 2, 3…)
- Charge estimée en jours (ex. 5 jours)
- Date de début (JJ/MM/AAAA)
- Date de fin (JJ/MM/AAAA)
- Description des livrables ou objectifs

## 4. ACTIVITÉS RÉALISÉES
Pour chaque activité ou temps passé déjà connu :
- Date (JJ/MM/AAAA)
- Nombre d'heures
- Prénom Nom du consultant (ou email)
- Étape associée (nom exact de l'étape)
- Description de la tâche

## 5. CONTACTS CLIENT
Pour chaque interlocuteur côté client :
- Prénom Nom
- Email (si disponible)
- Rôle (ex. DSI, Directeur de projet, Chef de projet client)

---

RÈGLES DE RÉDACTION :
- Si une information est absente ou incertaine, indique explicitement "Non renseigné" (ne pas inventer)
- Toutes les dates au format JJ/MM/AAAA
- Les durées toujours en jours (convertir semaines et mois : 1 semaine = 5 jours, 1 mois = 20 jours)
- Le budget en chiffre entier euros, sans symbole ni espace (ex. 45000)
- Les noms des étapes : courts, sans numéro, sans date (ex. "Cadrage" pas "Phase 1 - Cadrage - Jan 2026")
- Les heures d'activité en chiffre décimal (ex. 3.5 pour 3h30)
- Un consultant identifié par son email est préférable à son nom seul

---

STRUCTURE DE SORTIE ATTENDUE :

Rédige le document avec exactement les sections suivantes, dans cet ordre, avec les titres en majuscules :

PROJET
[informations projet]

ÉQUIPE
[liste des consultants]

ÉTAPES
[liste des étapes numérotées]

ACTIVITÉS RÉALISÉES
[liste des activités avec date, heures, consultant, étape, description]

CONTACTS CLIENT
[liste des contacts]

NOTES COMPLÉMENTAIRES
[tout ce qui ne rentre pas dans les catégories ci-dessus mais pourrait être utile]

---

Voici les documents à analyser :
[JOINDRE LES DOCUMENTS ICI]
```

---

## Exemple de document produit (format attendu)

```
PROJET
Nom : Transformation digitale RH — EcoGreen Industries
Client : EcoGreen Industries
Date de début : 03/02/2026
Date de fin : 30/06/2026
Budget : 87000
Statut : En cours
Description : Refonte du système de gestion RH d'EcoGreen Industries, incluant l'implémentation d'un SIRH,
la migration des données historiques et la formation des équipes. Projet en 4 phases sur 5 mois.

ÉQUIPE
- Julie Chen | julie.chen@reboot-conseil.com | Chef de projet
- Marc Fontaine | marc.fontaine@reboot-conseil.com | Consultant senior
- Sabrina Oualit | sabrina.oualit@reboot-conseil.com | Consultante

ÉTAPES
1. Cadrage
   Charge : 5 jours
   Début : 03/02/2026 | Fin : 07/02/2026
   Description : Ateliers de cadrage avec les parties prenantes, définition du périmètre,
   validation de la roadmap et des livrables.

2. Audit existant
   Charge : 10 jours
   Début : 10/02/2026 | Fin : 21/02/2026
   Description : Analyse des processus RH actuels, cartographie des données,
   identification des points de douleur et des opportunités.

3. Implémentation SIRH
   Charge : 30 jours
   Début : 24/02/2026 | Fin : 10/04/2026
   Description : Paramétrage du SIRH, migration des données, développement des interfaces
   avec les systèmes existants (paie, contrôle d'accès).

4. Formation et déploiement
   Charge : 15 jours
   Début : 14/04/2026 | Fin : 30/04/2026
   Description : Formation des utilisateurs clés (RH, managers), déploiement progressif
   par site, support à la prise en main.

5. Recette et clôture
   Charge : 5 jours
   Début : 04/05/2026 | Fin : 08/05/2026
   Description : Tests de recette, correction des anomalies, livraison de la documentation
   et bilan de projet.

ACTIVITÉS RÉALISÉES
- 03/02/2026 | 7h | Julie Chen | Cadrage | Atelier de lancement avec le CODIR EcoGreen
- 04/02/2026 | 6h | Marc Fontaine | Cadrage | Entretiens parties prenantes RH (DRH, gestionnaires)
- 05/02/2026 | 7h | Julie Chen | Cadrage | Rédaction du document de cadrage v1
- 06/02/2026 | 4h | Sabrina Oualit | Cadrage | Revue du document de cadrage, ajustements
- 10/02/2026 | 7h | Marc Fontaine | Audit existant | Analyse des processus recrutement et onboarding
- 11/02/2026 | 7h | Sabrina Oualit | Audit existant | Cartographie des données RH existantes

CONTACTS CLIENT
- Thomas Mercier | t.mercier@ecogreen.fr | Directeur des Ressources Humaines
- Aline Bertrand | a.bertrand@ecogreen.fr | Chef de projet côté client
- Paul Nguyen | p.nguyen@ecogreen.fr | DSI

NOTES COMPLÉMENTAIRES
- Le budget inclut 5 jours de réserve pour gestion des aléas (non alloués à une étape)
- Réunion de suivi bi-mensuelle avec le CODIR prévue tout au long du projet
- Contrainte : migration de données à réaliser impérativement hors heures ouvrées
```

---

## Conseils pour maximiser la qualité d'analyse

| Situation | Conseil |
|-----------|---------|
| Consultants sans email connu | Indiquer Prénom Nom — l'outil créera le profil, l'email sera lié plus tard |
| Durées en semaines dans le devis | Convertir : 1 semaine = 5 jours |
| Budget HT/TTC | Toujours indiquer HT |
| Plusieurs documents contradictoires | Laisser Claude arbitrer et indiquer la source retenue en note |
| Activités futures (non réalisées) | Les mettre dans "NOTES COMPLÉMENTAIRES", pas dans "ACTIVITÉS RÉALISÉES" |
| Projet déjà existant dans le dashboard | Le préciser en début de prompt : "Ce projet existe déjà sous le nom X" |
