# Tasklist 001 — MultiOBS
Spec: `specs/001-multiobs-instance-manager.md`

- [x] **T1. Scaffold Tauri 2 + React + TS + Tailwind v4**
  - Tạo app bằng `create-tauri-app` (template react-ts, npm), identifier `com.multiobs.app`, productName `MultiOBS`.
  - Thêm Tailwind v4 (`@tailwindcss/vite`), `lucide-react`, `@tauri-apps/plugin-dialog` (+ crate `tauri-plugin-dialog`, quyền `dialog:default`).
  - `src/index.css`: `@import "tailwindcss";` + nguyên khối `tokens.css` của skill ui-ux (bỏ khối `.dark`).
  - `tauri.conf.json`: cửa sổ 960×640, min 720×480; bundle target `nsis`.
  - Chỉ sửa: các file scaffold, `package.json`, `vite.config.ts`, `src/index.css`, `src-tauri/*`.
  - Verification: `npx tsc --noEmit` và `cargo check` (trong `src-tauri`) pass.

- [x] **T2. Lõi Rust: lưu instance, junction, mở/dừng OBS** — Depends: T1
  - Thiết kế theo mục "Lệnh Rust" và "Cơ chế tách dữ liệu" của spec. Crate: `serde`, `serde_json`, `uuid`, `sysinfo`.
  - Junction: `cmd /c mklink /J <link> <target>` (ẩn cửa sổ bằng `CREATE_NO_WINDOW`). Gỡ: `std::fs::remove_dir`.
  - Chỉ sửa: `src-tauri/src/lib.rs`, `src-tauri/src/obs.rs` (mới), `src-tauri/Cargo.toml`, `src-tauri/capabilities/default.json`.
  - Verification: `cargo test` (test đơn vị cho kiểm tên trùng / thư mục không trống / xoá không đi xuyên junction) và `cargo check`.

- [x] **T3. UI theo skill ui-ux** — Depends: T2
  - Dựng màn danh sách, modal tạo/đổi tên/cài đặt, hộp xác nhận xoá, toast, empty state, banner OBS — đúng mục "UI" của spec.
  - Chỉ sửa: `src/App.tsx`, `src/api.ts` (mới), `src/components/*` (mới), `src/index.css`.
  - Verification: `npx tsc --noEmit`; `npm run tauri dev` mở được, tạo instance ở thư mục tạm, Mở → OBS chạy, config ghi vào `<dir>\config\obs-studio`, Dừng, Xoá cả thư mục.

- [x] **T4. Script, README, bộ cài** — Depends: T3
  - `start.bat` (`npm install` nếu thiếu `node_modules`, rồi `npm run tauri dev`), `build.bat` (`npm run tauri build`, in đường dẫn bộ cài), `README.md` (cách dùng, cơ chế junction, cảnh báo xoá).
  - Chỉ sửa: `start.bat`, `build.bat`, `README.md`, `.gitignore`.
  - Verification: `build.bat` sinh `src-tauri\target\release\bundle\nsis\MultiOBS_*_x64-setup.exe`.
