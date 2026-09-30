# CLAUDE.md

Guide de contexte et de bonnes pratiques pour travailler sur ce dépôt.

## Le projet

Front **React 19** d'un agenda (vue « jour » d'événements), destiné à un **portfolio de
développeur front React**. Il refait le front Angular du dépôt voisin
`../agenda/Frontend` et consomme le backend Spring Boot `../agenda/Backend`
(aucune copie du backend ici).

- Le code doit être **idiomatique, moderne, testé et lisible** : chaque choix doit pouvoir se
  justifier en entretien.
- Le front Angular est la **référence fonctionnelle** (comportement attendu), pas une référence
  d'architecture : ne pas transposer services injectés, RxJS ou intercepteurs.
- En cas de contradiction entre le front Angular et ce guide : **demander**.

## Contraintes du kata (non négociables)

- **Dépendances runtime** : uniquement `react`, `react-dom`, `react-router`. Toute autre
  dépendance runtime nécessite mon accord. Pas de MUI/Chakra, lib de calendrier, lodash,
  TanStack Query, axios, date-fns, clsx… Les dépendances de **dev** sont libres.
- Le **calendrier est écrit from scratch**.
- Chaque événement est une `div` avec couleur de fond et bordure 1px, `id="event-<id>"`, et
  l'id apparaît dans son contenu.
- Layout responsive, recalculé au redimensionnement (`ResizeObserver`).
- Règles de chevauchement : si A et B se chevauchent, Largeur(A) = Largeur(B) et
  Largeur(A) + Largeur(B) = LargeurMax (largeur du conteneur).

## Stack

- Vite (`react-ts`), TypeScript `strict` (+ `noUncheckedIndexedAccess`,
  `noImplicitOverride`, `verbatimModuleSyntax`)
- React 19, composants fonctions + hooks uniquement
- `react-router` v8 en mode librairie (`createBrowserRouter`, `RouterProvider`)
- Modules SCSS (`sass-embedded`, dépendance de dev) + variables CSS, `<dialog>` natif pour les
  modales
- Vitest + React Testing Library + `@testing-library/user-event` + MSW, couverture `@vitest/coverage-v8`
- Playwright (`e2e/`) : l'application réelle dans Chromium, sur le faux backend MSW
- CI GitHub Actions (`.github/workflows/ci.yml`)
- ESLint flat config (`eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`,
  `typescript-eslint`) + Prettier
- Déploiement : Cloudflare Workers (`wrangler.json`) : fichiers statiques + proxy `/api/*`

## Commandes

```bash
npm run dev        # Vite sur http://localhost:5173
npm run dev:mock   # idem avec l'API simulée par MSW
npm run typecheck  # tsc -b
npm run build      # tsc -b && vite build
npm run preview
npm test           # vitest
npm run test:coverage  # une passe, échoue sous les seuils de vite.config.ts
npm run test:e2e   # Playwright (e2e/), démarre dev:mock sur le port 5174
npm run lint
npm run format
npm run format:check
```

Une fois une tâche terminée, et **avant chaque commit** : lancer le skill `/pre-commit-checks`
(`.claude/skills/pre-commit-checks/`). Il rejoue ce que fait la CI, dans cet ordre : `npm run lint`,
`npm run format:check`, `npm run test:coverage`, `npm run build`, `npm run test:e2e`. Les cinq
doivent passer ; en cas d'échec, corriger la cause puis tout relancer, sans affaiblir un contrôle.

## Architecture

Organisation **par fonctionnalité** :

```
src/
  main.tsx, App.tsx, router.tsx, ErrorPage.tsx
  api/          apiFetch + fonctions typées (getEvents, createEvent, login…) + types
  features/
    auth/       AuthProvider, useAuth, RequireAuth, LoginPage, LoginForm, RegisterForm
    calendar/   DayPage, CalendarHeader, DayGrid, EventBlock, EventFormDialog,
                EventDetailsDialog, OutOfRangeEvents, useDayEvents, layout.ts, time.ts
    loading/    useIsWaitingForServer, ServerWakeOverlay
  ui/           Button, IconButton, Dialog, TextField, Tabs, Spinner, icons.tsx
  styles/       variables.scss, reset.scss
  test/         setup, handlers MSW partagés, helpers de rendu
worker/         proxy Cloudflare /backend/* → backend (tsconfig.worker.json, API web standard)
e2e/            tests Playwright (mesures dans un vrai navigateur : règles du kata, parcours)
```

