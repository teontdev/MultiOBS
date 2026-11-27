# Tasklist 004: Nhân bản instance

Spec: `specs/004-duplicate-instance.md`
Memory áp dụng: DEC-001, BUG-001

- [x] **T1. Backend + UI nhân bản**
  - `obs.rs`: thêm `copy_config(src_inst, dst_inst)`. Hàm chép đệ quy `config\`, bỏ qua symlink/junction và các thư mục `logs`/`crashes`/`profiler_data`/`updates`. Thêm unit test.
  - `lib.rs`: thêm command `duplicate_instance(source_id, name, dir)`. Command từ chối khi nguồn đang chạy và rollback khi lỗi.
  - `api.ts`: thêm `duplicateInstance`. `Dialogs.tsx`: CreateDialog nhận `source`. `App.tsx`: thêm mục menu "Nhân bản" (bị khoá khi đang chạy) và state `duplicating`.
  - Chỉ sửa: `src-tauri/src/obs.rs`, `src-tauri/src/lib.rs`, `src/api.ts`, `src/components/Dialogs.tsx`, `src/App.tsx`, `README.md`.
  - Verification:
    - `cargo test` và `tsc --noEmit`.
    - E2E qua CDP: tạo A rồi ghi file vào `A\config\obs-studio\x.ini` và `logs\a.txt`; nhân bản thành B. Kết quả cần thấy: B có `x.ini`, không có `logs`, marker của B mang id mới, B có junction; xoá B kèm thư mục thì A vẫn còn nguyên.
    - Nguồn đang chạy thì nhân bản bị báo lỗi.
