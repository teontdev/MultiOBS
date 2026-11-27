# 001 — MultiOBS: app desktop quản lý nhiều instance OBS

## Mục tiêu nghiệp vụ
Sir stream nhiều account cùng lúc trên một máy. Mỗi account cần một OBS riêng (profile, scene,
stream key riêng) chạy song song. App cho phép tạo / sửa / xoá các "instance", chọn **thư mục
lưu dữ liệu** của từng instance (không lưu mặc định trong `%APPDATA%`), và mở / dừng từng OBS.
Giao dưới dạng bộ cài Windows (`.exe`).

## Quyết định đã chốt với Sir
| Quyết định | Lý do | Phương án đã loại |
|---|---|---|
| Nhiều instance OBS chạy song song bằng `--multi` | Mỗi account nội dung riêng | Plugin multi-RTMP (chỉ cùng một nội dung) |
| Stack **Tauri 2** (lõi Rust, UI React + TS + Vite + Tailwind v4) | Bộ cài ~5–10 MB, RAM thấp khi chạy kèm nhiều OBS; vẫn dùng được gu skill `ui-ux` (web/Tailwind) | Electron (nặng ~100 MB); Rust GUI thuần egui/iced (mất gu skill); WPF (không dùng được skill) |
| Bộ cài **NSIS** do `tauri build` sinh | Chuẩn Windows, Tauri tự đóng gói | MSI (không cần) |
| UI theo skill `ui-ux`, lối **"dựng luôn"** (không wireframe), phong cách flat, token `tokens.css` của skill, không dark mode | Sir chọn "dựng luôn" | — |

## Cơ chế tách dữ liệu (đã thử thật ngày 2026-11-27, OBS 33.0.1)
- ❌ **Đặt biến môi trường `APPDATA` cho tiến trình OBS: KHÔNG chạy.** OBS lấy thư mục config qua
  API shell của Windows, vẫn ghi vào `%APPDATA%\obs-studio` thật. Đừng dùng lại cách này.
- ✅ **Portable mode qua junction**: trong thư mục instance tạo junction NTFS (`mklink /J`, không cần
  admin, trỏ khác ổ được) cho **mỗi thư mục con cấp 1** của thư mục cài OBS (`bin`, `data`,
  `obs-plugins`, `core`…). Chạy `<inst>\bin\64bit\obs64.exe --multi --portable` với working dir
  `<inst>\bin\64bit`. OBS ghi config vào `<inst>\config\obs-studio`. Không copy ~400 MB binary.
- Hệ quả phụ: đường dẫn exe qua junction khác đường dẫn gốc, nên cờ compat "Run as administrator"
  (`RUNASADMIN`) Sir đặt cho `C:\Program Files\...\obs64.exe` **không áp** → OBS chạy quyền thường.
  Chạy quyền admin là follow-up, ngoài phạm vi spec này.
- **Xoá an toàn**: luôn gỡ junction bằng `std::fs::remove_dir` (chỉ gỡ link) TRƯỚC khi xoá thư mục;
  không bao giờ xoá đệ quy đi xuyên junction (sẽ xoá bản cài OBS).

## Mô hình dữ liệu
File `instances.json` trong app data dir của Tauri (`app.path().app_data_dir()`):
```json
{ "obs_root": "C:\\Program Files\\obs-studio",
  "instances": [ { "id": "uuid", "name": "Kênh A", "dir": "D:\\OBS\\kenh-a", "created_at": 1764200000, "pid": null } ] }
```
- `obs_root`: thư mục cài OBS (chứa `bin\64bit\obs64.exe`). Mặc định tự dò `C:\Program Files\obs-studio`.
- Trong mỗi `dir` có file đánh dấu `.multiobs` (nội dung là `id`) — chỉ xoá thư mục có file này.

