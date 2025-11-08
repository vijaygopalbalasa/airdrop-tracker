import { Telegraf } from 'telegraf';
import { config } from '../config.js';
import OpportunityClassifier from '../classifier.js';

class TelegramScraper {
  constructor(database) {
    this.db = database;
    this.classifier = new OpportunityClassifier();
    this.bot = null;
    this.channelMessageCount = 0;
  }

  async initialize() {
    if (!config.telegram.botToken) {
      console.log('⚠️  Telegram bot token not configured. Skipping Telegram scraper.');
      console.log('   To enable: Get a bot token from @BotFather and add to .env');
      return false;
    }

    try {
      this.bot = new Telegraf(config.telegram.botToken);

      // Handle channel posts
      this.bot.on('channel_post', (ctx) => this.handleChannelPost(ctx));

      // Handle errors
      this.bot.catch((err) => {
        console.error('❌ Telegram bot error:', err.message);
      });

      console.log('✅ Telegram scraper initialized');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Telegram bot:', error.message);
      return false;
    }
  }

  async handleChannelPost(ctx) {
    try {
      const message = ctx.channelPost;
      const channelName = message.chat.username || message.chat.title;
      const messageLink = message.chat.username
        ? `https://t.me/${message.chat.username}/${message.message_id}`
        : '';

      // Process the message
      const opportunity = this.classifier.processMessage(
        message,
        'telegram',
        channelName,
        messageLink
      );

      if (opportunity) {
        const result = this.db.addOpportunity(opportunity);
        if (result) {
          this.channelMessageCount++;
          console.log(`✨ New ${opportunity.category} found from Telegram: ${opportunity.title.substring(0, 50)}...`);
        }
      }
    } catch (error) {
      console.error('❌ Error processing Telegram message:', error.message);
    }
  }

  async start() {
    if (!this.bot) {
      return false;
    }

    try {
      console.log('🚀 Starting Telegram bot...');
      console.log(`📡 Monitoring ${config.telegram.channels.length} channels:`);
      config.telegram.channels.forEach(channel => {
        console.log(`   - ${channel}`);
      });
      console.log('\n💡 Make sure to add your bot to these channels as an admin!');

      await this.bot.launch();

      // Enable graceful stop
      process.once('SIGINT', () => this.bot.stop('SIGINT'));
      process.once('SIGTERM', () => this.bot.stop('SIGTERM'));

      return true;
    } catch (error) {
      console.error('❌ Failed to start Telegram bot:', error.message);
      return false;
    }
  }

  stop() {
    if (this.bot) {
      this.bot.stop();
      console.log('🛑 Telegram bot stopped');
    }
  }

  getStats() {
    return {
      messagesProcessed: this.channelMessageCount,
      channelsMonitored: config.telegram.channels.length
    };
  }
}

export default TelegramScraper;
