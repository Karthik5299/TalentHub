# TalentHub — Complete Postman Testing Guide

## Prerequisites
1. MongoDB running locally (`mongod`) or Atlas URI in `.env`
2. `.env` file created from `.env.example`
3. `npm install && npm run dev` — server on port 5000
4. Postman imported: `TalentHub.postman_collection.json`

---

## STEP 0 — Environment Setup in Postman

Before testing, verify your collection variables:
- `base_url` = `http://localhost:5000`
- `token` = (will be auto-filled after login)
- All other IDs start empty (auto-filled by test scripts)

---

## STEP 1 — Health Check

**GET** `{{base_url}}/api/health`

Expected response:
```json
{
  "success": true,
  "message": "TalentHub API is running",
  "environment": "development",
  "timestamp": "2025-..."
}
```

---

## STEP 2 — Auth: Bootstrap (First Admin)

**POST** `{{base_url}}/api/auth/bootstrap`
```json
{
  "name": "Super Admin",
  "email": "admin@talenthub.com",
  "password": "Admin@1234"
}
```

✅ Expected: `201` — Admin created  
❌ Run again: `403` — System already initialised  

---

## STEP 3 — Auth: Login

**POST** `{{base_url}}/api/auth/login`
```json
{
  "email": "admin@talenthub.com",
  "password": "Admin@1234"
}
```

✅ Expected: `200` with `accessToken`  
⚡ The test script auto-saves token to `{{token}}`  

**Test wrong password:**
```json
{ "email": "admin@talenthub.com", "password": "WrongPass" }
```
❌ Expected: `401 Invalid email or password`

**Test after 5 wrong passwords:**
❌ Expected: `423 Account locked. Try again in 15 minute(s).`

---

## STEP 4 — Auth: Get My Profile

**GET** `{{base_url}}/api/auth/me`  
Headers: `Authorization: Bearer {{token}}`

✅ Expected: `200` with user object

---

## STEP 5 — Departments: Create (×3 for variety)

**POST** `{{base_url}}/api/departments`
```json
{ "name": "Engineering", "code": "ENG", "description": "Software Engineering" }
```
⚡ Auto-saves `deptId`

Create 2 more:
```json
{ "name": "Human Resources", "code": "HR", "description": "People Operations" }
{ "name": "Finance", "code": "FIN", "description": "Accounting and Finance" }
```

**Test duplicate name:**
```json
{ "name": "Engineering", "code": "ENG2" }
```
❌ Expected: `400 Department "Engineering" already exists.`

---

## STEP 6 — Departments: Get All / Get One / Update / Delete

**GET** `{{base_url}}/api/departments`  
✅ Expected: `200` with departments array + total

**GET** `{{base_url}}/api/departments/{{deptId}}`  
✅ Expected: `200` with department + empty employees array

**PUT** `{{base_url}}/api/departments/{{deptId}}`
```json
{ "description": "Backend, Frontend and DevOps Engineering" }
```
✅ Expected: `200` updated

**DELETE** `{{base_url}}/api/departments/{{deptId}}`  
✅ Expected: `200` deleted (only works if no active employees)

> ⚠️ Re-create Engineering dept after deleting (need deptId for employees)

---

## STEP 7 — Employees: Create (×3)

**POST** `{{base_url}}/api/employees`
```json
{
  "firstName": "Arjun",
  "lastName": "Sharma",
  "email": "arjun@company.com",
  "phone": "+91 98765 43210",
  "department": "{{deptId}}",
  "position": "Senior Engineer",
  "salary": 95000,
  "joiningDate": "2024-01-15",
  "status": "active"
}
```
⚡ Auto-saves `employeeId`

Create 2 more:
```json
{
  "firstName": "Priya",
  "lastName": "Nair",
  "email": "priya@company.com",
  "phone": "+91 98765 43211",
  "department": "{{deptId}}",
  "position": "Frontend Developer",
  "salary": 80000,
  "joiningDate": "2024-03-01",
  "status": "active"
}
```
```json
{
  "firstName": "Rahul",
  "lastName": "Verma",
  "email": "rahul@company.com",
  "phone": "+91 98765 43212",
  "department": "{{deptId}}",
  "position": "DevOps Engineer",
  "salary": 88000,
  "joiningDate": "2024-06-01",
  "status": "active"
}
```

