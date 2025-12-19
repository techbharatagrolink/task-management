# Super Admin Credentials for Bharat Agrolink

## Login Credentials

**Email:** `admin@bharatagrolink.com`  
**Password:** `bharatagrolink@2024`  
**Role:** Super Admin

---

## How to Insert into Database via phpMyAdmin

### Method 1: Using the SQL File (Recommended)

1. **Generate the password hash:**
   ```bash
   cd bharatagrolink-management-system
   node scripts/generate-hash.js bharatagrolink@2024
   ```
   
   This will output the bcrypt hash and a complete SQL INSERT statement.

2. **Copy the generated SQL INSERT statement** from the output

3. **Open phpMyAdmin:**
   - Go to `http://localhost/phpmyadmin`
   - Select the `inhouse_management` database
   - Click on the "SQL" tab

4. **Paste and execute the SQL INSERT statement**

### Method 2: Direct SQL (If you have the hash)

1. Open phpMyAdmin
2. Select `inhouse_management` database
3. Click "SQL" tab
4. Paste this SQL (replace `YOUR_HASH_HERE` with the generated hash):

```sql
USE inhouse_management;

INSERT INTO users (name, email, password, role, is_active, created_at)
VALUES (
    'Super Admin',
    'admin@bharatagrolink.com',
    'YOUR_HASH_HERE',
    'Super Admin',
    1,
    NOW()
);
```

5. Click "Go" to execute

### Method 3: Using the Node.js Script

Run this command in the project directory:
```bash
node scripts/create-admin.js admin@bharatagrolink.com bharatagrolink@2024 "Super Admin"
```

---

## Verify the User Was Created

After inserting, verify by running this SQL in phpMyAdmin:

```sql
SELECT id, name, email, role, is_active, created_at 
FROM users 
WHERE email = 'admin@bharatagrolink.com';
```

You should see:
- **id:** (auto-generated number)
- **name:** Super Admin
- **email:** admin@bharatagrolink.com
- **role:** Super Admin
- **is_active:** 1
- **created_at:** (current timestamp)

---

## Login

Once the user is created, you can login at:
- **URL:** `http://localhost:3000/login`
- **Email:** `admin@bharatagrolink.com`
- **Password:** `bharatagrolink@2024`

---

## Security Note

⚠️ **Important:** Change the default password after first login for security!

---

## Troubleshooting

### If user already exists:
The create-admin.js script will update the password if the email already exists.

### If you get "Access denied":
- Make sure MySQL is running
- Check database credentials in `.env.local`
- Verify the `inhouse_management` database exists

### If password doesn't work:
- Make sure the bcrypt hash was generated correctly
- Verify the hash in the database matches the generated one
- Try regenerating the hash and updating the user

