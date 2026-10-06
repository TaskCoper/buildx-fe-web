# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## What this is

**SAVICO AI** — frontend-only Next.js 16 (App Router) / React 19 / TypeScript app. There is **no backend in this repo** — the app talks **only** to an external .NET REST API via a single Axios instance. Package manager is **pnpm**.

The UI contract is `docs/MO_TA_GIAO_DIEN.md` (11 screens, mục V). **Read it before changing any screen** — code comments reference it by section number (e.g. `mục III.2, trường 4`). `docs/TRANG_THAI_DUNG_KHUNG.md` maps each screen to its route + components and tracks what is still stubbed.

The product is a 3-step flow — **Nhập liệu → Nhận dự toán → Hồ sơ thi công** — wrapped in a public site (trang chủ, Cẩm nang, Hướng dẫn) and an account screen. This is the current frontend source in the BMT workspace; the backend and feature documentation are sibling repositories described below.

## Workspace và quy trình triển khai

Các đường dẫn trong mục này tính từ gốc `savico-ai/`.

| Thành phần         | Đường dẫn               | Vai trò                                                                      |
| ------------------ | ----------------------- | ---------------------------------------------------------------------------- |
| Frontend hiện tại  | `./`                    | Next.js, React, TypeScript; triển khai màn hình và API client                |
| Backend            | `../bmt-be/`            | .NET REST API; đọc endpoint, DTO, validator và handler để đối chiếu contract |
| Tài liệu tính năng | `../bmt-documentation/` | User Story, Business Rule, TDD, đặc tả Unit Test/System Test                 |

Không dùng `../bmt/` hoặc `savico/` làm đường dẫn source cũ mặc định. Chỉ tái sử dụng code lịch sử khi đã xác minh vị trí và mức độ phù hợp. Đọc hướng dẫn áp dụng trong mỗi repository trước khi làm việc tại đó; yêu cầu nối API frontend không mặc nhiên bao gồm sửa backend.

### Skill bắt buộc theo phạm vi

- Triển khai hoặc sửa tính năng frontend: đọc [savico-implement-feature](.claude/skills/savico-implement-feature/SKILL.md).
- Thêm/sửa API client, nối backend hoặc thay mock: đọc [savico-integrate-api](.claude/skills/savico-integrate-api/SKILL.md). Tính năng có nối API áp dụng cả hai, dùng lại kết quả đọc tài liệu trong cùng tác vụ.
- Soạn tài liệu và báo cáo: đọc `../bmt-be/.claude/skills/vietnamese-clear-writing/SKILL.md` hoặc bản đồng bộ `.codex` và áp dụng cùng skill chuyên môn.
- Skill chuẩn nằm trong `.claude/skills/`; `.agents/skills` và `.codex/skills` liên kết tới cùng thư mục cho Codex. Nếu phiên chưa liệt kê skill, đọc trực tiếp đường dẫn trên. Không kết luận thiếu skill chỉ vì chưa được tự động nạp.
- Khi sửa quy trình chung, cập nhật cả AGENTS.md và CLAUDE.md; giữ nội dung tương đương, trừ tên công cụ ở phần mở đầu.

### Bắt buộc đọc bmt-documentation trước khi code

Quy định áp dụng cho implement tính năng, sửa hành vi và thêm/sửa/tích hợp API. Đọc [quy trình đầy đủ](.claude/skills/savico-implement-feature/references/documentation-workflow.md), không dùng kết quả tìm kiếm thay cho nội dung tài liệu.

1. Tìm tài liệu bằng mã và nội dung tính năng trong `userstory/`, `businessrule/`, `tdd/`, `unittest/`, `systemtest/`. Mã thường có dạng `STORY-`, `BR-`, `TDD-`, `UT-`, `ST-`. `templates/` chỉ chứa mẫu, không phải nghiệp vụ thật; đọc thêm `database/`, `discovery/`, `debt/` khi liên quan.
2. Khi triển khai tính năng, đọc hết TDD của tính năng trước khi viết code, cùng Story, BR và đặc tả test liên quan. Đi theo tham chiếu và tìm tham chiếu ngược, kiểm tra section/AC đích và theo dõi nguồn đã đọc để tránh vòng lặp. Không mở rộng phạm vi triển khai chỉ vì tài liệu dẫn sang tính năng khác.
3. Đối chiếu tài liệu với backend source và OpenAPI của môi trường đích. Swagger từng được cấu hình tại `https://bmt-api.vnzdna.com/swagger/index.html`; phải xác minh trước khi dùng. Không suy diễn endpoint, DTO, role/permission, trạng thái, mã lỗi hay hạn mức từ mock hoặc nhãn UI.
4. Trước khi sửa code, tóm tắt nguồn đã đọc, AC/BR, contract, phần dùng chung và điểm thiếu/mâu thuẫn. Yêu cầu rõ ràng của người dùng được ưu tiên; chỉ hỏi quyết định chưa có căn cứ và tạm dừng phần phụ thuộc, tiếp tục phần độc lập.
5. Backend chưa có API thì báo rõ, không tạo endpoint giả hoặc âm thầm fallback sang mock trong chế độ API thật. Phân biệt đã code, chạy mock và kiểm chứng API thật khi bàn giao.

