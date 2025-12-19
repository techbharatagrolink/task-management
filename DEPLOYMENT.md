# Deployment Guide

This guide covers deploying the BharatAgroLink Management System using various methods including Docker, GitHub Actions, and Dockploy.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Configuration](#environment-configuration)
3. [Docker Deployment](#docker-deployment)
4. [GitHub Actions Deployment](#github-actions-deployment)
5. [Dockploy Deployment](#dockploy-deployment)
6. [Manual Deployment](#manual-deployment)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- Node.js 18+ installed
- MySQL 8.0+ (or use Docker MySQL)
- Git installed
- Docker and Docker Compose (for containerized deployment)
- PM2 (for process management, optional)

---

## Environment Configuration

### 1. Create Environment File

Copy the example environment file:

```bash
cp .env.example .env
```

### 2. Configure Database Credentials

Edit `.env` file with your database credentials:

```env
# Database Configuration
DB_HOST=localhost
DB_USER=your_db_user
DB_PASSWORD=your_secure_password
DB_NAME=inhouse_management
DB_PORT=3306

# Application
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Security
JWT_SECRET=your_super_secret_jwt_key_minimum_32_characters
SESSION_TIMEOUT=3600000
INACTIVITY_TIMEOUT=1800000
```

### 3. Database Setup

Run the database schema:

```bash
mysql -u your_db_user -p inhouse_management < database/schema.sql
```

---

## Docker Deployment

### Quick Start with Docker Compose

1. **Update environment variables in `docker-compose.yml`** or create a `.env` file:

```bash
DB_ROOT_PASSWORD=secure_root_password
DB_USER=app_user
DB_PASSWORD=secure_app_password
DB_NAME=inhouse_management
JWT_SECRET=your_jwt_secret_here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

2. **Build and start containers**:

```bash
docker-compose up -d
```

3. **Check container status**:

```bash
docker-compose ps
```

4. **View logs**:

```bash
docker-compose logs -f app
```

5. **Stop containers**:

```bash
docker-compose down
```

### Building Docker Image Manually

```bash
# Build the image
docker build -t bharatagrolink-app:latest .

# Run the container
docker run -d \
  --name bharatagrolink-app \
  -p 3000:3000 \
  --env-file .env \
  --link mysql-container:mysql \
  bharatagrolink-app:latest
```

---

## GitHub Actions Deployment

### Setup GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions, and add:

- `DEPLOY_HOST`: Your server IP address
- `DEPLOY_USER`: SSH username
- `DEPLOY_SSH_KEY`: Private SSH key
- `DEPLOY_PORT`: SSH port (default: 22)
- `DEPLOY_PATH`: Application directory path on server

### Workflow Configuration

The workflow file (`.github/workflows/deploy.yml`) will:

1. Build the application on push to `main`/`master`
2. Run tests and linting
3. Deploy to your server via SSH
4. Restart the application using PM2

### Server Setup for GitHub Actions

On your server, install:

```bash
# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
npm install -g pm2

# Clone repository
git clone https://github.com/your-username/bharatagrolink-management-system.git
cd bharatagrolink-management-system

# Install dependencies
npm ci --production

# Create PM2 ecosystem file (ecosystem.config.js)
```

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'bharatagrolink-app',
    script: 'npm',
    args: 'start',
    cwd: '/path/to/your/app',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
```

---

## Dockploy Deployment

Dockploy is a self-hosted deployment platform that uses Docker and GitHub webhooks.

### Step 1: Install Dockploy

Follow the [Dockploy installation guide](https://github.com/dockploy/dockploy) on your server.

### Step 2: Configure GitHub Webhook

1. **Go to your GitHub repository** → Settings → Webhooks → Add webhook

2. **Configure webhook**:
   - **Payload URL**: `https://your-dockploy-instance.com/api/webhooks/github`
   - **Content type**: `application/json`
   - **Secret**: (Generate a secret and add it to Dockploy)
   - **Events**: Select "Just the push event"
   - **Active**: ✓

3. **Save the webhook**

### Step 3: Create Dockploy Project

1. **Login to Dockploy** dashboard

2. **Create a new project**:
   - **Name**: `bharatagrolink-management-system`
   - **Repository**: `your-username/bharatagrolink-management-system`
   - **Branch**: `main` or `master`
   - **Dockerfile Path**: `./Dockerfile`
   - **Docker Compose**: Use `docker-compose.yml` if deploying with MySQL

3. **Configure Environment Variables** in Dockploy:
   ```
   DB_HOST=mysql
   DB_USER=app_user
   DB_PASSWORD=secure_password
   DB_NAME=inhouse_management
   DB_PORT=3306
   JWT_SECRET=your_jwt_secret
   NEXT_PUBLIC_APP_URL=https://your-domain.com
   NODE_ENV=production
   ```

4. **Configure Services** (if using docker-compose):
   - Enable "Use Docker Compose"
   - Set Compose file path: `./docker-compose.yml`

### Step 4: Deploy

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Deploy to production"
   git push origin main
   ```

2. **Monitor deployment** in Dockploy dashboard

3. **Check application logs** in Dockploy

### Step 5: Database Setup (First Time)

After first deployment, connect to MySQL container and run schema:

```bash
# Get MySQL container name
docker ps | grep mysql

# Execute schema
docker exec -i bharatagrolink-mysql mysql -u app_user -papp_password inhouse_management < database/schema.sql
```

### Dockploy Webhook Configuration Details

**Webhook URL Format**:
```
https://your-dockploy-domain.com/api/webhooks/github
```

**Webhook Secret**:
- Generate a secure random string (32+ characters)
- Add it to Dockploy project settings
- Use the same secret in GitHub webhook configuration

**Webhook Events**:
- `push`: Trigger deployment on code push
- `pull_request`: (Optional) Deploy preview environments

**Webhook Payload Example**:
```json
{
  "ref": "refs/heads/main",
  "repository": {
    "full_name": "your-username/bharatagrolink-management-system"
  }
}
```

---

## Manual Deployment

### 1. Clone Repository

```bash
git clone https://github.com/your-username/bharatagrolink-management-system.git
cd bharatagrolink-management-system
```

### 2. Install Dependencies

```bash
npm ci --production
```

### 3. Build Application

```bash
npm run build
```

### 4. Start Application

**Using PM2**:
```bash
pm2 start npm --name "bharatagrolink-app" -- start
pm2 save
pm2 startup
```

**Using Node directly**:
```bash
NODE_ENV=production npm start
```

**Using systemd** (create `/etc/systemd/system/bharatagrolink.service`):

```ini
[Unit]
Description=BharatAgroLink Management System
After=network.target mysql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/your/app
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm start
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Then:
```bash
sudo systemctl enable bharatagrolink
sudo systemctl start bharatagrolink
```

---

## Troubleshooting

### Database Connection Issues

1. **Check database is running**:
   ```bash
   docker-compose ps mysql
   # or
   systemctl status mysql
   ```

2. **Test connection**:
   ```bash
   mysql -h localhost -u your_user -p your_database
   ```

3. **Check environment variables**:
   ```bash
   cat .env | grep DB_
   ```

### Application Won't Start

1. **Check logs**:
   ```bash
   # Docker
   docker-compose logs app
   
   # PM2
   pm2 logs bharatagrolink-app
   
   # systemd
   journalctl -u bharatagrolink -f
   ```

2. **Verify build**:
   ```bash
   npm run build
   ```

3. **Check port availability**:
   ```bash
   netstat -tulpn | grep 3000
   ```

### GitHub Webhook Not Working

1. **Check webhook delivery** in GitHub → Settings → Webhooks
2. **Verify webhook secret** matches in both GitHub and Dockploy
3. **Check Dockploy logs** for incoming webhook requests
4. **Test webhook manually** using curl:
   ```bash
   curl -X POST https://your-dockploy-domain.com/api/webhooks/github \
     -H "Content-Type: application/json" \
     -H "X-GitHub-Event: push" \
     -d '{"ref":"refs/heads/main","repository":{"full_name":"your-username/repo"}}'
   ```

### Docker Issues

1. **Rebuild containers**:
   ```bash
   docker-compose down
   docker-compose build --no-cache
   docker-compose up -d
   ```

2. **Check container health**:
   ```bash
   docker-compose ps
   docker inspect bharatagrolink-app | grep Health
   ```

3. **View detailed logs**:
   ```bash
   docker-compose logs --tail=100 app
   ```

---

## Security Checklist

- [ ] Change default JWT_SECRET to a strong random string
- [ ] Use strong database passwords
- [ ] Enable SSL/TLS for database connections in production
- [ ] Set up firewall rules (only allow necessary ports)
- [ ] Use HTTPS for NEXT_PUBLIC_APP_URL
- [ ] Regularly update dependencies: `npm audit fix`
- [ ] Set up automated backups for database
- [ ] Configure rate limiting
- [ ] Enable CORS properly
- [ ] Review and restrict file permissions

---

## Backup and Recovery

### Database Backup

```bash
# Using Docker
docker exec bharatagrolink-mysql mysqldump -u app_user -papp_password inhouse_management > backup.sql

# Manual
mysqldump -u app_user -p inhouse_management > backup.sql
```

### Restore Database

```bash
# Using Docker
docker exec -i bharatagrolink-mysql mysql -u app_user -papp_password inhouse_management < backup.sql

# Manual
mysql -u app_user -p inhouse_management < backup.sql
```

---

## Support

For deployment issues, check:
- Application logs
- Docker logs
- GitHub Actions logs
- Dockploy dashboard logs

For more information, refer to:
- [Next.js Deployment Documentation](https://nextjs.org/docs/deployment)
- [Docker Documentation](https://docs.docker.com/)
- [Dockploy Documentation](https://github.com/dockploy/dockploy)


