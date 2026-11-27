# Spec 003: OBS chạy với quyền admin

## Yêu cầu (Sir, 2026-11-27)

"Cho OBS chạy với quyền admin."

## Hệ quả nghiệp vụ

OBS chạy admin thì game capture bắt được game chạy admin và OBS được ưu tiên GPU (OBS khuyến nghị cho stream ổn định).
Trước đây Sir đặt cờ "Run as administrator" cho `obs64.exe` gốc, nhưng cờ đó không áp dụng khi mở qua đường dẫn
junction của instance (xem DEC-001), nên OBS từ MultiOBS chạy không admin.

## Quyết định đã chốt

- Bản release của MultiOBS khai báo `requireAdministrator` trong Windows manifest. App hỏi UAC một lần khi mở;
  OBS do app mở thừa hưởng quyền admin.
- Chỉ áp dụng cho bản release (`build.rs` kiểm tra `PROFILE == "release"`). Bản dev (`start.bat`) vẫn chạy
  thường, vì `cargo run` từ terminal không admin sẽ lỗi 740 (ERROR_ELEVATION_REQUIRED) với exe đòi admin.
- Manifest giữ dependency Common-Controls v6 như manifest mặc định của Tauri.

## Phương án đã loại

- Mở từng OBS bằng `ShellExecuteEx` verb `runas`: mỗi lần Mở là một hộp UAC, và app không admin không gửi được
  WM_CLOSE tới cửa sổ OBS admin (UIPI chặn), làm hỏng nút "Dừng".
- Tuỳ chọn bật/tắt admin trong Cài đặt: cần cơ chế tự khởi động lại app có quyền; chưa ai yêu cầu.

- Bộ cài NSIS chuyển sang `installMode: perMachine` (Program Files, hỏi UAC khi cài). Lý do: exe chạy admin mà
  nằm ở `%LOCALAPPDATA%` (ghi được không cần admin) thì phần mềm khác có thể thay exe rồi được chạy admin ở lần mở
  sau. perMachine cũng cho bộ cài đóng được app đang chạy admin khi nâng cấp/gỡ.

## Ràng buộc

- Người dùng là tài khoản admin tự bấm UAC. Nếu tài khoản thường nâng quyền bằng mật khẩu admin khác, dữ liệu app
  nằm trong profile của tài khoản admin đó (không hỗ trợ).
- Cửa sổ chạy admin không nhận kéo-thả từ Explorer thường; app chỉ dùng hộp chọn thư mục nên không ảnh hưởng.
- Bản 0.1.0 trước đó cài per-user: nên gỡ bản cũ trước khi cài bản mới để tránh hai mục trong Apps.

- Thư mục/junction app tạo khi chạy admin vẫn thuộc quyền user (kế thừa ACL thư mục cha).
