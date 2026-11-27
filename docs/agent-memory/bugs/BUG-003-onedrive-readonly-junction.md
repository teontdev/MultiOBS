# BUG-003: Instance trong OneDrive báo "Access is denied (os error 5)" khi Mở và Xoá

- Status: resolved
- Type: bug
- Scope: `src-tauri/src/obs.rs` (`unlink_obs`, `remove_link`, `check_location`, `in_sync_folder`), `src-tauri/src/lib.rs` (`save_settings`)
- Created: 2026-11-27

## Symptom

Sir đặt thư mục instance trong `C:\Users\<user>\OneDrive\...`. Sau đó cả Mở lẫn Xoá instance đều lỗi "Access is denied. (os error 5)".

## Root cause

OneDrive gắn cờ `ReadOnly` lên các junction trong thư mục instance và biến `config`/`.multiobs` thành file cloud (reparse point). Mở và Xoá đều gỡ junction trước bằng `fs::remove_dir`. Windows không cho `RemoveDirectory` một thư mục có cờ ReadOnly, nên báo lỗi 5.

Đã tái hiện ngoài OneDrive: tạo junction, chạy `attrib +R <link> /L`, rồi `rmdir` thì ra lỗi 5. Chạy `attrib -R <link> /L` thì xoá được, và thư mục đích không đổi.

## Rule

- Gỡ junction phải chịu được cờ ReadOnly. Gặp `PermissionDenied` thì chạy `attrib -R <link> /L` rồi thử lại. `/L` tác động lên chính link, không lên bản cài OBS.
- Không cho tạo instance hay đặt thư mục mặc định trong OneDrive. Thư mục OneDrive lấy từ biến môi trường `OneDrive`, `OneDriveConsumer`, `OneDriveCommercial`. Lý do: OneDrive phá junction và đồng bộ cấu hình OBS liên tục trong lúc stream.

## Verification

- `cargo test`: `read_only_junction_is_unlinked`, `onedrive_is_detected`.
- E2E: `create_instance` và `save_settings` với đường dẫn trong OneDrive trả về lỗi giải thích.
