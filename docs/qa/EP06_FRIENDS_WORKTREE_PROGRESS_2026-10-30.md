# EP06 Friends — worktree đúng

Thư mục duy nhất của đợt sửa này: `E:/mss/du-an/StyleMind_FE/.worktrees/stylemind-customer-commerce`.

Đã triển khai phần Friends/lời mời UI demo vào kiến trúc hiện có. Không chép đè App.tsx/main.tsx, không tạo CommunityProvider hoặc tài khoản cố định thứ hai. Không gọi API, SMTP hoặc cloud.

## Đã làm

- Route `/friends` bảo vệ bằng AuthGuard customer; menu Bạn bè trên desktop, icon Bạn bè trên header mobile. Giữ nguyên sáu mục bottom navigation.
- Trang Bạn bè, Đã nhận, Đã gửi; tìm theo tên, empty states, avatar fallback.
- Gửi lời mời bằng email: trim/lowercase, chặn self/email sai/đã là bạn/pending trùng. Nếu có lời mời ngược chiều hợp lệ thì yêu cầu mở Đã nhận để Accept.
- Incoming chỉ Chấp nhận. Model dùng email của user đang đăng nhập; không tuyên bố email đã xác minh thật vì demo User chưa có trường này.
- Pending đã mô phỏng gửi thành công không được gửi lại. Failed/unknown/expired có cooldown30s; retry dùng chung validator giữa UI và reducer, từ chối tài khoản bị khóa và lời mời ngược chiều.
- Accept tạo hoặc kích hoạt lại cặp Friendship; hủy kết bạn qua xác nhận và vô hiệu hóa pending cũ của cả hai chiều. Giữ nguyên Outfit, legacy shares và lịch sử tin nhắn.
- DemoDatabase/reducer chung lưu Friends theo user; normalize storage schema1 cũ bằng hai array rỗng, không reset giỏ hàng/đơn hàng hoặc suy ra Friendship từ quyền share email cũ.
- Modal dùng shared UI, thêm vòng Tab riêng trong trang; Escape/restore focus. Nhãn demo nói rõ chưa gửi mail thật.

Seed mới có một lời mời mẫu Lê Mai → customer, ngày30/10/2026, hết hạn06/11/2026. Seed dùng ngày cố định để giữ tính xác định của toàn bộ demo database; không tự gia hạn khi mở app. Storage cũ không tự được chèn lời mời này.

## Files

Thêm:

- `src/entities/friendship/model/types.ts`
- `src/features/friends/model/friendshipModel.ts`
- `src/features/friends/model/friendshipModel.test.ts`
- `src/features/friends/pages/FriendsPage.tsx`
- `src/features/friends/FriendsFlow.test.tsx`

Sửa đúng sáu file cũ, đã đối chiếu hash với snapshot trước sửa:

- `src/app/store/types.ts`, `src/app/store/demoReducer.ts`
- `src/app/data/demoSeed.ts`
- `src/app/router/routes.ts`, `src/app/router/AppRouter.tsx`
- `src/app/layouts/components/CustomerHeader.tsx`

Plan: `docs/superpowers/plans/2026-10-30-ep06-friends-worktree.md`.
Evidence/snapshot: `E:/mss/du-an/.superpowers/implementation/ep06-friends-worktree/`.

## Kiểm thử và review

Baseline trước đợt sửa:113 tests/29 files pass. TDD ban đầu ghi nhận RED khi route/model chưa có, sau triển khai8 tests mới pass. Review độc lập phát hiện retry ngược chiều và báo thành công sai khi recipient bị khóa;4 regression tests mới đã RED→GREEN. Guard timestamp không hợp lệ cũng đã được bổ sung.

Focused gate sau sửa: **15/15 pass** gồm12 tests Friends và3 tests storage; `npm run typecheck` exit0.

Lần full regression đầu có1/121 fail do lời mời mẫu dùng Date.now làm seed không còn deterministic. Đã sửa bằng seed ngày cố định; focused storage3/3 pass. Kết quả full suite/build cuối được ghi trong phần Kết quả cuối và log, không dùng lần fail này làm bằng chứng hoàn tất.

