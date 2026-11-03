# EP06 — Kết nối API FE đang triển khai

FE: `E:/mss/du-an/FE`. Chọn API mode trong PowerShell trước khi chạy Vite:

```powershell
$env:VITE_COMMUNITY_MODE = 'api'
npm run dev
```

Gateway mặc định `http://127.0.0.1:8080`; có thể đặt `STYLEMIND_GATEWAY_URL` trong môi trường chạy Vite khi dùng địa chỉ khác. Token access được lưu trong sessionStorage của tab, không đưa vào dữ liệu demo. Khi hết hạn cần đăng nhập lại; refresh-token và đăng ký thật chưa kết nối.

Đang nối Identity login/profile, Friends/lời mời và xem/chia sẻ Outfit. Các test hiện dùng HTTP giả lập: backend chưa chạy theo thông tin người dùng, vì vậy chưa nghiệm thu với Gateway, hai tài khoản, SMTP hoặc cloud. Chat/WebSocket, ảnh và trang nhận link lời mời còn lại.

Danh sách lời mời gửi đi của backend hiện không có delivery_status và retry_after_seconds. FE không suy đoán pending đã gửi thành công; chỉ hiện gửi lại cho lời mời hết hạn hoặc lỗi đã nhận trực tiếp trong phiên hiện tại. Sau khi mất phiên, trường hợp pending gửi lỗi/chưa rõ cần backend bổ sung metadata hoặc phương án khôi phục trước khi coi luồng retry hoàn chỉnh.

Mua sắm/AI và những phần khác vẫn là demo. API mode không dùng ID Outfit/product demo để gửi lên backend. Chưa commit/push; mọi lệnh Git do người dùng tự chạy.

## Cập nhật 03/11

Đã thêm trang Outfit thật và kiểm tra API mode với HTTP giả lập. Review đã sửa lỗi phản hồi 401 cũ làm mất phiên mới, tránh làm mất bản nháp khi đổi tab, và ngăn kết quả thao tác cũ hiện thông báo trong phiên khác. Kiểm tra thật với backend được người dùng chọn để sau. Lưu ý các chức năng đăng ký, OTP và quên mật khẩu thật chưa được kết nối trong API mode.

Kiểm thử cuối: toàn bộ 154/154 test (37 file) đã qua; TypeScript và build qua. Build cảnh báo bundle khoảng 635 kB. Các test API dùng phản hồi giả lập, chưa xác nhận backend thật. Người dùng chọn để kiểm thử Gateway sau.

## Chat API — tiến độ 03/11

Đã nối HTTP mở hội thoại từ danh sách bạn bè, danh sách hội thoại, 30 tin gần nhất và gửi văn bản. Tin gửi lại cùng nội dung sau lỗi trong cùng màn hình dùng lại client_message_id; bản nháp giữ riêng theo hội thoại. Đã chạy 16 test tập trung cho client API, Friends, Identity và Outfit với HTTP giả lập; typecheck/build qua. Chưa có test tích hợp giao diện Chat, chưa chạy bộ test toàn dự án sau thay đổi Chat, và chưa thử backend thật.

Còn thiếu: WebSocket/reconnect và đồng bộ lịch sử, phân trang lịch sử cũ, tải/gửi/hiển thị ảnh qua API có xác thực, hiển thị tên bạn bè, trang nhận link và test end-to-end. Màn hình hiện chỉ cho tải lại để xem tin mới và hiển thị số ảnh đính kèm, chưa xem được ảnh.

Cập nhật kiểm tra: đã thêm test giao diện Chat dùng HTTP giả lập, xác nhận tải hội thoại và gửi đúng nội dung; 3/3 test Chat (giao diện + client) qua. Chưa chạy lại toàn bộ suite sau đợt thêm Chat.

## Cập nhật tiếp — Chat và lời mời

Đã nối FE với API mở/list Chat, lịch sử phân trang, gửi text, multipart ảnh, đọc ảnh riêng tư có Bearer, WebSocket STOMP để nhận sự kiện và tải lại lịch sử khi reconnect. Sau reconnect, các trang lịch sử được nối theo sequence; khi mở chat qua Bạn bè, backend quyết định quyền. Link lời mời FE là `/friend-invitations/accept`; backend cần cấu hình `STYLEMIND_FRIEND_INVITATION_PAGE_URL` tới URL frontend này, không kèm fragment. FE giữ ID/token trong fragment tới khi người nhận đăng nhập và bấm Chấp nhận, rồi POST API.

