# Deployment Guide - Making YardHop Public

This guide will walk you through deploying your YardHop application to make it publicly accessible with your own domain.

## Table of Contents
1. [Deployment Options](#deployment-options)
2. [Domain Acquisition](#domain-acquisition)
3. [Recommended: Deploy to Railway/Render (Easy)](#recommended-easy-deployment)
4. [Advanced: VPS Deployment](#advanced-vps-deployment)
5. [Domain Configuration](#domain-configuration)
6. [Production Environment Setup](#production-environment-setup)
7. [Post-Deployment Checklist](#post-deployment-checklist)

---

## Deployment Options

### Option 1: Platform-as-a-Service (Easiest) ⭐ Recommended
- **Railway** (railway.app) - Free tier, auto-deploys from GitHub
- **Render** (render.com) - Free tier, easy setup
- **Fly.io** (fly.io) - Global edge deployment
- **DigitalOcean App Platform** - Simple, managed

### Option 2: Serverless (For Frontend + API Routes)
- **Vercel** (vercel.com) - Excellent for React apps
- **Netlify** (netlify.com) - Easy deployments

### Option 3: VPS (Full Control)
- **DigitalOcean Droplet** - $4-12/month
- **Linode** - $5/month
- **AWS EC2** - Pay-as-you-go
- **Google Cloud Compute** - $300 free credit

---

## Domain Acquisition

### Step 1: Choose a Domain Registrar
Popular options:
- **Namecheap** (recommended - user-friendly)
- **Google Domains** (now Squarespace)
- **Cloudflare** (cheapest, best security)
- **GoDaddy** (common but pricier)

### Step 2: Search and Purchase Domain
1. Go to your chosen registrar
2. Search for your desired domain (e.g., `yardhop.com`, `getyardhop.com`)
3. Purchase the domain (typically $10-15/year for .com)
4. Complete the purchase

### Step 3: Wait for DNS Propagation
- Usually takes 1-48 hours
- You'll configure DNS after deploying your app

---

## Recommended: Easy Deployment (Railway/Render)

### Railway Deployment (Recommended)

#### Step 1: Prepare Your Code
```bash
# Make sure your code is on GitHub
cd /Users/maganali/Downloads/yardhop
git init  # if not already initialized
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/yardhop.git
git push -u origin main
```

#### Step 2: Deploy to Railway
1. Go to [railway.app](https://railway.app) and sign up
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your yardhop repository
4. Railway will auto-detect Node.js and start building

#### Step 3: Add Environment Variables
In Railway dashboard, go to "Variables" tab and add:

```env
NODE_ENV=production
PORT=3000

# Supabase (get from your Supabase project)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Gemini AI (get from Google AI Studio)
GEMINI_API_KEY=your-gemini-api-key

# Stripe (get from Stripe dashboard)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# CORS (your domain - add after you get it)
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

#### Step 4: Configure Build & Start Commands
In Railway, go to Settings → Deploy:
- **Build Command**: `cd frontend && npm install && npm run build`
- **Start Command**: `npm start`

#### Step 5: Get Your Railway URL
Railway will give you a URL like: `your-app.up.railway.app`

---

### Render Deployment (Alternative)

1. Go to [render.com](https://render.com) and sign up
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: yardhop
   - **Environment**: Node
   - **Build Command**: `cd frontend && npm install && npm run build && cd ..`
   - **Start Command**: `npm start`
5. Add environment variables (same as Railway above)
6. Click "Create Web Service"

---

## Domain Configuration

### Step 1: Point Domain to Railway/Render

#### For Railway:
1. In Railway dashboard, go to your service → Settings → Domains
2. Click "Custom Domain"
3. Enter your domain (e.g., `yardhop.com`)
4. Railway will give you DNS records to add

#### For Render:
1. In Render dashboard, go to your service → Settings → Custom Domains
2. Add your domain
3. Render will give you DNS records

### Step 2: Configure DNS Records

Go to your domain registrar's DNS settings and add:

**For Railway:**
```
Type: CNAME
Name: @ (or www)
Value: your-app.up.railway.app
```

**For Render:**
```
Type: CNAME
Name: @ (or www)
Value: your-app.onrender.com
```

**For Both (SSL/HTTPS):**
```
Type: A
Name: @
Value: 76.76.21.21 (or provider's IP)
```

**For www subdomain:**
```
Type: CNAME
Name: www
Value: your-app.up.railway.app (or onrender.com)
```

### Step 3: Update Environment Variables
After your domain is live, update CORS in Railway/Render:
```env
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

### Step 4: Wait for SSL Certificate
- Railway/Render automatically provisions SSL certificates (HTTPS)
- Takes 5-60 minutes
- Your site will be available at `https://yourdomain.com`

---

## Production Environment Setup

### Required Environment Variables

Create a `.env.production` file or set in your hosting platform:

```env
# Server
NODE_ENV=production
PORT=3000

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Google Gemini AI
GEMINI_API_KEY=AIza...

# Stripe (Production keys from Stripe Dashboard)
STRIPE_SECRET_KEY=sk_live_51...
STRIPE_PUBLISHABLE_KEY=pk_live_51...
STRIPE_WEBHOOK_SECRET=whsec_...

# CORS - Your production domain
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

### Update Frontend Environment Variables

Your frontend needs to know the production API URL. Update `frontend/lib/api.ts` or create `frontend/.env.production`:

```env
VITE_API_URL=https://yourdomain.com
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

---

## Advanced: VPS Deployment

If you prefer full control, deploy to a VPS:

### Step 1: Create a VPS
- DigitalOcean: Create a "Droplet" (Ubuntu 22.04, $6/month minimum)
- Linode: Create an instance ($5/month)

### Step 2: Connect to VPS
```bash
ssh root@your-server-ip
```

### Step 3: Install Dependencies
```bash
# Update system
apt update && apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install PM2
npm install -g pm2

# Install Nginx (for reverse proxy)
apt install -y nginx
```

### Step 4: Deploy Your Code
```bash
# Clone your repo
cd /var/www
git clone https://github.com/YOUR_USERNAME/yardhop.git
cd yardhop

# Install dependencies
npm install --legacy-peer-deps
cd frontend && npm install && npm run build && cd ..

# Create .env file
nano .env
# (paste your production environment variables)
```

### Step 5: Configure Nginx
```bash
nano /etc/nginx/sites-available/yardhop
```

Add:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site:
```bash
ln -s /etc/nginx/sites-available/yardhop /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

### Step 6: Install SSL Certificate (Let's Encrypt)
```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### Step 7: Start Your App
```bash
cd /var/www/yardhop
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Follow instructions to enable auto-start on reboot
```

### Step 8: Configure Domain DNS
In your domain registrar, add A record:
```
Type: A
Name: @
Value: your-server-ip
```

---

## Post-Deployment Checklist

- [ ] All environment variables are set in production
- [ ] Domain DNS records are configured correctly
- [ ] SSL certificate is active (HTTPS working)
- [ ] Site loads at `https://yourdomain.com`
- [ ] API endpoints are accessible
- [ ] Authentication/login works
- [ ] Database connection is working
- [ ] Stripe payments are configured (if using)
- [ ] AI features are working (Gemini API)
- [ ] CORS is configured for your domain
- [ ] Update Supabase URL settings if needed
- [ ] Test all major features (create listing, search, etc.)
- [ ] Monitor logs for errors
- [ ] Set up monitoring (optional: Sentry, LogRocket)

---

## Getting Your API Keys

### Supabase Keys
1. Go to [supabase.com](https://supabase.com)
2. Select your project
3. Go to Settings → API
4. Copy `Project URL` and `anon/public` key
5. Copy `service_role` key (keep secret!)

### Google Gemini API Key
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create API key
3. Copy the key

### Stripe Keys
1. Go to [stripe.com](https://stripe.com) dashboard
2. Get API keys from Developers → API keys
3. Use **Live keys** for production (not test keys)
4. Set up webhook endpoint: `https://yourdomain.com/api/payments/webhook`

---

## Troubleshooting

### Domain not resolving?
- Wait 24-48 hours for DNS propagation
- Check DNS with: `dig yourdomain.com` or `nslookup yourdomain.com`
- Verify DNS records are correct in registrar

### SSL certificate issues?
- Make sure DNS is pointing correctly
- Wait 10-60 minutes for certificate provisioning
- Check platform's SSL status

### App not starting?
- Check environment variables are set
- View logs: `pm2 logs` (VPS) or platform logs
- Verify all API keys are valid

### CORS errors?
- Update `CORS_ORIGIN` and `ALLOWED_ORIGINS` env vars
- Include both `yourdomain.com` and `www.yourdomain.com`
- Restart the server after updating

---

## Cost Estimate

**Minimum Setup (First Year):**
- Domain: $10-15/year
- Railway/Render: Free tier (or $5-7/month for production)
- **Total: ~$10-15 for first year** (free tier) or **~$70-90/year** (paid)

**VPS Setup:**
- Domain: $10-15/year
- VPS: $60-144/year ($5-12/month)
- **Total: ~$70-160/year**

---

## Next Steps

1. **Choose deployment platform** (Railway recommended for ease)
2. **Purchase domain** from Namecheap/Cloudflare
3. **Push code to GitHub**
4. **Deploy to platform**
5. **Configure domain DNS**
6. **Update environment variables**
7. **Test everything!**

Good luck! 🚀