Tài liệu giao diện vẫn là `docs/MO_TA_GIAO_DIEN.md`; đọc trước khi sửa màn hình và đối chiếu `docs/TRANG_THAI_DUNG_KHUNG.md`. Khi được giao soạn/sửa tài liệu nghiệp vụ, đọc hướng dẫn và template trong `bmt-documentation/`; không mặc định dùng kho MCP Document First thay cho thư mục này.

### Bắt buộc thông báo khi thay đổi hoặc xoá giao diện

- Trước khi thêm, sửa, ẩn hoặc xoá thành phần giao diện, thông báo màn hình/route, phần bị tác động, lý do và hành vi trước → sau. Bao gồm trường nhập, nút, nội dung, điều hướng và điều kiện hiển thị.
- Không xoá trường, nút hoặc màn hình chỉ vì backend thiếu API/dữ liệu. Báo chênh lệch và phương án xử lý; giữ luồng hiện có khi yêu cầu chỉ là nối API.
- Thay đổi đã được giao rõ thì thông báo rồi thực hiện, không yêu cầu duyệt lại. Nếu cần xoá hoặc đổi luồng ngoài phạm vi đã giao, đưa phương án cụ thể và hỏi trước khi thực hiện phần đó.
- Bàn giao phải nêu thay đổi giao diện thực tế và phần đã xoá/ẩn; nếu không thay đổi giao diện thì ghi rõ.

## Commands

```bash
pnpm dev            # start dev server (localhost:3000)
pnpm build          # production build
pnpm lint           # eslint . — enforces import/architecture rules (see below)
pnpm typecheck      # tsc --noEmit (strict: noUncheckedIndexedAccess, no unused locals)
pnpm format         # prettier --write src
pnpm format:check   # prettier --check src
```

Quality gate to run before considering work done (CI mirrors this):

```bash
pnpm typecheck && pnpm lint && pnpm format:check
```

`pnpm test:auth` runs pure routing policy tests with Node's built-in runner and is included in CI. There is no general React test framework; `services/` (pure domain logic) remains the intended target for broader unit coverage.

## Running without the backend

Copy `.env.example` → `.env.local`. Env vars are **validated by Zod at module load** (`src/shared/config/env.ts`) and the app throws on startup if they're invalid. Two dev-only flags swap real API calls for in-browser mocks:

- `NEXT_PUBLIC_USE_MOCK_AUTH=true` — login/roles work with no API. Email containing `admin` → admin role. (`features/auth/api/auth.mock.ts`)
- `NEXT_PUBLIC_USE_MOCK_API=true` — feature pages render sample data with no API.

Feature API modules select the mock vs. real implementation at import time based on these flags (see `auth.api.ts` for the pattern).

## Architecture — the rules that matter

Three layers with a strict one-directional dependency rule (**enforced by ESLint `no-restricted-imports`**):

```
app/ (routes)  →  features/ (business)  →  shared/ (reusable infra & UI)
```

- A layer may only import the layers to its right.
- **No cross-feature imports.** `features/a` must never import from `features/b`. Shared logic is lifted into `shared/`.
- **Import only through barrels** (`index.ts`). `import { LoginForm } from '@/features/auth'` ✅ — never reach into `@/features/auth/components/login-form` ❌. Path alias is `@/*` → `src/*`.

**Feature anatomy** (`features/design` is the canonical template): each feature is a vertical slice with `api/` (`*.api.ts` thin fns + `*.keys.ts` query-key factory + `*.mock.ts`), `components/`, `hooks/` (TanStack Query + custom), `schemas/` (Zod), `services/` (pure, no React/HTTP), `store/` (feature-scoped Zustand), `types/`, `constants/`, and a single `index.ts` public surface.

Current features: `auth`, `design` (luồng 3 bước), `handbook` (Cẩm nang + panel cá nhân hóa), `guide` (Hướng dẫn), `landing` (trang chủ), `consultation` (Tư vấn 1:1), `plans` (Gói đăng ký), `account`, `chatbot`, `admin` (khu quản trị).

