# Tasklist 003: OBS chạy với quyền admin

Spec: `specs/003-run-obs-as-admin.md`
Memory áp dụng: DEC-001, BUG-001

- [x] **T1. Manifest requireAdministrator cho bản release**
  - `src-tauri/build.rs`: khi `PROFILE == "release"` truyền manifest (Common-Controls v6 + `requireAdministrator`) qua `WindowsAttributes::app_manifest`; còn lại `tauri_build::build()`.
  - `tauri.conf.json`: `bundle.windows.nsis.installMode = "perMachine"` (finding review: exe admin không được nằm ở thư mục user ghi được).
  - Chỉ sửa: `src-tauri/build.rs`, `src-tauri/windows-admin.manifest` (mới), `src-tauri/tauri.conf.json`, `README.md`.
  - Verification: `build.bat` thành công; exe release có `requireAdministrator` trong manifest; mở app → UAC; OBS mở từ app có token elevated; Dừng vẫn đóng được OBS; `npm run tauri dev` vẫn chạy không cần admin.
  - Kết quả: manifest có trong exe release, không có trong debug; bộ cài perMachine build OK. Chưa chạy thật (cần người bấm UAC): app hỏi UAC, OBS elevated, Dừng.
