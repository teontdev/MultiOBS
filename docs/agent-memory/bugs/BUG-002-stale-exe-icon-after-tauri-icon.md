# BUG-002: Đổi icon bằng `tauri icon` nhưng exe/taskbar vẫn icon cũ

- Status: resolved
- Type: bug
- Scope: `src-tauri/icons/`, build release (`build.bat`)
- Created: 2026-11-27

## Symptom

Sau `npx tauri icon` và build lại, logo trong giao diện (web) đã mới nhưng icon thanh tiêu đề, taskbar và file exe vẫn là icon Tauri mặc định.

## Root cause

Icon Windows được nhúng vào exe lúc compile (resource + `generate_context!`). Code Rust không đổi nên cargo dùng lại artifact cũ, không nhúng lại `icons/icon.ico` mới. Đã kiểm chứng: icon trích từ exe là icon cũ trong khi `icon.ico` là icon mới; sau `cargo clean -p multiobs --release` và build lại thì exe mang icon mới.

## Rule

Sau khi đổi file trong `src-tauri/icons/`, chạy `cd src-tauri && cargo clean -p multiobs --release` trước `build.bat`, rồi kiểm tra icon nhúng trong exe (bằng `System.Drawing.Icon::ExtractAssociatedIcon`), không chỉ nhìn giao diện.

## Verification

- `[System.Drawing.Icon]::ExtractAssociatedIcon("src-tauri\target\release\multiobs.exe")` ra logo MultiOBS.
