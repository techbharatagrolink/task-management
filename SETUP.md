# Quick Setup Guide

## Step 1: Install Dependencies
```bash
npm install
```

## Step 2: Set Up MySQL Database

1. **Create the database:**
   ```sql
   CREATE DATABASE inhouse_management;
   ```

2. **Run the schema:**
   ```bash
   mysql -u root -p inhouse_management < database/schema.sql
   ```

## Step 3: Configure Environment

Create `.env.local` file in the root directory:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=inhouse_management

JWT_SECRET=your_super_secret_jwt_key_change_this_in_production

SESSION_TIMEOUT=3600000
INACTIVITY_TIMEOUT=1800000

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Step 4: Create Super Admin User

**Option 1: Using the script (Recommended)**
```bash
node scripts/create-admin.js admin@example.com admin123 "Super Admin"
```

**Option 2: Manual SQL**
```sql
-- First, generate password hash using Node.js:
-- const bcrypt = require('bcryptjs');
-- const hash = await bcrypt.hash('your_password', 10);
-- console.log(hash);

-- Then insert:
INSERT INTO users (name, email, password, role, is_active)
VALUES ('Super Admin', 'admin@example.com', '$2a$10$YourHashedPasswordHere', 'Super Admin', 1);
```

## Step 5: Start the Application

```bash
npm run dev
```

Open `http://localhost:3000` and login with your Super Admin credentials.

## Next Steps

1. **Login as Super Admin**
2. **Create additional employees** via the Employees page
3. **Assign roles** to employees (only Admin can do this)
4. **Start creating tasks** and assigning them to developers
5. **Set up department-specific data** (logistics orders, marketing leads, etc.)

## Troubleshooting

### Database Connection Error
- Verify MySQL is running: `mysql -u root -p`
- Check credentials in `.env.local`
- Ensure database exists: `SHOW DATABASES;`

### Cannot Login
- Verify Super Admin user exists in database
- Check password hash is correct
- Clear browser cookies and try again

### Module Not Found
- Delete `node_modules` and `.next` folders
- Run `npm install` again

## Default Roles Available

- Super Admin
- Admin
- HR
- Manager
- Backend Developer
- Frontend Developer
- AI/ML Developer
- App Developer
- Digital Marketing
- Logistics
- Design & Content Team

## Important Notes

- **No signup**: Only Admin can create users
- **No role selection at login**: Roles are assigned by Admin
- **NDA required**: First-time users must accept NDA
- **Auto-logout**: 30 minutes of inactivity
- **Direct SQL**: No ORM used, all queries are native SQL

