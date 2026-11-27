# MultiOBS

App desktop Windows quản lý nhiều instance OBS Studio chạy song song. Mỗi instance là một OBS riêng (profile, scene, stream key riêng), lưu cấu hình trong thư mục bạn chọn. Dùng để stream nhiều kênh/account cùng lúc từ một máy.

## Cài đặt (người dùng)

1. Cài [OBS Studio](https://obsproject.com/) (mặc định `C:\Program Files\obs-studio`).
2. Chạy bộ cài `MultiOBS_<phiên bản>_x64-setup.exe`.
3. Mở MultiOBS. Nếu OBS cài ở chỗ khác, bấm biểu tượng bánh răng để chọn thư mục cài OBS.

## Sử dụng

- **Thêm instance**: nhập tên và chọn thư mục lưu. Thư mục phải trống (hoặc chưa tồn tại); không dùng gốc ổ đĩa, thư mục cài OBS, hay thư mục lồng với instance khác.
- **Mở / Dừng**: chạy hoặc đóng OBS của instance. "Dừng" gửi lệnh đóng bình thường, nên nếu OBS đang mở hộp thoại (ví dụ trình hướng dẫn lần đầu) thì phải đóng hộp thoại đó trước; nếu đang stream/ghi hình, OBS sẽ hỏi xác nhận thoát.
- **⋯ → Đổi tên / Mở thư mục / Xoá**.
- **Xoá** (chỉ bấm được khi OBS của instance đã dừng): mặc định chỉ gỡ khỏi danh sách, thư mục dữ liệu giữ nguyên. Thư mục giữ lại không thêm lại được làm instance mới (vẫn còn file `.multiobs` và `config`); muốn dùng lại cấu hình cũ, chép thư mục `config` sang instance mới khi OBS của nó đang dừng. Tick "Xoá cả thư mục dữ liệu" để xoá luôn (không khôi phục được). App chỉ xoá thư mục có file đánh dấu `.multiobs` mang đúng id của instance, và không bao giờ xoá bản cài OBS.

## Cơ chế

OBS không cho đổi chỗ lưu cấu hình qua biến môi trường. MultiOBS dùng **chế độ portable** của OBS:

- Trong thư mục instance, app tạo **junction** (lối tắt thư mục cấp NTFS) tới từng thư mục con của bản cài OBS (`bin`, `data`, `obs-plugins`...). Không chép file, không tốn dung lượng.
- OBS được mở bằng `bin\64bit\obs64.exe --multi --portable` từ thư mục instance, nên cấu hình ghi vào `<thư mục instance>\config\obs-studio`.
- Cập nhật OBS xong, các instance dùng luôn bản mới; nếu thiếu thư mục mới, app tự tạo junction lúc mở.

Lưu ý: đừng xoá thư mục instance bằng tay khi chưa gỡ junction trong đó. Hãy xoá qua app.

Danh sách instance lưu ở `%APPDATA%\com.multiobs.app\instances.json`.

## Phát triển

Yêu cầu: Node.js LTS (đã build với v24), Rust (stable, MSVC), WebView2 (có sẵn trên Windows 11).

| Script | Việc làm |
|---|---|
| `start.bat` | Cài thư viện nếu thiếu, chạy app chế độ dev (hot reload). |
| `build.bat` | Build bản production và bộ cài NSIS tại `src-tauri\target\release\bundle\nsis\`. |

Test backend: `cd src-tauri && cargo test`.

Tài liệu thiết kế: `specs/001-multiobs-instance-manager.md`.
