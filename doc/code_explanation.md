# Giải thích cấu trúc code và luồng xử lý (Code Explanation)

Tài liệu này giải thích cách tổ chức file/folder trong hệ thống và phân tích luồng chạy của một số luồng logic quan trọng.

---

## 1. Cấu trúc thư mục (Architecture)

Project được cấu trúc theo mô hình **MVC (Model - View - Controller)** (Không có View vì đây là API Backend):

```text
/
├── server.js              # File entry-point. Khởi tạo Express, kết nối DB và định tuyến chính
├── models/                # Khai báo cấu trúc Schema của MongoDB (Mongoose)
│   ├── User.js
│   ├── Department.js
│   └── Ticket.js
├── routes/                # Định nghĩa các Endpoints API và gắn các Middlewares tương ứng
│   ├── authRoutes.js
│   ├── departmentRoutes.js
│   └── ticketRoutes.js
├── controllers/           # Nơi chứa toàn bộ logic xử lý nghiệp vụ của API
│   ├── authController.js
│   ├── departmentController.js
│   └── ticketController.js
└── middleware/            # Chứa các hàm chặn đứng giữa request và controller
    ├── protect.js         # Middleware: Kiểm tra tính hợp lệ của JWT Token
    └── authorize.js       # Middleware: Kiểm tra quyền (Role)
```

---

## 2. Luồng Xử Lý Middlewares Xác thực và Phân quyền

Để bảo vệ các API (VD: Yêu cầu đăng nhập, chỉ cho phép admin...), project sử dụng chuỗi Middleware trên Route.

### **A. Middleware Xác thực (`middleware/protect.js`)**
Chức năng: Đảm bảo Request gửi lên là của người dùng đã đăng nhập hợp lệ.

**Luồng hoạt động:**
1. Khi có request gọi vào router cần bảo vệ, hàm `protect` sẽ chạy đầu tiên.
2. Kiểm tra Header: Lấy ra trường `Authorization` có format: `Bearer <token>`.
3. Lấy `<token>` ra và sử dụng thư viện `jsonwebtoken` (`jwt.verify()`) kết hợp với `JWT_SECRET` để giải mã token.
4. Quá trình giải mã sẽ trả về Payload có chứa `id` của user.
5. Truy vấn DB (`User.findById(id)`) để lấy thông tin User (loại bỏ trường password).
6. Gán đối tượng user vừa tìm được vào object `req` (`req.user = user`). Nhờ vậy, các Controller phía sau đều có thể truy cập `req.user`.
7. Gọi `next()` để chuyển xử lý sang hàm tiếp theo.
8. Nếu token sai, hết hạn, hoặc không có -> Quăng lỗi `401 Unauthorized` ngay lập tức.

### **B. Middleware Phân quyền (`middleware/authorize.js`)**
Chức năng: Chặn không cho các Role cấp thấp truy cập API cấp cao.

**Luồng hoạt động:**
1. Thường được đặt ngay phía sau middleware `protect`. (Nghĩa là `req.user` đã tồn tại).
2. Hàm `authorize(...roles)` nhận vào một mảng các roles được cấp phép (VD: `authorize('admin', 'manager')`).
3. Nó so sánh `req.user.role` với mảng `roles` trên.
4. Nếu hợp lệ: Gọi `next()`.
5. Nếu không hợp lệ: Báo lỗi `403 Forbidden`.

---

## 3. Giải thích luồng chuẩn của một API (Ví dụ: `GET /api/tickets`)

Dưới đây là từng bước code chạy từ khi nhận Request cho tới khi trả Response:

1. **Client gửi Request:** `GET /api/tickets?page=1&limit=5&sortBy=priority` kèm Token.
2. **`server.js`:** Nhận thấy endpoint bắt đầu bằng `/api/tickets` -> Trỏ xử lý sang file `routes/ticketRoutes.js`.
3. **`ticketRoutes.js`:** 
   ```javascript
   router.route('/')
     .get(protect, getTickets) 
   ```
   Router thấy đây là HTTP GET, gọi chuỗi hàm: `protect` -> `getTickets`.
4. **Middleware `protect`:** Kiểm tra Token, xác thực thành công, gán `req.user` là một `employee` (ví dụ vậy). Gọi `next()`.
5. **Controller `getTickets` (`controllers/ticketController.js`):**
   * **Bắt tham số Query:** Đọc các biến `req.query.page`, `limit`, `sortBy`, `order` và tính toán `skip`.
   * **Filter theo Role:** Code kiểm tra `if (req.user.role === 'employee')`. Vì đúng, nó tạo ra bộ filter là `{ employee: req.user.id }`. (Nghĩa là query DB hãy tìm ticket có chủ nhân là id này thôi).
   * **Query Database:** Gọi Mongoose `Ticket.find(filter).sort(...).skip(...).limit(...)`. Đồng thời gọi thêm lệnh đếm tổng `Ticket.countDocuments(filter)` để lấy tổng số dùng cho phân trang.
   * **Trả về JSON:** Đóng gói kết quả query cùng với status 200, thông báo "Success" và dữ liệu `page`, `limit`, `total` trả về phía Client.

---

## 4. Chuẩn hóa Controller (Controller Pattern)

Toàn bộ các API trong file controllers đều được viết theo một form (mẫu) chung chuẩn mực. Điều này giúp code dễ đọc, dễ bảo trì:

1. **Khối `try / catch`:** Mọi logic thao tác tới DB được bọc trong `try`. Nếu có bất kỳ sự cố gì (ID sai định dạng, đứt kết nối DB, thuộc tính bắt buộc bị thiếu), JS tự nhảy vào `catch` và Server không bị Crash, đồng thời trả lỗi an toàn về cho người dùng qua `res.status(400)` hoặc `500`.
2. **Kiểm tra Not Found:** Hàm GetByID, Update, Delete luôn luôn kiểm tra: 
   ```javascript
   if (!data) return res.status(404).json({...})
   ```
   Nếu database không trả về kết quả, chủ động báo `404`.
3. **Chuẩn JSON Response:** Được viết theo cấu trúc JSON mở rộng thành từng dòng giúp nhìn rõ các trường.
   ```javascript
   res.status(200).json({
      status: 200,
      message: '...',
      data: ...
   });
   ```
