# DEC-001: Tách dữ liệu OBS theo instance bằng portable mode + junction

- Status: accepted
- Type: decision
- Scope: `src-tauri/src/obs.rs`, `src-tauri/src/lib.rs`
- Created: 2026-11-27
- Supersedes: none

## Context

Mỗi instance OBS phải lưu cấu hình ở thư mục người dùng chọn. Thử thực tế trên OBS 33.0.1:
đặt biến môi trường `APPDATA` khác cho tiến trình OBS **không** có tác dụng, vì OBS lấy đường dẫn
config qua shell API của Windows, không đọc biến môi trường. OBS vẫn ghi vào `%APPDATA%\obs-studio` thật.

## Decision

- Thư mục instance chứa NTFS junction (`mklink /J`) tới từng thư mục con cấp 1 của bản cài OBS, trừ `config`.
- Mở `<inst>\bin\64bit\obs64.exe --multi --portable` với cwd `<inst>\bin\64bit`, nên config ghi vào `<inst>\config\obs-studio`.
- `link_obs` idempotent, được gọi lại mỗi lần launch để tự vá sau khi OBS cập nhật.
- Xoá: gỡ junction bằng `fs::remove_dir` trước, chỉ `remove_dir_all` khi file `.multiobs` chứa đúng id instance.

## Alternatives considered

- Biến môi trường `APPDATA`: không cô lập được (đã kiểm chứng).
- Chép nguyên bản cài OBS vào mỗi instance: tốn ~500 MB/instance và không tự cập nhật theo OBS.
- Symlink file: cần quyền admin hoặc Developer Mode; junction thư mục thì không cần.

## Consequences

- Không tốn dung lượng; cập nhật OBS áp dụng cho mọi instance.
- `remove_dir_all` trên thư mục còn junction có thể đi vào bản cài OBS, nên luôn unlink trước và kiểm marker.
- Cờ compat `RUNASADMIN` đặt trên exe gốc không áp dụng qua đường dẫn junction, nên OBS chạy không admin.
- Kiểm chứng: `cargo test` (test `delete_never_touches_obs_install`, `location_rules`).
