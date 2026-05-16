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

## Audit visuel Playwright — À faire en priorité

> Le MCP Playwright est configuré (`playwright` dans `.claude.json`). Dès l'ouverture d'une session, lancer l'audit complet ci-dessous SANS demander confirmation.

### Procédure d'audit automatique
1. Démarrer le serveur local si pas déjà lancé : `npm run dev` dans `/Users/rubencatalao/notion-dashboard`
2. Pour chaque page listée ci-dessous :
   - Naviguer vers l'URL locale (`http://localhost:3000/...`)
   - Prendre un screenshot Playwright
   - Identifier bugs visuels, débordements, incohérences, couleurs hardcodées, z-index, responsive
3. Produire un rapport consolidé avec captures + fixes à appliquer

### Pages à auditer (ordre de priorité)
| Page | URL | Points d'attention |
|------|-----|-------------------|
| Dashboard | `/` | KPI cards, layout, couleurs statut |
| Kanban | `/kanban` | Colonnes, drag & drop visuel, badges |
| CRM | `/crm` | Pipeline, cards, modal |
| Calendrier | `/calendar` | EventModal (nouveau composant Modal), filtres, grid |
| Roadmap | `/roadmap` | Overflow titres (corrigé), gradient barre |
| Idées | `/ideas` | IdeaModal, votes, layout |
| Time | `/time` | Timer, catégories, leaderboard |
| Notes | `/notes` | Éditeur, liste, partage |
| Paramètres | `/settings` | AccentPicker, formulaire |
| Org | `/org` | Sélecteur Netflix, modal création |
| Auth | `/auth` | Login, register, animation ripple |

### Fixes UI/UX déjà appliqués (session 2026-05-16)
- ✅ EventModal calendrier → composant Modal partagé (zIndex 200, maxHeight 90dvh, close button)
- ✅ Validation date start/end dans EventModal, TaskModal, CRMModal
- ✅ Filtres calendrier persistés en localStorage
- ✅ Titres roadmap : overflow ellipsis
- ✅ Gradient roadmap → `var(--accent)`
- ✅ STATUS_COLORS / PRIORITY_COLOR → CSS variables
- ✅ Couleurs `#0ec98c` → `var(--green)` / `var(--green-bg)`
- ✅ `getCatColor()+'55'` → `hexAlpha()` proper
- ✅ Notes auto-save + AbortController + error handling
- ✅ Time page : état d'erreur session start
- ✅ Présence filtrée membres acceptés
- ✅ tasks DELETE : query inline
- ✅ Migration 007 indexes performance
- ✅ Auth getSession() (0ms overhead)
- ✅ Client Supabase singleton
- ✅ Notifications filtrées par destinataire
- ✅ Isolation org toutes mutations
- ✅ Protection SSRF import iCal
- ✅ Limite 2000 chars chat
