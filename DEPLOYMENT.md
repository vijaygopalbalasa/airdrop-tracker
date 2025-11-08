# 🌐 Deployment Guide

This guide covers multiple FREE deployment options for your Web3 Opportunity Aggregator.

## 📋 Before You Deploy

Make sure you have:
- ✅ Your Telegram Bot Token from @BotFather
- ✅ Configured `config/sources.json` with your channels
- ✅ Tested locally and everything works

---

## 🚂 Option 1: Railway (Recommended - Easiest)

Railway offers 500 hours/month free (about 20 days).

### Steps:

1. **Create Railway Account**
   - Go to [railway.app](https://railway.app)
   - Sign up with GitHub

2. **Deploy from GitHub**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Connect your repository
   - Select `airdrop-tracker` repo

3. **Configure Environment Variables**
   - Go to your project settings
   - Click "Variables"
   - Add:
     ```
     TELEGRAM_BOT_TOKEN=your_bot_token_here
     PORT=3000
     NODE_ENV=production
     ```

4. **Deploy**
   - Railway will automatically build and deploy
   - You'll get a URL like `your-app.railway.app`

5. **Add Bot to Telegram Channels**
   - Make sure your bot is added as admin to all Telegram channels

### Pros:
- ✅ Super easy setup
- ✅ Automatic deployments from GitHub
- ✅ Free tier is generous
- ✅ Built-in database persistence

### Cons:
- ⚠️ Free tier has limits (500 hours/month)

---

## 🎨 Option 2: Render

Render offers free web services with some limitations.

### Steps:

1. **Create Render Account**
   - Go to [render.com](https://render.com)
   - Sign up with GitHub

2. **Create New Web Service**
   - Click "New +"
   - Select "Web Service"
   - Connect your repository

3. **Configure Service**
   - Name: `web3-opportunity-tracker`
   - Environment: `Node`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Instance Type: `Free`

4. **Add Environment Variables**
   - Click "Environment" tab
   - Add:
     ```
     TELEGRAM_BOT_TOKEN=your_bot_token_here
     NODE_ENV=production
     ```

5. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment (5-10 minutes)

### Pros:
- ✅ Completely free tier
- ✅ Auto-deploy from GitHub
- ✅ SSL included

### Cons:
- ⚠️ Free tier spins down after 15 minutes of inactivity
- ⚠️ Database might not persist between restarts

**Solution**: Use a free cron service to ping your app every 14 minutes:
- Use [cron-job.org](https://cron-job.org)
- Set up a job to visit your Render URL every 14 minutes

---

## 💻 Option 3: Run on Your Local Machine 24/7

If you have a computer/laptop that runs 24/7 or a Raspberry Pi.

### Steps:

1. **Install PM2** (Process Manager)
   ```bash
   npm install -g pm2
   ```

2. **Start Application**
   ```bash
   cd airdrop-tracker
   pm2 start src/index.js --name web3-tracker
   ```

3. **Save PM2 Configuration**
   ```bash
   pm2 save
   ```

4. **Enable Auto-Start on Boot**
   ```bash
   pm2 startup
   # Follow the instructions it gives you
   ```

5. **Useful PM2 Commands**
   ```bash
   pm2 list                    # List all apps
   pm2 logs web3-tracker       # View logs
   pm2 restart web3-tracker    # Restart app
   pm2 stop web3-tracker       # Stop app
   pm2 delete web3-tracker     # Remove app
   ```

### Access from Other Devices:

To access the dashboard from your phone/tablet:

1. Find your local IP:
   ```bash
   # On Mac/Linux:
   ifconfig | grep "inet "

   # On Windows:
   ipconfig
   ```

2. Open `http://YOUR_LOCAL_IP:3000` on any device on same network

### Pros:
- ✅ 100% free
- ✅ Full control
- ✅ No monthly limits
- ✅ Persistent database

### Cons:
- ⚠️ Requires your computer to run 24/7
- ⚠️ Not accessible from outside your network (unless you set up port forwarding)

---

## ☁️ Option 4: Oracle Cloud (Free Forever Tier)

Oracle offers a "forever free" tier with a VPS.

### Steps:

1. **Create Oracle Cloud Account**
   - Go to [oracle.com/cloud/free](https://www.oracle.com/cloud/free/)
   - Sign up (requires credit card but won't charge)

2. **Create VM Instance**
   - Go to Compute > Instances
   - Create Instance
   - Select "Always Free Eligible" shape
   - Choose Ubuntu 22.04

3. **SSH into Instance**
   ```bash
   ssh ubuntu@YOUR_VM_IP
   ```

4. **Install Node.js**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

5. **Clone and Setup**
   ```bash
   git clone <your-repo>
   cd airdrop-tracker
   npm install
   cp .env.example .env
   nano .env  # Add your TELEGRAM_BOT_TOKEN
   ```

6. **Install PM2 and Start**
   ```bash
   sudo npm install -g pm2
   pm2 start src/index.js --name web3-tracker
   pm2 startup
   pm2 save
   ```

7. **Open Firewall Port**
   ```bash
   sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 3000 -j ACCEPT
   sudo netfilter-persistent save
   ```

8. **Access Dashboard**
   - Visit `http://YOUR_VM_IP:3000`

### Pros:
- ✅ Truly free forever
- ✅ Persistent VPS
- ✅ No time limits
- ✅ Good performance

### Cons:
- ⚠️ More complex setup
- ⚠️ Requires basic Linux knowledge

---

## 🐳 Option 5: Docker (Any Cloud Provider)

If you prefer Docker deployment.

### Create Dockerfile:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
```

### Create docker-compose.yml:

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
      - NODE_ENV=production
    volumes:
      - ./data:/app/data
      - ./config:/app/config
    restart: unless-stopped
```

### Deploy:

```bash
docker-compose up -d
```

---

## 📊 Monitoring Your Deployment

### Set Up Uptime Monitoring (Free):

1. **UptimeRobot** ([uptimerobot.com](https://uptimerobot.com))
   - Free monitoring for up to 50 monitors
   - Get alerts if your app goes down
   - Monitor: `http://your-app-url/api/health`

2. **Better Stack** ([betterstack.com](https://betterstack.com))
   - Free tier available
   - Beautiful dashboard

### Set Up Logs:

For Railway/Render:
- Built-in logging in dashboard

For VPS/Local:
```bash
pm2 logs web3-tracker
```

For Docker:
```bash
docker-compose logs -f
```

---

## 🔒 Security Best Practices

1. **Never commit `.env` file**
   - Always use environment variables
   - Keep bot tokens secret

2. **Use HTTPS in production**
   - Railway/Render provide this automatically
   - For VPS, use Nginx + Let's Encrypt

3. **Regular Updates**
   ```bash
   git pull
   npm install
   pm2 restart web3-tracker
   ```

---

## 🆘 Deployment Troubleshooting

### App Won't Start:

1. Check logs:
   ```bash
   pm2 logs web3-tracker  # For PM2
   # or
   docker-compose logs    # For Docker
   ```

2. Verify environment variables:
   - Make sure `TELEGRAM_BOT_TOKEN` is set
   - Check for typos

### Database Issues:

- Ensure `data/` directory has write permissions:
  ```bash
  chmod 755 data/
  ```

### Port Already in Use:

- Change PORT in `.env`:
  ```env
  PORT=3001
  ```

### Can't Access Dashboard:

1. Check firewall rules
2. Verify app is running: `pm2 list`
3. Check if port is open: `curl http://localhost:3000/api/health`

---

## 🎯 Recommended Setup

**For Beginners**: Railway
- Easiest setup
- Auto-deploy from GitHub
- Great free tier

**For Advanced Users**: Oracle Cloud Free Tier
- Free forever
- Full control
- Best performance

**For Developers**: Local with PM2
- Fastest development
- No deployment needed
- Free

---

## 📞 Need Help?

If you encounter issues:
1. Check the logs first
2. Verify all environment variables
3. Make sure bot is added to Telegram channels
4. Open a GitHub issue with details

---

**Choose your deployment method and get started! 🚀**
