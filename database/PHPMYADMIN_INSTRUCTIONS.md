# Quick Guide: Insert Super Admin via phpMyAdmin

## ✅ Ready-to-Use SQL File

I've created a ready-to-use SQL file: **`insert-super-admin-ready.sql`**

---

## 📋 Step-by-Step Instructions

### Step 1: Open phpMyAdmin
1. Open your browser
2. Go to: `http://localhost/phpmyadmin`
3. Login with your MySQL credentials

### Step 2: Select Database
1. Click on **`inhouse_management`** database in the left sidebar
2. If the database doesn't exist, create it first by running:
   ```sql
   CREATE DATABASE inhouse_management;
   ```

### Step 3: Execute SQL
1. Click on the **"SQL"** tab at the top
2. Open the file: `database/insert-super-admin-ready.sql`
3. **Copy the entire contents** of that file
4. **Paste it** into the SQL text area in phpMyAdmin
5. Click **"Go"** button to execute

### Step 4: Verify
After execution, you should see:
- A success message
- A table showing the created user with:
  - **name:** Super Admin
  - **email:** admin@bharatagrolink.com
  - **role:** Super Admin
  - **is_active:** 1

---

## 🔑 Login Credentials

Once inserted, you can login at `http://localhost:3000/login` with:

- **Email:** `admin@bharatagrolink.com`
- **Password:** `bharatagrolink@2024`

---

## 📝 Alternative: Copy-Paste SQL

If you prefer, copy and paste this directly into phpMyAdmin SQL tab:

```sql
USE inhouse_management;

INSERT INTO users (name, email, password, role, is_active, created_at)
VALUES (
    'Super Admin',
    'admin@bharatagrolink.com',
    '$2b$10$NwDRbCN6LBI6H1h8GP8TGuGExfhAx3LCIW.VG0Xr.7ik.k1IqpXm2',
    'Super Admin',
    1,
    NOW()
)
ON DUPLICATE KEY UPDATE
    password = VALUES(password),
    role = VALUES(role),
    is_active = 1;
```

---

## ✅ Success!

After executing, you're ready to login! 🎉