**Test duplicate email:**
```json
{ ..., "email": "arjun@company.com", ... }
```
❌ Expected: `400 An employee with this email already exists.`

**Test missing required fields:**
```json
{ "firstName": "Test" }
```
❌ Expected: `422 Validation failed` with field errors

---

## STEP 8 — Employees: List / Search / Stats / Profile

**GET** `{{base_url}}/api/employees?page=1&limit=10`  
✅ Expected: `200` with pagination

**GET** `{{base_url}}/api/employees?search=Arjun`  
✅ Expected: `200` filtered results

**GET** `{{base_url}}/api/employees?status=active`  
✅ Expected: `200` active only

**GET** `{{base_url}}/api/employees/stats`  
✅ Expected: `200` with total, active, payroll totals, byDepartment, recentHires

**GET** `{{base_url}}/api/employees/{{employeeId}}`  
✅ Expected: `200` single employee + userAccount (null until linked)

**GET** `{{base_url}}/api/employees/{{employeeId}}/profile`  
✅ Expected: `200` full profile with attendance/leave/payroll summary

---

## STEP 9 — Employees: Update & Offboard

**PUT** `{{base_url}}/api/employees/{{employeeId}}`
```json
{ "position": "Lead Engineer", "salary": 110000 }
```
✅ Expected: `200` updated

**DELETE** `{{base_url}}/api/employees/{{employeeId}}`  
✅ Expected: `200 Employee offboarded` (status → terminated)

> ⚠️ Employee still in DB as "terminated". Re-create for further testing.

---

## STEP 10 — Auth: Register Employee User

**POST** `{{base_url}}/api/auth/register`
```json
{
  "name": "Arjun Sharma",
  "email": "arjun.user@talenthub.com",
  "password": "Employee@1234",
  "role": "employee"
}
```
⚡ Auto-saves `userId`  
✅ Expected: `201` user created (no token returned — admin action)

**Test invalid password (no uppercase):**
```json
{ "name": "Test", "email": "test@co.com", "password": "lowercase1" }
```
❌ Expected: `422` password validation error

---

## STEP 11 — Auth: Link Employee to User

**PUT** `{{base_url}}/api/auth/link-employee`
```json
{
  "userId": "{{userId}}",
  "employeeId": "{{employeeId}}"
}
```
✅ Expected: `200` — user now has employeeId populated

Now check employee profile again:  
**GET** `{{base_url}}/api/employees/{{employeeId}}`  
✅ Expected: userAccount now shows linked user

---

## STEP 12 — Auth: Manage Users

**GET** `{{base_url}}/api/auth/users`  
✅ Expected: `200` all users

**PUT** `{{base_url}}/api/auth/users/{{userId}}/toggle`  
✅ Expected: `200 User account deactivated`  
Run again → `200 User account activated`

---

## STEP 13 — Attendance: Clock In

**POST** `{{base_url}}/api/attendance/clock-in`
```json
{ "employeeId": "{{employeeId}}" }
```
✅ Expected: `201` clocked in (status = present or late)

**Test clocking in twice:**  
Same request again  
❌ Expected: `400 Arjun has already clocked in today`

**Test invalid employee:**
```json
{ "employeeId": "000000000000000000000000" }
```
❌ Expected: `404 Employee not found`

---

## STEP 14 — Attendance: Today's View

**GET** `{{base_url}}/api/attendance/today`  
✅ Expected: `200` with records, activeStaff, completed, stats

---

## STEP 15 — Attendance: Clock Out

**POST** `{{base_url}}/api/attendance/clock-out`
```json
{ "employeeId": "{{employeeId}}" }
```
✅ Expected: `200` clocked out with workHours calculated

**Test clocking out twice:**  
❌ Expected: `400 Already clocked out today`

---

## STEP 16 — Attendance: History & Pulse

**GET** `{{base_url}}/api/attendance/history?page=1&limit=20`  
✅ Expected: `200` paginated records

**GET** `{{base_url}}/api/attendance/history?employeeId={{employeeId}}`  
✅ Expected: `200` filtered by employee

**GET** `{{base_url}}/api/attendance/monthly-pulse?year=2025&month=3`  
✅ Expected: `200` daily breakdown for chart

---

