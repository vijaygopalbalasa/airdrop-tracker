import { Client, GatewayIntentBits } from 'discord.js';
import { config } from '../config.js';
import OpportunityClassifier from '../classifier.js';

class DiscordScraper {
  constructor(database) {
    this.db = database;
    this.classifier = new OpportunityClassifier();
    this.client = null;
    this.messageCount = 0;
    this.isEnabled = !!config.discord?.botToken;
  }

  async initialize() {
    if (!this.isEnabled) {
      console.log('⚠️  Discord bot token not configured. Skipping Discord scraper.');
      console.log('   To enable: Add DISCORD_BOT_TOKEN to .env');
      return false;
    }

    try {
      this.client = new Client({
        intents: [
          GatewayIntentBits.Guilds,
          GatewayIntentBits.GuildMessages,
          GatewayIntentBits.MessageContent
        ]
      });

      // Handle messages
      this.client.on('messageCreate', (message) => this.handleMessage(message));

      // Handle errors
      this.client.on('error', (error) => {
        console.error('❌ Discord bot error:', error.message);
      });

      console.log('✅ Discord scraper initialized');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Discord bot:', error.message);
      return false;
    }
  }

  async handleMessage(message) {
    // Ignore bot messages
    if (message.author.bot) return;

    // Only process messages from configured channels
    const configuredChannels = config.discord?.channels || [];
    if (!configuredChannels.includes(message.channel.id)) {
      return;
    }

    try {
      const messageText = message.content;
      const channelName = message.channel.name;
      const messageLink = `https://discord.com/channels/${message.guild.id}/${message.channel.id}/${message.id}`;

      // Process the message
      const opportunity = this.classifier.processMessage(
        { text: messageText },
        'discord',
        `${message.guild.name} #${channelName}`,
        messageLink
      );

      if (opportunity) {
        const result = this.db.addOpportunity(opportunity);
        if (result) {
          this.messageCount++;
          console.log(`✨ New ${opportunity.category} found from Discord: ${opportunity.title.substring(0, 50)}...`);
        }
      }
    } catch (error) {
      console.error('❌ Error processing Discord message:', error.message);
    }
  }

  async start() {
    if (!this.client) {
      return false;
    }

    try {
      console.log('🚀 Starting Discord bot...');
      await this.client.login(config.discord.botToken);

      const channels = config.discord?.channels || [];
      console.log(`📡 Monitoring ${channels.length} Discord channels`);

      return true;
    } catch (error) {
      console.error('❌ Failed to start Discord bot:', error.message);
      return false;
    }
  }

  stop() {
    if (this.client) {
      this.client.destroy();
      console.log('🛑 Discord bot stopped');
    }
  }

  getStats() {
    return {
      messagesProcessed: this.messageCount,
      channelsMonitored: config.discord?.channels?.length || 0
    };
  }
}

export default DiscordScraper;
