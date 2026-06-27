# Deployment Guide

## Required Services

- Node.js 20 or newer
- MongoDB connection string
- A domain or subdomain for the frontend
- A domain, subdomain, or reverse proxy path for the backend API

## Backend Environment

Create `Backend/.env` from `Backend/.env.example` and set production values:

```bash
PORT=5000
NODE_ENV=production
MONGODB_URI=mongodb://your-mongo-host:27017/certverify
JWT_SECRET=use-a-long-random-secret
API_URL=https://api.your-domain.com
FRONTEND_URL=https://your-domain.com
SUPERADMIN_EMAIL=admin@your-domain.com
SUPERADMIN_PASSWORD=change-this-secure-password
SUPERADMIN_NAME=System Administrator
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@example.com
EMAIL_PASS=your-email-app-password
```

## Frontend Environment

Create `Frontend/.env` from `Frontend/.env.example`:

```bash
VITE_API_BASE_URL=https://api.your-domain.com/api
```

## cPanel / Namecheap VPS Deployment

1. Upload the project to the VPS.
2. In `Backend`, run:

```bash
npm ci --omit=dev
npm run setup-superadmin
npm start
```

3. In `Frontend`, build the static site:

```bash
npm ci
npm run build
```

4. Upload/copy the contents of `Frontend/dist` to the cPanel public document root for your frontend domain.
5. Configure cPanel Node.js App, PM2, or a reverse proxy to run `Backend/server.js`.
6. Ensure the backend API is reachable at `https://api.your-domain.com/api`.
7. Ensure `Backend/uploads` is persistent and writable by the Node.js process.

## PM2 Option

From `Backend`:

```bash
pm2 start ecosystem.config.js
pm2 save
```

## Docker Option

If Docker is available on the VPS:

```bash
docker compose up -d --build
```

Before production use, replace the example secrets in `docker-compose.yml` or move them to a secure environment file.