## STEP 17 — Attendance: Mark Absent

**POST** `{{base_url}}/api/attendance/mark-absent`
```json
{ "employeeId": "{{employeeId}}", "date": "2025-01-15" }
```
✅ Expected: `200` marked absent for that date

---

## STEP 18 — Leaves: Check Stats First

**GET** `{{base_url}}/api/leaves/stats`  
✅ Expected: `200` `{ pending:0, approved:0, declined:0, total:0 }`

---

## STEP 19 — Leaves: Apply

**POST** `{{base_url}}/api/leaves`
```json
{
  "employeeId": "{{employeeId}}",
  "leaveType": "annual",
  "startDate": "2025-06-10",
  "endDate": "2025-06-14",
  "reason": "Family vacation trip"
}
```
⚡ Auto-saves `leaveId`  
✅ Expected: `201` totalDays: 5

**Test overlapping dates:**
```json
{
  "employeeId": "{{employeeId}}",
  "leaveType": "sick",
  "startDate": "2025-06-12",
  "endDate": "2025-06-16",
  "reason": "Overlap test"
}
```
❌ Expected: `409 A leave application already exists overlapping these dates`

**Test end before start:**
```json
{ ..., "startDate": "2025-06-14", "endDate": "2025-06-10", ... }
```
❌ Expected: `400 endDate cannot be before startDate`

**Test invalid leaveType:**
```json
{ ..., "leaveType": "vacation", ... }
```
❌ Expected: `400 leaveType must be one of: annual, sick, maternity...`

---

## STEP 20 — Leaves: List, Get, Review

**GET** `{{base_url}}/api/leaves`  
✅ Expected: paginated list

**GET** `{{base_url}}/api/leaves?status=pending`  
✅ Expected: only pending leaves

**GET** `{{base_url}}/api/leaves/{{leaveId}}`  
✅ Expected: single leave record

**PUT** `{{base_url}}/api/leaves/{{leaveId}}/review`
```json
{ "status": "approved", "adminNote": "Enjoy your vacation!" }
```
✅ Expected: `200 Leave approved successfully`

**Try reviewing again (already approved):**  
❌ Expected: `400 Leave already approved. Only pending leaves can be reviewed.`

**Create another leave and decline:**
```json
{
  "employeeId": "{{employeeId}}",
  "leaveType": "sick",
  "startDate": "2025-07-01",
  "endDate": "2025-07-03",
  "reason": "Fever"
}
```
Then: `PUT /leaves/{{newLeaveId}}/review`
```json
{ "status": "declined", "adminNote": "Project deadline that week" }
```
✅ Expected: `200 Leave declined successfully`

---

## STEP 21 — Leaves: Cancel

Create a new pending leave, then:  
**DELETE** `{{base_url}}/api/leaves/{{leaveId}}`  
✅ Expected: `200 Leave cancelled`

**Try cancelling an approved leave:**  
❌ Expected: `400 Only pending leaves can be cancelled`

---

## STEP 22 — Kin: Create

**POST** `{{base_url}}/api/kin`
```json
{
  "employeeId": "{{employeeId}}",
  "name": "Sunita Sharma",
  "relationship": "spouse",
  "phone": "+91 98765 00001",
  "email": "sunita@email.com",
  "address": "123 MG Road, Bangalore"
}
```
⚡ Auto-saves `kinId`  
✅ Expected: `200 Emergency contact saved`

**Run same request again (upsert — should UPDATE not error):**  
✅ Expected: `200` — updates existing record

**Test invalid relationship:**
```json
{ ..., "relationship": "cousin", ... }
```
❌ Expected: `400 relationship must be one of: spouse, parent, sibling...`

---

## STEP 23 — Kin: Get All / Get by Employee

**GET** `{{base_url}}/api/kin`  
✅ Expected: `200` with kins array + missingKin array (employees without contacts)

**GET** `{{base_url}}/api/kin/employee/{{employeeId}}`  
✅ Expected: `200` single kin record

**Test non-existent employee:**  
**GET** `{{base_url}}/api/kin/employee/000000000000000000000000`  
❌ Expected: `404 No emergency contact found for this employee`

---

## STEP 24 — Kin: Delete

**DELETE** `{{base_url}}/api/kin/{{kinId}}`  
✅ Expected: `200 Emergency contact deleted`

