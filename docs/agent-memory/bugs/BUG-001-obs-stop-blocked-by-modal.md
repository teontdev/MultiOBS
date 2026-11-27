# BUG-001: "Dừng" không đóng được OBS khi OBS đang mở hộp thoại modal

- Status: resolved
- Type: bug
- Scope: `src-tauri/src/obs.rs` (`stop`), `src/App.tsx`
- Created: 2026-11-27
- Related: E2E qua CDP (WebView2 remote debugging port 9333)

## Symptom

Bấm "Dừng", `taskkill /PID` báo SUCCESS nhưng `obs64.exe` vẫn chạy, UI vẫn hiện "Đang chạy" mà không có phản hồi.

## Root cause

`taskkill` không `/F` chỉ gửi WM_CLOSE. Lần chạy đầu OBS mở hộp thoại modal ("Auto-Configuration Wizard",
"New update available"), modal chặn việc đóng cửa sổ chính. Đã kiểm chứng: đóng 2 modal xong thì "Dừng" đóng OBS bình thường.

## Rule

Giữ đóng êm (không `/F`) để OBS tự hỏi khi đang stream/ghi hình; UI phải báo "đã gửi lệnh đóng, đóng hộp thoại OBS trước"
thay vì im lặng. Không tự chuyển sang `/F`.

## Verification

- Mở instance mới (có wizard), bấm Dừng: thấy toast "Đã gửi lệnh đóng...", OBS còn chạy; đóng wizard, bấm Dừng lại: `tasklist /FI "IMAGENAME eq obs64.exe"` rỗng.
