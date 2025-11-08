import OpportunityDB from './database.js';
import TelegramScraper from './scrapers/telegram.js';
import TwitterScraper from './scrapers/twitter.js';
import API from './api.js';
import cron from 'node-cron';
import { config } from './config.js';

console.log('');
console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║   🚀 Web3 Opportunity Aggregator                         ║');
console.log('║   Track airdrops, hackathons, and grants from X & Telegram ║');
console.log('╚═══════════════════════════════════════════════════════════╝');
console.log('');

class OpportunityAggregator {
  constructor() {
    this.db = new OpportunityDB();
    this.telegramScraper = new TelegramScraper(this.db);
    this.twitterScraper = new TwitterScraper(this.db);
    this.api = new API(this.db);
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

    // Run initial Twitter scrape
    console.log('');
    await this.twitterScraper.scrapeAll();

    // Schedule periodic Twitter scraping
    const intervalMinutes = config.scraping.intervalMinutes;
    console.log(`\n⏰ Scheduled Twitter scraping every ${intervalMinutes} minutes`);

    cron.schedule(`*/${intervalMinutes} * * * *`, async () => {
      console.log(`\n🔄 Running scheduled Twitter scrape... (${new Date().toLocaleString()})`);
      await this.twitterScraper.scrapeAll();
    });

    // Display stats
    this.displayStats();

    // Display stats every hour
    cron.schedule('0 * * * *', () => {
      this.displayStats();
    });

    console.log('\n✅ All systems running!');
    console.log('\n💡 Tips:');
    console.log('   - Edit config/sources.json to add more channels/accounts');
    console.log('   - Visit the dashboard to see discovered opportunities');
    console.log('   - Press Ctrl+C to stop\n');
  }

  displayStats() {
    const dbStats = this.db.getStats();
    const telegramStats = this.telegramScraper.getStats();
    const twitterStats = this.twitterScraper.getStats();

    console.log('\n📊 Statistics:');
    console.log(`   Total opportunities: ${dbStats.total}`);
    console.log(`   This week: ${dbStats.lastWeek}`);
    console.log(`   Telegram channels: ${telegramStats.channelsMonitored}`);
    console.log(`   Twitter accounts: ${twitterStats.accountsMonitored}`);

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
    this.api.stop();
    this.db.close();
    console.log('✅ Shutdown complete\n');
    process.exit(0);
  }
}

// Start the aggregator
const aggregator = new OpportunityAggregator();

aggregator.start().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => aggregator.stop());
process.on('SIGTERM', () => aggregator.stop());
