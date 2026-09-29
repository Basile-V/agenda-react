# Agenda — React 19

Vue « jour » d'un agenda : un calendrier construit **from scratch** en React 19 qui affiche,
crée, modifie et supprime des événements, avec une gestion fine des chevauchements.

> Projet portfolio. Il refait en React le front Angular du dépôt
> [agenda](../agenda) et consomme **le même backend** Spring Boot.

- **Démo** : _à venir (Cloudflare Workers)_
- **Comptes de démo** : `admin` / `demo1234` et `basile` / `demo1234`
- **Backend** : API Java / Spring Boot, hébergée sur Render
  (`https://agenda-o5su.onrender.com`), code dans le dépôt `agenda/Backend`.

> ⏳ Le backend est en offre gratuite et se met en veille : la première requête peut prendre
> jusqu'à une minute. L'application affiche un message pendant ce réveil.

## Fonctionnalités

- **Connexion et inscription** (onglets sur `/login`), session par cookies httpOnly (JWT),
  restauration automatique de la session au chargement.
- **Vue jour** sur `/:date` (`YYYY-MM-DD`) : navigation jour précédent / suivant / aujourd'hui
  pilotée par l'URL.
- **Grille horaire 09:00 → 21:00**, position et hauteur des événements proportionnelles à
  l'heure et à la durée, recalcul au redimensionnement (`ResizeObserver`).
- **Chevauchements** : les événements qui se chevauchent se partagent la largeur disponible,
  selon les règles du kata (voir plus bas).
- **Création, détails, modification, suppression** dans des modales `<dialog>` natives.
  Mises à jour optimistes : l'interface réagit immédiatement et revient en arrière en cas
  d'erreur API.
- **Événements publics / privés** : on voit ses événements et les événements publics des autres,
  en lecture seule pour ces derniers.
- **Réveil du serveur** : message statique avant le démarrage de React, puis overlay de
  chargement pour toute requête qui dépasse 2 s.
- **Accessibilité** : navigation clavier, focus piégé et restitué dans les modales, rôles et
  labels ARIA.

## Stack

| Sujet | Choix |
|---|---|
| Build | Vite, TypeScript `strict` |
| UI | React 19 (fonctions + hooks) |
| Routage | `react-router` v8 (mode librairie, `createBrowserRouter`) |
| État | `useState` / `useReducer`, Context pour l'auth et le suivi des requêtes lentes |
| Styles | Modules SCSS + variables CSS (thème modifiable à l'exécution) |
| HTTP | `fetch` natif, encapsulé dans `apiFetch` |
| Tests | Vitest, React Testing Library, `user-event`, MSW |
| Qualité | ESLint (flat config, `react-hooks`), Prettier |
| Déploiement | Cloudflare Workers Static Assets |

**Dépendances runtime : `react`, `react-dom` et `react-router`, rien d'autre.** Pas de
librairie de composants, de calendrier, de requêtes ou d'utilitaires : c'est une contrainte
du kata, et tout le reste (calendrier, modales, onglets, client HTTP) est écrit à la main.

### Ce que React 19 apporte ici

- `useActionState` + `<form action>` + `useFormStatus` pour les formulaires de connexion et
  d'inscription (état d'envoi et erreurs sans `useState` manuel).
- `useOptimistic` pour la création, la modification et la suppression, avec retour arrière
  automatique en cas d'échec.
- `ref` passé comme une prop ordinaire (plus de `forwardRef`).
- `<title>` rendu directement depuis les pages.
- `<Context value={…}>` à la place de `<Context.Provider>`.

## Démarrage

Prérequis : Node.js ≥ 22 et npm.

```bash
npm install
cp .env.example .env    # puis ajuster VITE_API_BASE_URL si besoin
npm run dev             # http://localhost:5173
```

### Avec le backend en local

Lancer le backend du dépôt `agenda/Backend` (voir son README), qui écoute sur
`http://localhost:8080`, puis `npm run dev`.

### Sans backend (mode mock)

```bash
npm run dev:mock
```

Les requêtes sont interceptées par MSW avec les mêmes handlers que les tests.

### Variables d'environnement

| Variable | Rôle | Exemple |
|---|---|---|
| `VITE_API_BASE_URL` | URL de base de l'API | `http://localhost:8080` (dev), `https://agenda-o5su.onrender.com` (prod) |

## Scripts

