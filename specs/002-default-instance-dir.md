# Spec 002: Thư mục lưu instance mặc định

## Yêu cầu (Sir, 2026-11-27)

"Trong cài đặt. Cho set sẵn thư mục lưu instance mặc định."

## Hệ quả nghiệp vụ

Hiện mỗi lần thêm instance, người dùng phải mở hộp chọn thư mục và tự tạo thư mục con trống. Với nhiều kênh,
việc này lặp lại và dễ chọn nhầm. Có thư mục mặc định thì chỉ cần gõ tên là tạo được.

## Quyết định đã chốt

- Thư mục mặc định là **thư mục cha**. Khi tạo, thư mục instance = `<mặc định>\<tên instance đã làm sạch>`.
  Lý do: instance phải ở thư mục trống riêng (spec 001), nên không thể dùng chung một thư mục.
- Ô "Thư mục lưu" trong dialog tạo tự điền và cập nhật theo tên khi gõ. Người dùng bấm "Chọn thư mục" thì
  ngừng tự điền cho lần mở dialog đó.
- Làm sạch tên: thay ký tự Windows cấm `<>:"/\|?*` và ký tự điều khiển bằng `-`, bỏ dấu chấm/khoảng trắng cuối.
  Giữ dấu tiếng Việt (NTFS hỗ trợ Unicode). Tên thiết bị Windows (CON, NUL, COM1...) được thêm `_` phía trước,
  vì thư mục tên đó khó mở/xoá trong Explorer.
- Thư mục mặc định đã biến mất (bị xoá, rút ổ) thì `get_state` trả về như chưa đặt, để không tự điền vào chỗ
  không còn và không chặn việc lưu Cài đặt khác.
- Không đặt mặc định thì hành vi như cũ (phải chọn tay).
- Backend: `Store.default_dir: Option<PathBuf>` (`serde(default)`, file cũ vẫn đọc được). Thay command
  `set_obs_root` bằng `save_settings(obs_root: Option<PathBuf>, default_dir: Option<PathBuf>)`:
  `obs_root` nếu có phải chứa `bin\64bit\obs64.exe`; `default_dir` nếu có phải tuyệt đối và đang tồn tại.
  `default_dir = None` nghĩa là xoá mặc định.
- Mọi kiểm tra an toàn thư mục instance (`check_location`, `prepare_dir`) vẫn chạy lúc tạo như spec 001.

## Phương án đã loại

- Tự sinh tên thư mục theo id/uuid: khó nhận ra thư mục nào của kênh nào khi mở Explorer.
- Kiểm tra default_dir chồng lấn OBS ngay lúc lưu: thừa, vì `check_location` đã chặn lúc tạo.

## Ngoài phạm vi

Di chuyển instance đã có sang thư mục mặc định mới.
