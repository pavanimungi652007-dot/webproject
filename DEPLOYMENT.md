# Deployment Guide - Vehicle Service Booking System

## Overview
This guide covers deploying the Vehicle Service Booking System to various platforms: local, Docker, or cloud services.

---

## 1. Local Deployment (Development)

### Prerequisites
- Node.js 18+ ([download](https://nodejs.org/))
- npm or yarn

### Steps

```bash
# Navigate to project directory
cd C:\lastpro

# Install dependencies
npm install

# Run the application
npm start
```

**Access:** http://localhost:3000

**Environment Variables:**
- `PORT` – Server port (default: 3000)
- `JWT_SECRET` – JWT signing secret (default: dev-secret-key-change-in-production)
- `DATABASE_PATH` – SQLite database path (default: ./data.sqlite)
- `NODE_ENV` – Environment mode (development/production)

All variables are defined in `.env` file (copy from `.env.example` if missing).

---

## 2. Production Deployment (Local)

### Setup

```bash
# Set production environment
$env:NODE_ENV='production'
$env:JWT_SECRET='your-very-secure-random-secret-here'
$env:PORT=3000

# Install dependencies (production only)
npm install --production

# Start server
npm start
```

**Important:** 
- Change `JWT_SECRET` to a strong, random value
- Use a process manager (PM2, Forever) to keep the app running

### Using PM2 (Recommended)

```bash
# Install PM2 globally
npm install -g pm2

# Start app with PM2
pm2 start server.js --name "vehicle-booking"

# View logs
pm2 logs vehicle-booking

# Stop app
pm2 stop vehicle-booking

# Restart on boot
pm2 startup
pm2 save
```

---

## 3. Docker Deployment

### Prerequisites
- Docker ([download](https://www.docker.com/products/docker-desktop))
- Docker Compose (included with Docker Desktop)

### Quick Start

```bash
cd C:\lastpro

# Build and run container
docker-compose up --build
```

**Access:** http://localhost:3000

### Docker Commands

```bash
# Run in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop container
docker-compose down

# Rebuild after code changes
docker-compose up --build
```

### Manual Docker Commands

```bash
# Build image
docker build -t vehicle-booking .

# Run container
docker run -p 3000:3000 \
  -e JWT_SECRET="your-secret-key" \
  -e NODE_ENV="production" \
  -v "$(pwd)/data.sqlite:/app/data.sqlite" \
  vehicle-booking
```

---

## 4. Cloud Deployment

### 4.1 Render ([render.com](https://render.com))

**Easiest free tier option with persistent storage**

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

2. **Create Render Web Service**
   - Go to [render.com](https://render.com)
   - Click "Create +" → "Web Service"
   - Connect GitHub repo
   - Build command: `npm install`
   - Start command: `node server.js`
   - Environment variables:
     ```
     NODE_ENV=production
     JWT_SECRET=<generate-secure-random-string>
     PORT=3000
     ```

3. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment (2-3 minutes)
   - Your app will be live at `https://<service-name>.onrender.com`

---

### 4.2 Railway ([railway.app](https://railway.app))

**Free tier with easy GitHub integration**

1. **Push to GitHub** (same as Render)

2. **Create Railway Project**
   - Go to [railway.app](https://railway.app)
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your repo

3. **Set Variables**
   - Navigate to Variables tab
   - Add:
     ```
     NODE_ENV=production
     JWT_SECRET=<secure-random-string>
     PORT=3000
     ```

4. **Deploy**
   - Railway auto-deploys on push
   - Access via Railway dashboard URL

---

### 4.3 Heroku (Deprecated but still available)

**Note:** Heroku free tier ended Nov 2022. Use paid dyno or alternative.

```bash
# Install Heroku CLI
npm install -g heroku

# Login
heroku login

# Create app
heroku create vehicle-booking

# Set environment variables
heroku config:set JWT_SECRET="your-secret-key" NODE_ENV="production"

# Deploy
git push heroku main

# View logs
heroku logs --tail
```

---

### 4.4 AWS (EC2)

**For full control and scalability**

1. **Launch EC2 Instance**
   - Ubuntu 22.04 LTS, t3.micro (free tier eligible)
   - Security group: allow ports 80, 443, 3000

2. **Connect and Setup**
   ```bash
   sudo apt update && sudo apt upgrade -y
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt install -y nodejs git

   git clone <your-repo>
   cd lastpro
   npm install --production
   ```

3. **Run with PM2**
   ```bash
   sudo npm install -g pm2
   pm2 start server.js --name "vehicle-booking"
   pm2 startup
   pm2 save
   ```

4. **Setup Nginx Reverse Proxy**
   ```bash
   sudo apt install nginx
   sudo systemctl start nginx
   ```
   
   Edit `/etc/nginx/sites-available/default`:
   ```nginx
   server {
       listen 80 default_server;
       server_name _;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```
   
   ```bash
   sudo systemctl reload nginx
   ```

---

## 5. Environment Variables Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | Server listening port |
| `NODE_ENV` | development | Set to `production` for live |
| `JWT_SECRET` | dev-secret-key-change-in-production | JWT signing key; MUST change in production |
| `DATABASE_PATH` | ./data.sqlite | SQLite database file path |
| `ADMIN_USERNAME` | admin | Default admin username |
| `ADMIN_PASSWORD` | admin123 | Default admin password |

---

## 6. Database Backup & Migration

### Backup SQLite Database

```bash
# Copy database file
cp data.sqlite data.sqlite.backup

# Or use Docker
docker cp <container-id>:/app/data.sqlite ./backup.sqlite
```

### Migrate to PostgreSQL (Optional)

For production, consider upgrading from SQLite to PostgreSQL:

```bash
npm install pg
```

Update `server.js` to use `pg` driver. [Guide](https://www.postgresql.org/download/)

---

## 7. Monitoring & Logs

### Local
```bash
npm run dev  # With nodemon auto-reload
```

### PM2
```bash
pm2 logs vehicle-booking
pm2 monit
```

### Docker
```bash
docker-compose logs -f --tail=50
```

### Cloud (Render/Railway)
- View logs in dashboard
- Set up email alerts for errors

---

## 8. Security Checklist

- [ ] Change `JWT_SECRET` to a strong, random 32+ character string
- [ ] Change default admin credentials (`ADMIN_USERNAME`, `ADMIN_PASSWORD`)
- [ ] Enable HTTPS/SSL on production domain
- [ ] Set `NODE_ENV=production` in production
- [ ] Keep dependencies updated: `npm audit fix`
- [ ] Use `.env` file for secrets (never commit `.env` to Git)
- [ ] Add rate limiting for API endpoints (optional)
- [ ] Enable CORS only for trusted domains (optional)

---

## 9. Quick Deployment Comparison

| Method | Setup Time | Cost | Best For |
|--------|-----------|------|----------|
| Local | 5 min | $0 | Development |
| Docker Local | 10 min | $0 | Testing |
| Render | 10 min | Free tier | Small projects, learning |
| Railway | 10 min | Free tier | Small projects |
| AWS | 30 min | $5–50/mo | Production, scalability |
| Heroku | 10 min | $7+/mo | Rapid prototyping |

---

## 10. Troubleshooting

### Port Already in Use
```bash
# Find process on port 3000
netstat -ano | findstr ":3000"

# Kill process (replace PID)
taskkill /PID <PID> /F
```

### Database Locked
```bash
# Remove and reinitialize
rm data.sqlite
npm start
```

### Build Fails in Docker
```bash
# Clean and rebuild
docker-compose down
docker system prune -a
docker-compose up --build
```

### Environment Variables Not Loading
- Ensure `.env` file exists in project root
- Restart the app after changing `.env`
- Cloud platforms: set variables in dashboard, not `.env` file

---

## Support

For issues, check:
1. Server logs (console output)
2. `.env` file configuration
3. Database connectivity
4. Firewall/port permissions
5. Node.js version compatibility (18+)

---

**Last Updated:** December 2025
