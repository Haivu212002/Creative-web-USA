# Fashion Nails & Spa

Website đa trang tiếng Anh dành cho khách tại Lewistown; Content Studio tiếng Việt dành cho người chỉnh nội dung. Các file HTML hoàn chỉnh đã được tạo và commit để GitHub Pages phục vụ trực tiếp. Không có package runtime phụ thuộc và không gửi dữ liệu khách hàng đến máy chủ.

## Chạy và kiểm tra

Dùng checkout hiện tại; mỗi cloud task đã được cách ly. Không tạo Git worktree nếu người dùng chưa yêu cầu.

Từ `/workspace/Creative-web-USA`:

```sh
npm start
```

Lệnh này dùng Python 3 để phục vụ file qua HTTP, cổng 4173. Có thể chạy trực tiếp `python3 -m http.server 4173 --bind 0.0.0.0`. Không cần `npm install`. Khi chỉnh template trong `templates/`, chạy `npm run build` để tạo lại các file HTML; `npm run check` kiểm tra các file đã đồng bộ với template. Mở trang gốc cho website và đường dẫn `admin/` cho Content Studio. Các module JavaScript cần HTTP; không mở bằng `file://`.

```sh
npm run check
npm test
npm run test:browser
```

Kiểm tra logic dùng Node.js >=20. Kiểm tra trình duyệt dùng Python, thư viện `playwright` và Chromium (đã có trong môi trường được kiểm tra). Bộ kiểm tra tự khởi động HTTP server tạm, dùng trình duyệt độc lập, không gửi tin nhắn/booking và không sửa `content.json`. Ảnh chụp kiểm tra nằm trong `test-results/`, được Git bỏ qua. Nếu không có Chromium hệ thống, Playwright dùng browser đã cài của nó. Máy chạy cần cho phép mở cổng và tiến trình Chromium.

## Cấu trúc

- `index.html`: Home, chỉ giới thiệu và xem nhanh dịch vụ/ảnh.
- `services.html`: Services & Prices, đầy đủ menu dịch vụ và bộ lọc.
- `gallery.html`: Gallery, bộ lọc, xem thêm và lightbox.
- `offers.html`: Specials & Rewards.
- `about.html`: About Us, không gian salon, ảnh cộng đồng và liên kết Journal.
- `gift-certificates.html`: Gift Certificates.
- `booking.html`: Contact & Book, địa chỉ, giờ mở cửa và planner gọi xác nhận.
- `templates/layout.html`, `templates/partials/`, `templates/pages/`: nguồn HTML dùng chung; `scripts/build-pages.mjs` tạo 13 file HTML độc lập (7 menu chính, trang chi tiết, Journal/bài viết và privacy).
- `assets/js/routes.js`: ánh xạ trang chính và các liên kết giữ dịch vụ/bản nháp; `assets/js/chrome.js` quản lý menu chung.
- `assets/js/effects.js`, `assets/css/effects.css`: hiệu ứng xuất hiện khi cuộn, hover, menu, dialog, thanh tiến độ và nút về đầu trang; hỗ trợ giảm chuyển động.
- `assets/css/multipage.css`: bố cục banner và nội dung riêng cho từng trang.
- `assets/css/site.css`: giao diện desktop/mobile, các thành phần dùng chung.
- `assets/js/site.js`: lọc dịch vụ, gallery/lightbox, planner gọi xác nhận lịch.
- `service.html?service=<id>`, `assets/js/service.js`, `assets/css/service.css`: trang thông tin riêng của từng dịch vụ; ảnh, tiêu đề và liên kết trong card đều mở đúng dịch vụ.
- `content.json`: nội dung công khai có phiên bản schema, các giá trị chưa biết là `null`.
- `assets/js/core.js`: kiểm tra dữ liệu, bản nháp, lịch theo `America/New_York`.
- `admin/index.html`, `assets/js/admin.js`, `assets/css/admin.css`: trình sửa bản nháp.
- `assets/images/`: JPEG gốc từ ZIP người dùng cung cấp, cùng các bản WebP đã chỉnh để hiển thị trên website. Ảnh JPEG gốc giữ nguyên.
- `docs/media-sources.json`: tên và SHA-256 đối chiếu với ảnh gốc trong ZIP.
- `docs/media-edits.json`: ánh xạ, kích thước và SHA-256 của 14 ảnh đã chỉnh với ảnh gốc. Các bản `*-enhanced.webp` dùng trên website; JPEG gốc vẫn giữ nguyên.