**Delete again:**  
❌ Expected: `404 Emergency contact not found`

---

## STEP 25 — Payroll: Generate for All Employees

**POST** `{{base_url}}/api/payroll/generate`
```json
{ "month": 3, "year": 2025 }
```
⚡ Auto-saves `payrollId` (first record)  
✅ Expected: `201` with generated count, records with auto-calculated values

**Run again (already generated):**  
✅ Expected: `201` generated:0, skipped: N (all already exist)

---

## STEP 26 — Payroll: Generate for Single Employee

**POST** `{{base_url}}/api/payroll/generate`
```json
{ "month": 4, "year": 2025, "employeeId": "{{employeeId}}" }
```
✅ Expected: `201` generated:1

---

## STEP 27 — Payroll: List, Get, Summary

**GET** `{{base_url}}/api/payroll?month=3&year=2025`  
✅ Expected: paginated records with grossSalary, netSalary, deductions

**GET** `{{base_url}}/api/payroll?status=generated`  
✅ Expected: only generated (not paid) records

**GET** `{{base_url}}/api/payroll/{{payrollId}}`  
✅ Expected: single payroll with full breakdown

**GET** `{{base_url}}/api/payroll/summary?year=2025`  
✅ Expected: monthly totals array + yearTotals

**GET** `{{base_url}}/api/payroll/employee/{{employeeId}}`  
✅ Expected: all payroll records for that employee

---

## STEP 28 — Payroll: Update (Add Bonus)

**PUT** `{{base_url}}/api/payroll/{{payrollId}}`
```json
{
  "bonus": 5000,
  "otherAllowances": 1000,
  "notes": "Q1 performance bonus"
}
```
✅ Expected: `200` with recalculated grossSalary and netSalary

---

## STEP 29 — Payroll: Mark as Paid

**PUT** `{{base_url}}/api/payroll/{{payrollId}}/mark-paid`
```json
{
  "paymentMethod": "bank_transfer",
  "paidAt": "2025-03-31"
}
```
✅ Expected: `200 Payroll marked as paid` with status: "paid"

**Try to edit a paid payroll:**  
**PUT** `{{base_url}}/api/payroll/{{payrollId}}`
```json
{ "bonus": 1000 }
```
❌ Expected: `400 Cannot edit a payroll that has already been paid.`

**Try to delete a paid payroll:**  
**DELETE** `{{base_url}}/api/payroll/{{payrollId}}`  
❌ Expected: `400 Cannot delete a paid payroll record.`

---

## STEP 30 — Payroll: Delete Draft

Create a new draft payroll for a different month:
```json
{ "month": 5, "year": 2025, "employeeId": "{{employeeId}}" }
```
Then delete it:  
**DELETE** `{{base_url}}/api/payroll/{{newPayrollId}}`  
✅ Expected: `200 Payroll record deleted.`

---

## STEP 31 — Auth: Change Password

**PUT** `{{base_url}}/api/auth/change-password`
```json
{
  "currentPassword": "Admin@1234",
  "newPassword": "Admin@5678"
}
```
✅ Expected: `200 Password changed. Please log in again.`

Now login with new password to get a fresh token.

---

## STEP 32 — Security Tests

**Test without token:**  
**GET** `{{base_url}}/api/employees` (no Authorization header)  
❌ Expected: `401 No token provided.`

**Test with fake token:**  
Set Authorization: `Bearer fakejwttoken123`  
❌ Expected: `401 Invalid token.`

**Test employee role on admin route:**  
Login as employee user, then:  
**GET** `{{base_url}}/api/employees` (admin only)  
❌ Expected: `403 Access denied. Required role: admin. Your role: employee.`

**Test 404:**  
**GET** `{{base_url}}/api/nonexistent`  
❌ Expected: `404 Route GET /api/nonexistent not found.`

---

## Summary Checklist

| Module         | Routes | Tested |
|----------------|--------|--------|
| Health         | 1      | ☐      |
| Auth           | 9      | ☐      |
| Departments    | 5      | ☐      |
| Employees      | 7      | ☐      |
| Attendance     | 6      | ☐      |
| Leaves         | 7      | ☐      |
| Kin            | 4      | ☐      |
| Payroll        | 8      | ☐      |
| **Total**      | **47** |        |
