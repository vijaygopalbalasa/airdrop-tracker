# 🚀 Web3 Opportunity Aggregator

**Your personal zero-budget solution to track airdrops, hackathons, grants, and Web3 opportunities from X (Twitter) and Telegram - all in one place!**

Stop missing opportunities because of algorithm-driven feeds and information overload. This tool aggregates content from multiple platforms and uses AI-powered filtering to show you only what matters.

## ✨ Features

- 🔍 **Multi-Platform Aggregation**: Monitor X/Twitter and Telegram simultaneously
- 🤖 **AI-Powered Classification**: Automatically categorizes airdrops, hackathons, grants, bounties, etc.
- 🎯 **Priority Scoring**: High-value opportunities get priority
- 📊 **Beautiful Dashboard**: Clean, modern web interface to view all opportunities
- 🔄 **Auto-Refresh**: Continuously monitors sources for new opportunities
- 💾 **Local Database**: SQLite - no external database needed
- 🆓 **100% Free**: No API costs (uses free Telegram Bot API + Twitter scraping)
- ⚙️ **Easy Configuration**: Simple JSON file to add/remove channels and accounts

## 🎯 Problem This Solves

If you're in Web3 and facing these issues:
- Following too many channels across X, Telegram, Discord, YouTube
- Getting distracted by irrelevant content due to algorithm suggestions
- Missing airdrops and opportunities because you can't keep up
- Wasting hours scrolling through noise

**This is your solution!**

## 📋 Prerequisites

- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)
- **A Telegram account** (for creating a bot - 100% free!)

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd airdrop-tracker
npm install
```

### 2. Set Up Telegram Bot (FREE!)

1. Open Telegram and search for `@BotFather`
2. Send `/newbot` command
3. Follow instructions to create your bot
4. Copy the bot token you receive
5. Create `.env` file:

```bash
cp .env.example .env
```

6. Edit `.env` and add your bot token:

```env
TELEGRAM_BOT_TOKEN=your_bot_token_here
PORT=3000
```

### 3. Configure Sources

Edit `config/sources.json` to add your channels and accounts:

```json
{
  "telegram": {
    "channels": [
      "@AirdropDetective",
      "@YourFavoriteChannel"
    ]
  },
  "twitter": {
    "accounts": [
      "AirdropDetect",
      "airdrops_io"
    ]
  }
}
```

**Important for Telegram**: After starting the bot, you need to:
1. Add your bot to each Telegram channel you want to monitor
2. Make the bot an admin (with "Read Messages" permission)

### 4. Start the Application

```bash
npm start
```

You should see:

```
╔═══════════════════════════════════════════════════════════╗
║   🚀 Web3 Opportunity Aggregator                         ║
║   Track airdrops, hackathons, and grants from X & Telegram ║
╚═══════════════════════════════════════════════════════════╝

✅ Database initialized
✅ Telegram scraper initialized
🌐 API server running on http://localhost:3000
📊 Dashboard: http://localhost:3000
```

### 5. Open Dashboard

Visit `http://localhost:3000` in your browser to see all discovered opportunities!

## 📁 Project Structure

```
airdrop-tracker/
├── config/
│   └── sources.json          # Configure channels/accounts here
├── public/                   # Frontend dashboard
│   ├── index.html
│   ├── style.css
│   └── app.js
├── src/
│   ├── index.js             # Main application
│   ├── config.js            # Configuration loader
│   ├── database.js          # SQLite database
│   ├── classifier.js        # AI-powered opportunity detector
│   ├── api.js               # Express API server
│   └── scrapers/
│       ├── telegram.js      # Telegram monitor
│       └── twitter.js       # Twitter scraper
├── data/
│   └── opportunities.db     # SQLite database (auto-created)
├── package.json
└── README.md
```

## ⚙️ Configuration

### Adding More Channels/Accounts

Simply edit `config/sources.json`:

```json
{
  "telegram": {
    "channels": [
      "@AirdropDetective",
      "@AirdropAlertDaily",
      "@CryptoAirdropz",
      "@YourCustomChannel"
    ]
  },
  "twitter": {
    "accounts": [
      "AirdropDetect",
      "airdropalertcom",
      "airdrops_io",
      "YourFavoriteAccount"
    ],
    "hashtags": [
      "#airdrop",
      "#web3hackathon",
      "#cryptogrants"
    ]
  },
  "keywords": {
    "opportunities": [
      "airdrop",
      "hackathon",
      "grant",
      "bounty",
      "testnet",
      "retroactive"
    ],
    "exclude": [
      "scam",
      "fake",
      "phishing"
    ]
  }
}
```

**No restart needed!** The app will pick up changes automatically.

### Customizing Keywords

Edit the `keywords` section in `config/sources.json`:
- `opportunities`: Keywords that identify opportunities
- `exclude`: Keywords that filter out scams/spam

## 🎨 Dashboard Features

The web dashboard provides:

- **Statistics**: Total opportunities, weekly count, category breakdown
- **Filters**: Filter by category, status, platform
- **Actions**: Mark opportunities as:
  - ⭐ Interested
  - ✅ Applied
  - ❌ Ignored
- **Priority Badges**: High/Medium/Low priority scoring
- **Source Links**: Direct links to original posts
- **Auto-refresh**: Updates every 2 minutes

## 🔧 Advanced Usage

### Custom Scraping Interval

Edit `.env`:

```env
SCRAPE_INTERVAL_MINUTES=30  # Default is 30 minutes
```

### Development Mode

```bash
npm run dev
```

This uses Node's `--watch` flag to auto-restart on file changes.

### Manual Scraping

```bash
npm run scrape
```

## 🌐 Free Deployment Options

### Option 1: Railway (Recommended)

1. Create account at [railway.app](https://railway.app)
2. Create new project from GitHub repo
3. Add environment variables (TELEGRAM_BOT_TOKEN)
4. Deploy! (Free tier: 500 hours/month)

### Option 2: Render

1. Create account at [render.com](https://render.com)
2. Create new Web Service from repo
3. Add environment variables
4. Deploy! (Free tier available)

### Option 3: Run Locally 24/7

Use `pm2` to keep it running:

```bash
npm install -g pm2
pm2 start src/index.js --name web3-tracker
pm2 save
pm2 startup  # Follow instructions to auto-start on boot
```

## 🐛 Troubleshooting

### Telegram Bot Not Receiving Messages

1. Make sure you added the bot to your channels
2. Ensure the bot is an admin with "Read Messages" permission
3. Check if TELEGRAM_BOT_TOKEN is correct in `.env`

### Twitter Scraping Not Working

- Twitter scraping uses Nitter instances (free Twitter frontends)
- If one instance is down, it automatically tries others
- Be patient - some instances may be slow

### No Opportunities Found

- Check `config/sources.json` has valid channels/accounts
- Wait a few minutes for the scraper to collect data
- Try running `npm run scrape` manually
- Check if keywords in config match the content you're looking for

### Database Locked Error

- Only run one instance of the app at a time
- If you see this error, restart the application

## 🤝 Contributing

Found a bug? Have a feature request? Open an issue!

Want to contribute? PRs are welcome!

## 📊 How It Works

1. **Telegram Monitor**: Uses Telegram Bot API to listen to channel messages in real-time
2. **Twitter Scraper**: Scrapes Twitter via Nitter instances (free Twitter frontend) every 30 minutes
3. **AI Classifier**: Analyzes each message using keyword matching and pattern detection
4. **Database**: Stores opportunities with deduplication (same opportunity won't appear twice)
5. **Dashboard**: Serves a clean web interface to browse, filter, and manage opportunities

## 🔐 Privacy & Security

- All data stored locally in SQLite database
- No data sent to third parties
- Open source - audit the code yourself
- No tracking or analytics

## 📜 License

MIT License - Use freely!

## 🙏 Acknowledgments

Built for the Web3 community by someone who missed too many airdrops!

## 💬 Support

Having issues? Open a GitHub issue or reach out!

---

**Happy hunting! May you never miss an airdrop again! 🚀**
