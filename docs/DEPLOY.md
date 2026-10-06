# Deploy BuildX AI

Quy trình được chuyển từ `hoatheomua-fe`, dùng biến môi trường và source của
`buildx-fe-web`. Push nhánh `develop` triển khai môi trường `dev` trên runner
`linhdanhthue`. Có thể chạy thủ công workflow **Deploy Application** trên nhánh
`develop`. Chưa cấu hình deploy cho `main` theo yêu cầu hiện tại.

## Quy trình

1. Kiểm tra type, lint, format, test chính sách auth và build ứng dụng.
2. Build Docker image trên `ubuntu-latest`, đăng nhập GHCR bằng `GITHUB_TOKEN`.
3. Push image `ghcr.io/<owner>/<repository>/buildx-fe-web:<environment>-<commit>`
   và cập nhật tag `<environment>-latest`.
4. Self-hosted runner pull tag của đúng commit vừa build, chạy Compose và chờ
   container vượt qua healthcheck tại `/vi`. Nếu healthcheck thất bại, job deploy
   thất bại; quy trình chưa tự rollback.

Các file chính:

| File                                        | Vai trò                                                  |
| ------------------------------------------- | -------------------------------------------------------- |
| `.github/workflows/main.yaml`               | Ghép quality → build → deploy cho `develop`              |
| `.github/workflows/quality.yaml`            | Kiểm tra PR và chặn deploy khi kiểm tra thất bại         |
| `.github/workflows/build-image.yaml`        | Build/push image bằng biến của GitHub Environment        |
| `.github/workflows/deploy-application.yaml` | Pull và chạy image trên self-hosted runner               |
| `Dockerfile`                                | Build Next.js standalone, chạy bằng user không phải root |
| `.docker/compose.yaml`                      | Profile `dev`, healthcheck và external network           |
| `.docker/sync-env-secrets.sh`               | Đồng bộ cấu hình từ file env lên GitHub                  |

## Biến môi trường ứng dụng

Tạo GitHub Environment **dev**. Environment dùng các secret
cùng tên với biến ứng dụng, kể cả giá trị công khai, để giữ cách cấu hình của repo mẫu.

| Secret                        | Giá trị / mục đích                                                                      | Thời điểm đọc  |
| ----------------------------- | --------------------------------------------------------------------------------------- | -------------- |
| `BMT_API_ORIGIN`              | Mặc định `https://bmt-api.vnzdna.com`; upstream của proxy Next.js                       | Build          |
| `NEXT_PUBLIC_API_BASE_URL`    | Giữ `/api/v1` để cookie auth đi qua cùng domain                                         | Build          |
| `NEXT_PUBLIC_API_TIMEOUT`     | Mặc định `30000` ms                                                                     | Build          |
| `NEXT_PUBLIC_APP_NAME`        | Mặc định `BuildX AI`                                                                    | Build          |
| `NEXT_PUBLIC_APP_URL`         | **Bắt buộc:** URL frontend thực tế của môi trường, ví dụ `https://frontend.example.com` | Build          |
| `NEXT_PUBLIC_USE_MOCK_AUTH`   | Mặc định `false`, dùng backend thật                                                     | Build          |
| `NEXT_PUBLIC_USE_MOCK_API`    | Mặc định `false`, dùng backend thật                                                     | Build          |
| `NEXT_PUBLIC_VIETMAP_API_KEY` | Khóa công khai để hiển thị bản đồ; có thể để trống                                      | Build          |
| `VIETMAP_API_KEY`             | Khóa riêng để server gọi geocode; có thể để trống nếu chưa cấu hình geocode             | Container chạy |

Đổi `NEXT_PUBLIC_*` hoặc `BMT_API_ORIGIN` thì phải build image mới. Next.js nhúng
biến công khai vào bundle và lưu đích rewrite lúc build. Không truyền
`VIETMAP_API_KEY` bằng build arg hoặc dùng nó thay khóa công khai. File `.env.local`
không được đưa vào Docker build context.

