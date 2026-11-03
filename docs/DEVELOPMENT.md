# Fashion Nails & Spa

Website tiếng Anh dành cho khách tại Lewistown; Content Studio tiếng Việt dành cho người chỉnh nội dung. Website tĩnh, không cần build, không có package phụ thuộc và không gửi dữ liệu khách hàng đến máy chủ.

## Chạy và kiểm tra

Dùng checkout hiện tại; mỗi cloud task đã được cách ly. Không tạo Git worktree nếu người dùng chưa yêu cầu.

Từ `/workspace/Creative-web-USA`:

```sh
npm start
```

Lệnh này dùng Python 3 để phục vụ file qua HTTP, cổng 4173. Có thể chạy trực tiếp `python3 -m http.server 4173 --bind 0.0.0.0`. Không cần `npm install`. Mở trang gốc cho website và đường dẫn `admin/` cho Content Studio. Các module JavaScript cần HTTP; không mở bằng `file://`.

```sh
npm run check
npm test
npm run test:browser
```

Kiểm tra logic dùng Node.js >=20. Kiểm tra trình duyệt dùng Python, thư viện `playwright` và Chromium (đã có trong môi trường được kiểm tra). Bộ kiểm tra tự khởi động HTTP server tạm, dùng trình duyệt độc lập, không gửi tin nhắn/booking và không sửa `content.json`. Ảnh chụp kiểm tra nằm trong `test-results/`, được Git bỏ qua. Nếu không có Chromium hệ thống, Playwright dùng browser đã cài của nó. Máy chạy cần cho phép mở cổng và tiến trình Chromium.

## Cấu trúc

- `index.html`: website 7 mục menu.
- `assets/css/site.css`: giao diện desktop/mobile, các thành phần dùng chung.
- `assets/js/site.js`: lọc dịch vụ, gallery/lightbox, planner gọi xác nhận lịch.
- `content.json`: nội dung công khai có phiên bản schema, các giá trị chưa biết là `null`.
- `assets/js/core.js`: kiểm tra dữ liệu, bản nháp, lịch theo `America/New_York`.
- `admin/index.html`, `assets/js/admin.js`, `assets/css/admin.css`: trình sửa bản nháp.
- `assets/images/`: ảnh từ `Archive.zip` người dùng cung cấp, sao chép không sửa ảnh.
- `docs/media-sources.json`: tên và SHA-256 đối chiếu với ảnh gốc trong ZIP.

## Thông tin và nguồn

- Tên miền hiển thị: **GoFashionNailSpa.com**. Chưa thêm `CNAME` hoặc đổi DNS/GitHub Pages.
- Địa chỉ người dùng xác nhận: **8 W. Water St., Lewistown, PA 17044**.
- Điện thoại người dùng xác nhận: **+1 717 248 4131**. Số khác trên ảnh giờ mở cửa không được dùng.
- Tên Facebook người dùng cung cấp: **GoFashionNails Spa**. Đường dẫn `https://www.facebook.com/GoFashionNailSpa` được đọc từ business card trong ảnh gốc, chưa xác minh truy cập trực tuyến. Có thể sửa trong Studio.
- Giờ mở cửa đọc từ ảnh `1793603130222_5040336832554875085_g6322614212090226305_15eaecc37ee0ce3c74a2635c01f7137c.jpg`: Chủ nhật/thứ hai đóng cửa; thứ ba/thứ tư 12:00–18:00; thứ năm/thứ sáu 10:30–19:00; thứ bảy 09:00–17:00. Website ghi rõ giờ có thể thay đổi, cần gọi xác nhận.
- “Nails & Go $25” lấy từ ảnh yêu cầu 7 menu. Chưa có mô tả gói, thời hạn hay điều kiện cụ thể nên website mời khách gọi hỏi chi tiết, không tự thêm quyền lợi.
- Chưa có bảng giá đầy đủ hoặc thời lượng dịch vụ: hiển thị “Call for pricing”, không tự đặt giá/thời lượng.
- Ảnh khách, nail và nội thất là ảnh do người dùng gửi. Không đưa ảnh tham khảo người mẫu hoặc ảnh chụp yêu cầu lên gallery. Một số ảnh gốc có business card/tên miền cũ; không sửa hoặc tẩy nội dung ảnh gốc.
- Chưa có liên kết YouTube/TikTok, cặp ảnh trước/sau, testimonial có nội dung xác thực, thể lệ giveaway hay tên người thắng: không bịa nội dung hoặc tạo chương trình giả. Specials & Rewards dẫn khách đến Facebook để xem thông báo.

