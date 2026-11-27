# Tasklist 002: Thư mục lưu instance mặc định

Spec: `specs/002-default-instance-dir.md`
Memory áp dụng: DEC-001

- [x] **T1. Backend + UI thư mục mặc định**
  - `obs.rs`: thêm `default_dir` vào `Store`. `lib.rs`: `StateView.default_dir`, thay `set_obs_root` bằng `save_settings`.
  - `api.ts`: type + `saveSettings`. `Dialogs.tsx`: SettingsDialog thêm ô thư mục mặc định (có nút bỏ chọn); CreateDialog tự điền `<mặc định>\<tên sạch>`. `App.tsx`: truyền state.
  - Chỉ sửa: `src-tauri/src/obs.rs`, `src-tauri/src/lib.rs`, `src/api.ts`, `src/components/Dialogs.tsx`, `src/App.tsx`, `README.md`.
  - Verification: `cargo test`; `tsc --noEmit`; chạy app: đặt mặc định, gõ tên → ô thư mục tự điền, tạo thành công, thư mục được tạo đúng chỗ; chọn tay → không bị ghi đè; file `instances.json` cũ vẫn đọc được.