## Thông tin và nguồn

- Tên miền hiển thị: **GoFashionNailSpa.com**. Chưa thêm `CNAME` hoặc đổi DNS/GitHub Pages.
- Địa chỉ người dùng xác nhận: **8 W. Water St., Lewistown, PA 17044**.
- Điện thoại người dùng xác nhận: **+1 717 248 4131**. Số khác trên ảnh giờ mở cửa không được dùng.
- Tên Facebook người dùng cung cấp: **GoFashionNails Spa**. Đường dẫn `https://www.facebook.com/GoFashionNailSpa` được đọc từ business card trong ảnh gốc, chưa xác minh truy cập trực tuyến. Có thể sửa trong Studio.
- Giờ mở cửa đọc từ ảnh `1793603130222_5040336832554875085_g6322614212090226305_15eaecc37ee0ce3c74a2635c01f7137c.jpg`: Chủ nhật/thứ hai đóng cửa; thứ ba/thứ tư 12:00–18:00; thứ năm/thứ sáu 10:30–19:00; thứ bảy 09:00–17:00. Website ghi rõ giờ có thể thay đổi, cần gọi xác nhận.
- “Nails & Go $25” lấy từ ảnh yêu cầu 7 menu. Chưa có mô tả gói, thời hạn hay điều kiện cụ thể nên website mời khách gọi hỏi chi tiết, không tự thêm quyền lợi.
- Chưa có bảng giá đầy đủ hoặc thời lượng dịch vụ: hiển thị “Call for pricing”, không tự đặt giá/thời lượng.
- Ảnh khách, nail và nội thất là ảnh do người dùng gửi. Theo yêu cầu tiếp theo, 14 ảnh thực tế đang hiển thị đã được xử lý bằng image_gen để tăng độ rõ, giảm nhiễu, cân bằng trắng và chỉnh màu tự nhiên. Đã kiểm tra trực quan các bản chỉnh; không yêu cầu thiết kế mẫu nail mới hoặc thay khuôn mặt. Kết quả được mã hóa WebP chất lượng 90 bằng ImageMagick để phục vụ web; ImageMagick không dùng để thực hiện chỉnh màu/độ nét. Các ảnh JPEG gốc và ZIP vẫn giữ nguyên, có kiểm tra SHA-256. Ảnh tham khảo người mẫu và ảnh chụp yêu cầu không đưa lên gallery. Một số ảnh có business card/tên miền cũ; thông tin liên hệ dạng chữ trên website dùng thông tin người dùng xác nhận.
- Chưa có liên kết YouTube/TikTok, cặp ảnh trước/sau, testimonial có nội dung xác thực, thể lệ giveaway hay tên người thắng: không bịa nội dung hoặc tạo chương trình giả. Specials & Rewards dẫn khách đến Facebook để xem thông báo.

## Dùng Content Studio

Studio là công cụ chỉnh **bản nháp cục bộ**, không phải backend hoặc trang quản trị được bảo vệ bằng đăng nhập. Không nhập mật khẩu, thông tin khách hàng hoặc dữ liệu riêng tư vào đây.

