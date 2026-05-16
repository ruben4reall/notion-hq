# Manager Dashboard — Context for Claude

## Règle absolue
Exécute directement sans demander confirmation. Pas de "est-ce que je peux ?", pas de "veux-tu que je…". Tu fais.

## Projet
Dashboard de gestion d'équipe full-stack (remplacement de Notion). Propriétaire : Ruben Catalao + Alexandre Thomas.

**URL prod :** https://manager-thenextbigthing.vercel.app  
**Repo :** https://github.com/ruben4reall/manager-dashboard  
**Stack :** Next.js 15 App Router · React 19 · Supabase · Tailwind CSS 3 · TypeScript · Vercel

## Tech stack détaillé
- **Next.js 15.3+** — App Router, Server Components, Route Handlers dans `app/api/`
- **React 19** — `useRef<T>()` exige une valeur initiale : `useRef<T | undefined>(undefined)`
- **Supabase** — Auth via `@supabase/ssr`, DB via service role key (`lib/db.ts`)
- **Auth** — `mailer_autoconfirm: true` (pas de confirmation email), `site_url: https://manager-thenextbigthing.vercel.app`
- **Tailwind 3** — utilitaires classiques, pas de v4
- **@hello-pangea/dnd 18** — drag & drop Kanban

## Structure des fichiers clés

```
app/
  layout.tsx          — root layout, charge Providers
  page.tsx            — Dashboard principal (KPIs, Kanban, CRM résumés)
  org/page.tsx        — Sélecteur de projet style Netflix (multi-step Typeform pour création)
  auth/page.tsx       — Login / Register avec animation ripple au succès
  settings/page.tsx   — Paramètres utilisateur + AccentPicker (8 couleurs)
  kanban/             — Board Kanban drag & drop
  crm/                — Pipeline CRM
  calendar/           — Calendrier + import iCal + Google Calendar
  notes/              — Éditeur de notes collaboratif
  time/               — Time tracker avec sessions et leaderboard
  ideas/              — Board d'idées avec votes
  roadmap/            — Roadmap visuelle
  api/                — Route Handlers (un dossier par feature)

components/
  TopNav.tsx          — Nav fixe en haut, menu profil (Changer de projet / Paramètres / Déconnexion)
  BottomNav.tsx       — Nav mobile en bas (cachée sur /auth, /org, /login)
  PresenceIndicator.tsx — Avatars en ligne, isTouch détecte touch vs mouse, bottom sheet sur mobile
  NotificationBell.tsx  — Cloche avec badge, dropdown fixed top:58 right:12
  Chat.tsx            — Chat flottant, plein écran mobile, fenêtre 340×460 desktop
  GlobalTimerBar.tsx  — Barre de timer active, top:56, cachée sur /time /auth /org /login
  PageTransition.tsx  — Ajoute paddingTop:56 + offset timer, skip sur pages publiques
  Providers.tsx       — AuthProvider + TimerProvider + AccentInit
  ThemeToggle.tsx     — Dark/Light, cachée sur mobile
  TimeWidget.tsx      — Horloge en temps réel, cachée sur mobile

lib/
  db.ts               — getClient() avec service role, toutes les fonctions CRUD
  auth.ts             — getUser(req) côté serveur
  accent-color.ts     — 8 accents, applyAccent(), saveAccent(), initAccent()
  sounds.ts           — playPresenceSound(), playNotifSound(), playLoginSound()
  timer-context.tsx   — TimerContext global (active session, elapsed)
  supabase/           — clients server/browser pour @supabase/ssr

context/
  AuthContext.tsx     — useAuth() → { user: {id, name, email}, status, signOut }

middleware.ts         — Auth guard global, redirige /auth si non connecté, /org si pas d'org cookie
```

## Base de données Supabase (tables)

| Table | Clés importantes |
|-------|-----------------|
| `tasks` | title, status, priority, module, assigned_to, date_start, date_end |
| `crm` | enseigne, contact, status, canal, type, priority, next_followup |
| `ideas` | title, status, category, effort, votes |
| `events` | title, type, date_start, date_end |
| `notes` | titre, contenu, utilisateur, shared_with (array) |
| `time_sessions` | utilisateur, categorie, debut, fin (null si actif), duree |
| `notifications` | message, type (info/success/warning/error), lu, de, pour |
| `presence` | username, last_seen, connected_at, display_name, password_override, ical_feed_url |
| `chat_messages` | author, message, destinataire |
| `organizations` | name, slug, created_by |
| `org_members` | org_id, user_id, role (admin/member) |

**Présence "en ligne"** = last_seen < 2 minutes.

## Système multi-org
- Cookie `current_org_id` (30 jours) définit l'espace actif
- `middleware.ts` redirige vers `/org` si cookie absent
- `/org` = sélecteur Netflix → cards avec couleur générée depuis l'ID, bouton + ouvre modal Typeform 2 étapes
- `TopNav` → menu profil → "Changer de projet" → `/org`

## Système de couleurs (accent)
CSS variables sur `:root` :
- `--accent` : couleur hex
- `--accent-rgb` : "R, G, B" (pour rgba())
- `--accent-bg` : rgba(var(--accent-rgb), 0.12)
- `--accent-glow` : rgba(var(--accent-rgb), 0.35)

8 accents disponibles dans `lib/accent-color.ts`. Stockés dans `localStorage`. `Providers.tsx` appelle `initAccent()` au montage.

**Toujours utiliser `rgba(var(--accent-rgb), X)` dans les styles inline, jamais de rgba hardcodé.**