## Dùng Content Studio

Studio là công cụ chỉnh **bản nháp cục bộ**, không phải backend hoặc trang quản trị được bảo vệ bằng đăng nhập. Không nhập mật khẩu, thông tin khách hàng hoặc dữ liệu riêng tư vào đây.

1. Vào `admin/`, sửa dịch vụ/giá, ảnh, ưu đãi, nội dung hoặc giờ mở cửa. Lưu từng mục.
2. Bản nháp nằm trong `localStorage`, khóa `fashion-nails.content-draft.v1`. Chỉ tồn tại trên cùng trình duyệt và origin; có thể mất khi xóa dữ liệu trình duyệt.
3. “Xem trước” mở `?preview=draft` và có banner nhận diện. Khách truy cập bình thường vẫn đọc file công khai; bản nháp không tự trở thành nội dung công khai.
4. “Xuất content.json” tải một bản sao. “Nhập JSON” kiểm tra schema và yêu cầu xác nhận trước khi thay bản nháp. Hai tab cùng sửa sẽ được cảnh báo và chặn ghi đè từ tab cũ.
5. Để đưa nội dung lên website, sao lưu file cũ, kiểm tra diff, thay `content.json` bằng file đã xuất rồi triển khai repository. Studio không có token GitHub và không tự push.

Ảnh mới có thể dùng đường dẫn `assets/images/ten-anh.jpg`, URL HTTPS, hoặc tải ảnh raster tối đa 700 KB/ảnh để nhúng trong bản nháp/JSON. Không chấp nhận SVG/script URL. Dung lượng `localStorage` bị giới hạn: ưu tiên đưa ảnh vào `assets/images/` và dùng đường dẫn nếu gallery lớn. Ảnh được nhúng chỉ có trong file JSON sau khi xuất; không được upload lên cloud.

## Booking, gift certificates và khuyến mãi

Planner chỉ chuẩn bị dịch vụ, ngày và giờ mong muốn, sau đó hiện liên kết `tel:`. Ngày và giờ theo **Lewistown / America/New_York**, không theo múi giờ trình duyệt; ngày đóng cửa, ngày quá khứ, giờ đã qua và giờ đóng cửa không được chọn. Đây không phải dữ liệu lịch trống thực tế, không giữ chỗ và không gửi request booking. Không lưu thông tin khách hàng. Booking trực tuyến cần một tích hợp dịch vụ hoặc backend được xác thực, cơ sở dữ liệu, thông báo và quy tắc tránh trùng lịch.

Gift certificates hiện hướng khách gọi hoặc ghé salon để mua; không có checkout, thanh toán hoặc mã thẻ được tạo. Các ưu đãi có thể đặt ngày bắt đầu/kết thúc (tính cả hai ngày theo giờ salon), mã coupon, mô tả và bật/tắt. Mã coupon chỉ để khách nhắc với salon; không có hệ thống đổi coupon tự động.

## GitHub Pages và bảo toàn code

Tất cả URL nội bộ dùng đường dẫn tương đối để chạy được ở cả `/` và `/Creative-web-USA/`. File `.nojekyll` cho phép phục vụ trực tiếp file tĩnh. Không có bước build hoặc workflow triển khai tự động.

Tại thời điểm phát triển, checkout chỉ có README tại commit `f7db62f`, nhánh local `work`. Đọc `origin/main` và `origin/gh-pages` bị lỗi kết nối proxy cổng 8080. Không thể kết luận nội dung các nhánh remote hoặc website đang chạy là trống. README gốc giữ nguyên; chỉ thêm file mới trong checkout. Chưa reset, push, force-push, đổi nhánh xuất bản, sửa DNS hay triển khai lên GitHub Pages.

**Trước khi tích hợp lên remote**, khôi phục quyền truy cập mạng, kiểm tra trạng thái Git và đọc code/lịch sử của cả `main` lẫn `gh-pages`. Đối chiếu và tích hợp phần bổ sung, giữ lại code và thay đổi đang có. Không chép đè cả nhánh xuất bản khi chưa kiểm tra. Thử đầy đủ website ở base path GitHub Pages sau khi tích hợp. Trỏ tên miền riêng chỉ khi đã kiểm tra quyền sở hữu và cấu hình Pages/DNS phù hợp.
