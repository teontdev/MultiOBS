# DEC-002: Chạy app admin (release) để OBS thừa hưởng quyền; bộ cài perMachine

- Status: accepted
- Type: decision
- Scope: `src-tauri/build.rs`, `src-tauri/windows-admin.manifest`, `src-tauri/tauri.conf.json`
- Created: 2026-11-27
- Supersedes: none

## Context

Sir cần OBS chạy admin. Cờ compat "Run as administrator" của exe OBS gốc không áp dụng qua đường dẫn junction (DEC-001).

## Decision

- Exe release nhúng manifest `requireAdministrator` (build.rs chỉ khi `PROFILE == "release"`); OBS con thừa hưởng token admin.
- Bộ cài NSIS `installMode: perMachine` để exe admin nằm trong Program Files.

## Alternatives considered

- `ShellExecuteEx runas` cho từng OBS: UAC mỗi lần mở, và app không admin không gửi được WM_CLOSE tới OBS admin (UIPI), hỏng nút Dừng.
- Giữ `currentUser`: exe admin nằm ở `%LOCALAPPDATA%`, phần mềm không admin thay được exe → leo thang quyền.

## Consequences

- Một UAC mỗi lần mở app; bản dev không admin (`cargo run --release` từ terminal thường lỗi 740).
- Không nhận kéo-thả từ Explorer thường; app chỉ dùng hộp chọn thư mục.
- Mọi cách mở OBS mới phải giữ: app và OBS cùng mức quyền, nếu không Dừng (WM_CLOSE) hỏng.
