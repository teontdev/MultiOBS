# Tasklist 005: Chuyển ngôn ngữ Anh – Việt

Spec: `specs/005-language-switch.md`
Memory áp dụng: none

- [x] **T1. Từ điển frontend + nút đổi ngôn ngữ**
  - Depends: tasklist 004 T1, để các chuỗi của dialog nhân bản cũng được dịch.
  - Tạo `src/i18n.tsx`, chứa `vi`, `en`, `LangProvider` và `useT`. `main.tsx` bọc `App` trong `LangProvider`.
  - Thay mọi chuỗi hiển thị trong `App.tsx`, `Dialogs.tsx`, `ui.tsx` (aria "Đóng") và `Toasts.tsx` (aria) bằng `t.*`. Thêm nút ngôn ngữ trên header.
  - `api.ts`: thêm `setLanguage(en)`. `errorText` không được còn chuỗi tiếng Việt cứng; trả `null` khi lỗi không rõ để nơi gọi dùng `t`.
  - Chỉ sửa: `src/i18n.tsx` (mới), `src/main.tsx`, `src/App.tsx`, `src/api.ts`, `src/components/Dialogs.tsx`, `src/components/ui.tsx`, `src/components/Toasts.tsx`.
  - Verification:
    - `tsc --noEmit`.
    - `grep` các ký tự có dấu tiếng Việt trong `src/` (trừ `i18n.tsx` và comment): không còn chuỗi hiển thị nào.
- [ ] **T2. Lỗi backend song ngữ**
  - `obs.rs`: thêm `static EN: AtomicBool`, `pub fn set_en`, `pub fn tr`. Bọc mọi chuỗi lỗi bằng `tr`.
  - `lib.rs`: thêm command `set_language(en: bool)` và bọc mọi chuỗi lỗi bằng `tr`.
  - Thêm unit test cho `tr`.
  - Chỉ sửa: `src-tauri/src/obs.rs`, `src-tauri/src/lib.rs`, `README.md`.
  - Verification:
    - `cargo test`.
    - E2E: chuyển sang EN, tạo instance trùng tên thì thấy lỗi tiếng Anh; chuyển lại VI thì thấy lỗi tiếng Việt; tải lại app thì vẫn giữ ngôn ngữ đã chọn.
