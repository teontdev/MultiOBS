# Spec 005: Chuyển ngôn ngữ Anh – Việt

## Yêu cầu (Sir, 2026-11-27)

"Bổ sung chức năng chuyển đổi ngôn ngữ anh-việt."

## Hệ quả nghiệp vụ

Repo đã public trên GitHub, nhưng app hiện chỉ có tiếng Việt. Người dùng nước ngoài không hiểu được nút bấm hay thông
báo lỗi, ví dụ lỗi "Thư mục phải trống". Có thêm tiếng Anh thì họ dùng được app.

## Quyết định đã chốt

- **Phạm vi dịch:** mọi chữ trên giao diện (nút, dialog, toast, gợi ý, aria-label, tiêu đề hộp chọn thư mục) và mọi thông
  báo lỗi do backend trả về.
- **Không cài thư viện i18n.** App có khoảng 100 chuỗi, một file từ điển là đủ:
  - Thêm file `src/i18n.tsx`. Trong đó object `vi` là chuẩn; object `en` có kiểu `typeof vi` để TypeScript báo lỗi khi
    thiếu key.
  - Chuỗi có tham số viết thành hàm, ví dụ `created: (n: string) => \`Đã tạo instance "${n}"\``.
  - `LangProvider` và `useT()` trả về `{ t, lang, setLang }`.
- **Lưu ngôn ngữ:** frontend lưu ở `localStorage["lang"]`. Lần đầu mở app thì chọn theo `navigator.language`: bắt đầu
  bằng `vi` thì dùng tiếng Việt, còn lại dùng tiếng Anh. Đổi ngôn ngữ cũng cập nhật `document.documentElement.lang`.
- **Lỗi từ backend:** thêm command `set_language(en: bool)`, ghi vào một `static AtomicBool` trong `obs.rs`. Hàm
  `obs::tr(vi, en) -> String` chọn chuỗi theo ngôn ngữ đang đặt. Mọi chỗ trả lỗi trong `obs.rs` và `lib.rs` đều dùng
  `tr`. Frontend gọi `set_language` khi mở app và mỗi lần đổi ngôn ngữ.
  Lý do: lỗi backend có nhiều biến thể và có tham số (tên, đường dẫn). Dịch tại chỗ gọn hơn đổi sang mã lỗi rồi map lại
  ở frontend.
- **Nút đổi ngôn ngữ** nằm trên header, cạnh nút Cài đặt. Đó là một nút ghost hiện "EN" khi đang ở tiếng Việt và "VI"
  khi đang ở tiếng Anh, có `aria-label` "Switch to English" hoặc "Chuyển sang tiếng Việt". Bấm một lần là đổi ngay,
  không cần Lưu.
- Lỗi do hệ điều hành sinh ra (`io::Error` từ Windows) giữ nguyên theo ngôn ngữ của Windows.

## Phương án đã loại

- `react-i18next`: thêm dependency và cấu hình cho khoảng 100 chuỗi, không đáng.
- Lưu ngôn ngữ trong `instances.json`: khi app vừa mở, danh sách chưa tải xong thì chưa biết ngôn ngữ, nên giao diện
  sẽ nháy tiếng Việt rồi mới đổi. `localStorage` đọc được ngay lúc render đầu.
- Đặt ô chọn ngôn ngữ trong dialog Cài đặt: phải mở dialog rồi bấm Lưu, chậm hơn một nút bấm trên header.

## Ngoài phạm vi

- Ngôn ngữ của bộ cài NSIS (đã có cả Việt và Anh).
- Ngôn ngữ của chính OBS.
- Dịch README (đã có tóm tắt tiếng Anh).