Règles de dépendance entre dossiers :

- `ui/` ne connaît **ni** l'API **ni** le domaine (pas d'import depuis `api/` ou `features/`).
- `features/*` peut importer `ui/`, `api/` et ses propres fichiers. Un feature n'importe un
  autre feature que via son hook public (ex. `useAuth` depuis `features/auth`).
- `api/` ne dépend pas de React : il expose des abonnements (`onSessionExpired`,
  `subscribeToSlowRequests`) que React lit (effet, `useSyncExternalStore`).
- `worker/` ne dépend de rien d'autre dans le dépôt et n'utilise que les API web standard
  (`Request`, `Response`, `fetch`).
- `layout.ts` et `time.ts` sont **purs** : aucun import React, aucun accès au DOM.

Conventions de fichiers :

- Un composant par fichier, `PascalCase.tsx`, avec son `PascalCase.module.scss` à côté.
- Hooks : `useXxx.ts`. Fonctions pures : `camelCase.ts`.
- Tests colocalisés : `Xxx.test.tsx` / `xxx.test.ts`.
- Exports nommés uniquement (pas de `export default`), sauf si un outil l'exige.
- Pas de fichiers barrel (`index.ts`) qui réexportent tout : importer depuis le fichier.

## Bonnes pratiques React 19

### Composants

- Fonctions uniquement, props typées par un `type XxxProps = {…}`. Pas de `React.FC`.
- Pour les composants qui enveloppent un élément natif, étendre ses props :
  `type ButtonProps = ComponentProps<'button'> & { variant?: 'primary' | 'ghost' }`, et
  transmettre le reste avec `...props`.
- **`ref` est une prop ordinaire** : ne jamais utiliser `forwardRef`.
  ```tsx
  function TextField({ ref, label, ...props }: ComponentProps<'input'> & { label: string }) {
    const id = useId();
    return (<><label htmlFor={id}>{label}</label><input id={id} ref={ref} {...props} /></>);
  }
  ```
- Les callbacks `ref` peuvent retourner une **fonction de nettoyage** (utile pour
  `ResizeObserver`, listeners sur `<dialog>`).
- Valeurs par défaut via la déstructuration (`{ variant = 'primary' }`), jamais `defaultProps`.
  Pas de `propTypes` : TypeScript suffit.
- `useId()` pour relier `label`/`input` et les attributs `aria-*` ; jamais d'id codés en dur
  dans un composant réutilisable.
- Garder les composants petits et purs : même props → même rendu, aucun effet de bord pendant
  le rendu.

### Context

- Rendre directement le contexte : `<AuthContext value={auth}>`, **pas** `<AuthContext.Provider>`.
- Lire un contexte avec `use(AuthContext)` (peut être appelé conditionnellement), encapsulé
  dans un hook (`useAuth`) qui lève une erreur explicite hors du provider.
- Seul l'utilisateur courant va en Context. Le compteur de requêtes lentes vit dans `api/` et se
  lit avec `useSyncExternalStore` (pas de provider). Tout le reste
  reste local (état au plus près de son usage, remonté seulement si nécessaire).

### Formulaires et actions

- Formulaires via **`<form action={formAction}>`** + **`useActionState`** : l'action reçoit
  `(prevState, formData)` et retourne le nouvel état (erreurs par champ, message global).
  `isPending` sert à désactiver le bouton et afficher le chargement.
- `useFormStatus` dans un bouton de soumission réutilisable pour connaître l'état du `<form>`
  parent sans passer de props.
- Validation : attributs natifs (`required`, `min`, `pattern`, `type="time"`) + validation
  dans l'action pour les messages par champ. Les erreurs sont reliées au champ par
  `aria-describedby` et `aria-invalid`.
- Après une action réussie, React réinitialise le formulaire non contrôlé : utiliser
  `defaultValue` plutôt que des champs contrôlés quand c'est possible. Les champs contrôlés
  sont réservés aux cas où la valeur pilote l'UI (ex. activer « Ajouter » seulement si valide).
- Exception : un formulaire qui déclenche une **mutation optimiste** et se ferme aussitôt
  (`EventFormDialog`) utilise `onSubmit`, pas `<form action>`. Une action est une transition :
  la fermeture de la modale attendrait la réponse du serveur, entremêlée avec la mutation.

### Mises à jour optimistes

