# YouTube Transcript Grabber

Chrome Extension giúp trích xuất transcript (phụ đề) từ video YouTube một cách dễ dàng và nhanh chóng.

## Tính năng

- Trích xuất transcript từ video YouTube đang mở
- Hỗ trợ đa ngôn ngữ (nếu video có nhiều phụ đề)
- Copy transcript vào clipboard với một click
- Tải transcript dưới dạng file .txt
- Hiển thị timestamp (thời gian) cho từng đoạn văn bản
- Hoạt động offline, không cần API key

## Cài đặt

### Từ GitHub
1. Clone repository này:
   ```
   git clone https://github.com/sonpiaz/youtube-transcript-grabber.git
   ```
2. Mở Chrome, vào `chrome://extensions/`
3. Bật "Developer mode" ở góc phải
4. Click "Load unpacked" và chọn thư mục đã clone

### Cài đặt trực tiếp
1. Tải repository này dưới dạng zip
2. Giải nén vào một thư mục trên máy tính
3. Mở Chrome, vào `chrome://extensions/`
4. Bật "Developer mode" ở góc phải
5. Click "Load unpacked" và chọn thư mục đã giải nén

## Cách sử dụng

1. Mở video YouTube bất kỳ
2. Click vào icon extension trên thanh công cụ
3. Extension sẽ tự động lấy transcript của video
4. Click "Copy" để sao chép transcript hoặc "Tải xuống" để lưu thành file

## Công nghệ sử dụng

- Chrome Extensions API (Manifest V3)
- JavaScript (Vanilla)
- HTML & CSS

## Xử lý lỗi thường gặp

- Video không có transcript: Hiển thị thông báo "Video này không có transcript"
- Lỗi mạng: Có nút "Thử lại" để tải lại transcript
- Video đang load: Hiển thị trạng thái loading

## Cơ chế hoạt động

Extension sử dụng nhiều phương pháp khác nhau để lấy transcript:

1. **Phương pháp Captions API**: Trích xuất trực tiếp từ API nội bộ của YouTube
2. **Phương pháp TimedText API**: Sử dụng API timedtext của YouTube
3. **Phương pháp UI**: Tương tác với giao diện người dùng của YouTube

Mỗi phương pháp được thử theo thứ tự độ tin cậy, đảm bảo extension hoạt động với nhiều video khác nhau.

## Đóng góp

Mọi đóng góp đều được chào đón! Hãy tạo issue hoặc pull request nếu bạn muốn cải thiện extension.

## Giấy phép

[MIT License](LICENSE)