Browser thật trên port8444 của đúng worktree:

- Guest `/friends` bị chuyển sang login; đăng nhập demo thành công, mở Bạn bè từ menu.
- Accept Lê Mai, chặn email trùng, dữ liệu còn sau reload.
- Giữ bạn bè khi Cancel, xóa khỏi danh sách sau xác nhận Hủy kết bạn.
- Mobile390px không tràn ngang, modal dùng được; Tab cuối→đầu, Shift+Tab đầu→cuối, Escape trả focus về Mời bạn bè.
- Không dùng DevTools để chèn user hoặc sửa storage trong browser; thao tác qua UI.

Có log context lỗi tạm thời khi HMR thay đổi chuỗi store/model trong lúc dev; sau reload giao diện hoạt động. Không tuyên bố console toàn phiên sạch. Login hiện có có lần điều hướng về Shop sau đăng nhập thay vì quay lại `/friends`; dùng menu Bạn bè mở được. Auth resume thật chưa thuộc slice này.

## Quyết định và phần chưa làm

1. Dùng đúng worktree người dùng chỉ định, snapshot source và không chạy Git/commit/push. Không xác định lịch sử/branch thay người dùng; giữ evidence sau bàn giao.
2. Tiếp tục Native theo lựa chọn đã duyệt, sửa cách gắn feature theo Router/store mới; không hỏi lại thiết kế Friends đã chốt.
3. Legacy storage thiếu array được normalize rỗng. Đổi lại user đang có demo storage cũ có thể chưa thấy lời mời mẫu, nhưng dữ liệu đang có được giữ nguyên.
4. **Sharing và Messages vẫn dùng quyền email-share cũ.** Slice này chỉ hoàn thiện Friends; hủy kết bạn chưa thu hồi quyền ở hai màn cũ. Không thêm nút View outfits/Chat trên card Friends để tránh dẫn người dùng vào luồng quyền cũ.
5. Mobile dùng icon Friends trên header, giữ nguyên bottom nav. Đổi lại lối vào Friends nằm tách khỏi hàng dưới.
6. Seed mẫu có hạn thật và không tự gia hạn. Đổi lại demo sau06/11 có thể có Received rỗng.
7. Reviewer giao browser cho parent kiểm tra; SMTP/API/email verification/Sharing/Chat migration đều để đợt sau. Regrade timestamp corruption thành Important và sửa trong cùng pass; không bỏ qua một action có thể tạo Friendship từ dữ liệu sai.

Lượt tiếp theo:

1. Chuyển sharing từng Outfit sang PRIVATE/FRIENDS/PUBLIC dựa trên Friendship; dừng cơ chế email-grant cũ theo contract BE đã duyệt.
2. Chuyển Messages sang cặp bạn bè, chặn đọc/gửi và ẩn list khi unfriend; thêm Chat nổi/ảnh/draft per-peer.
3. Thêm landing link lời mời và nối auth/verified email/API thật; xử lý auth-resume.
4. Chuyển các phần còn dùng được từ UI làm nhầm, sau đó gỡ đúng thay đổi của agent ở FE gốc bằng đối chiếu snapshot. Chưa rollback/xóa trong đợt này.

## Kết quả cuối

- `npm test -- --reporter=dot`: exit0, **125/125 tests**,31 files pass; gồm113 test cũ và12 tests Friends mới.
- `npm run typecheck`: exit0, không lỗi TypeScript.
- `npm run build`: exit0; còn cảnh báo chunk lớn hơn500kB, không chặn build. Chưa thêm code splitting trong slice này.
- Browser sau reload cuối vẫn mở `/friends` và thấy đúng lời mời đã lưu; ảnh `friends-desktop.jpg`, `friends-mobile-modal.jpg`, `friends-final.jpg` trong evidence.
- Một final reviewer, các Important đã sửa và kiểm thử RED→GREEN; không dispatch review lần hai.

**Hoàn tất slice Friends UI/demo.** Chưa hoàn tất toàn bộ migration EP06 trong worktree; Sharing/Chat/landing/API và gỡ bản root vẫn là các việc tiếp theo.
