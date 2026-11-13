# Rà soát trạng thái và chỉnh giao diện quản lý đơn

## Nguyên nhân đã xác định

- Giao diện khách dựng lịch sử từ trạng thái giao hàng, chưa thể hiện rõ giai đoạn chờ shop xác nhận sau thanh toán.
- Hoàn tiền được ghi nhận tại Payment trước khi kết quả được gửi sang Commerce. Trang khách đọc Payment, bảng đơn admin đọc Commerce và danh sách trả hàng. Danh sách trả hàng cũ có thể che nhãn đã hoàn tiền của đơn.
- Trả hàng không cộng lại số lượng kho theo nghiệp vụ đã chốt. Chỉ hủy đơn chưa giao mới hoàn lại số lượng.
- Màn quản lý có hai tầng điều hướng dạng tab và lặp bộ lọc trả hàng, tạo mật độ điều khiển cao.
- Khoản thu là giao dịch shop đã thực nhận. Quyền trả hàng dựa vào khoản thu đã được xác minh.

## Phạm vi sửa

1. Đối chiếu đơn thanh toán thực tế với confirmation_state, lịch sử và phản hồi API xác nhận. Chỉ sửa BE khi tái hiện được lỗi thực tế.
2. Bổ sung nhãn chờ xác nhận vào giao diện khách, gắn với confirmation_state và thời điểm tạo đơn.
3. Sửa thứ tự ưu tiên nhãn hoàn tiền và luồng cập nhật dữ liệu admin để kết quả hoàn tiền không bị che bởi danh sách trả hàng cũ.
4. Bỏ toàn bộ tab đối soát thanh toán khỏi giao diện quản trị. Đường dẫn cũ chuyển về danh sách đơn.
5. Thiết kế quản lý đơn với một tiêu đề, ba khu vực Đơn hàng, Yêu cầu hủy, Trả hàng / Hoàn tiền. Dùng nhóm lọc nhanh gọn, giảm khoảng trống, giữ bảng phân trang và chi tiết thao tác.
6. Kiểm thử việc bỏ tab, trạng thái hoàn tiền, điều hướng và các thao tác quản lý hiện có. Kiểm tra TypeScript và build.

## Công cụ thiết kế

Superdesign chưa có công cụ kết nối trong phiên. Đã dùng MCP Mobbin xem màn đơn hàng của Stripe và Canva để tham khảo cấu trúc tiêu đề, bộ lọc và bảng. Giữ kiểu chữ hiện tại của StyleMind.

## Kiểm chứng runtime ban đầu

Hai đơn COD gần đây đã có khoản thu SETTLED tại Payment và sự kiện APPLIED tại Commerce. Tại thời điểm kiểm tra chưa có đơn SEPAY_VIETQR đã thanh toán trong database đang chạy, nên lỗi admin xác nhận VietQR cần đối chiếu tiếp mã đơn cụ thể. Không thay đổi dữ liệu trong bước rà soát.

## Kết quả đối chiếu ảnh bổ sung

Ảnh của đơn SM-2EB53ED2 thể hiện phương thức VNPAY. Database xác nhận shop đã xác nhận đơn trước đó. FE chọn bước kế tiếp cho PAID là confirmed, ánh xạ thành PLACED, trong khi BE không cho PAID chuyển về PLACED. Đã đổi bước kế tiếp của PAID đã được shop xác nhận sang PROCESSING. PAID chưa được shop xác nhận tiếp tục dùng API confirm riêng.

Đã bỏ tab đối soát và đưa đường dẫn cũ về danh sách đơn, gom phần tiêu đề, làm gọn bộ lọc nhanh và bảng. Đã ưu tiên kết quả hoàn tiền cuối cùng hơn dữ liệu trả hàng cũ và cập nhật bảng trả hàng khi mở hồ sơ đã hoàn tiền. Đã bổ sung bước chờ shop xác nhận cho lịch sử PAID trên giao diện khách.

Ba khoản hoàn tiền trong database đang chạy đều đã đồng bộ xong. Ba đơn COD cũ đã COMPLETED nhưng thiếu khoản thu APPLIED cũng thiếu dấu yêu cầu thu tiền, nên worker phục hồi hiện tại bỏ qua. Không tạo khoản thu giả cho các đơn này. Các đơn COD mới được kiểm tra đã đồng bộ thành công.

Tham khảo bố cục qua MCP [Stripe](https://mobbin.com/screens/cd631da7-b35f-49d4-9323-adbb5d21e267) và [Canva](https://mobbin.com/screens/fc424e75-fdaf-4eb1-ab69-b44ad50d7e0d).

## Kiểm thử sau chỉnh sửa

- 49 kiểm thử liên quan trong 6 file đều qua.
- TypeScript typecheck và Vite build đều qua. Build còn cảnh báo kích thước bundle hiện có.
- Đã kiểm tra dữ liệu runtime bằng truy vấn chỉ đọc. Chưa thao tác thanh toán thật hoặc kiểm tra trực quan giao diện mới trong trình duyệt.
- Đợt này thay đổi FE và tài liệu. Không sửa source BE hoặc dữ liệu đang dùng.
