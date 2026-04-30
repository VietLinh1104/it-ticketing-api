# SKILL: Enterprise IT Support Ticketing System (Topic 3)
> Internet and Web Services – Spring 2026 | Node.js + Express.js + MongoDB

---

## Tổng quan dự án

Xây dựng RESTful API backend cho hệ thống quản lý ticket hỗ trợ IT nội bộ. Nhân viên đăng nhập để tạo ticket gửi đến các phòng ban IT. Danh sách ticket phải được phân trang và sắp xếp theo priority.

**Tech stack bắt buộc:** Node.js, Express.js, MongoDB (Mongoose), bcryptjs, jsonwebtoken

---

## Điểm số & Tiêu chí

| Tiêu chí | Điểm |
|---|---|
| Database Modeling (3 schemas đúng kiểu dữ liệu + validation) | 1.5 |
| Controller Logic (CRUD đầy đủ cho mọi entity) | 3.0 |
| Routing & Error Handling (HTTP methods + try/catch + status codes) | 1.5 |
| Authentication & Data Ownership (protect middleware + 401/403) | 2.0 |
| Pagination & Sorting (limit/skip + .sort()) | 2.0 |
| **Tổng** | **10.0** |

---

## Cấu trúc Response Wrapper (Bắt buộc)

Tất cả các API response trả về phải tuân thủ cấu trúc wrapper bao gồm `status`, `message`, và `data`:

**Thành công (Success):**
```json
{
  "status": 200, // HTTP status code
  "message": "Thông báo thành công",
  "data": { ... } // Dữ liệu trả về (object, array...)
}
```

**Thất bại (Error):**
```json
{
  "status": 400, // HTTP status code
  "message": "Thông báo lỗi chi tiết",
  "data": null
}
```

---

## Cấu trúc thư mục (bắt buộc theo MVC)

```
it-ticketing-api/
├── models/
│   ├── User.js
│   ├── Department.js
│   └── Ticket.js
├── controllers/
│   ├── authController.js
│   ├── departmentController.js
│   └── ticketController.js
├── routes/
│   ├── authRoutes.js
│   ├── departmentRoutes.js
│   └── ticketRoutes.js
├── middleware/
│   ├── protect.js
│   └── authorize.js       ← MỚI: kiểm tra role
├── .env
├── server.js
└── package.json
```

---

## Database Models

### 1. User.js

```js
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  email:    { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role:     { type: String, enum: ['admin', 'manager', 'employee'], default: 'employee' }, // ← MỚI
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
```

> **Thiết kế Role:**
> | Role | Quyền hạn |
> |---|---|
> | `admin` | Toàn quyền trên tất cả resource |
> | `manager` | Quản lý department và ticket |
> | `employee` | Chỉ tạo và quản lý ticket của chính mình |

### 2. Department.js

```js
const mongoose = require('mongoose');

const DepartmentSchema = new mongoose.Schema({
  name:           { type: String, required: true },
  officeLocation: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Department', DepartmentSchema);
```

### 3. Ticket.js

```js
const mongoose = require('mongoose');

const TicketSchema = new mongoose.Schema({
  issueTitle:  { type: String, required: true },
  description: { type: String },
  status:   { type: String, enum: ['pending', 'resolved'], default: 'pending' },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'low' },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
  employee:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

module.exports = mongoose.model('Ticket', TicketSchema);
```

> **Lưu ý:** `status` và `priority` phải dùng `enum` để Mongoose tự validate giá trị hợp lệ.

---

## Middleware

### middleware/protect.js

```js
const jwt  = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) return res.status(401).json({ status: 401, message: 'Unauthorized – no token', data: null });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    next();
  } catch (err) {
    res.status(401).json({ status: 401, message: 'Unauthorized – token invalid', data: null });
  }
};

module.exports = protect;
```

### middleware/authorize.js ← MỚI

> **Quan trọng:** Phải dùng SAU `protect` vì cần `req.user.role` đã được gán.

