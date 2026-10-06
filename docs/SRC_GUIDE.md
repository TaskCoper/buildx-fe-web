# Hướng dẫn đọc thư mục `src`

Tài liệu này giúp người mới **hiểu nhanh** cách code được tổ chức và **biết tìm thứ mình cần ở đâu**. Đọc lướt 5 phút là nắm được.

> Tài liệu kỹ thuật chi tiết (quy ước, ESLint, naming) nằm ở [`ARCHITECTURE.md`](./ARCHITECTURE.md). File này tập trung vào "cái gì nằm ở đâu".

---

## 1. Bức tranh tổng thể

Code chia làm **3 tầng**, chỉ được import theo một chiều: trái → phải.

```
app/        →   features/      →   shared/
(màn hình)      (nghiệp vụ)        (hạ tầng + UI dùng chung)
```

- **`app/`** — các route/trang (Next.js App Router). Trang chỉ "lắp ráp", gần như không chứa logic.
- **`features/`** — mỗi tính năng nghiệp vụ (auth, project, users…) là một "lát cắt dọc" tự chứa đủ thứ của nó.
- **`shared/`** — thứ dùng chung mọi nơi: nút bấm, HTTP client, config, types…

**Quy tắc vàng:**

- `app` được import `features` và `shared`.
- `features` chỉ được import `shared` — **KHÔNG** import feature khác. Cần dùng chung thì đẩy lên `shared/`.
- `shared` không import ngược lên.
- Luôn import qua **barrel** (`index.ts`): `import { LoginForm } from '@/features/auth'` — đừng chọc thẳng vào file con.

---

## 2. Cây thư mục (rút gọn)

```
src/
├── app/[locale]/            # Route, chia nhóm theo (...) — không ảnh hưởng URL
│   ├── (landing)/           #   Trang giới thiệu (khách) — URL gốc "/"
│   ├── (auth)/login/        #   Đăng nhập
│   ├── (dashboard)/         #   Nhóm sau đăng nhập (guard + layout dùng chung)
│   │   └── dashboard/       #     ⚠️ Trang con nằm ở ĐÂY → URL /dashboard/...
│   │       ├── projects/    #       (projects, estimates, library, users…)
│   │       └── …            #       Xem mục 2b về quy ước route
│   ├── layout.tsx           #   Layout gốc theo ngôn ngữ
│   ├── loading.tsx          #   UI khi đang tải
│   ├── error.tsx            #   UI khi lỗi
│   └── not-found.tsx        #   Trang 404
│
├── features/                # Nghiệp vụ — mỗi thư mục là 1 tính năng
│   ├── auth/                #   Đăng nhập/đăng xuất, phiên người dùng
│   ├── project/  ⭐         #   MẪU CHUẨN — copy cấu trúc này cho feature mới
│   ├── users/               #   Quản lý người dùng (admin)
│   ├── dashboard/ landing/ …#   Các feature khác
│
├── shared/                  # Dùng chung toàn app
│   ├── components/
│   │   ├── ui/              #   Nút, input, table… (shadcn) — gạch xây UI
│   │   └── common/          #   Khối ghép sẵn: PageHeader, EmptyState, Logo…
│   ├── layouts/             #   Khung trang: sidebar, header dashboard
│   ├── auth/                #   Store phiên + guard phân quyền (dùng mọi nơi)
│   ├── lib/                 #   HTTP client (axios) + React Query + tiện ích
│   ├── config/             #   env, cấu hình API, thông tin site
│   ├── constants/           #   routes.ts (đường dẫn), query-keys.ts
│   ├── hooks/ utils/ types/ #   Hook, hàm tiện ích, kiểu dữ liệu dùng chung
│   └── providers/           #   Bọc app: React Query, theme…
│
└── i18n/                    # Đa ngôn ngữ (vi/en): routing, navigation
```

(Văn bản hiển thị KHÔNG nằm trong code mà ở `messages/vi.json` và `messages/en.json` ở thư mục gốc dự án.)

---

## 2b. Quy ước route — ⚠️ DỄ VẤP

Trong App Router, thư mục **có dấu ngoặc `(...)` là "route group"**: chỉ để gom nhóm/áp layout, **KHÔNG tạo segment trong URL**. Còn thư mục **không ngoặc thì là segment thật** (xuất hiện trong URL).

```
app/[locale]/(dashboard)/dashboard/projects/page.tsx
            └─ group ─┘  └ segment ┘ └ segment ┘
              (bỏ qua)     /dashboard  /projects     →  URL: /dashboard/projects
```

➡️ **Mọi trang sau đăng nhập PHẢI nằm trong `(dashboard)/dashboard/<tên>/page.tsx`**, KHÔNG đặt thẳng trong `(dashboard)/<tên>/`.

| Đặt file ở…                               | URL ra                           | Đúng?                                       |
| ----------------------------------------- | -------------------------------- | ------------------------------------------- |
| `(dashboard)/dashboard/projects/page.tsx` | `/dashboard/projects`            | ✅                                          |
| `(dashboard)/projects/page.tsx`           | `/projects` (thiếu `/dashboard`) | ❌ menu trỏ `/dashboard/projects` → **404** |

**Vì sao bắt buộc `/dashboard/...`:**