1. Vào `admin/`, sửa dịch vụ/giá, ảnh, ưu đãi, nội dung hoặc giờ mở cửa. Lưu từng mục.
2. Bản nháp nằm trong `localStorage`, khóa `fashion-nails.content-draft.v1`. Chỉ tồn tại trên cùng trình duyệt và origin; có thể mất khi xóa dữ liệu trình duyệt.
3. “Xem trước” mở trang phù hợp với mục đang chỉnh (ví dụ `services.html?preview=draft` hoặc `gallery.html?preview=draft`) và có banner nhận diện. Tham số bản nháp được giữ khi đi qua menu và trang chi tiết. Khách truy cập bình thường vẫn đọc file công khai; bản nháp không tự trở thành nội dung công khai.
4. “Xuất content.json” tải một bản sao. “Nhập JSON” kiểm tra schema và yêu cầu xác nhận trước khi thay bản nháp. Hai tab cùng sửa sẽ được cảnh báo và chặn ghi đè từ tab cũ.
5. Để đưa nội dung lên website, sao lưu file cũ, kiểm tra diff, thay `content.json` bằng file đã xuất rồi triển khai repository. Studio không có token GitHub và không tự push.

Ảnh mới có thể dùng đường dẫn `assets/images/ten-anh.jpg`, URL HTTPS, hoặc tải ảnh raster tối đa 700 KB/ảnh để nhúng trong bản nháp/JSON. Không chấp nhận SVG/script URL. Dung lượng `localStorage` bị giới hạn: ưu tiên đưa ảnh vào `assets/images/` và dùng đường dẫn nếu gallery lớn. Ảnh được nhúng chỉ có trong file JSON sau khi xuất; không được upload lên cloud.

## Thông tin từng dịch vụ

Ảnh và tiêu đề tại “Find your next favorite” mở `service.html?service=<id>`. Mỗi dịch vụ có mô tả, các nội dung nên trao đổi, chuẩn bị trước khi đến, thông tin cần biết, ảnh liên quan, giá và thời lượng (nếu đã có), cùng nút lên kế hoạch ghé tiệm. Các trường `details`, `highlights`, `preparation`, `goodToKnow` có thể sửa trong Studio; hai trường danh sách dùng mỗi dòng làm một ý. Schema vẫn chấp nhận bản nháp cũ chưa có các trường này. Không tự thêm giá, quy trình điều trị hoặc gói dịch vụ chưa được xác nhận.

Liên kết trang chi tiết giữ `preview=draft` khi đang xem bản nháp và giữ dịch vụ đã chọn khi quay về planner. ID không tồn tại hiển thị trang không tìm thấy, không tự chọn một dịch vụ khác. Giá/điện thoại trên trang chi tiết lấy từ cùng `content.json` hoặc bản nháp đã chọn.

## Booking, gift certificates và khuyến mãi

Planner chỉ chuẩn bị dịch vụ, ngày và giờ mong muốn, sau đó hiện liên kết `tel:`. Ngày và giờ theo **Lewistown / America/New_York**, không theo múi giờ trình duyệt; ngày đóng cửa, ngày quá khứ, giờ đã qua và giờ đóng cửa không được chọn. Đây không phải dữ liệu lịch trống thực tế, không giữ chỗ và không gửi request booking. Không lưu thông tin khách hàng. Booking trực tuyến cần một tích hợp dịch vụ hoặc backend được xác thực, cơ sở dữ liệu, thông báo và quy tắc tránh trùng lịch.

Gift certificates hiện hướng khách gọi hoặc ghé salon để mua; không có checkout, thanh toán hoặc mã thẻ được tạo. Các ưu đãi có thể đặt ngày bắt đầu/kết thúc (tính cả hai ngày theo giờ salon), mã coupon, mô tả và bật/tắt. Mã coupon chỉ để khách nhắc với salon; không có hệ thống đổi coupon tự động.

## GitHub Pages và bảo toàn code

Tất cả URL nội bộ dùng đường dẫn tương đối để chạy được ở cả `/` và `/Creative-web-USA/`. File `.nojekyll` cho phép phục vụ trực tiếp file tĩnh. Chạy `npm run build` khi sửa các template, rồi commit cả nguồn và HTML được tạo. Không cần build trên máy chủ: GitHub Pages dùng các file HTML đã commit; tác vụ Pages tự chạy khi cập nhật `gh-pages`.

