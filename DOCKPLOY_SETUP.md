# Dockploy Deployment Setup Guide

Complete guide for deploying BharatAgroLink Management System using Dockploy with GitHub webhooks.

## What is Dockploy?

Dockploy is a self-hosted deployment platform that automates Docker-based deployments using GitHub webhooks. It provides a web interface for managing deployments and automatically builds and deploys your application when you push to GitHub.

## Prerequisites

1. **Server Requirements**:
   - Ubuntu 20.04+ or similar Linux distribution
   - Docker and Docker Compose installed
   - Minimum 2GB RAM, 20GB disk space
   - Domain name (optional but recommended)

2. **GitHub Repository**:
   - Your code pushed to GitHub
   - Admin access to repository settings

## Step 1: Install Dockploy

### Option A: Using Docker Compose (Recommended)

1. **Create a directory for Dockploy**:
   ```bash
   mkdir -p ~/dockploy
   cd ~/dockploy
   ```

2. **Create docker-compose.yml**:
   ```yaml
   version: '3.8'
   
   services:
     dockploy:
       image: dockploy/dockploy:latest
       container_name: dockploy
       restart: unless-stopped
       ports:
         - "3001:3000"  # Change port if needed
       volumes:
         - /var/run/docker.sock:/var/run/docker.sock
         - dockploy-data:/app/data
       environment:
         - NODE_ENV=production
         - DATABASE_URL=sqlite:/app/data/dockploy.db
       networks:
         - dockploy-network
   
   volumes:
     dockploy-data:
   
   networks:
     dockploy-network:
       driver: bridge
   ```

3. **Start Dockploy**:
   ```bash
   docker-compose up -d
   ```

4. **Access Dockploy**:
   - Open `http://your-server-ip:3001` in your browser
   - Complete the initial setup wizard

### Option B: Using Installation Script

```bash
curl -fsSL https://raw.githubusercontent.com/dockploy/dockploy/main/install.sh | bash
```

## Step 2: Configure Dockploy

1. **Login to Dockploy**:
   - Default credentials (change immediately):
     - Username: `admin`
     - Password: `admin`

2. **Change Admin Password**:
   - Go to Settings → User Settings
   - Update password

3. **Configure Docker**:
   - Dockploy should automatically detect Docker
   - Verify Docker connection in Settings → Docker

## Step 3: Create Project in Dockploy

1. **Navigate to Projects** → **New Project**

2. **Fill in Project Details**:
   ```
   Project Name: bharatagrolink-management-system
   Description: BharatAgroLink Management System
   Repository URL: https://github.com/your-username/bharatagrolink-management-system
   Branch: main (or master)
   ```

3. **Configure Build Settings**:
   - **Dockerfile Path**: `./Dockerfile`
   - **Docker Compose**: Enable if using docker-compose.yml
   - **Build Context**: `.` (root directory)

4. **Set Environment Variables**:
   Click "Add Environment Variable" and add:
   ```
   DB_HOST=mysql
   DB_USER=app_user
   DB_PASSWORD=your_secure_password
   DB_NAME=inhouse_management
   DB_PORT=3306
   JWT_SECRET=your_super_secret_jwt_key_minimum_32_characters
   NEXT_PUBLIC_APP_URL=https://your-domain.com
   NODE_ENV=production
   SESSION_TIMEOUT=3600000
   INACTIVITY_TIMEOUT=1800000
   ```

5. **Configure Ports**:
   - Application Port: `3000`
   - Exposed Port: `3000` (or your preferred port)

6. **Save Project**

## Step 4: Setup GitHub Webhook

### Generate Webhook Secret

1. **Generate a secure secret**:
   ```bash
   openssl rand -hex 32
   ```
   Copy this secret - you'll need it in both places.

### Configure in Dockploy

1. **Go to your project** in Dockploy
2. **Click "Webhooks"** tab
3. **Copy the Webhook URL** (e.g., `https://your-dockploy-domain.com/api/webhooks/github`)
4. **Copy the Webhook Secret** (or generate a new one)

### Configure in GitHub

1. **Go to your GitHub repository**
2. **Navigate to**: Settings → Webhooks → Add webhook

3. **Configure Webhook**:
   - **Payload URL**: 
     ```
     https://your-dockploy-domain.com/api/webhooks/github
     ```
     Or if using IP:
     ```
     http://your-server-ip:3001/api/webhooks/github
     ```
   
   - **Content type**: `application/json`
   
   - **Secret**: Paste the secret from Dockploy
   
   - **Which events**: Select "Just the push event"
   
   - **Active**: ✓ Checked

4. **Click "Add webhook"**

### Test Webhook

1. **Make a test commit**:
   ```bash
   git commit --allow-empty -m "Test webhook"
   git push origin main
   ```

2. **Check GitHub Webhook Delivery**:
   - Go to Settings → Webhooks
   - Click on your webhook
   - Check "Recent Deliveries"
   - Should show "200 OK" response

3. **Check Dockploy Dashboard**:
   - Should show deployment in progress
   - Check logs for build status

## Step 5: First Deployment

### Manual Deployment (Optional)

If webhook doesn't work initially, you can trigger manual deployment:

1. **In Dockploy**, go to your project
2. **Click "Deploy"** button
3. **Select branch**: `main` or `master`
4. **Click "Start Deployment"**

### Monitor Deployment

1. **View Build Logs**:
   - Click on deployment in Dockploy
   - View real-time build logs

2. **Check Container Status**:
   ```bash
   docker ps | grep bharatagrolink
   ```

3. **View Application Logs**:
   ```bash
   docker logs bharatagrolink-app -f
   ```