- `useOptimistic` pour création, modification et suppression : on applique le changement
  optimiste **dans une action / `startTransition`**, puis on appelle l'API ; en cas d'erreur, la
  valeur optimiste disparaît d'elle-même à la fin de la transition, il suffit d'afficher le message.
- Après un `await` dans une transition asynchrone, rendre la mise à jour d'état confirmée dans un
  nouveau `startTransition(() => …)`, sinon l'événement optimiste et le confirmé coexistent.
- Tant qu'une action asynchrone est en cours, React regroupe **toutes** les transitions : ne pas
  mettre dans une transition une mise à jour qui doit être immédiate (fermer une modale,
  naviguer). D'où `<RouterProvider useTransitions={false}>`.
- Le reducer optimiste est une fonction pure testable, partagée avec le reducer réel si possible.

### Effets

- **Pas de `useEffect` pour dériver des données** : calculer pendant le rendu (ex. le layout
  des événements se calcule à partir de `events` et de la largeur mesurée).
- `useEffect` uniquement pour se **synchroniser avec un système externe** : `fetch` avec
  `AbortController`, `ResizeObserver`, `showModal()`/`close()` d'un `<dialog>`, listeners.
  Toujours retourner un nettoyage.
- Pas d'effet pour réagir à un événement utilisateur : mettre la logique dans le gestionnaire.
- Pour réinitialiser l'état d'un sous-arbre quand une donnée change, utiliser `key`
  (ex. `<EventFormDialog key={event?.id ?? 'new'} />`) plutôt qu'un effet qui remet à zéro.
- Chargement de données : `useDayEvents(date)` annule la requête précédente quand `date`
  change, ignore les réponses obsolètes et expose `{ events, status, error }` via
  `useReducer`.
- Respecter les **règles des hooks** et les dépendances exhaustives ; ne jamais désactiver
  `react-hooks/exhaustive-deps`. Si une dépendance pose problème, revoir la conception
  (`useEffectEvent` si disponible dans la version installée, ou déplacer la logique).

### Performance

- Ne pas ajouter `useMemo` / `useCallback` / `memo` par réflexe. Les utiliser seulement pour :
  une valeur de Context (éviter de re-rendre tous les consommateurs), une dépendance d'effet
  qui doit rester stable, ou un calcul mesuré comme coûteux.
- Pas de `startTransition` pour le changement de jour : les routes n'ont pas de loader, et
  `useDayEvents` affiche son propre état de chargement. Les navigations restent immédiates
  (`useTransitions={false}`) pour ne jamais attendre une mutation optimiste en cours.
- Listes : `key` stable issue des données (`event.id`), jamais l'index.

### Métadonnées de page

- Rendre `<title>` directement dans la page (`DayPage`, `LoginPage`) : React 19 le remonte
  dans `<head>`. Pas de `document.title = …` dans un effet.

### Routage (`react-router` v8)

- Importer depuis **`react-router`** (pas `react-router-dom`).
- Routes déclarées dans `router.tsx` avec `createBrowserRouter`.
- Navigation par `<Link>` / `useNavigate` ; la date affichée vient **uniquement** de l'URL
  (`useParams`), jamais d'un état dupliqué.
- `RequireAuth` attend la restauration de session (un seul `GET /api/auth/me` partagé) avant
  de rediriger avec `<Navigate replace />`.

### Accessibilité

- HTML sémantique d'abord (`button`, `form`, `label`, `dialog`, `header`, `main`, `time`).
- Modales : `<dialog>` + `showModal()` (focus piégé et `Échap` natifs), `aria-labelledby`
  vers le titre, focus restitué à l'élément déclencheur à la fermeture.
- Onglets : `role="tablist"` / `tab` / `tabpanel`, `aria-selected`, flèches gauche/droite.
- Événements du calendrier : focusables (`tabIndex={0}` ou `<button>`), activables à `Entrée`,
  avec un libellé accessible (titre, heure, durée).
- Boutons icônes : toujours un `aria-label`. Icônes SVG décoratives : `aria-hidden="true"`.
- Contrastes AA, styles `:focus-visible` visibles.

### Styles

- Modules SCSS (`styles.xxx`), classes en `camelCase`. SCSS pour l'imbrication (`&:hover`,
  sélecteurs enfants) et les placeholders `%xxx` + `@extend` quand des règles se répètent.