## Lệnh Rust (Tauri command)
| Lệnh | Hành vi | Lỗi trả về (tiếng Việt) |
|---|---|---|
| `get_state()` | `{ obs_root, obs_ok, instances:[{id,name,dir,created_at,running}] }`; `running` = pid còn sống và tên tiến trình là `obs64.exe` | — |
| `set_obs_root(path)` | Lưu nếu có `bin\64bit\obs64.exe` | "Không thấy obs64.exe trong thư mục này" |
| `create_instance(name, dir)` | Tên không rỗng, không trùng (không phân biệt hoa thường). `dir` chưa tồn tại thì tạo; đã tồn tại thì phải rỗng. Tạo junction + `config\` + `.multiobs` | "Tên đã có", "Thư mục phải trống", "Thư mục đã thuộc instance khác" |
| `rename_instance(id, name)` | Đổi tên, cùng luật tên | như trên |
| `delete_instance(id, delete_files)` | Đang chạy → lỗi. Gỡ junction; nếu `delete_files` và có `.multiobs` thì xoá cả thư mục; bỏ khỏi danh sách | "Dừng OBS trước khi xoá" |
| `launch_instance(id)` | Đang chạy → lỗi. Dựng lại junction nếu thiếu (OBS cài lại). Spawn như mục cơ chế, lưu `pid` | "OBS chưa được cấu hình", lỗi spawn |
| `stop_instance(id)` | `taskkill /PID <pid>` (không `/F`) → OBS đóng êm, tự hỏi nếu đang stream | — |
| `open_dir(id)` | Mở thư mục trong Explorer | — |
Đổi thư mục của instance đã tạo: **không hỗ trợ** (dễ mất dữ liệu; tạo instance mới thay thế).

## UI (skill `ui-ux`, một màn + modal)
- Khung: thanh header `h-16` nền surface, `<h1>` "Instance OBS" `text-base font-semibold`; bên phải nút
  icon Cài đặt (outline) và nút `primary` "+ Thêm instance".
- Thân: card danh sách chia kẻ (không mỗi dòng một card). Mỗi dòng: tên `text-sm font-medium` +
  đường dẫn `text-xs text-muted truncate` (title đầy đủ); badge "Đang chạy" (`--success-bg/--success`)
  **chỉ** ở dòng đang chạy; nút "Mở" (outline, icon play) hoặc "Dừng" (nút nguy hiểm nền rose mờ — kết
  thúc thứ đang chạy, luật I4); nút ⋯ mở menu: Đổi tên, Mở thư mục, Xoá (mục menu trung tính, rê mới đỏ).
- Rỗng (lần đầu): empty state có icon + câu + nút "Thêm instance" (màn chính của app, được phép CTA).
- OBS chưa cấu hình: banner cảnh báo trên danh sách kèm nút "Chọn thư mục OBS".
- Modal tạo: Tên, Thư mục lưu (ô chỉ đọc + nút "Chọn thư mục" dùng `@tauri-apps/plugin-dialog`), câu gợi ý
  "OBS sẽ lưu profile, scene và stream key trong thư mục này". Footer: Huỷ (`secondary`), "Tạo instance" (`primary`).
- Modal đổi tên: một ô Tên. Modal Cài đặt: thư mục cài OBS + nút chọn.
- Hộp xác nhận xoá: đỏ, tên instance đậm, checkbox "Xoá cả thư mục dữ liệu (không khôi phục được)".
- Lỗi lệnh: toast đáy phải. Trạng thái chạy làm mới mỗi 2 giây (OBS có thể bị đóng ngoài app).
- Copy tiếng Việt. Không dark mode. Bấm ra ngoài modal có form không đóng; Esc/Huỷ/✕ đóng.

## Ràng buộc
- Windows 10/11, WebView2 có sẵn. Không cần quyền admin.
- Script gốc: `start.bat` (dev), `build.bat` (bộ cài); README hướng dẫn.

## Ngoài phạm vi (follow-up)
Chạy OBS với quyền admin; đổi thư mục instance; nhân bản instance (copy config); tự khởi động cùng Windows.