| Commande | Rôle |
|---|---|
| `npm run dev` | Serveur de développement Vite |
| `npm run dev:mock` | Serveur de développement avec l'API simulée par MSW |
| `npm run build` | Vérification TypeScript + build de production dans `dist/` |
| `npm run preview` | Sert le build de production en local |
| `npm test` | Tests Vitest |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |

## Architecture

Organisation **par fonctionnalité** :

```
src/
  main.tsx, App.tsx, router.tsx
  api/          apiFetch (credentials, CSRF, refresh sur 401, requêtes lentes) + fonctions typées
  features/
    auth/       AuthProvider, useAuth, RequireAuth, LoginPage, LoginForm, RegisterForm
    calendar/   DayPage, CalendarHeader, DayGrid, EventBlock, dialogs, useDayEvents,
                layout.ts, time.ts
    loading/    LoadingProvider, ServerWakeOverlay
  ui/           composants génériques : Button, IconButton, Dialog, TextField, Tabs, Spinner, icons
  styles/       variables CSS (variables.scss), reset
```

- La logique métier (layout, dates, heures) est faite de **fonctions pures sans React**,
  testées unitairement.
- `apiFetch` est la seule fonction qui appelle `fetch`. Elle envoie les cookies
  (`credentials: 'include'`), ajoute le jeton CSRF sur les requêtes mutantes, rafraîchit la
  session une seule fois sur 401 puis rejoue la requête, et signale les requêtes lentes.
- Seuls l'utilisateur courant et le compteur de requêtes lentes sont en Context. Les
  événements du jour vivent dans le hook `useDayEvents(date)`, qui annule les requêtes
  obsolètes (`AbortController`) quand la date change.

## Algorithme de chevauchement

Règles imposées (LargeurMax = largeur du conteneur) :

1. si A et B se chevauchent, Largeur(A) = Largeur(B) ;
2. LargeurMax = largeur de la fenêtre ;
3. si A et B se chevauchent sur une plage, Largeur(A) + Largeur(B) = LargeurMax.

Étapes de `layout.ts` :

1. **Tri** par heure de début, puis par durée décroissante.
2. **Clusters** : on regroupe les événements qui se chevauchent de proche en proche. Tous les
   événements d'un cluster partagent le même nombre de colonnes.
3. **Colonnes** : chaque événement va dans la première colonne libre (attribution gloutonne).
4. **Largeur** : tous les événements d'un cluster ont la même largeur,
   `LargeurMax / nombre de colonnes`. LargeurMax est la largeur de la zone des événements,
   mesurée par `ResizeObserver` : la colonne des heures est à côté, pas en marge à déduire. Pas d'extension sur les colonnes libres (comme
   le fait le front Angular) : elle donnerait des largeurs différentes à deux événements qui se
   chevauchent, ce qui viole la règle 1.

Avec trois événements qui se chevauchent deux à deux, la règle 3 ne peut pas tenir en même temps
que la règle 1 (chacun fait un tiers) : la règle 1 prime, et la règle 3 est garantie pour les
clusters à deux colonnes.

Les horaires sont bornés à la grille 09:00 → 21:00 ; un événement entièrement hors de cette
plage n'est pas placé sur la grille.

```
        colonne 1   colonne 2
09:00  ┌─────────┐
       │    A    │ ┌─────────┐
10:00  │         │ │    B    │   A et B se chevauchent : même cluster,
       └─────────┘ │         │   chacun la moitié de la largeur
                   └─────────┘
11:00  ┌─────────────────────┐
       │          C          │   C commence quand B finit : pas de
12:00  └─────────────────────┘   chevauchement, nouveau cluster, pleine largeur
```

## Tests

```bash
npm test
```

- **Unitaires** : `layout.ts` (événement seul, chevauchements, événements contigus, horaires
  hors plage, les 3 règles du kata) et `time.ts`.
- **Client API** avec MSW : cookies et en-tête CSRF, refresh unique sur 401, retry sur 403,
  overlay après 2 s.
- **Intégration** avec Testing Library + MSW : parcours utilisateur complets (connexion,
  navigation, création, modification, suppression, lecture seule, erreurs).

## Déploiement

Cloudflare Workers Static Assets, configuré dans `wrangler.json`
(`assets.not_found_handling: "single-page-application"`).

```bash
npm run build
npx wrangler deploy
```

## Licence

Projet personnel à but de démonstration.
