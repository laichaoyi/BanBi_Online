# Bắn Bi Online

![Bắn Bi Online](folk-hero.jpg)

**Trò chơi bắn bi dân gian Việt Nam trong không gian 3D.**

Bắn Bi Online là dự án game do **Andy N Le** phát triển, lấy cảm hứng từ những trò chơi sân xóm tuổi thơ và nét đẹp làng quê Việt Nam xưa. Người chơi có thể vượt màn, thử sức với các kiểu bắn bi truyền thống, chơi bida Carom, bi sắt và rủ bạn bè cùng tranh tài.

Giao diện mang phong cách Việt Nam thập niên 1950 với tranh minh họa dân gian, nền giấy cổ, sân cát, bóng cây dừa, tiếng sóng biển và âm nhạc thư giãn.

[**Chơi game trên GitHub Pages**](https://laichaoyi.github.io/BanBi_Online/)

## Các chế độ chơi

| Chế độ | Cách chơi |
| --- | --- |
| Chơi đơn | Hoàn thành mục tiêu trong số lượt giới hạn, tích lũy 1–3 sao và mở khóa màn tiếp theo. |
| Bắn bi vòng tròn | Mỗi người dọn sạch cùng một thế bi. Người hoàn thành với ít cú bắn nhất thắng. |
| Bắn bi hai vạch | Bắn bi về gần vạch đích để xếp lượt, sau đó bắn trúng bi đối thủ để loại đối phương. |
| Bắn bi một lỗ | Căn lực, hướng bắn và gió để đưa bi vào lỗ trước khi được quyền ăn bi đối thủ. |
| Bắn bi sáu lỗ | Hai phe dùng bi cái trắng và đen riêng. Phe đưa nhiều bi màu có số vào lỗ hơn thắng. |
| Carom tự do | Bi cái chạm cả hai bi còn lại trong một cú đánh để ghi điểm. |
| Carom 1 băng | Chạm cả hai bi mục tiêu và dội ít nhất một băng trước lần chạm bi mục tiêu thứ hai. |
| Carom 3 băng | Chạm cả hai bi mục tiêu và dội ít nhất ba băng trước lần chạm bi mục tiêu thứ hai. |
| Bi sắt (Pétanque) | Ném bi sắt gần bi đích nhất, tích lũy điểm qua các hiệp. Phe đạt 13 điểm thắng. |

## Tính năng nổi bật

- Đồ họa 3D, mô phỏng va chạm, ma sát, lực bắn và hướng gió.
- Bối cảnh bãi biển với sân cát, cây cối, bóng đổ và âm thanh môi trường.
- Bốn thời điểm trong ngày gồm sáng, trưa, chiều và tối.
- Camera tự do, phóng to, thu nhỏ, bản đồ sân và đường ngắm hỗ trợ.
- Phòng chơi nhiều người, chat, liên kết mời bạn bè và đối thủ NPC.
- Oẳn tù tì xếp lượt, đổi chế độ và chơi lại trong cùng phòng.
- Đồng hồ 120 giây cho mỗi lượt chơi mạng.
- Chân dung người chơi tự chọn, tạo ngẫu nhiên hoặc tải ảnh riêng.
- Tiến độ chơi đơn, kỷ lục sao và bộ sưu tập bi được lưu trong trình duyệt.

## Hướng dẫn chơi

1. Chọn **Chơi** để vượt màn đơn hoặc **Chơi mạng** để vào sảnh.
2. Kéo ngược bi cái rồi thả để bắn. Có thể điều chỉnh lực bằng thanh trượt.
3. Xoay camera bằng các nút điều khiển hoặc kéo chuột phải. Dùng con lăn để phóng to, thu nhỏ.
4. Khi chơi mạng, tạo phòng hoặc nhập mã phòng để tham gia. Chủ phòng có thể bắt đầu ván đấu với NPC nếu chưa có bạn cùng chơi.
5. Mở mục **Cách chơi** để xem luật đầy đủ của từng chế độ.

## Chạy game trên máy tính

Yêu cầu [Node.js 20 trở lên](https://nodejs.org/) và trình duyệt hỗ trợ WebGL.

### Windows

Tải hoặc clone repository, sau đó chạy file `dev.bat`. Trình duyệt sẽ tự mở game.

Cũng có thể khởi động từ terminal trong thư mục dự án.

```bash
node server.js
```

Mở [http://localhost:3000](http://localhost:3000) hoặc địa chỉ được máy chủ in ra.

## Triển khai

Phiên bản v4.1 hỗ trợ GitHub Pages. Chế độ chơi đơn chạy trực tiếp trên website. Các tính năng chơi mạng cần một máy chủ Node.js công khai có HTTPS.

Để kết nối chơi mạng với GitHub Pages, triển khai `server.js`, đặt biến môi trường `PAGES_ORIGIN` thành `https://laichaoyi.github.io` và cấu hình địa chỉ máy chủ HTTPS trong `pages-config.js`.

```javascript
window.BANBI_API_ORIGIN = 'https://your-server.example.com';
```

Máy chủ sử dụng Node.js, HTTP API và bộ vật lý JavaScript. Giao diện 3D sử dụng Three.js cùng HTML, CSS và JavaScript. Phòng chơi và trận đấu đang diễn ra được lưu trong bộ nhớ của máy chủ.

## Tác giả và liên hệ

**Andy N Le — Nhà phát triển Bắn Bi Online**

Mọi thắc mắc, góp ý, báo lỗi hoặc đề xuất phát triển, xin vui lòng liên hệ:

- Email — [me@andyle.one](mailto:me@andyle.one)
- Facebook — [facebook.com/ndle2](https://www.facebook.com/ndle2)

Nếu yêu thích trò chơi, hãy tặng dự án một ngôi sao ⭐ trên GitHub để ủng hộ tác giả.

## Giấy phép

Xem [LICENSE](LICENSE) để biết điều khoản giấy phép của repository. Các thư viện và tài nguyên bên thứ ba có giấy phép hoặc ghi chú nguồn tương ứng trong các file đi kèm dự án.