**Composing across features**: two features that must appear together are joined at the **app layer**, never by importing each other. Two patterns in use — a `ReactNode` slot prop (the Bước 2/3 waiting screen takes `sidePanel`, the app passes `features/handbook`'s panel), and a page composing both barrels (`/account` renders `features/account` + `features/design`'s `MyProjects`). Genuinely cross-cutting state goes to `shared/` instead: `shared/auth`, `shared/favorite` (the ♥ toggle, mục VI) and `shared/cms` — the content store `features/admin` writes to and the public features read from (localStorage while there is no backend; swap the body of `cmsDb` for HTTP calls when the API lands).

**Admin area**: `app/[locale]/(admin)` is an isolated route group — its layout wraps `AntdProvider` → `ProtectedRoute` → `AdminGuard`, so **Ant Design is only bundled there** and the public site stays Tailwind + shadcn. New admin screens are declarations, not layouts: `ResourceManager` (table + search + drawer form) for collections, `DocumentEditor` for single documents, `OverrideEditor` for the flat key→value documents.

The sidebar splits by **nature of the work**, not by module: _Site content_ (copy, images, articles — what visitors read), _System configuration_ (plan pricing, quotas, catalogues, unit prices — numbers that drive behaviour) and _Operations_ (bookings, projects, users). Mixing them is what makes an admin unusable — plan pricing once sat on the same screen as the plans page copy.

Site content is organised **by public page**: one menu entry per page, and each editable block of that page is a **submenu item, not a tab** — everything is visible in the sidebar without clicking into a page first. All of them run through the single dynamic route `/admin/content/[page]?tab=<block>`, driven by `features/admin/constants/admin-pages.config.ts`; `contentPanelsOf()` is the single source both the menu and the screen read, so they cannot drift. Adding a page means adding one entry there, not a new route file.

Within a page's copy block, fields are grouped by the **section the visitor sees** (`handbook.foundation.*` → "Khối Cẩm nang nền tảng"), derived from the key's first two segments — never a hand-picked list, which is guesswork and silently omits things. Panels are ordinary standalone screens; `AdminPanelScope` is the context that tells the `AdminPage` inside them to drop its heading so the tab label does not say the same thing twice. Note `AdminPage`'s root is a plain flex `div`, never antd `Space`: Space wraps each child in an `.ant-space-item` exactly as tall as the child, and `position: sticky` cannot move inside a parent its own height — that silently broke every sticky save bar.

Styling inside `(admin)` follows one rule: antd's CSS-in-JS is **unlayered**, Tailwind v4 utilities live in `@layer utilities`, so utilities lose to antd on antd's own elements. Plain `div`/`span` you build → Tailwind classes. Overriding antd's internal DOM (`.ant-*`) → `admin.css`, or the component's `style` prop (inline always wins). When a rule in `admin.css` does not apply, check specificity against antd's selector before adding `!important` — antd's sheet loads later, so a tie goes to antd.

**Everything on the public site is editable without a deploy.** Beyond the content collections, two flat documents cover the rest: `uiStrings` (i18n key → replacement copy) and `uiAssets` (`shared/lib/imagery` key → replacement image URL). `CmsMessagesProvider` (in the locale layout, inside `NextIntlClientProvider`) layers `uiStrings` over the catalogue, so `useTranslations` picks the edits up untouched; `useSiteImage` does the same for images. Both are per-locale, and both only store keys that were actually changed — a new string in code appears immediately without touching the store. `admin.*` keys are deliberately NOT overridable (`isOverridableMessageKey`), and `uiStrings` never falls back across locales, or an edited Vietnamese string would land on the English site.

Operational screens follow two patterns: `ResourceManager` with `allowEdit={false}` + row-action buttons for decision queues (reschedule requests, package reviews, abuse reports, subscriptions — approve/extend/cancel mutate state, records are never deleted, queues default-filter to the pending state), and bespoke screens where a table is the wrong shape (`BookingCalendar` renders bookings as a month calendar; approving a reschedule request moves the underlying booking itself). The transactions ledger is strictly read-only. Each content page has **one editor screen** ("Nội dung trang"): sections declared in `featuredSections` follow the page's visual scroll order with numbered titles, and each section holds its text fields AND its images together (`imageKeys` per section — only keys the page actually reads via `useSiteImage`; images living inside records are edited on the record's own table, never here). Fields show the live effective text in the input (edit-in-place; typing the original back removes the override) with hand-written labels from `admin.fieldNames`; every other string of the page folds into a collapsed "Advanced" section. `OverrideEditor` binds BOTH `uiStrings` and `uiAssets` and splits the draft by row `kind` on save — one Save button for text and images. `HOME_CONTENT_SEED` is intentionally empty strings: `cmsText` prefers the doc, so a non-empty seed overrides translations (the EN home page once showed Vietnamese because of exactly this).

