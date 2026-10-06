# Architecture, Conventions & Coding Standards

This document is the contract every contributor follows. It exists so new
developers can onboard in hours, not weeks.

## 1. Guiding principles

- **Feature-first** — code is organized by business capability, not by type.
- **Clean Architecture / SOLID / DRY / KISS** — depend on abstractions
  (shared barrels, the HTTP client), keep modules small and single-purpose.
- **Composition over inheritance** — build UI by composing shadcn primitives.
- **Never duplicate** — shared logic goes in `shared/`, not copy-pasted.
- **Never hardcode UI text** — all strings come from `messages/*.json`.

## 2. Layered structure & dependency rules

```
app/        →  features/  →  shared/
(routes)       (business)     (reusable infra & UI)
```

Allowed import directions (a layer may import the ones to its right):

| From \ May import | shared | features | app |
| ----------------- | :----: | :------: | :-: |
| **app**           |   ✅   |    ✅    |  —  |
| **features**      |   ✅   |   ❌\*   | ❌  |
| **shared**        |   ✅   |    ❌    | ❌  |

\* **No cross-feature imports.** A feature must never import another feature's
internals. If two features need to share something, lift it into `shared/`.
This is enforced by ESLint (`no-restricted-imports`).

Everything is imported through **barrels** (`index.ts`):

```ts
// ✅ good
import { LoginForm } from '@/features/auth'
import { Button } from '@/shared/components/ui'

// ❌ bad — reaching into internals
import { LoginForm } from '@/features/auth/components/login-form'
```

## 3. Feature anatomy

Every feature owns its full vertical slice. `features/project` is the
canonical template — copy its shape:

```
project/
  api/         endpoint functions (project.api.ts) + query keys (project.keys.ts)
  components/  feature UI, composed from shared/components/ui
  hooks/       TanStack Query hooks + custom hooks
  schemas/     Zod schemas + inferred form value types
  services/    pure domain logic (no React, no HTTP) — unit-testable
  store/       feature-scoped Zustand store(s)
  types/       feature domain types
  constants/   feature constants/enums
  index.ts     the ONLY public surface
```

## 4. Naming conventions

| Thing                 | Convention               | Example                    |
| --------------------- | ------------------------ | -------------------------- |
| Files (components)    | kebab-case               | `login-form.tsx`           |
| Files (hooks)         | kebab-case `use-*`       | `use-projects.ts`          |
| Files (stores)        | `*.store.ts`             | `project-filters.store.ts` |
| Files (api / keys)    | `*.api.ts` / `*.keys.ts` | `project.api.ts`           |
| Files (schemas)       | `*.schema.ts`            | `login.schema.ts`          |
| React components      | PascalCase               | `ProjectList`              |
| Hooks                 | camelCase `use*`         | `useProjects`              |
| Variables / functions | camelCase                | `getCurrentUser`           |
| Types / interfaces    | PascalCase               | `ProjectFilters`           |
| Constants / enums     | UPPER_SNAKE_CASE         | `PROJECT_STATUS`           |
| Zustand stores        | `useXStore`              | `useAuthStore`             |
| Query key factories   | `xKeys`                  | `projectKeys`              |
| Translation keys      | `namespace.dot.case`     | `auth.login.title`         |

## 5. State management

- **Server state → TanStack Query.** All remote data. Each feature defines a
  hierarchical query-key factory (`*.keys.ts`) for safe invalidation.
- **Client state → Zustand.** UI/ephemeral state, feature-scoped. There is no
  global app store; auth is the single cross-cutting store (`shared/auth`).

## 6. Data fetching & API

- One Axios instance: `shared/lib/api` (`httpClient` + typed `http` helpers).
- Request/response interceptors handle locale headers, the 401
  refresh-token retry, and error normalization to `ApiError`.
- Feature API modules are thin, framework-agnostic functions over `http`.

## 7. Forms

React Hook Form + `zodResolver` + shadcn `Form` primitives. Schemas are
built via factories that receive **resolved, localized** messages
(see `createLoginSchema`) so validation copy is never hardcoded.

## 8. Styling & design system

- Use Tailwind utilities + semantic tokens only (`bg-primary`,
  `text-muted-foreground`). Never hardcode hex colors.
- Every reusable component variant uses **CVA**.
- Never hand-roll a button/input/dialog/etc. that shadcn already provides —
  extend it.
- Honor `prefers-reduced-motion`; keep motion subtle (`duration-*` tokens).

## 9. Internationalization

- Locales: `vi` (default) and `en` (fallback). Routes are prefixed (`/vi`, `/en`).
- Use the locale-aware `Link` / `useRouter` from `@/i18n/navigation`.
- Server pages call `setRequestLocale(locale)` for static rendering.
- Add new strings to **both** `messages/vi.json` and `messages/en.json`.

## 10. Authentication (infrastructure)

`shared/auth` provides the store, routing personas (`guest` / `customer` /
`staff` / `admin`), permissions, and route guards. `src/proxy.ts` checks the
non-sensitive `bmt.auth` marker; `AuthBootstrap` checks `/users/me` before
rendering private pages, including client navigations. `accountKind` separates
customer and staff areas; stable `roleCodes` identify the system Admin role.
The effective token permissions drive both the admin sidebar and direct URL
access through `ADMIN_ROUTE_ACCESS`. Admin has no implicit permission bypass.
Legacy CMS screens and contractor endpoints retain their system Admin gate.
Refresh rechecks the session and unrecoverable 401 clears private caches.
**Authorization and assignment scope are always enforced by the backend** —
client guards are UX only. See [the integration notes](./TICH_HOP_PHAN_QUYEN.md).

`pnpm test:auth` runs the pure routing policy regression tests using Node's
built-in runner and the existing TypeScript compiler.

## 11. Quality gates

Run before every PR:

```bash
pnpm typecheck && pnpm lint && pnpm format:check
```

Strict TypeScript is on (`noUncheckedIndexedAccess`, no unused locals, etc.).
Keep components small, prefer composition, and add new shared UI to the `ui`
barrel so the rest of the app can consume it.