Ảnh tối đa 5 ảnh/tin, 5 MiB/ảnh và 40 megapixel; FE và backend cùng kiểm tra. Lời mời lỗi/chưa rõ có thể gửi lại theo metadata nhận được trong cùng tab, kể cả tải lại trang. Khi tab bị đóng và backend chỉ trả PENDING mà không kèm delivery_status, FE không thể xác định quyền gửi lại; cần bổ sung metadata từ backend để hoàn thiện trường hợp này.

API mode dùng `VITE_COMMUNITY_MODE=api`, Gateway mặc định 127.0.0.1:8080. Trang đang mở ở cổng 8444 có thể đang ở chế độ demo; cần chạy FE với biến môi trường API mode và bật backend trước khi thử thật. Chưa kiểm thử runtime hai tài khoản/WebSocket/ảnh cloud do backend được để sau. Chat vẫn là trang Tin nhắn, chưa chuyển thành cửa sổ nổi.

Để WebSocket hoạt động khi kiểm thử thật, cấu hình backend `STYLEMIND_FRONTEND_BASE_URL` trùng chính xác origin trình duyệt (ví dụ `http://127.0.0.1:8444`; khác với `http://localhost:8444`). Vite dùng proxy WebSocket qua Gateway. Giá trị mặc định backend là `http://localhost:3000` nên phải chỉnh cho đúng môi trường chạy.

Kiểm tra cập nhật: suite 165/165 test qua, tiếp đó 13 test tập trung Chat/Friends qua sau thay đổi cuối; TypeScript và build qua. Các test mô phỏng HTTP/WebSocket; chưa thay thế kiểm thử qua Gateway thật. Review độc lập phát hiện và đã sửa lỗi mất tin ở ranh giới phân trang, mất hội thoại đang chọn khi refresh và giữ sai credential khi mở link lời mời mới. Khi mất WebSocket, FE giữ nháp và khóa gửi đến khi kết nối lại.

Giới hạn giao diện hiện tại: Chat là trang Tin nhắn, chưa thành cửa sổ nổi. Tên bạn trong danh sách Chat được đối chiếu trang Friends đầu tiên, các bạn ngoài trang này có nhãn dự phòng “Bạn bè”.

## Khôi phục Auth FE theo yêu cầu người dùng

Ngày 03/11: khôi phục `AppProviders`, `AuthGuard`, `GuestGuard`, `useAuth` và `LoginPage` từ snapshot ngay trước khi mình tích hợp API; bỏ chặn các trang đăng ký/OTP/khôi phục mật khẩu trong router. Provider đăng nhập Identity và test riêng của provider được lưu tại `E:/mss/du-an/.superpowers/implementation/ep06-api-connection/auth-rollback-2026-11-03` để đối chiếu, không dùng trong FE.

Code API Friends/Outfit/Chat được giữ nhưng chế độ gọi API đang tạm ngắt, kể cả khi đặt `VITE_COMMUNITY_MODE=api`, để không nhầm phiên đăng nhập demo với token thật. `apiMode()` trong `src/shared/api/http.ts` là điểm cần nối lại sau khi đọc Auth của Quân. Không tự suy đoán token hoặc contract Auth của Quân. Chín test UI cần Auth thật hiện được đánh dấu skip; các test API client độc lập vẫn chạy. Sau khi người dùng pull, đối chiếu code Auth, tích hợp token/guard theo cấu trúc thực tế, khôi phục chín test và kiểm thử với backend thật.

Lưu ý: các chỉ dẫn API mode ở các mục trước là lịch sử và chưa áp dụng cho đến khi tích hợp Auth mới. Không chạy Git, commit hoặc push.

Kiểm tra sau khôi phục: 155 test qua, 9 test UI API tạm bỏ qua chờ Auth thật; typecheck và build thành công. Các test API client độc lập và test Auth demo vẫn chạy. Đã bỏ proxy `/identity` do lượt nối Auth trước thêm vào; proxy Wardrobe Community giữ lại cho task của bạn. Bản test API cũ mô phỏng endpoint Identity và sẽ được cập nhật theo Auth thật khi tích hợp lại.
