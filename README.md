# Omnira Studio v1.2.9 — Web Edition (Angular v22 + NestJS + Firebase)

Bản dựng lại toàn diện (1:1 về giao diện Fluent Command Suite, bảng màu, font chữ, 18 phân hệ và 335 RPC endpoints) của ứng dụng **Omnira Studio v1.2.9** sang nền tảng Web hiện đại:

- **Frontend:** Angular `v22.2.4` (Standalone Components, Signals, Lazy-loaded Routes, Fluent Command Suite CSS & Fonts gốc từ bản Desktop).
- **Backend:** NestJS `v12` (`@nestjs/core`, Unified RPC Dispatcher `/api/rpc/:endpoint` & `/api/invoke`, 335 RPC handlers trải trên 17 miền nghiệp vụ).
- **Database:** Firebase Firestore (`omnira-studio-11041651` — **Omnira Studio Web**) kết hợp bộ lưu trữ đồng bộ JSON tại `backend/data/omnira-firestore-store.json` (34 collections khởi tạo sẵn dữ liệu tiếng Việt).

---

## 1. Thông tin Cloud & Repository

- **GitHub Repository:** https://github.com/dautrunghao/omnira-studio-web
- **Firebase Project ID:** `omnira-studio-11041651`
- **Firebase Web App ID:** `1:309309845834:web:ed15160fa9145b561451b3`
- **Firebase Console:** https://console.firebase.google.com/project/omnira-studio-11041651/overview

---

## 2. Danh sách 18 Phân hệ (100% tính năng từ Omnira Studio 1.2.9)

