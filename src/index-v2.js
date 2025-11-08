import OpportunityDB from './database.js';
import TelegramScraper from './scrapers/telegram.js';
import TwitterScraper from './scrapers/twitter.js';
import DiscordScraper from './scrapers/discord.js';
import YouTubeScraper from './scrapers/youtube.js';
import NotificationService from './notifications.js';
import APIv2 from './api-v2.js';
import cron from 'node-cron';
import { config } from './config.js';

console.log('');
console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║   🚀 Web3 Opportunity Aggregator V2                      ║');
console.log('║   Next-gen tracker with AI, users, and multi-platform   ║');
console.log('╚═══════════════════════════════════════════════════════════╝');
console.log('');

class OpportunityAggregatorV2 {
  constructor() {
    this.db = new OpportunityDB();
    this.notifications = new NotificationService(this.db);
    this.telegramScraper = new TelegramScraper(this.db, this.notifications);
    this.twitterScraper = new TwitterScraper(this.db);
    this.discordScraper = new DiscordScraper(this.db);
    this.youtubeScraper = new YouTubeScraper(this.db);
    this.api = new APIv2(this.db, this.notifications);
  }

  async start() {
    console.log('⚙️  Initializing...\n');

    // Start API server
    await this.api.start();

    // Initialize Telegram scraper
    const telegramReady = await this.telegramScraper.initialize();
    if (telegramReady) {
      await this.telegramScraper.start();
    }

    // Initialize Discord scraper
    const discordReady = await this.discordScraper.initialize();
    if (discordReady) {
      await this.discordScraper.start();
    }

    // Run initial scrapes
    console.log('');
    await this.twitterScraper.scrapeAll();
    await this.youtubeScraper.scrapeAll();

    // Schedule periodic scraping
    const intervalMinutes = config.scraping.intervalMinutes;
    console.log(`\n⏰ Scheduled scraping every ${intervalMinutes} minutes`);

    cron.schedule(`*/${intervalMinutes} * * * *`, async () => {
      console.log(`\n🔄 Running scheduled scrape... (${new Date().toLocaleString()})`);
      await this.twitterScraper.scrapeAll();
      await this.youtubeScraper.scrapeAll();
    });

    // Display stats
    this.displayStats();

    // Display stats every hour
    cron.schedule('0 * * * *', () => {
      this.displayStats();
    });

    console.log('\n✅ All systems running!');
    console.log('\n💡 New Features:');
    console.log('   - AI-powered classification (set CLAUDE_API_KEY)');
    console.log('   - User accounts and authentication');
    console.log('   - Community ratings and verification');
    console.log('   - Personalized notifications');
    console.log('   - Multi-platform support (Telegram, Twitter, Discord, YouTube)');
    console.log('   - Advanced analytics');
    console.log('\n📚 Quick Start:');
    console.log('   - Visit the dashboard to create an account');
    console.log('   - Set your preferences for personalized opportunities');
    console.log('   - Rate opportunities to help the community');
    console.log('   - Edit config/sources.json to add more sources');
    console.log('   - Press Ctrl+C to stop\n');
  }

  displayStats() {
    const dbStats = this.db.getStats();
    const telegramStats = this.telegramScraper.getStats();
    const twitterStats = this.twitterScraper.getStats();
    const discordStats = this.discordScraper.getStats();
    const youtubeStats = this.youtubeScraper.getStats();

    console.log('\n📊 Statistics:');
    console.log(`   Total opportunities: ${dbStats.total}`);
    console.log(`   This week: ${dbStats.lastWeek}`);
    console.log('\n   Sources:');
    console.log(`   📱 Telegram: ${telegramStats.channelsMonitored} channels`);
    console.log(`   🐦 Twitter: ${twitterStats.accountsMonitored} accounts`);
    console.log(`   💬 Discord: ${discordStats.channelsMonitored} channels`);
    console.log(`   🎥 YouTube: ${youtubeStats.channelsMonitored} channels`);

    if (dbStats.byCategory.length > 0) {
      console.log('\n   By category:');
      dbStats.byCategory.forEach(cat => {
        console.log(`      ${cat.category}: ${cat.count}`);
      });
    }
  }

  stop() {
    console.log('\n🛑 Shutting down...');
    this.telegramScraper.stop();
    this.discordScraper.stop();
    this.api.stop();
    this.db.close();
    console.log('✅ Shutdown complete\n');
    process.exit(0);
  }
}

// Start the aggregator
const aggregator = new OpportunityAggregatorV2();

aggregator.start().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => aggregator.stop());
process.on('SIGTERM', () => aggregator.stop());