Usage limits live in one CMS document, `quotas`: free-tier credits, the daily AI-chat allowance and the daily handbook lookup allowance. They used to be three separate hardcoded constants (`chatbot.constants`, `handbook.mock`, and nowhere at all for the free tier) — `useChat` and the handbook mock now read `quotas`, so operations can change them without a deploy. Paid-plan limits stay per-row in the `plans` collection.

Every i18n namespace is **owned by exactly one page** via `copyNamespaces` in `admin-pages.config.ts`, so there is no catch-all key-table screen sitting outside the by-page structure: a page's copy tab shows its curated "frequently edited" list first, then an "everything else on this page" group holding the rest of its namespaces. Namespaces belonging to no single page (`common`, `auth`, `validation`, `theme`, `language`, `favorite`) live on the "Shared copy" page. `ContentWorkspace` warns in development if a namespace is left unclaimed — that is the check keeping the "every string is editable inside its own page" promise honest.

**State**: server state → TanStack Query (each feature owns a hierarchical key factory for safe invalidation); client/UI state → feature-scoped Zustand. The only cross-cutting store is auth (`shared/auth`).

**Data/auth flow**: one Axios instance in `shared/lib/api` (`httpClient` + typed `http` helpers). Auth is **cookie-based (httpOnly), set by the backend** — no token is stored client-side. The auth store (`shared/auth/auth.store.ts`) persists only the non-sensitive user profile. The response interceptor does a **single-flight refresh-token retry on 401**; on refresh failure it clears client auth via the `auth-bridge` (which decouples the HTTP layer from the store). Errors are normalized to `ApiError`.

**Routing & auth gate**: `src/proxy.ts` is the Next.js 16 proxy (the renamed `middleware` convention). It runs next-intl and checks the client-set, non-sensitive `bmt.auth` marker; it does not verify backend tokens. `AuthBootstrap` checks `GET /users/me` before private pages render, including client navigation. `accountKind` separates Customer and Staff routes; stable `roleCodes` identify the system Admin role. `shared/auth/route-access.ts` is the policy used by the proxy, link prefetch checks, admin menu and `AdminRouteGuard`; `PROTECTED_ROUTE_PREFIXES` / `GUEST_ONLY_ROUTES` remain in `shared/constants/routes.ts`, with private contractor children also protected. Frontend personas are `guest`/`customer`/`staff`/`admin`; permissions come from the current token snapshot in `/users/me`, with no Admin bypass for permission-backed sections. Legacy CMS and contractor APIs retain their system Admin gate. Refresh rechecks permissions; unrecoverable 401 clears auth and query caches. Guards are **UX only** — real permissions and assignment scope are always enforced by the backend. `pnpm test:auth` runs pure routing policy regression tests; see `docs/TICH_HOP_PHAN_QUYEN.md`.

## Conventions

- **Never hardcode UI text.** All strings live in `messages/vi.json` + `messages/en.json` — add to **both**. i18n is next-intl, locales `vi` (default) / `en`, routes are locale-prefixed (`/vi`, `/en`) via `src/proxy.ts`. Use the locale-aware `Link`/`useRouter` from `@/i18n/navigation`; server pages call `setRequestLocale(locale)`.
- **Forms**: React Hook Form + `zodResolver` + shadcn `Form`. Schemas are built by factories that take resolved localized messages (see `createLoginSchema`) so validation copy is never hardcoded.
- **Styling**: Tailwind v4 with semantic design tokens only (`bg-primary`, `text-muted-foreground`) — never raw hex. Tokens are OKLCH CSS variables in `src/app/globals.css` exposed via `@theme inline`. Every reusable variant uses CVA.
- **shadcn/ui**: `pnpm dlx shadcn@latest add <component>` installs into `src/shared/components/ui` (configured in `components.json`, style "new-york"). Re-export from the `ui/index.ts` barrel afterward. **Extend** primitives with new CVA variants — never replace or hand-roll a primitive shadcn already provides.

## Naming

Files: components/hooks kebab-case (`login-form.tsx`, `use-projects.ts`); stores `*.store.ts`; api/keys `*.api.ts`/`*.keys.ts`; schemas `*.schema.ts`. Components PascalCase, hooks `useX`, Zustand stores `useXStore`, query-key factories `xKeys`, constants UPPER_SNAKE_CASE, translation keys `namespace.dot.case`.

See `docs/ARCHITECTURE.md` for the full contract, `docs/MO_TA_GIAO_DIEN.md` for the UI spec, and `README.md` for the design-system token reference.