1. **Tổng quan (`/`)** — KPI thời gian thực, biểu đồ lượt tiếp cận theo nền tảng (`LineChart`), Kênh nổi bật, Cảnh báo hệ thống, Trạng thái luồng tự động (Daemon), Giờ vàng & Nhật ký hoạt động.
2. **Không gian làm việc (`/workspaces`)** — Quản lý các Pocket theo ngách/thương hiệu, Giọng văn thương hiệu (Brand Voice), Khung giờ vàng, Đặt vị trí Watermark trực quan, Ngân sách AI & Xuất/Khôi phục cấu hình.
3. **Tài khoản & Kênh (`/accounts`)** — Cây tài khoản Facebook & Fanpage, lưới TikTok, Instagram, YouTube, Trình kiểm tra tài khoản, Quản lý Proxy (`HTTP/SOCKS5`), Browser Profiles (chống trùng vân tay Canvas) & Hạn mức kênh.
4. **Kế hoạch nội dung (`/plan`)** — Lịch ý tưởng theo tuần/tháng/danh sách, kéo thả đổi ngày, AI lập kế hoạch nội dung tự động (`plan.generate`), chuyển đổi nhanh sang Video AI / Ảnh AI / Bài đăng.
5. **Kho nội dung (`/content`)** — Quản lý Video/Reels/Shorts/Carousel, chấm điểm câu mở đầu bằng AI (`content.hookScore`), AI Spin tạo biến thể caption (`content.spin`), gợi ý Hashtag AI, lên lịch thủ công & tự động theo giờ vàng.
6. **Series AI (`/series`)** — Xây dựng chuỗi phim nhiều tập có cốt truyện xuyên suốt, quản lý hồ sơ nhân vật kèm ảnh tham chiếu & prompt tiếng Anh chuẩn hóa, AI tự động phát triển tập mới (`series.develop`) và chuyển thẳng sang Xưởng Phim (`series.makeFilm`).
7. **Xưởng Video AI (`/studio`)** — Quy trình 3 cột tạo video ngắn tự động (Kịch bản AI -> Giọng đọc TTS -> Hình nền & Thử đồ ảo Visual Bible -> Xem trước điện thoại kèm phụ đề Karaoke -> Kết xuất MP4).
8. **Xưởng Phim AI (`/film` & `/film/:id`)** — Quy trình làm phim 6 bước chuyên sâu (`Kịch bản` -> `Nhân vật` -> `Bối cảnh` -> `Khung hình` -> `Video` -> `Ghép tập`) hỗ trợ Seedance 2.0, Google Veo 3.1 (Flow), Kling AI, Muse & Grok kèm chọn luồng song song.
9. **Clone Video Mẫu (`/clone`)** — Phân tích video TikTok/Reels mẫu bằng Gemini Vision, tách phân cảnh, góc máy, nhịp dựng, lời thoại và dựng lại dự án phim mới (`clone.toFilm`).
10. **Xưởng Ảnh AI (`/image-studio`)** — Chụp ảnh sản phẩm & Lookbook thời trang bằng AI, gợi ý concept tự động (`imagestudio.generateIdeas`), sinh bộ ảnh chất lượng cao và đẩy thẳng vào Kho nội dung.
11. **Đọc văn bản TTS (`/tts`)** — Chuyển văn bản dài thành giọng đọc đa nhân vật (`[Tên nhân vật]: lời thoại`), tự động phân vai (Cast table), hỗ trợ Gemini TTS / OpenAI / ElevenLabs / VieNeu Local Voice Clone, xuất WAV & phụ đề SRT.
12. **Lịch đăng bài (`/calendar`)** — Lưới lịch đăng tuần/tháng, kéo thả dời lịch, tự động xếp lịch giờ vàng (`posts.autoSchedule`), cài đặt giãn cách chống spam (`stagger`), đăng ngay & xuất báo cáo CSV.
13. **Hộp thư hợp nhất (`/inbox`)** — Quản lý bình luận & tin nhắn đa kênh (Facebook, TikTok, Instagram, YouTube), AI gợi ý câu trả lời theo giọng thương hiệu (`inbox.suggestReply`), duyệt bản nháp AI, Quy tắc trả lời/ẩn bình luận tự động & Mẫu trả lời nhanh.
14. **Phân tích (`/analytics`)** — Thống kê lượt xem, tương tác, tỷ lệ giữ chân theo định dạng & độ dài video, biểu đồ khung giờ tương tác tốt nhất (`insights.bestHours`) và theo dõi Mục tiêu bật kiếm tiền (`analytics.goals`).
15. **Gói & Thanh toán (`/billing`)** — Quản lý bản quyền, kích hoạt mã License, bảng giá nâng cấp kèm thanh toán VietQR tự động, quản lý thiết bị đăng nhập & Chương trình giới thiệu hoàn tiền 20%.
16. **Cài đặt (`/settings`)** — 4 tab chuẩn bản gốc: `AI & Định tuyến` (BYOK API keys, chuỗi dự phòng, ngân sách & cầu dao tự ngắt), `Nguồn Video & Giọng đọc` (Google Flow, Seedance, FFmpeg GPU, Local TTS), `Kết nối Đăng bài` (Meta/TikTok/YouTube OAuth) & `Hệ thống & Lưu trữ` (Firebase Firestore + Phông nền Fluent).
17. **Hướng dẫn kết nối (`/guide`)** — Cẩm nang từng bước kết nối Facebook, TikTok, Instagram, YouTube kèm bộ đếm trạng thái kênh trực tiếp.
18. **Hỗ trợ & Góp ý (`/support`)** — Hệ thống gửi phiếu hỗ trợ kỹ thuật, báo lỗi và trao đổi trực tiếp với đội ngũ kỹ thuật viên.

---

## 3. Hướng dẫn Chạy Dự án

### Cài đặt phụ thuộc
```bash
npm run install:all
```

### Chạy Backend (NestJS — Port `3000`)
```bash
cd backend
npm run build
npm run start
```

### Chạy Frontend (Angular v22 — Port `4200`)
```bash
cd frontend
npm start
```
Truy cập ứng dụng tại: **http://localhost:4200**
