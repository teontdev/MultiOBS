<p align="center"><img src="src-tauri/icons/logo.svg" width="128" alt="MultiOBS logo"></p>

# MultiOBS

Chạy nhiều OBS Studio song song trên một máy Windows, mỗi OBS một cấu hình riêng (profile, scene, stream key), để stream nhiều kênh/account cùng lúc.

> **🤖 App này được làm hoàn toàn bằng AI.**
> Toàn bộ code, giao diện, script build, tài liệu và test đều do AI viết (Claude, qua Claude Code).
> Người làm dự án chỉ đưa yêu cầu, chốt quyết định và thử app. Code đã được AI review và chạy thử trên máy thật,
> nhưng không có lập trình viên nào viết hay đọc duyệt từng dòng. Dùng thì tự cân nhắc rủi ro; góp ý/issue luôn được hoan nghênh.

> **Không chính thức.** MultiOBS là công cụ độc lập, không liên quan và không được OBS Project bảo trợ.
> "OBS" và "OBS Studio" là nhãn hiệu của OBS Project.

**English:** MultiOBS is a Windows desktop app to create, run and manage multiple isolated OBS Studio instances side by side (one per streaming account). It was built entirely by AI (Claude via Claude Code); the human only provided requirements and decisions. Unofficial, not affiliated with the OBS Project.

## Tính năng

- **Tạo / đổi tên / xoá instance OBS**, mỗi instance lưu cấu hình trong thư mục do bạn chọn.
- **Nhân bản instance**: tạo instance mới với cấu hình (profile, scene, cài đặt) chép từ instance có sẵn.
- **Thư mục lưu mặc định**: đặt một lần trong Cài đặt, khi thêm instance chỉ cần gõ tên.
- **Mở / Dừng** từng OBS, xem instance nào đang chạy; nhiều OBS chạy cùng lúc (`--multi`).
- **OBS chạy với quyền admin** (game capture bắt được game chạy admin, OBS được ưu tiên GPU).
- **Xoá an toàn**: không bao giờ đụng tới bản cài OBS hay thư mục không do app tạo.
- Không chép OBS: mọi instance dùng chung bản cài OBS, cập nhật OBS là tất cả cùng lên đời.

## Yêu cầu

