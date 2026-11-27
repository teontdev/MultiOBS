# Spec 004: Nhân bản instance

## Yêu cầu (Sir, 2026-11-27)

"Phát triển chức năng duplicate instance. Sẽ clone config của instance cũ, và sẽ cho nhập tên instance mới trước khi tạo
thư mục để tránh dính tên thư mục mặc định khi clone."

## Hệ quả nghiệp vụ

Muốn thêm một kênh có cùng scene, nguồn và cài đặt encoder với kênh đang có, hiện người dùng phải tạo instance trống rồi
dựng lại từ đầu trong OBS, hoặc tự chép thư mục `config` bằng tay. Việc chép tay dễ sai: chép lúc OBS đang chạy, hoặc
chép cả junction. Có nút "Nhân bản" thì chỉ cần nhập tên mới là có ngay một OBS cấu hình giống hệt.

## Quyết định đã chốt

- **Dialog nhân bản dùng lại CreateDialog**, thêm prop `source: Instance | null`:
  - Tiêu đề là "Nhân bản instance". Mô tả nói chép cấu hình từ `<tên nguồn>`.
  - Ô tên **để trống** (không điền sẵn "<tên> - copy"). Thư mục tự điền là `<mặc định>\<tên mới đã làm sạch>`, giống
    spec 002. Vì vậy thư mục chỉ được tạo sau khi người dùng gõ tên mới, đúng yêu cầu "không dính tên thư mục mặc định".
  - Có dòng cảnh báo rằng stream key cũng được chép. Người dùng phải đổi key trong OBS mới, nếu không hai OBS sẽ stream
    vào cùng một kênh.
- **Command backend `duplicate_instance(source_id, name, dir)`** có cùng các bước và kiểm tra như `create_instance`:
  `validate_name`, `check_location`, `prepare_dir`, `write_marker` với id mới, `link_obs`. Sau `write_marker` thêm bước
  chép `<nguồn>\config` sang `<mới>\config`. Lỗi ở bất kỳ bước nào thì `rollback`, giống create.
- **Instance nguồn phải đang dừng.** Nếu đang chạy thì trả lỗi "Dừng OBS của instance nguồn trước khi nhân bản". Menu
  "Nhân bản" bị khoá kèm gợi ý, giống mục Xoá.
  Lý do: OBS ghi `basic.ini` và scene `.json` khi đang chạy, chép lúc đó có thể ra file dở dang.
- **Cách chép:** đệ quy toàn bộ `config\`, nhưng bỏ qua:
  - mọi symlink/junction, để không bao giờ đi theo link ra ngoài;
  - các thư mục rác `logs`, `crashes`, `profiler_data`, `updates`, `.sentinel` (dấu tắt bất thường), so tên không phân
    biệt hoa thường, **chỉ ở cấp ngay dưới `config\obs-studio`**. Ở cấp sâu hơn không bỏ, vì profile của người dùng
    có thể tên "Logs" (finding review).
  - Bản thân `config` của nguồn là link thì coi như không có config.
- Kiểm tra "nguồn đang chạy" nằm trong cùng khoá store với bước tạo, để không thể bấm Mở nguồn giữa lúc đang chép.
- Nguồn không có `config\` (OBS chưa mở lần nào) thì vẫn tạo được, kết quả là một instance trống.
- Menu ⋯ của mỗi dòng thêm mục "Nhân bản" (icon `Copy`), đặt sau "Đổi tên".

## Phương án đã loại

- Điền sẵn tên "<tên> (copy)": Sir muốn tránh thư mục mang tên mặc định. Để trống thì nút Tạo bị khoá cho tới khi gõ tên.
- Chép cả thư mục instance: sẽ chép theo junction vào bản cài OBS, nặng và nguy hiểm.
- Tự xoá stream key trong bản sao: phải sửa định dạng file cấu hình OBS (`service.json`), dễ vỡ khi OBS đổi phiên bản.
  Chỉ cảnh báo là đủ.

## Ràng buộc

- DEC-001: OBS chạy `--portable`. Cấu hình nằm ở `<inst>\config\obs-studio`; các thư mục khác là junction.
- Chỉ xoá theo marker: thư mục mới có marker với id mới, nên xoá bản sao không đụng tới bản gốc.

## Ngoài phạm vi

Đồng bộ cấu hình giữa các instance sau khi đã nhân bản.
