# Quick Deployment Reference

## 🚀 Quick Start

### 1. Environment Setup

Copy the environment template:
```bash
cp env.template .env
```

Edit `.env` with your credentials.

### 2. Docker Deployment (Recommended)

```bash
# Start everything
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop
docker-compose down
```

### 3. GitHub Webhook for Dockploy

1. **In Dockploy**: Copy webhook URL and secret
2. **In GitHub**: Settings → Webhooks → Add webhook
   - URL: `https://your-dockploy-domain.com/api/webhooks/github`
   - Secret: (from Dockploy)
   - Events: "Just the push event"
3. **Push to deploy**:
   ```bash
   git push origin main
   ```

## 📚 Full Documentation

- **General Deployment**: See [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Dockploy Setup**: See [DOCKPLOY_SETUP.md](./DOCKPLOY_SETUP.md)
- **Database Config**: See [config/database.config.js](./config/database.config.js)

## 🔑 Required Environment Variables

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=inhouse_management
JWT_SECRET=your_jwt_secret_min_32_chars
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 📦 Files Created

- `Dockerfile` - Container build configuration
- `docker-compose.yml` - Multi-container setup
- `.dockerignore` - Docker build exclusions
- `.github/workflows/deploy.yml` - GitHub Actions workflow
- `config/database.config.js` - Master database config
- `env.template` - Environment variables template

## 🆘 Need Help?

Check the troubleshooting sections in:
- [DEPLOYMENT.md](./DEPLOYMENT.md)
- [DOCKPLOY_SETUP.md](./DOCKPLOY_SETUP.md)


