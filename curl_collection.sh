#!/bin/bash
# ============================================================
#  IT Ticket API — cURL Collection
#  Base URL: http://localhost:5000
#  Thay TOKEN=<...> bằng token thật sau khi login/register
# ============================================================

BASE="http://localhost:5000/api"
TOKEN="PASTE_YOUR_TOKEN_HERE"

echo ""
echo "========================================"
echo "  IT Ticket API — cURL Collection"
echo "========================================"

# ────────────────────────────────────────────
# 1. AUTH
# ────────────────────────────────────────────

echo ""
echo "──── [1] AUTH ────"

# 1.1 Register
echo ""
echo "→ 1.1 Register (POST /api/auth/register)"
curl -s -X POST "$BASE/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Nguyen Van A",
    "email": "nguyenvana@example.com",
    "password": "password123"
  }' | python3 -m json.tool 2>/dev/null || echo "(install python3 for pretty-print)"

# 1.2 Login
echo ""
echo "→ 1.2 Login (POST /api/auth/login)"
curl -s -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "nguyenvana@example.com",
    "password": "password123"
  }' | python3 -m json.tool 2>/dev/null

# ────────────────────────────────────────────
# 2. DEPARTMENTS  (cần token)
# ────────────────────────────────────────────

echo ""
echo "──── [2] DEPARTMENTS (yêu cầu Bearer Token) ────"

# 2.1 Lấy danh sách department
echo ""
echo "→ 2.1 Get all departments (GET /api/departments)"
curl -s -X GET "$BASE/departments" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool 2>/dev/null

# 2.2 Tạo department (admin / manager)
echo ""
echo "→ 2.2 Create department (POST /api/departments) [admin/manager]"
curl -s -X POST "$BASE/departments" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "IT Support",
    "officeLocation": "Floor 3, Building A"
  }' | python3 -m json.tool 2>/dev/null

# 2.3 Lấy department theo ID
echo ""
echo "→ 2.3 Get department by ID (GET /api/departments/:id)"
DEPT_ID="PASTE_DEPARTMENT_ID_HERE"
curl -s -X GET "$BASE/departments/$DEPT_ID" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool 2>/dev/null

# 2.4 Cập nhật department (admin / manager)
echo ""
echo "→ 2.4 Update department (PUT /api/departments/:id) [admin/manager]"
curl -s -X PUT "$BASE/departments/$DEPT_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "IT Support & Infrastructure",
    "officeLocation": "Floor 4, Building B"
  }' | python3 -m json.tool 2>/dev/null

# 2.5 Xóa department (admin only)
echo ""
echo "→ 2.5 Delete department (DELETE /api/departments/:id) [admin only]"
curl -s -X DELETE "$BASE/departments/$DEPT_ID" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool 2>/dev/null

# ────────────────────────────────────────────
# 3. TICKETS  (cần token)
# ────────────────────────────────────────────

echo ""
echo "──── [3] TICKETS (yêu cầu Bearer Token) ────"

# 3.1 Tạo ticket (mọi role)
echo ""
echo "→ 3.1 Create ticket (POST /api/tickets)"
curl -s -X POST "$BASE/tickets" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"title\": \"Máy tính không bật được\",
    \"description\": \"Bấm nút nguồn không có phản hồi\",
    \"priority\": \"high\",
    \"department\": \"$DEPT_ID\"
  }" | python3 -m json.tool 2>/dev/null

# 3.2 Lấy danh sách ticket (có pagination & sorting)
echo ""
echo "→ 3.2 Get all tickets — page 1, limit 5, sort by priority asc"
echo "   (GET /api/tickets?page=1&limit=5&sortBy=priority&order=asc)"
curl -s -X GET "$BASE/tickets?page=1&limit=5&sortBy=priority&order=asc" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool 2>/dev/null

# 3.3 Lấy ticket theo ID
echo ""
echo "→ 3.3 Get ticket by ID (GET /api/tickets/:id)"
TICKET_ID="PASTE_TICKET_ID_HERE"
curl -s -X GET "$BASE/tickets/$TICKET_ID" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool 2>/dev/null

# 3.4 Cập nhật ticket
echo ""
echo "→ 3.4 Update ticket (PUT /api/tickets/:id)"
curl -s -X PUT "$BASE/tickets/$TICKET_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "status": "in-progress",
    "priority": "medium"
  }' | python3 -m json.tool 2>/dev/null

# 3.5 Xóa ticket (admin / manager)
echo ""
echo "→ 3.5 Delete ticket (DELETE /api/tickets/:id) [admin/manager]"
curl -s -X DELETE "$BASE/tickets/$TICKET_ID" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool 2>/dev/null

echo ""
echo "========================================"
echo "  Done!"
echo "========================================"