## CSS variables thème
```
--bg-0, --bg-1, --bg-2, --bg-3   → fonds (de plus en plus clair)
--t0, --t1, --t2                  → textes (0 = plus fort)
--border-s, --border-m            → bordures
--accent, --accent-rgb, --accent-bg, --accent-glow
--red                             → erreurs/danger
```

## Pages publiques (pas de nav, pas de padding)
`/auth/*`, `/org`, `/login`

Dans `TopNav.tsx` et `BottomNav.tsx` :
```tsx
if (path === '/login' || path.startsWith('/auth') || path.startsWith('/org')) return null
```

Dans `PageTransition.tsx` :
```tsx
const isPublic = pathname === '/login' || pathname.startsWith('/auth') || pathname.startsWith('/org')
```

## Mobile
- Touch détecté via `window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 1024`
- `PresenceIndicator` : avatars sur toutes tailles, bottom sheet sur touch, hover tooltip sur desktop
- `NotificationBell` dropdown : `position: fixed, top: 58, right: 12` (pas absolute)
- `Chat` : plein écran sur mobile (`top:56, left:0, right:0, bottom: calc(64px + env(safe-area-inset-bottom))`)
- Chat float button : `bottom: calc(64px + env(safe-area-inset-bottom) + 12px)`
- Safe area iPhone : `env(safe-area-inset-bottom)`

## Patterns à respecter
- **Styles inline** partout (pas de classes Tailwind pour les composants custom)
- **Tailwind** uniquement pour layout global (hidden lg:flex, max-w-*, etc.)
- **Pas de commentaires** sauf si raison non évidente
- **useRef React 19** : toujours `useRef<T | undefined>(undefined)`
- **Fetch côté client** vers `/api/*` — pas d'import direct de `lib/db.ts` dans les composants
- **getClient()** = Supabase service role, uniquement dans les Route Handlers
- **getUser(req)** = auth serveur dans les Route Handlers

## Déploiement
- Push sur `main` → Vercel déploie automatiquement via GitHub webhook
- Pas de CLI Vercel installée localement
- Si le webhook ne se déclenche pas : API Vercel REST pour forcer un deploy

## Animations disponibles (globals.css)
`slideDown`, `floatIn`, `fadeIn`, `pulse-dot`, `auth-ripple`, `auth-logo-bounce`, `auth-text-in`, `dropdown-enter` (class CSS)

## Ce qui n'existe PAS / a été supprimé
- ~~next-auth~~ → remplacé par Supabase Auth + `AuthContext`
- ~~@notionhq/client~~ → remplacé par Supabase DB
- ~~lib/notion.ts~~ → supprimé
- ~~lib/users.ts~~ → supprimé
- ~~app/api/auth/[...nextauth]/~~ → supprimé

## Fixes UI/UX en attente (audit 2026-05-16)

### 🔴 Critique
- **`app/calendar/page.tsx`** — EventModal : `zIndex: 100/101` trop bas, doit être 200/201 (collision avec NotificationBell)
- **`app/calendar/page.tsx`** — EventModal : pas de `maxHeight: 90dvh`, peut sortir de l'écran sur mobile
- **`app/ideas/page.tsx` + composant IdeaModal** — le formulaire "Nouvelle idée" est visuellement incohérent (à vérifier et refaire proprement avec les variables CSS du design system)

### 🟠 Important
- **`app/roadmap/page.tsx`** — titres de tâches sans `textOverflow: ellipsis` → overflow hors des cartes
- **`app/calendar/page.tsx`** — pas de validation date (dateEnd peut être avant dateStart)
- **`app/calendar/page.tsx`** — bouton fermeture modal différent de Modal.tsx (pas de background `var(--bg-3)`)
- **`app/calendar/page.tsx`** — labels formulaire en MAJUSCULES au lieu de "Title case" comme les autres modals
- **`app/calendar/page.tsx`** — `inputStyle` dupliqué au lieu d'utiliser les styles partagés
- **`components/TaskModal.tsx`** et **`components/CRMModal.tsx`** — pas de validation date start/end
- **`app/notes/page.tsx`** — pas de gestion d'erreur sur l'auto-save (silencieux si réseau KO)
- **`app/time/page.tsx`** — pas d'état d'erreur si le démarrage de session échoue

### 🟡 Moyen
- **`app/page.tsx`** — `STATUS_COLORS` et `PRIORITY_COLOR` hardcodés en hex → utiliser CSS variables
- **`app/calendar/page.tsx`** — couleurs rgba hardcodées (vert `#0ec98c`) → `var(--accent-rgb)` pattern
- **`app/roadmap/page.tsx`** — gradient `linear-gradient(90deg, #7c6af5, #0ec98c)` hardcodé
- **`app/time/page.tsx`** — `getCatColor() + '55'` (opacity suffix bricolé) → utiliser `rgba(var(--accent-rgb), 0.33)`
- **`app/calendar/page.tsx`** — filtres "AFFICHER" perdus à la navigation (non persistés en localStorage)
- **`app/notes/page.tsx`** — auto-save sans AbortController → requêtes obsolètes si frappe rapide

### Déjà réglé dans cette session
- ✅ Présence filtrée aux membres acceptés du projet (non aux invités en attente)
- ✅ tasks DELETE : `verifyTaskOwnership` undefined → remplacé par query inline
- ✅ Migration 007 indexes performance appliquée
- ✅ Auth getSession() au lieu de getUser() (0ms overhead)
- ✅ Client Supabase singleton
- ✅ Notifications filtrées par destinataire
- ✅ Isolation org sur toutes les mutations (tasks/crm/ideas/events/time)
- ✅ Protection SSRF sur import iCal
- ✅ Limite 2000 chars sur chat