- Couleurs, espacements, rayons, ombres en **variables CSS** (`--xxx`) dans
  `styles/variables.scss`, pas en variables Sass (`$xxx`) : elles restent modifiables à
  l'exécution (thème sombre, valeurs venant de React).
- Les positions calculées (top, height, left, width) passent par `style={{ … }}` ou des
  custom properties (`--top`, `--height`), le reste reste dans le CSS.
- Pas de librairie CSS ni de `clsx` : concaténer les classes à la main.

## TypeScript

- Pas de `any` (utiliser `unknown` + affinage). Pas de `as` pour contourner le typage, sauf
  à la frontière de l'API après validation.
- `import type` pour les imports de types (`verbatimModuleSyntax`).
- Types du domaine dans `api/types.ts` : `CalendarEvent` (pas `Event`, qui masquerait le type DOM), `EventPayload`, `User`.
- Unions discriminées pour les états (`{ status: 'loading' } | { status: 'success'; events } | …`)
  plutôt que plusieurs booléens.

## Client API

- `apiFetch` est une **fonction** (pas de classe), la **seule** qui appelle `fetch`.
- Toujours `credentials: 'include'`.
- En-tête `X-XSRF-TOKEN` sur `POST`/`PUT`/`PATCH`/`DELETE`, lu via **`getXsrfToken()`**
  uniquement (pour pouvoir passer du cookie à un en-tête de réponse sans toucher au reste).
- 401 hors `login` / `register` / `refresh` / `logout` → **un seul** refresh partagé (promesse
  mémorisée), puis rejeu ; si le refresh échoue → session perdue, retour `/login`.
  `/api/auth/me` est rafraîchi comme le reste : la restauration de session survit au jeton
  d'accès (15 min) tant que le refresh token (7 j) est valide.
- 403 sur requête mutante avec jeton XSRF changé entre envoi et réponse → un seul rejeu.
- Requête en attente après `SLOW_REQUEST_DELAY_MS` (2 s) → incrémente le compteur de
  requêtes lentes ; décrément à la fin, quel que soit le résultat.
- Les erreurs sont des `ApiError` typées (`status`, `message`) ; l'UI affiche un message
  compréhensible, jamais une erreur brute.
- URL de base : `import.meta.env.VITE_API_BASE_URL` (typée dans `vite-env.d.ts`).

En production, l'API est appelée sur le domaine du site : le Worker `worker/index.ts` relaie
`/backend/*` vers le backend (`API_ORIGIN` dans `wrangler.json`), d'où `VITE_API_BASE_URL=/backend`
dans `.env.production`. Préfixe `/backend` et non `/api` : EasyPrivacy (uBlock) bloque
`||workers.dev/api/event`. Le Worker retire le préfixe et réécrit le `Path` des `Set-Cookie`.
Il n'exporte que son handler (le runtime refuse tout autre export du module principal) : les
utilitaires vont dans `worker/paths.ts`. Ça évite CORS, les cookies tiers et le jeton CSRF illisible entre domaines,
sans toucher au backend. Tout changement côté backend se fait dans le dépôt `agenda`, pas ici.

## Tests

- **TDD** pour la logique pure (`layout.ts`, `time.ts`) : test d'abord, couverture exhaustive
  des cas limites, dont les 3 règles du kata vérifiées explicitement.
- Tester **ce que voit l'utilisateur**, pas l'implémentation :
  - requêtes par priorité `getByRole` (avec `name`) > `getByLabelText` > `getByText` ;
    `getByTestId` en dernier recours ;
  - `const user = userEvent.setup()` puis `await user.click(…)` ; pas de `fireEvent` sauf cas
    impossible autrement ;
  - `findBy…` / `waitFor` pour l'asynchrone, jamais de `setTimeout` manuel.
- API simulée par **MSW** (handlers partagés dans `src/test/`), `onUnhandledRequest: 'error'`,
  `server.resetHandlers()` après chaque test. On ne mocke pas `fetch` ni les modules maison.
- Faux timers Vitest stricts (`vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })`)
  pour le délai de 2 s : avec `shouldAdvanceTime`, le temps réel s'ajoute et le seuil devient
  instable sous charge.
- jsdom n'implémente ni `ResizeObserver` ni `HTMLDialogElement.showModal` : les polyfiller
  dans le setup de test.
- Un helper `renderWithRouter` (router mémoire + providers) pour les tests d'intégration.

## Qualité

