# Inhouse Management & Work Monitoring System

A comprehensive internal management system for monitoring tasks, work performance, attendance, and department-specific metrics.

## Features

- **Universal Login System**: Single login portal with role-based dashboard routing
- **Employee Management**: Admin creates and manages employee profiles
- **Attendance & Time Logging**: Automatic login/logout tracking with weekly hours reports
- **Leave Management**: Apply, approve, and track leaves
- **Task Management**: Create tasks, subtasks, assign developers, track progress
- **Tech Department Monitoring**: Task execution, progress tracking, comments, reports
- **Logistics Department**: Order status tracking, RTO metrics, daily statistics
- **Digital Marketing**: Leads tracking, ROAS, traffic monitoring
- **Design & Social Media**: YouTube vlogs and Instagram posts tracking
- **NDA System**: Mandatory NDA acceptance on first login
- **Performance & Rating**: Task ratings, monthly performance scores
- **Reporting**: Excel export capabilities (to be implemented)

## Tech Stack

- **Frontend**: Next.js 16 (JavaScript + JSX only, no TypeScript)
- **Backend**: Next.js API Routes
- **Database**: MySQL (direct SQL queries, no ORM)
- **Styling**: Tailwind CSS
- **Charts**: Chart.js with react-chartjs-2
- **Authentication**: JWT tokens with bcrypt password hashing

## Prerequisites

- Node.js 18+ installed
- MySQL 8.0+ installed and running
- npm or yarn package manager

## Installation

1. **Clone or navigate to the project directory**
   ```bash
   cd bharatagrolink-management-system
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up MySQL database**
   - Create a new MySQL database:
     ```sql
     CREATE DATABASE inhouse_management;
     ```
   - Run the schema file to create all tables:
     ```bash
     mysql -u root -p inhouse_management < database/schema.sql
     ```

4. **Configure environment variables**
   - Create a `.env.local` file in the root directory:
     ```env
     # Database Configuration
     DB_HOST=localhost
     DB_USER=root
     DB_PASSWORD=your_mysql_password
     DB_NAME=inhouse_management

     # JWT Secret (change this to a secure random string)
     JWT_SECRET=your_super_secret_jwt_key_change_this_in_production

     # Session Configuration
     SESSION_TIMEOUT=3600000
     INACTIVITY_TIMEOUT=1800000

     # App Configuration
     NEXT_PUBLIC_APP_URL=http://localhost:3000
     ```

5. **Create initial Super Admin user**
   - You'll need to manually insert a Super Admin user into the database:
     ```sql
     INSERT INTO users (name, email, password, role, is_active)
     VALUES ('Super Admin', 'admin@example.com', '$2a$10$YourHashedPasswordHere', 'Super Admin', 1);
     ```
   - To generate a password hash, you can use Node.js:
     ```javascript
     const bcrypt = require('bcryptjs');
     const hash = await bcrypt.hash('your_password', 10);
     console.log(hash);
     ```

## Running the Application

1. **Start the development server**
   ```bash
   npm run dev
   ```

2. **Open your browser**
   - Navigate to `http://localhost:3000`
   - You'll be redirected to the login page

3. **Login with Super Admin credentials**
   - Use the email and password you created in the database

## User Roles

The system supports the following roles:

- **Super Admin**: Full system access
- **Admin**: Employee management, task creation, all dashboards
- **HR**: Employee management, attendance, leaves, reports
- **Manager**: Task management, team oversight, reports
- **Backend Developer**: View assigned tasks, submit reports
- **Frontend Developer**: View assigned tasks, submit reports
- **AI/ML Developer**: View assigned tasks, submit reports
- **App Developer**: View assigned tasks, submit reports
- **Digital Marketing**: Marketing dashboard, leads, ads, traffic
- **Logistics**: Logistics dashboard, order management
- **Design & Content Team**: YouTube and Instagram content tracking

## Project Structure