1. Đường dẫn trong `shared/constants/routes.ts` đều dạng `/dashboard/...` — menu (`nav-config.ts`) trỏ theo đó.
2. Middleware (`src/middleware.ts`) chỉ bảo vệ các route bắt đầu bằng `/dashboard` (xem `PROTECTED_ROUTE_PREFIXES`). Đặt sai chỗ vừa bị 404, vừa **mất luôn lớp bảo vệ**.

**Checklist khi thêm trang mới sau đăng nhập:**

1. Tạo `(dashboard)/dashboard/<tên>/page.tsx`.
2. Thêm đường dẫn `/dashboard/<tên>` vào `routes.ts`.
3. Thêm mục menu vào `nav-config.ts` (kèm `roles` nếu chỉ một số vai trò được xem).
4. Trang chỉ dành admin: bọc nội dung bằng `<AdminGuard>`.

> Các route group khác: `(landing)` = trang công khai (URL gốc `/…`), `(auth)` = đăng nhập/đăng ký. Layout dùng chung cho cả nhóm đặt ở file `layout.tsx` ngay trong group.

---

## 3. Bên trong một feature (lấy `project` làm mẫu)

Mỗi feature tự chứa đủ "lát cắt dọc". Cần tính năng mới thì **copy nguyên cấu trúc của `project`**:

```
features/project/
├── api/          # Hàm gọi API (project.api.ts) + query keys (project.keys.ts)
├── components/   # Giao diện riêng của feature (ghép từ shared/ui)
├── hooks/        # Hook React Query / hook tùy biến (use-projects.ts)
├── schemas/      # Zod schema kiểm tra form
├── services/     # Logic thuần (không React, không HTTP) — dễ unit test
├── store/        # State cục bộ của feature (Zustand)
├── types/        # Kiểu dữ liệu của feature
├── constants/    # Hằng số của feature
└── index.ts      # CỬA DUY NHẤT để bên ngoài import
```

> Feature nhỏ không cần đủ hết các thư mục trên — chỉ tạo cái nào dùng tới (ví dụ `users/` chỉ có `components`, `constants`, `types`).

---

## 4. Dữ liệu chảy thế nào? (ví dụ: hiển thị danh sách dự án)

```
Trang projects/page.tsx
   └─ render <ProjectList/>            (features/project/components)
        └─ gọi hook useProjects()      (features/project/hooks)
             └─ gọi projectApi.list()  (features/project/api)
                  └─ dùng http client  (shared/lib/api)  ──► API .NET
```

- **Dữ liệu từ server** (danh sách, chi tiết…) → quản bằng **React Query** (`hooks/` + `*.keys.ts`).
- **State giao diện tạm thời** (bộ lọc, mở/đóng…) → **Zustand** (`store/`).
- **Mọi lời gọi mạng** đều đi qua **một** axios instance ở `shared/lib/api` (tự xử lý lỗi, refresh token, ngôn ngữ).

---

## 5. Phân quyền & đăng nhập (nhanh)

- Phiên đăng nhập lưu ở store `shared/auth`. 3 vai trò: `guest` / `user` / `admin`.
- **Middleware** (`src/middleware.ts`) chặn route ở tầng đầu (theo cookie).
- **Guard** dùng trong giao diện:
  - `ProtectedRoute` — bắt buộc đăng nhập.
  - `AdminGuard` / `RoleGuard` — chặn nội dung theo vai trò.
- Menu hiện theo vai trò được cấu hình ở `shared/layouts/nav-config.ts`.

> ⚠️ Hiện chưa có backend: đăng nhập đang chạy **mock** (bật bằng `NEXT_PUBLIC_USE_MOCK_AUTH=true` trong `.env.local`). Email chứa "admin" → vào với quyền admin. Xem `features/auth/api/auth.mock.ts`.

---

## 6. Muốn làm X thì sửa ở đâu?

| Muốn…                              | Vào…                                                                                               |
| ---------------------------------- | -------------------------------------------------------------------------------------------------- |
| Thêm trang sau đăng nhập           | `src/app/[locale]/(dashboard)/dashboard/<ten>/page.tsx` ([xem mục 2b](#2b-quy-ước-route--️-dễ-vấp)) |
| Thêm đường dẫn                     | `src/shared/constants/routes.ts`                                                                   |
| Thêm mục vào menu trái             | `src/shared/layouts/nav-config.ts`                                                                 |
| Sửa/thêm chữ hiển thị              | `messages/vi.json` **và** `messages/en.json`                                                       |
| Thêm nút/ô input dùng chung        | `src/shared/components/ui/`                                                                        |
| Thêm một tính năng nghiệp vụ mới   | copy `src/features/project/` rồi đổi tên                                                           |
| Đổi địa chỉ API / biến môi trường  | `.env.local` (+ khai báo ở `shared/config/env.ts`)                                                 |
| Sửa cách gọi API / xử lý lỗi chung | `src/shared/lib/api/`                                                                              |

---

## 7. Vài quy ước cần nhớ

- **Không hardcode chữ** trên UI — luôn lấy từ `messages/*.json`.
- **Không hardcode màu** — dùng token Tailwind (`bg-primary`, `text-muted-foreground`).
- **Không tự dựng** button/input/dialog… nếu `shared/components/ui` đã có.
- File đặt tên **kebab-case** (`login-form.tsx`), component **PascalCase** (`LoginForm`), hook **`useX`**.
- Trước khi mở PR: `pnpm typecheck && pnpm lint && pnpm format:check`.

Còn lại xem chi tiết ở [`ARCHITECTURE.md`](./ARCHITECTURE.md).
