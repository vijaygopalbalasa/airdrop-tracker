# ⚡ Quick Start Guide

Get up and running in 5 minutes!

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Get Telegram Bot Token (FREE!)

1. Open Telegram
2. Search for `@BotFather`
3. Send: `/newbot`
4. Choose a name and username for your bot
5. **Copy the token you receive** (looks like: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

## Step 3: Create .env File

```bash
cp .env.example .env
```

Edit `.env` and paste your token:

```env
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
PORT=3000
```

## Step 4: Configure Your Sources (Optional)

The app comes with pre-configured channels and accounts. To customize:

Edit `config/sources.json`:

```json
{
  "telegram": {
    "channels": [
      "@AirdropDetective",
      "@YourChannel"
    ]
  },
  "twitter": {
    "accounts": [
      "AirdropDetect",
      "YourAccount"
    ]
  }
}
```

## Step 5: Start the App

```bash
npm start
```

You should see:

```
✅ Database initialized
✅ Telegram scraper initialized
🌐 API server running on http://localhost:3000
```

## Step 6: Add Bot to Telegram Channels

**IMPORTANT**: For Telegram monitoring to work:

1. Go to each Telegram channel in your config
2. Click channel name → Administrators
3. Add your bot as admin
4. Give it permission to "Read Messages"

## Step 7: Open Dashboard

Visit: `http://localhost:3000`

That's it! Your opportunity tracker is running! 🎉

---

## What Happens Next?

- **Telegram**: The bot will immediately start monitoring channels (if you added it as admin)
- **Twitter**: The app scrapes Twitter accounts every 30 minutes
- **Dashboard**: Auto-refreshes every 2 minutes with new opportunities

---

## Common Issues

### No opportunities showing?

- Wait a few minutes for the scrapers to collect data
- Check if you added the bot to Telegram channels as admin
- Verify `config/sources.json` has valid channels/accounts

### Telegram not working?

1. Make sure you copied the bot token correctly in `.env`
2. Ensure the bot is admin in the channels
3. Check if channels are public (start with @)

### Want to add more channels?

Just edit `config/sources.json` and the app will automatically pick them up!

---

## Next Steps

- ✅ Star the repo if you find it useful!
- ✅ Read [README.md](README.md) for full features
- ✅ Check [DEPLOYMENT.md](DEPLOYMENT.md) to deploy for free
- ✅ Customize keywords in `config/sources.json`

**Happy tracking! 🚀**