Nguồn đối chiếu: [biến môi trường Next.js](https://nextjs.org/docs/app/guides/environment-variables)
và [standalone output](https://nextjs.org/docs/app/api-reference/config/next-config-js/output).

## Runner, network và domain

| Cấu hình GitHub               | Phạm vi           | Giá trị cần điền                                      |
| ----------------------------- | ----------------- | ----------------------------------------------------- |
| Input `run-on` trong workflow | Source            | `linhdanhthue`, đã cấu hình cho `develop`             |
| Variable `DOCKER_NETWORK`     | Environment `dev` | Mặc định `bmt-network-dev`; đặt nếu dùng network khác |

Nhãn `linhdanhthue` và network `bmt-network-dev` khớp cấu hình nhánh `develop`
trong `../bmt-be/.github/workflows/main.yaml` và `../bmt-be/.docker/compose.yaml`.
Runner cần chạy Linux, có Docker Compose v2 và quyền truy cập Docker daemon.
Nếu nhiều runner có cùng nhãn, bảo đảm chúng đều trỏ tới đúng Docker host deploy.

Compose không mở port ra host. Reverse proxy phải cùng network và chuyển tiếp
domain frontend dev tới `buildx-fe-web-dev:3000`. Giữ header `Host`, cấu hình HTTPS
và header chuyển tiếp theo reverse proxy hiện có. Network phải tồn tại trước khi deploy; workflow sẽ
kiểm tra và báo lỗi nếu thiếu.

Workflow dùng quyền `packages: write` khi build và `packages: read` khi deploy.
Nếu package GHCR đã tồn tại, cần cấp quyền repository cho package đó để
`GITHUB_TOKEN` pull/push được. Không cần chép token registry vào source.

## Chuẩn bị và đồng bộ cấu hình

Từ gốc repository:

```bash
cp .docker/.env.example .docker/.env.dev
```

Điền URL frontend, upstream backend và khóa VietMap thực tế. Giữ mock `false`.
File mẫu đã chọn network `bmt-network-dev` nhưng chưa chứa domain hoặc khóa thật.
`BMT_API_ORIGIN` giữ mặc định của repo; đổi sang upstream dev thực tế nếu khác.

File `.docker/.env.dev` được Git bỏ qua. Không commit file chứa khóa.
Có thể lấy giá trị phù hợp từ `.env.local`, nhưng phải thay URL
`localhost` bằng URL deploy và không gộp hai khóa VietMap.

Khi đã điền đủ và muốn cập nhật GitHub, chạy:

```bash
gh auth login
.docker/sync-env-secrets.sh
```

Script lấy repository từ `gh repo view`; có thể chỉ định `REPO=TaskCoper/buildx-fe-web`.
Script cần quyền quản trị repo, tạo/cập nhật environment và chính sách nhánh
(`dev` → `develop`), nạp secret ứng dụng và đặt `DOCKER_NETWORK` từ `NETWORK`.
Script không xóa các chính sách nhánh đã có; kiểm tra chúng nếu cần giới hạn chặt
chỉ một nhánh. `REGISTRY` và `TAG` chỉ dùng cho Compose thủ công, không được upload.

Sau khi cấu hình GitHub và reverse proxy, push nhánh `develop` để chạy pipeline.
Việc thêm file workflow vào working tree chưa cập nhật GitHub hoặc deploy server.

## Kiểm tra hoặc chạy Compose thủ công

Kiểm tra cấu hình mà không in khóa ra terminal:

```bash
docker compose --env-file .docker/.env.dev -f .docker/compose.yaml --profile dev config --quiet
```

Build và chạy trên server đã có network/reverse proxy:

```bash
docker compose --env-file .docker/.env.dev -f .docker/compose.yaml --profile dev build
docker compose --env-file .docker/.env.dev -f .docker/compose.yaml -p buildx-fe-web-dev --profile dev up -d --no-build --wait --wait-timeout 120
```

`VIETMAP_API_KEY` được truyền vào container; các giá trị build không thể đổi chỉ
bằng restart container.