```js
const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      status: 403,
      message: 'Forbidden – insufficient permissions',
      data: null
    });
  }
  next();
};

module.exports = authorize;
```

---

## Controllers

### controllers/authController.js

```js
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const User   = require('../models/User');

// POST /api/auth/register
exports.registerEmployee = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const salt   = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);
    const user   = await User.create({ name, email, password: hashed });
    const token  = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.status(201).json({ status: 201, message: 'Register successful', data: { token } });
  } catch (err) {
    res.status(400).json({ status: 400, message: err.message, data: null });
  }
};

// POST /api/auth/login
exports.loginEmployee = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ status: 404, message: 'User not found', data: null });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ status: 401, message: 'Invalid credentials', data: null });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.status(200).json({ status: 200, message: 'Login successful', data: { token } });
  } catch (err) {
    res.status(500).json({ status: 500, message: err.message, data: null });
  }
};
```

---

### controllers/departmentController.js

> Department routes yêu cầu **Authentication** (`protect`) và **Authorization** (`authorize`):
> - GET: tất cả roles
> - POST / PUT: `admin`, `manager`
> - DELETE: chỉ `admin`

```js
const Department = require('../models/Department');

// POST /api/departments  [admin, manager]
exports.createDepartment = async (req, res) => {
  try {
    const dept = await Department.create(req.body);
    res.status(201).json({ status: 201, message: 'Department created', data: dept });
  } catch (err) { res.status(400).json({ status: 400, message: err.message, data: null }); }
};

// GET /api/departments  [all roles]
exports.getDepartments = async (req, res) => {
  try {
    const page   = parseInt(req.query.page)  || 1;
    const limit  = parseInt(req.query.limit) || 10;
    const skip   = (page - 1) * limit;
    const sortBy = req.query.sortBy || 'createdAt';
    const order  = req.query.order === 'asc' ? 1 : -1;

    const depts = await Department.find()
      .sort({ [sortBy]: order })
      .skip(skip)
      .limit(limit);

    const total = await Department.countDocuments();
    res.status(200).json({ status: 200, message: 'Success', data: { total, page, limit, departments: depts } });
  } catch (err) { res.status(500).json({ status: 500, message: err.message, data: null }); }
};

// GET /api/departments/:id  [all roles]
exports.getDepartmentById = async (req, res) => {
  try {
    const dept = await Department.findById(req.params.id);
    if (!dept) return res.status(404).json({ status: 404, message: 'Department not found', data: null });
    res.status(200).json({ status: 200, message: 'Success', data: dept });
  } catch (err) { res.status(500).json({ status: 500, message: err.message, data: null }); }
};

// PUT /api/departments/:id  [admin, manager]
exports.updateDepartment = async (req, res) => {
  try {
    const dept = await Department.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!dept) return res.status(404).json({ status: 404, message: 'Department not found', data: null });
    res.status(200).json({ status: 200, message: 'Department updated', data: dept });
  } catch (err) { res.status(400).json({ status: 400, message: err.message, data: null }); }
};

// DELETE /api/departments/:id  [admin only]
exports.deleteDepartment = async (req, res) => {
  try {
    const dept = await Department.findByIdAndDelete(req.params.id);
    if (!dept) return res.status(404).json({ status: 404, message: 'Department not found', data: null });
    res.status(200).json({ status: 200, message: 'Department deleted', data: null });
  } catch (err) { res.status(500).json({ status: 500, message: err.message, data: null }); }
};
```

---

### controllers/ticketController.js

> Tất cả Ticket routes đều **Protected**. `getTickets` bắt buộc có Pagination + Sorting.
> Phân quyền ticket theo role:
> - `employee`: chỉ thấy / sửa ticket của chính mình
> - `admin`, `manager`: thấy và quản lý tất cả ticket

