---
name: verify
description: Vérifier un changement Komo en pilotant l'app en vrai (dev server + Playwright), avec le flow d'auth anonyme.
---

# Vérifier Komo end-to-end

## Lancer

```bash
npm run dev &   # http://localhost:3000 — pointe sur le Supabase distant (.env.local)
```

Playwright est dans `node_modules` (Chromium déjà téléchargé) :
`require('<repo>/node_modules/playwright')` dans un script Node du scratchpad.
Viewport mobile : `{ width: 400, height: 850 }` (l'app est verrouillée à ~440px).

## Auth / atteindre un event

Pas de mot de passe — sessions Supabase anonymes créées par les server actions.
Chaque nouveau contexte navigateur = nouvel utilisateur.

- **Créer un event** : landing → bouton `Go. →` → `#title`, `#destination`,
  `input[name=date_start|date_end]` → « Créer le plan → » → page join.
- **Join créateur** : directement `input[name=pseudo]` → submit.
- **Join invité** : étape email d'abord (`input[name=email]`, requise — utiliser
  `*.test@example.com`) → « Continuer → » → pseudo.

## Semer des données (via l'UI — ne pas insérer en SQL dans la base partagée)

- Transport : `?tab=transport` → « Je propose un trajet » → mode (boutons), `label`,
  `departure_city`, `departure_date`, `departure_time` (+ `arrival_time` en mode train)
  → « Proposer → ».
- Activité : `?tab=activites` → « Proposer une activité » → `label`, `activity_date`,
  `start_time` → « Proposer → ».
- Repas : `?tab=bouffe` → DashedAddButton du jour (« ＋ ajouter un repas » /
  « Aucun repas prévu — ajouter ») → input placeholder « Risotto » → « Créer le repas ».

## Pièges

- Les créations sont **optimistes** : attendre la revalidation (recharger la page)
  avant de vérifier une vue serveur, sinon race.
- Le hub streame : `waitForSelector` sur du vrai contenu avant screenshot,
  pas juste `waitForURL`.
- `innerText` reflète les transformations CSS (`uppercase` etc.) — comparer en
  conséquence.
- **Nettoyage** : supprimer l'event de test à la fin
  (`delete from events where slug = '<slug>' and title = '<titre de test>'`,
  cascade sur les enfants).
