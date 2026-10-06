# SAVICO AI — Frontend

Frontend cho SAVICO AI: người dùng chụp ảnh lô đất, nhập nhu cầu, và nhận lại
bản vẽ, phối cảnh, dự toán chi phí và bộ hồ sơ thi công do AI sinh ra.

Luồng chính gồm 3 bước — **Nhập liệu → Nhận dự toán → Hồ sơ thi công** — bao
quanh bởi trang chủ, Cẩm nang, Hướng dẫn và Cửa sổ cá nhân.

> **Tài liệu giao diện là nguồn chuẩn**: [`docs/MO_TA_GIAO_DIEN.md`](./docs/MO_TA_GIAO_DIEN.md)
> mô tả đủ 11 màn hình. Code chú thích theo số mục của tài liệu này.
> Trạng thái dựng khung và việc còn lại: [`docs/TRANG_THAI_DUNG_KHUNG.md`](./docs/TRANG_THAI_DUNG_KHUNG.md).

> The backend is fully separate. This app communicates **only** through the
> external .NET REST API.

## Tech stack

| Concern         | Choice                                                   |
| --------------- | -------------------------------------------------------- |
| Framework       | Next.js 16 (App Router) · React 19 · TypeScript (strict) |
| Styling         | Tailwind CSS v4 · shadcn/ui · Radix UI · CVA · tw-animate-css |
| Icons           | lucide-react                                             |
| Server state    | TanStack Query                                           |
| Client state    | Zustand (feature-scoped)                                 |
| Forms           | React Hook Form + Zod                                    |
| Networking      | Axios (single shared instance + interceptors)            |
| i18n            | next-intl (`vi` default, `en` fallback)                  |
| Notifications   | Sonner                                                   |
| Theme           | next-themes (light / dark / system)                      |

## Getting started

```bash
pnpm install
cp .env.example .env.local   # then fill in NEXT_PUBLIC_API_BASE_URL
pnpm dev
```

Scripts: `dev`, `build`, `start`, `lint`, `typecheck`, `format`.

### Working without the backend

Env vars are validated by Zod at startup (`src/shared/config/env.ts`), so the
app fails fast on misconfiguration. While the .NET API is unavailable, two
dev-only flags swap real requests for in-browser mocks:

- `NEXT_PUBLIC_USE_MOCK_AUTH=true` — login & roles work with no API (an email
  containing `admin` gets the admin role).
- `NEXT_PUBLIC_USE_MOCK_API=true` — feature pages render sample data with no API.

Each feature's API module picks the mock vs. real implementation at import time
based on these flags.

## Project structure

```
src/
  app/
    [locale]/              # all routes are locale-prefixed (/vi, /en)
      (landing)/           # public marketing route group
      (auth)/              # guest-only route group (login, …)
      (dashboard)/         # protected route group (nested shell)
      layout.tsx           # root layout: <html>, fonts, providers, i18n
      error.tsx loading.tsx not-found.tsx
  features/                # feature-based architecture (see below)
    landing/ auth/ dashboard/ project/ estimate/ library/ chatbot/ cms/
    users/ profile/ settings/
  shared/
    components/ui/         # shadcn/ui primitives (CLI target)
    components/common/     # composed app-level components
    hooks/ providers/ layouts/ config/ lib/ constants/ types/ utils/ auth/
  i18n/                    # next-intl routing, navigation, request config
  proxy.ts                 # locale routing + auth route guards (Next.js 16 proxy)
messages/                  # vi.json, en.json (no hardcoded UI text)
```

See [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) for naming conventions,
coding standards, and the rules that keep this codebase scalable.

## Design system

Semantic design tokens live in `src/app/globals.css` as CSS variables
(OKLCH colors) and are exposed to Tailwind via `@theme inline`:

- **Colors** — `background`, `foreground`, `primary`, `secondary`, `accent`,
  `muted`, `border`, plus status roles `success`, `warning`, `destructive`.
- **Radius** — `sm` / `md` / `lg` / `xl`
- **Spacing** — `xs` / `sm` / `md` / `lg` / `xl` / `2xl`
- **Typography** — `text-display` / `text-heading` / `text-title` /
  `text-body` / `text-caption`
- **Shadow** — `sm` / `md` / `lg` / `xl`
- **Animation** — `duration-fast` / `normal` / `slow`

All three themes (light, dark, system) are supported out of the box.

## Adding shadcn components

```bash
pnpm dlx shadcn@latest add <component>
```

Components are configured (via `components.json`) to install into
`src/shared/components/ui`. After adding, re-export from
`src/shared/components/ui/index.ts`. Always **extend** shadcn primitives
(new CVA variants) rather than replacing them.
