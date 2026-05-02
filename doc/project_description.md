# Dự án IT Ticketing System API

Đây là tài liệu mô tả tổng quan về dự án, bao gồm cấu trúc dữ liệu, cơ chế phân quyền, quy chuẩn mã lỗi và cách thức hoạt động của các tính năng chung như phân trang, sắp xếp.

---

## 1. Các Model và Cấu trúc dữ liệu chính

Hệ thống xoay quanh 3 thực thể chính:

### **User (Người dùng)**
Đại diện cho nhân viên công ty, những người dùng hệ thống để gửi yêu cầu hỗ trợ hoặc xử lý yêu cầu.
* **Trường dữ liệu:**
  * `name`: Tên nhân viên.
  * `email`: Email đăng nhập (duy nhất).
  * `password`: Mật khẩu (được mã hóa bằng bcrypt).
  * `role`: Vai trò trong hệ thống (gồm `admin`, `manager`, `employee`). Mặc định là `employee`.
  * `department`: Tham chiếu đến ID của Department (phòng ban mà nhân viên trực thuộc).

### **Department (Phòng ban)**
Đại diện cho các phòng ban trong công ty.
* **Trường dữ liệu:**
  * `name`: Tên phòng ban (VD: IT Support, HR, Sales).
  * `officeLocation`: Vị trí phòng ban (VD: Floor 3, Building A).

### **Ticket (Yêu cầu hỗ trợ)**
Yêu cầu hỗ trợ kỹ thuật do nhân viên gửi lên.
* **Trường dữ liệu:**
  * `title`: Tiêu đề yêu cầu.
  * `description`: Mô tả chi tiết vấn đề.
  * `status`: Trạng thái xử lý (`open`, `in-progress`, `resolved`, `closed`). Mặc định: `open`.
  * `priority`: Độ ưu tiên (`low`, `medium`, `high`). Mặc định: `medium`.
  * `department`: Tham chiếu đến phòng ban sẽ xử lý (VD: IT Department).
  * `employee`: Tham chiếu đến User đã tạo ticket này.

---

## 2. Phân quyền (Role-based Access Control - RBAC)

Hệ thống có 3 role: `admin`, `manager`, `employee`. Mỗi role có quyền hạn khác nhau trên từng API.

### **Authentication (Xác thực)**
* `POST /api/auth/register`: Public (Ai cũng có thể đăng ký). *Lưu ý: Mặc định role là `employee`, có thể truyền role lên nếu muốn.*
* `POST /api/auth/login`: Public (Ai cũng có thể đăng nhập).

### **Departments API**
| API | Quyền truy cập | Mô tả |
| :--- | :--- | :--- |
| `GET /api/departments` | **All roles** | Xem danh sách các phòng ban. |
| `GET /api/departments/:id` | **All roles** | Xem chi tiết một phòng ban. |
| `POST /api/departments` | **admin, manager** | Thêm mới một phòng ban. |
| `PUT /api/departments/:id` | **admin, manager** | Cập nhật thông tin phòng ban. |
| `DELETE /api/departments/:id` | **admin** | Chỉ admin mới có quyền xóa phòng ban. |

### **Tickets API**
Cơ chế kiểm tra quyền truy cập trên Ticket kết hợp cả **Role** và **Quyền sở hữu (Ownership)**.

| API | Quyền truy cập & Xử lý |
| :--- | :--- |
| `POST /api/tickets` | **All roles**: Ai cũng có thể tạo ticket. Khi tạo, hệ thống tự động lấy ID của người dùng từ Token gán vào trường `employee` của ticket. |
| `GET /api/tickets` | **All roles**: <br/>- Nếu là `employee`: Chỉ nhìn thấy danh sách các ticket **của chính mình**.<br/>- Nếu là `admin` hoặc `manager`: Nhìn thấy **toàn bộ** ticket trên hệ thống. |
| `GET /api/tickets/:id` | **All roles**: <br/>- Nếu là `employee`: Nếu cố gắng mở ID ticket của người khác -> Báo lỗi `403 Forbidden`. |
| `PUT /api/tickets/:id` | **All roles**: <br/>- `employee` chỉ được cập nhật ticket của chính mình.<br/>- `admin`, `manager` cập nhật được mọi ticket. |
| `DELETE /api/tickets/:id`| **admin, manager**: Chỉ có cấp quản lý mới được quyền xóa ticket khỏi hệ thống. |

---

## 3. Quy chuẩn Mã lỗi (HTTP Status Codes)

Hệ thống trả về các mã lỗi chuẩn của HTTP để báo hiệu trạng thái của Request. Mỗi response (thành công hoặc thất bại) đều có chung một cấu trúc JSON: `{ status, message, data }`.

* **`200 OK`**: Yêu cầu (GET, PUT, DELETE) thực hiện thành công.
* **`201 Created`**: Tạo mới bản ghi thành công (dùng cho POST register, tạo ticket, tạo department).
* **`400 Bad Request`**: Dữ liệu gửi lên không hợp lệ, thiếu trường bắt buộc, ID gửi lên sai định dạng của MongoDB, validation thất bại.
* **`401 Unauthorized`**: Lỗi xác thực. Nguyên nhân có thể do chưa truyền Token vào Header, Token bị sai, Token đã hết hạn, hoặc đăng nhập sai email/password.
* **`403 Forbidden`**: Cấm truy cập. Đã đăng nhập hợp lệ nhưng **không có quyền** thực hiện hành động này. VD: Employee cố gắng xóa Ticket, hoặc Employee sửa Ticket của người khác.
* **`404 Not Found`**: Không tìm thấy tài nguyên (User, Ticket, Department không tồn tại với ID tương ứng).
* **`500 Internal Server Error`**: Lỗi hệ thống, lỗi kết nối Database, code phát sinh exception chưa được bắt...

---

## 4. Phân trang và Sắp xếp (Pagination & Sorting)

Các API lấy ra danh sách (như `GET /api/tickets`, `GET /api/departments`) được tích hợp chức năng phân trang và sắp xếp thông qua **Query Parameters**.

**Các tham số Query params hỗ trợ:**
* `page` (Mặc định `1`): Trang hiện tại muốn lấy.
* `limit` (Mặc định `10`): Số lượng bản ghi trả về trên một trang.
* `sortBy` (Mặc định `createdAt`): Trường dữ liệu dùng để sắp xếp (có thể truyền `priority`, `status`, `title`...).
* `order` (Mặc định `desc` / `-1`): Thứ tự sắp xếp. Có thể truyền `asc` để sắp xếp tăng dần.

**Ví dụ:** `GET /api/tickets?page=2&limit=5&sortBy=priority&order=asc`
*(Sẽ lấy trang 2, mỗi trang 5 phần tử, sắp xếp theo thứ tự priority tăng dần).*

**Cấu trúc dữ liệu trả về khi phân trang:**
Data trả về không phải là mảng ngay lập tức, mà là một object chứa siêu dữ liệu (metadata):
```json
{
  "status": 200,
  "message": "Success",
  "data": {
    "total": 45,       // Tổng số lượng bản ghi thỏa mãn điều kiện
    "page": 2,         // Trang hiện tại
    "limit": 5,        // Limit cấu hình
    "tickets": [ ... ] // Dữ liệu của danh sách trong trang này
  }
}
```