Checkout ban đầu chỉ có README tại `f7db62f`, nhánh `work`. Khi chuẩn bị xuất bản ngày 03/11/2026, GitHub đã được đọc thành công bằng lệnh có quyền truy cập mạng qua proxy. Đã xác minh `main` còn ở `f7db62f`, còn `gh-pages` ở `1d6f42cf1dc1ff5dbb76fecf61e39c7391cb6d07`, chứa 21 file của demo cũ. GitHub Actions hiển thị Pages build/deployment thành công cho nhánh `gh-pages` từ bản demo trước.

Trước khi tích hợp, toàn bộ 21 file cũ được lưu và đối chiếu byte trong `/workspace/artifacts/fashion-nails-before-refresh-gh-pages-1d6f42c.zip`. Lịch sử `gh-pages` được giữ làm cha của commit cập nhật. Không dùng force-push hoặc reset remote. Nội dung các bài Journal và bốn ảnh cũ vẫn được giữ lại; Journal dùng header/footer và CSS chung của bản đa trang. Stylesheet/script cũ vẫn có trong lịch sử và checkout để đối chiếu. Các URL phụ cũ (`pricing.html`, `transformations.html`, `reviews.html`, `visit.html`) được chuyển đến file trang mới theo `docs/legacy-routes.json`. Các bookmark cũ như `/#services` hoặc `/#contact` chuyển đến file riêng tương ứng, không phục dựng trang đơn. `booking.html?service=design` vẫn chọn Nail Art trong planner. Privacy notice được sửa để phản ánh đúng việc không gửi booking hoặc thu thông tin khách hàng.

Bản tích hợp cuối cùng được dùng cho cả source `main` và nhánh xuất bản `gh-pages`, qua cập nhật fast-forward. Không thêm `CNAME`, không đổi DNS hoặc thiết lập thanh toán/booking backend. Xem lịch sử Git và GitHub Actions để kiểm tra commit và kết quả triển khai thực tế.

Trong môi trường cloud, lệnh mạng có thể cần quyền phù hợp dù proxy đã được cấu hình. Giữ proxy và TLS verification; không bỏ proxy để vượt chính sách. Nếu API GitHub hoặc địa chỉ Pages bị HTTP 403 vì chính sách mạng, cần cho phép `api.github.com` và `haivu212002.github.io` trong cài đặt môi trường. Lưu bản nháp mạng không tự áp dụng hoặc xuất bản. Có thể theo dõi kết quả Pages trên trang GitHub Actions công khai qua `github.com` khi host đó được phép.

## Điều hướng đa trang và chuyển động

Bảy menu chính trỏ đến bảy file HTML thật, không cuộn giữa các phần của một trang và không dùng router SPA. Nút Back/Forward dùng lịch sử tài liệu của trình duyệt; các liên kết menu hoạt động ngay cả khi tắt JavaScript. Trang chủ chỉ có giới thiệu, ba dịch vụ xem nhanh, bốn ảnh xem nhanh và lời mời ghé salon.

Hiệu ứng dùng CSS và IntersectionObserver: banner xuất hiện nhẹ, ảnh phóng khi hover, thẻ nổi, phần nội dung xuất hiện khi cuộn, menu điện thoại chuyển động, lightbox mở nhẹ, thanh tiến độ đọc và nút về đầu trang. Trình duyệt hỗ trợ có chuyển cảnh tài liệu bằng View Transitions; trình duyệt khác điều hướng bình thường. Không chặn liên kết để giả lập đổi trang. Hiệu ứng tôn trọng `prefers-reduced-motion`, và nội dung vẫn hiện khi không có JavaScript hoặc IntersectionObserver.

Bộ kiểm tra trình duyệt xác minh riêng các điều hướng có HTTP document response, lịch sử Back/Forward, toàn bộ trang chính trên desktop/mobile, menu khi tắt JavaScript, ảnh/dịch vụ, booking, dữ liệu bản nháp và chuyển động thường/giảm chuyển động.