```js
const Ticket = require('../models/Ticket');

// POST /api/tickets  [all roles]
exports.createTicket = async (req, res) => {
  try {
    // Tự động gán employee từ token đã giải mã
    const ticket = await Ticket.create({ ...req.body, employee: req.user.id });
    res.status(201).json({ status: 201, message: 'Ticket created', data: ticket });
  } catch (err) { res.status(400).json({ status: 400, message: err.message, data: null }); }
};

// GET /api/tickets  [protected + pagination + sorting]
// Query params: ?page=1&limit=10&sortBy=priority&order=asc
exports.getTickets = async (req, res) => {
  try {
    const page   = parseInt(req.query.page)  || 1;
    const limit  = parseInt(req.query.limit) || 10;
    const skip   = (page - 1) * limit;               // Công thức bắt buộc
    const sortBy = req.query.sortBy || 'createdAt';
    const order  = req.query.order === 'asc' ? 1 : -1;

    // employee chỉ thấy ticket của mình; admin/manager thấy tất cả
    const filter = req.user.role === 'employee' ? { employee: req.user.id } : {};

    const tickets = await Ticket.find(filter)
      .sort({ [sortBy]: order })
      .skip(skip)
      .limit(limit);

    const total = await Ticket.countDocuments(filter);
    res.status(200).json({ status: 200, message: 'Success', data: { total, page, limit, tickets } });
  } catch (err) { res.status(500).json({ status: 500, message: err.message, data: null }); }
};

// GET /api/tickets/:id  [protected + populate]
exports.getTicketById = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate('department', 'name officeLocation')
      .populate('employee',   'name email');
    if (!ticket) return res.status(404).json({ status: 404, message: 'Ticket not found', data: null });

    // employee chỉ được xem ticket của mình
    if (req.user.role === 'employee' && ticket.employee._id.toString() !== req.user.id)
      return res.status(403).json({ status: 403, message: 'Forbidden – not your ticket', data: null });

    res.status(200).json({ status: 200, message: 'Success', data: ticket });
  } catch (err) { res.status(500).json({ status: 500, message: err.message, data: null }); }
};

// PUT /api/tickets/:id  [protected + data ownership]
exports.updateTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ status: 404, message: 'Ticket not found', data: null });

    // employee chỉ được sửa ticket của mình; admin/manager được sửa tất cả
    if (req.user.role === 'employee' && ticket.employee.toString() !== req.user.id)
      return res.status(403).json({ status: 403, message: 'Forbidden – not your ticket', data: null });

    const updated = await Ticket.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json({ status: 200, message: 'Ticket updated', data: updated });
  } catch (err) { res.status(400).json({ status: 400, message: err.message, data: null }); }
};

// DELETE /api/tickets/:id  [admin, manager only]
exports.deleteTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ status: 404, message: 'Ticket not found', data: null });

    await ticket.deleteOne();
    res.status(200).json({ status: 200, message: 'Ticket deleted', data: null });
  } catch (err) { res.status(500).json({ status: 500, message: err.message, data: null }); }
};
```

---

## Routes

### routes/authRoutes.js

```js
const express = require('express');
const router  = express.Router();
const { registerEmployee, loginEmployee } = require('../controllers/authController');

router.post('/register', registerEmployee);
router.post('/login',    loginEmployee);

module.exports = router;
```

### routes/departmentRoutes.js

```js
const express    = require('express');
const router     = express.Router();
const protect    = require('../middleware/protect');
const authorize  = require('../middleware/authorize');
const {
  createDepartment, getDepartments, getDepartmentById,
  updateDepartment, deleteDepartment
} = require('../controllers/departmentController');

router.route('/')
  .get(protect, getDepartments)                                         // all roles
  .post(protect, authorize('admin', 'manager'), createDepartment);      // admin, manager

router.route('/:id')
  .get(protect, getDepartmentById)                                      // all roles
  .put(protect, authorize('admin', 'manager'), updateDepartment)        // admin, manager
  .delete(protect, authorize('admin'), deleteDepartment);               // admin only

module.exports = router;
```

### routes/ticketRoutes.js