```
bharatagrolink-management-system/
├── database/
│   └── schema.sql              # MySQL database schema
├── lib/
│   ├── db.js                   # Database connection utility
│   └── auth.js                 # Authentication utilities
├── src/
│   ├── app/
│   │   ├── api/                # API routes
│   │   │   ├── auth/           # Authentication APIs
│   │   │   ├── employees/      # Employee management APIs
│   │   │   ├── tasks/          # Task management APIs
│   │   │   ├── attendance/     # Attendance APIs
│   │   │   ├── leaves/         # Leave management APIs
│   │   │   ├── logistics/      # Logistics APIs
│   │   │   ├── marketing/      # Marketing APIs
│   │   │   └── design/         # Design & Social Media APIs
│   │   ├── dashboard/          # Dashboard pages
│   │   ├── login/              # Login page
│   │   └── nda/                # NDA acceptance page
│   ├── components/
│   │   └── DashboardLayout.js  # Main dashboard layout
│   └── ...
├── middleware.js                # Next.js middleware for auth
└── package.json
```

## Key Features Implementation

### Authentication
- JWT-based authentication
- Secure password hashing with bcrypt
- Session management with cookies
- Auto-logout on inactivity (30 minutes)

### Task Management
- Create tasks with priority levels
- Assign multiple developers
- Create subtasks
- Automatic progress calculation based on subtasks
- Comments and discussions
- Report submission (cannot be rejected once submitted)

### Attendance
- Automatic login time tracking
- Manual logout or auto-logout
- Weekly hours calculation
- Attendance reports

### Logistics
- Order status tracking (confirmed, dispatched, out for delivery, delivered, RTO)
- Daily statistics aggregation
- RTO percentage calculation
- Time period filters (today, yesterday, week, month, custom)

### Digital Marketing
- Lead tracking by channel (Facebook, Instagram, Google)
- ROAS (Return on Ad Spend) tracking
- Conversion percentage
- Traffic monitoring

### Design & Social Media
- YouTube vlog tracking (views, subscriber impact)
- Instagram posts, reels, and banners tracking
- View and follow metrics

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/check` - Check authentication status

### Employees
- `GET /api/employees` - Get all employees
- `POST /api/employees` - Create new employee (Admin only)
- `GET /api/employees/[id]` - Get employee by ID
- `PUT /api/employees/[id]` - Update employee
- `DELETE /api/employees/[id]` - Delete employee (soft delete)

### Tasks
- `GET /api/tasks` - Get tasks (filtered by role)
- `POST /api/tasks` - Create task (Admin/Manager only)
- `GET /api/tasks/[id]` - Get task details
- `PUT /api/tasks/[id]` - Update task
- `POST /api/tasks/[id]/comments` - Add comment
- `POST /api/tasks/[id]/reports` - Submit report
- `PUT /api/tasks/[id]/subtasks` - Update subtask

### Attendance
- `GET /api/attendance` - Get attendance records

### Leaves
- `GET /api/leaves` - Get leaves
- `POST /api/leaves` - Apply for leave
- `POST /api/leaves/[id]/approve` - Approve/reject leave

### Logistics
- `GET /api/logistics/orders` - Get orders
- `POST /api/logistics/orders` - Create/update order
- `GET /api/logistics/stats` - Get statistics

### Marketing
- `GET /api/marketing/leads` - Get leads
- `POST /api/marketing/leads` - Create/update lead
- `GET /api/marketing/ads` - Get ads
- `POST /api/marketing/ads` - Create/update ad
- `GET /api/marketing/traffic` - Get traffic data
- `POST /api/marketing/traffic` - Create/update traffic

### Design
- `GET /api/design/youtube` - Get YouTube vlogs
- `POST /api/design/youtube` - Create YouTube vlog
- `GET /api/design/instagram` - Get Instagram posts
- `POST /api/design/instagram` - Create Instagram post

## Development Notes

- All API routes use direct SQL queries (no ORM)
- Password hashing uses bcryptjs
- JWT tokens stored in HTTP-only cookies
- Role-based access control implemented in API routes
- Inactivity timeout: 30 minutes
- Session timeout: 24 hours

## Future Enhancements

- Excel export for all reports
- PDF report generation
- File upload for task reports
- Email notifications
- Real-time updates with WebSockets
- Advanced analytics and insights
- Mobile app support

## Troubleshooting

### Database Connection Issues
- Verify MySQL is running
- Check database credentials in `.env.local`
- Ensure database `inhouse_management` exists
- Verify all tables are created (run schema.sql)

### Authentication Issues
- Clear browser cookies
- Verify JWT_SECRET is set in `.env.local`
- Check token expiration settings

### Build Issues
- Delete `node_modules` and `.next` folder
- Run `npm install` again
- Clear npm cache: `npm cache clean --force`

## License

This is an internal management system. All rights reserved.

## Support

For issues or questions, contact the development team.
