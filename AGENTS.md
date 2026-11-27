# AGENTS.md

## Project

MultiOBS: Tauri 2 (Rust) + React 19 + Tailwind v4 desktop app quản lý nhiều instance OBS (Windows).

- Backend: `src-tauri/src/obs.rs` (store, junction, launch/stop, xoá an toàn), `src-tauri/src/lib.rs` (Tauri commands).
- Frontend: `src/App.tsx`, `src/api.ts`, `src/components/`.
- Chạy dev: `start.bat`. Build bộ cài NSIS: `build.bat`. Test backend: `cd src-tauri && cargo test`.
- Spec/tasklist: `specs/`, `tasks/`.

## Agent memory index

- `DEC-001` | accepted | obs, instance, portable, junction, delete | Cô lập OBS bằng `--portable` qua junction; APPDATA env không có tác dụng; chỉ xoá thư mục có marker đúng id, unlink trước | [details](docs/agent-memory/decisions/DEC-001-obs-isolation-portable-junction.md)
- `BUG-001` | resolved | obs, stop, taskkill, modal | Dừng OBS bằng WM_CLOSE (không `/F`); modal OBS chặn đóng nên UI phải báo cho người dùng | [details](docs/agent-memory/bugs/BUG-001-obs-stop-blocked-by-modal.md)
- `DEC-002` | accepted | admin, uac, manifest, nsis, installMode | Bản release chạy requireAdministrator để OBS thừa hưởng admin; bộ cài perMachine; app và OBS phải cùng mức quyền | [details](docs/agent-memory/decisions/DEC-002-elevated-app-permachine.md)
- `BUG-003` | resolved | onedrive, junction, readonly, access denied, unlink | Gỡ junction phải xử lý cờ ReadOnly (`attrib -R /L`); chặn instance/thư mục mặc định trong OneDrive | [details](docs/agent-memory/bugs/BUG-003-onedrive-readonly-junction.md)
- `BUG-002` | resolved | icon, tauri icon, build, cargo cache | Đổi icon xong phải `cargo clean -p multiobs --release` rồi mới build; kiểm icon nhúng trong exe | [details](docs/agent-memory/bugs/BUG-002-stale-exe-icon-after-tauri-icon.md)
