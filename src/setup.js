import { readFileSync, writeFileSync, existsSync } from 'fs';
import { createInterface } from 'readline';

const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function setup() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║   🚀 Web3 Opportunity Aggregator - Setup Wizard         ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  console.log('This wizard will help you set up your opportunity tracker.\n');

  // Check if .env exists
  if (existsSync('.env')) {
    const overwrite = await question('.env file already exists. Overwrite? (y/N): ');
    if (overwrite.toLowerCase() !== 'y') {
      console.log('\n✅ Keeping existing .env file');
      rl.close();
      return;
    }
  }

  console.log('\n📱 Step 1: Telegram Bot Setup');
  console.log('─────────────────────────────────');
  console.log('To get a bot token:');
  console.log('1. Open Telegram and search for @BotFather');
  console.log('2. Send: /newbot');
  console.log('3. Follow instructions and copy the token\n');

  const botToken = await question('Enter your Telegram bot token (or press Enter to skip): ');

  console.log('\n🌐 Step 2: Server Configuration');
  console.log('─────────────────────────────────');

  const port = await question('Port to run on (default: 3000): ') || '3000';

  console.log('\n⏰ Step 3: Scraping Configuration');
  console.log('─────────────────────────────────');

  const interval = await question('Twitter scraping interval in minutes (default: 30): ') || '30';

  // Create .env file
  const envContent = `# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=${botToken || 'your_telegram_bot_token_here'}

# Server Configuration
PORT=${port}
NODE_ENV=development

# Database
DATABASE_PATH=./data/opportunities.db

# Scraping Configuration
SCRAPE_INTERVAL_MINUTES=${interval}

# Optional: Claude API for better AI classification
CLAUDE_API_KEY=
`;

  writeFileSync('.env', envContent);
  console.log('\n✅ .env file created successfully!');

  // Ask about sources configuration
  console.log('\n📡 Step 4: Configure Sources (Optional)');
  console.log('─────────────────────────────────');

  const configureSources = await question('Do you want to add custom Telegram channels/Twitter accounts now? (y/N): ');

  if (configureSources.toLowerCase() === 'y') {
    console.log('\n📱 Telegram Channels:');
    console.log('Enter channel usernames (with @), one per line. Press Enter twice when done.\n');

    const telegramChannels = [];
    while (true) {
      const channel = await question('Channel (e.g., @AirdropDetective): ');
      if (!channel) break;
      if (channel.startsWith('@')) {
        telegramChannels.push(channel);
      } else {
        console.log('⚠️  Channel must start with @');
      }
    }

    console.log('\n🐦 Twitter Accounts:');
    console.log('Enter account usernames (without @), one per line. Press Enter twice when done.\n');

    const twitterAccounts = [];
    while (true) {
      const account = await question('Account (e.g., AirdropDetect): ');
      if (!account) break;
      if (!account.startsWith('@')) {
        twitterAccounts.push(account);
      } else {
        console.log('⚠️  Don\'t include @ for Twitter accounts');
      }
    }

    // Update sources.json
    const sourcesPath = './config/sources.json';
    const sources = JSON.parse(readFileSync(sourcesPath, 'utf-8'));

    if (telegramChannels.length > 0) {
      sources.telegram.channels = telegramChannels;
    }

    if (twitterAccounts.length > 0) {
      sources.twitter.accounts = twitterAccounts;
    }

    writeFileSync(sourcesPath, JSON.stringify(sources, null, 2));
    console.log('\n✅ Sources configured successfully!');
  }

  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║   ✅ Setup Complete!                                     ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  console.log('Next steps:\n');

  if (!botToken) {
    console.log('⚠️  1. Get a Telegram bot token from @BotFather');
    console.log('   2. Add it to .env file\n');
  }

  console.log('📋 Important: Add your bot to Telegram channels as admin!');
  console.log('   - Go to each channel');
  console.log('   - Click Administrators → Add Administrator');
  console.log('   - Add your bot and give "Read Messages" permission\n');

  console.log('🚀 Start the application:');
  console.log('   npm start\n');

  console.log('📊 Then visit: http://localhost:' + port + '\n');

  rl.close();
}

setup().catch(error => {
  console.error('❌ Setup failed:', error);
  rl.close();
  process.exit(1);
});