- ESLint et Prettier propres, aucun `eslint-disable` sans commentaire justifiant pourquoi.
- Pas de `console.log` laissé dans le code.
- Commentaires rares : expliquer le **pourquoi** (règle du kata, contournement navigateur),
  pas le quoi.
- Textes de l'interface en français, code (identifiants, commits) en anglais.

## Plugins Claude Code

Deux plugins sont installés au niveau utilisateur. Ils complètent ce fichier sans le remplacer :
**en cas de conflit, ce `CLAUDE.md` prime.**

### ponytail (sobriété du code)

Actif par défaut (mode `full`) : avant d'écrire du code, remonter l'échelle YAGNI → code déjà
présent → API standard → fonctionnalité native → une ligne → minimum. C'est l'esprit du kata
(`<dialog>`, `<input type="time">`, `Intl.DateTimeFormat`, CSS plutôt que JS, aucune dépendance
ajoutée).

Ce que ponytail ne doit **pas** simplifier ici :

- **Tests** : la règle « un seul check minimal » ne s'applique pas. TDD et couverture
  exhaustive de `layout.ts` / `time.ts`, tests d'intégration RTL + MSW, comme décrit dans
  « Tests ».
- **Architecture et conventions** : l'arborescence par fonctionnalité, un composant par
  fichier, les composants `ui/` réutilisables et le client `apiFetch` (refresh, XSRF, requêtes
  lentes) sont voulus, même s'ils ajoutent des fichiers.
- **Accessibilité, validation, gestion d'erreurs, sécurité** : jamais rognées.
- **Compte rendu de fin de phase** : complet, c'est une explication demandée.

Les raccourcis assumés portent un commentaire `// ponytail: <limite>, <quand l'améliorer>`
(en anglais). Commandes utiles :

- `/ponytail-review` : revue de la phase en cours, centrée sur la sur-ingénierie. La faire avant
  de présenter une phase, en plus des tests et du lint.
- `/ponytail-audit` : audit du dépôt entier, à lancer ponctuellement.
- `/ponytail-debt` : liste les commentaires `ponytail:`, à relire avant la phase de finition.

### graphify (graphe de connaissances du code)

Les hooks du plugin ne font rien tant que `graphify-out/graph.json` n'existe pas. Une fois le
graphe construit, ils rappellent de l'interroger avant de lire ou chercher dans les fichiers et
le rafraîchissent automatiquement avant chaque requête.

- **Construire le graphe** (une fois qu'il y a du code, puis après un gros refactor) :
  `graphify extract . --code-only`. Ne pas lancer `extract` sans `--backend` explicite (sinon
  graphify choisit seul à quel fournisseur envoyer les docs).
- **L'utiliser** pour les questions de structure : `graphify god-nodes` (vue d'ensemble),
  `graphify query "<question>"`, `graphify explain "<symbole>"`,
  `graphify path "<A>" "<B>"`, `graphify affected "<symbole>"` avant de modifier un module
  partagé (`apiFetch`, `layout.ts`, `AuthProvider`…).
- `affected` ne voit que les liens code → code : chercher aussi le nom du fichier dans les tests
  et la config.
- **Front Angular de référence** : si `../agenda` a son propre graphe, l'interroger avec
  `--graph ../agenda/graphify-out/graph.json` pour retrouver un comportement attendu, puis lire
  le fichier désigné.
- **Ne pas lancer `graphify claude install`** : il réécrirait ce fichier ; le plugin fournit
  déjà les hooks.
- `graphify-out/` n'est **pas versionné** (l'ajouter au `.gitignore` dès sa création).

## Git et workflow

- Travailler **phase par phase** : à la fin de chaque phase, `/pre-commit-checks` vert,
  montrer le résultat et **attendre mon feu vert** avant la phase suivante.
- **Ne jamais committer ni pousser sans demande explicite.** Quand un commit est demandé,
  `/pre-commit-checks` doit avoir passé sur l'état exact qui est committé.
- Commits au format **Conventional Commits** (`feat:`, `fix:`, `test:`, `refactor:`, `chore:`,
  `docs:`…), en anglais, un commit par unité logique.
- **Ne pas ajouter de ligne `Co-Authored-By`** dans les messages de commit.
- Mettre à jour le `README.md` dans le même commit que tout changement notable
  (fonctionnalité, commande, variable d'env, structure).
- Déploiement : `wrangler.json` avec `assets.not_found_handling: "single-page-application"`.
  **Ne pas** créer de fichier `_redirects` (conflit → boucle de redirection).