## Step 6: Database Setup

After first deployment, set up the database:

### Option A: Using Docker Compose (Recommended)

If your `docker-compose.yml` includes MySQL, it should be automatically set up. Verify:

```bash
docker exec -it bharatagrolink-mysql mysql -u app_user -p
```

### Option B: External Database

1. **Connect to your MySQL server**
2. **Create database**:
   ```sql
   CREATE DATABASE inhouse_management;
   ```

3. **Run schema**:
   ```bash
   mysql -u app_user -p inhouse_management < database/schema.sql
   ```

4. **Update environment variables** in Dockploy:
   ```
   DB_HOST=your-database-host
   DB_USER=your-database-user
   DB_PASSWORD=your-database-password
   ```

## Step 7: Configure Reverse Proxy (Optional but Recommended)

### Using Nginx

1. **Install Nginx**:
   ```bash
   sudo apt update
   sudo apt install nginx
   ```

2. **Create Nginx configuration** (`/etc/nginx/sites-available/bharatagrolink`):
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

3. **Enable site**:
   ```bash
   sudo ln -s /etc/nginx/sites-available/bharatagrolink /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

4. **Update NEXT_PUBLIC_APP_URL** in Dockploy:
   ```
   NEXT_PUBLIC_APP_URL=https://your-domain.com
   ```

### Using Caddy (Easier SSL)

1. **Install Caddy**:
   ```bash
   sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
   curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
   curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
   sudo apt update
   sudo apt install caddy
   ```

2. **Create Caddyfile** (`/etc/caddy/Caddyfile`):
   ```
   your-domain.com {
       reverse_proxy localhost:3000
   }
   ```

3. **Reload Caddy**:
   ```bash
   sudo systemctl reload caddy
   ```

## Step 8: Verify Deployment

1. **Access Application**:
   - `http://your-server-ip:3000` or
   - `https://your-domain.com`

2. **Test Login**:
   - Create Super Admin user (if not exists)
   - Login and verify functionality

3. **Check Health Endpoint**:
   ```bash
   curl http://localhost:3000/api/auth/check
   ```

## Troubleshooting

### Webhook Not Triggering

1. **Check GitHub Webhook Delivery**:
   - Settings → Webhooks → Recent Deliveries
   - Look for error messages

2. **Verify Webhook Secret**:
   - Must match in both GitHub and Dockploy

3. **Check Firewall**:
   ```bash
   sudo ufw status
   sudo ufw allow 3001/tcp  # Dockploy port
   ```

4. **Test Webhook Manually**:
   ```bash
   curl -X POST http://your-server-ip:3001/api/webhooks/github \
     -H "Content-Type: application/json" \
     -H "X-GitHub-Event: push" \
     -H "X-Hub-Signature-256: sha256=..." \
     -d '{"ref":"refs/heads/main","repository":{"full_name":"your-username/repo"}}'
   ```

### Build Failures

1. **Check Build Logs** in Dockploy
2. **Verify Dockerfile** syntax
3. **Check Environment Variables** are set correctly
4. **Verify Repository Access** (private repos need token)

### Application Not Starting

1. **Check Container Logs**:
   ```bash
   docker logs bharatagrolink-app -f
   ```

2. **Verify Database Connection**:
   - Check DB_HOST, DB_USER, DB_PASSWORD
   - Test connection manually

3. **Check Port Conflicts**:
   ```bash
   sudo netstat -tulpn | grep 3000
   ```

### Database Connection Issues

1. **Verify Environment Variables** in Dockploy
2. **Test Database Connection**:
   ```bash
   docker exec -it bharatagrolink-mysql mysql -u app_user -p
   ```

3. **Check Network Connectivity**:
   ```bash
   docker network ls
   docker network inspect dockploy-network
   ```

## Security Best Practices

1. **Change Default Passwords**:
   - Dockploy admin password
   - Database passwords
   - JWT secret

2. **Use HTTPS**:
   - Set up SSL certificate (Let's Encrypt)
   - Update NEXT_PUBLIC_APP_URL to https

3. **Firewall Configuration**:
   ```bash
   sudo ufw allow 22/tcp    # SSH
   sudo ufw allow 80/tcp    # HTTP
   sudo ufw allow 443/tcp   # HTTPS
   sudo ufw enable
   ```

4. **Regular Updates**:
   ```bash
   docker pull dockploy/dockploy:latest
   docker-compose up -d
   ```

5. **Backup Strategy**:
   - Regular database backups
   - Backup Docker volumes
   - Version control for configuration

## Maintenance

### Update Application

Simply push to GitHub - Dockploy will automatically deploy:

```bash
git add .
git commit -m "Update application"
git push origin main
```

### Update Dockploy

```bash
cd ~/dockploy
docker-compose pull
docker-compose up -d
```

### View Logs

```bash
# Dockploy logs
docker logs dockploy -f

# Application logs
docker logs bharatagrolink-app -f
```

## Support

- **Dockploy Documentation**: https://github.com/dockploy/dockploy
- **Docker Documentation**: https://docs.docker.com/
- **GitHub Webhooks**: https://docs.github.com/en/developers/webhooks-and-events/webhooks

## Quick Reference

### Important URLs

- Dockploy Dashboard: `http://your-server-ip:3001`
- Application: `http://your-server-ip:3000` or `https://your-domain.com`
- GitHub Webhook: `https://your-dockploy-domain.com/api/webhooks/github`

### Important Commands

```bash
# View running containers
docker ps

# View logs
docker logs -f container-name

# Restart application
docker restart bharatagrolink-app

# Check webhook status
curl http://your-server-ip:3001/api/webhooks/status
```