- Windows 10/11 64-bit (đã thử trên Windows 11).
- [OBS Studio](https://obsproject.com/) đã cài (đã thử với OBS 33.0.1).
- Tài khoản Windows có quyền admin (app hỏi UAC khi mở).

## Cài đặt

1. Cài OBS Studio (mặc định `C:\Program Files\obs-studio`).
2. Tải bộ cài `MultiOBS_<phiên bản>_x64-setup.exe` ở mục [Releases](https://github.com/teontdev/MultiOBS/releases), hoặc tự build (xem [Phát triển](#phát-triển)).
3. Chạy bộ cài. App cài vào Program Files nên cần UAC. Đã cài bản cũ thì gỡ bản cũ trước.
4. Mở MultiOBS. Nếu OBS cài ở chỗ khác, bấm biểu tượng bánh răng để chọn thư mục cài OBS.

Windows SmartScreen có thể cảnh báo vì bộ cài chưa được ký số. Bấm "More info" → "Run anyway" nếu bạn tin nguồn tải.

## Sử dụng

- **Thêm instance**: nhập tên và chọn thư mục lưu. Thư mục phải trống (hoặc chưa tồn tại); không dùng gốc ổ đĩa, thư mục cài OBS, thư mục lồng với instance khác, hay thư mục trong **OneDrive** (OneDrive khoá liên kết của app và đồng bộ cấu hình OBS liên tục).
- **Thư mục lưu mặc định** (bánh răng → Cài đặt): đặt một thư mục cha; khi thêm instance, ô "Thư mục lưu" tự điền `<thư mục mặc định>\<tên instance>` (ký tự Windows cấm trong tên được thay bằng `-`). Vẫn bấm "Chọn thư mục" để đặt chỗ khác.
- **Mở / Dừng**: chạy hoặc đóng OBS của instance. "Dừng" gửi lệnh đóng bình thường (không ép tắt), nên:
  - nếu OBS đang mở hộp thoại (ví dụ trình hướng dẫn lần đầu), đóng hộp thoại đó trước;
  - nếu đang stream/ghi hình, OBS sẽ hỏi xác nhận thoát.
- **⋯ → Nhân bản**: nhập tên mới, thư mục lưu tự đặt theo tên mới (hoặc chọn tay). App chép thư mục `config` của instance nguồn (bỏ log, crash), nên OBS mới có sẵn profile, scene, cài đặt. Instance nguồn phải đang dừng. **Stream key cũng được chép**, nhớ đổi key trong OBS mới để không phát trùng kênh.
- **⋯ → Đổi tên / Mở thư mục / Xoá**.
- **Xoá** (chỉ bấm được khi OBS của instance đã dừng):
  - Mặc định chỉ gỡ khỏi danh sách, thư mục dữ liệu giữ nguyên. Thư mục giữ lại không thêm lại được làm instance mới; muốn dùng lại cấu hình cũ, chép thư mục `config` sang instance mới khi OBS của nó đang dừng.
  - Tick "Xoá cả thư mục dữ liệu" để xoá luôn (không khôi phục được). App chỉ xoá thư mục có file đánh dấu `.multiobs` mang đúng id của instance.

## Cách hoạt động

OBS không cho đổi chỗ lưu cấu hình qua biến môi trường (`APPDATA`), nên MultiOBS dùng **chế độ portable** của OBS:

- Trong thư mục instance, app tạo **junction** (lối tắt thư mục cấp NTFS) tới từng thư mục con của bản cài OBS (`bin`, `data`, `obs-plugins`...). Không chép file, không tốn dung lượng.
- OBS được mở bằng `bin\64bit\obs64.exe --multi --portable` từ thư mục instance, nên cấu hình ghi vào `<thư mục instance>\config\obs-studio`.
- Mỗi lần Mở, app tạo lại junction theo thư mục cài OBS hiện tại, nên đổi/cập nhật OBS không cần làm gì thêm.
- Bản cài của MultiOBS chạy admin (manifest `requireAdministrator`), OBS mở từ app thừa hưởng quyền đó. App và OBS cùng mức quyền thì nút Dừng mới đóng được OBS.

**Đừng xoá thư mục instance bằng tay** khi trong đó còn junction: một số công cụ xoá sẽ đi theo junction vào bản cài OBS. Hãy xoá qua app.

Danh sách instance lưu ở `%APPDATA%\com.multiobs.app\instances.json`.

## Phát triển

Stack: [Tauri 2](https://tauri.app/) (Rust) + React 19 + TypeScript + Tailwind CSS v4, bộ cài NSIS.

Yêu cầu: Node.js LTS (đã build với v24), Rust stable (MSVC toolchain), WebView2 (có sẵn trên Windows 11).

| Script | Việc làm |
|---|---|
| `start.bat` | Cài thư viện nếu thiếu, chạy app chế độ dev (hot reload). Bản dev chạy **không** admin. |
| `build.bat` | Build bản production và bộ cài NSIS tại `src-tauri\target\release\bundle\nsis\`. |

Test backend: `cd src-tauri && cargo test`.

Cấu trúc:

- `src-tauri/src/obs.rs`: lưu danh sách instance, tạo/gỡ junction, mở/dừng OBS, kiểm tra thư mục và xoá an toàn.
- `src-tauri/src/lib.rs`: các lệnh Tauri mà giao diện gọi.
- `src/`: giao diện React.
- `specs/`, `tasks/`: đặc tả và danh sách việc mà AI đã lập trước khi code.
- `docs/agent-memory/`: các quyết định và bài học AI ghi lại trong quá trình làm.

## Giấy phép

[PolyForm Noncommercial 1.0.0](LICENSE): được dùng, sửa, chia sẻ miễn phí cho **mục đích cá nhân, phi thương mại** (học tập, sở thích, tổ chức phi lợi nhuận). **Cấm dùng cho mục đích thương mại** (bán, đóng gói vào sản phẩm/dịch vụ trả phí, dùng trong công ty để kiếm lợi). Muốn dùng thương mại, liên hệ tác giả qua [Issues](https://github.com/teontdev/MultiOBS/issues).

Đây là giấy phép "source-available", không phải giấy phép open source theo định nghĩa OSI.