```js
const express    = require('express');
const router     = express.Router();
const protect    = require('../middleware/protect');
const authorize  = require('../middleware/authorize');
const {
  createTicket, getTickets, getTicketById,
  updateTicket, deleteTicket
} = require('../controllers/ticketController');

router.route('/')
  .get(protect, getTickets)           // all roles (filter by role in controller)
  .post(protect, createTicket);       // all roles

router.route('/:id')
  .get(protect, getTicketById)        // all roles (filter by role in controller)
  .put(protect, updateTicket)         // all roles (filter by role in controller)
  .delete(protect, authorize('admin', 'manager'), deleteTicket); // admin, manager

module.exports = router;
```

---

## server.js

```js
const express    = require('express');
const mongoose   = require('mongoose');
require('dotenv').config();

const app = express();
app.use(express.json());

// Routes
app.use('/api/auth',        require('./routes/authRoutes'));
app.use('/api/departments', require('./routes/departmentRoutes'));
app.use('/api/tickets',     require('./routes/ticketRoutes'));

// Connect DB & start server
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(process.env.PORT || 5000, () =>
      console.log(`Server running on port ${process.env.PORT || 5000}`)
    );
  })
  .catch(err => console.error(err));
```

### .env

```
MONGO_URI=mongodb://localhost:27017/it-ticketing
JWT_SECRET=your_secret_key_here
PORT=5000
```

### package.json dependencies

```json
{
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "dotenv": "^16.0.0",
    "express": "^4.18.0",
    "jsonwebtoken": "^9.0.0",
    "mongoose": "^7.0.0"
  }
}
```

---

## HTTP Status Codes cần dùng

| Code | Tình huống |
|---|---|
| 200 | GET / PUT / DELETE thành công |
| 201 | POST tạo mới thành công |
| 400 | Dữ liệu đầu vào không hợp lệ |
| 401 | Không có token / token sai |
| 403 | Có token nhưng không phải owner |
| 404 | Không tìm thấy resource |
| 500 | Lỗi server không xác định |

---

## Các lỗi thường gặp cần tránh

1. **Quên `.toString()` khi so sánh ObjectId**
   ```js
   // SAI
   if (ticket.employee !== req.user.id)
   // ĐÚNG
   if (ticket.employee.toString() !== req.user.id)
   ```

2. **Quên gán `employee: req.user.id` khi tạo ticket**
   ```js
   // Phải spread req.body và override employee
   const ticket = await Ticket.create({ ...req.body, employee: req.user.id });
   ```

3. **Sai thứ tự `.sort().skip().limit()`** – phải đúng thứ tự này.

4. **Không dùng `{ new: true }` trong `findByIdAndUpdate`** – sẽ trả về document cũ.

5. **Không hash password trước khi lưu** – phải `bcrypt.hash()` trong controller register.

---

## Checklist nộp bài

- [ ] Cấu trúc đúng: `models/`, `controllers/`, `routes/`, `middleware/`
- [ ] Áp dụng đúng cấu trúc response wrapper (status, message, data) cho toàn bộ API
- [ ] User model với bcryptjs hash password và field `role` (enum: admin/manager/employee)
- [ ] JWT trả về sau register & login
- [ ] `protect` middleware kiểm tra Bearer token → 401 nếu thiếu/sai
- [ ] `authorize` middleware kiểm tra role → 403 nếu không đủ quyền
- [ ] Department: đủ 5 CRUD endpoints, có protect + authorize theo role
- [ ] `createTicket` tự gán `employee: req.user.id`
- [ ] `getTickets` có `limit`, `skip`, `sort` (Pagination + Sorting); filter theo role
- [ ] `getTicketById` dùng `.populate()` để embed department; employee chỉ xem ticket của mình
- [ ] `updateTicket` kiểm tra role: employee chỉ sửa ticket của mình
- [ ] `deleteTicket` chỉ cho admin/manager (dùng `authorize` ở route)
- [ ] `try...catch` đầy đủ và đúng HTTP status codes