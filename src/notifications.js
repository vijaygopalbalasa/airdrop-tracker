import { Telegraf } from 'telegraf';
import { config } from './config.js';

class NotificationService {
  constructor(database) {
    this.db = database;
    this.telegramBot = config.telegram.botToken ? new Telegraf(config.telegram.botToken) : null;
  }

  async sendTelegramNotification(telegramId, message) {
    if (!this.telegramBot || !telegramId) {
      return false;
    }

    try {
      await this.telegramBot.telegram.sendMessage(telegramId, message, {
        parse_mode: 'Markdown',
        disable_web_page_preview: false
      });
      return true;
    } catch (error) {
      console.error(`❌ Failed to send Telegram notification:`, error.message);
      return false;
    }
  }

  async notifyNewOpportunity(opportunity) {
    // Find users who want notifications for this category/priority
    const users = this.db.db.prepare(`
      SELECT u.id, u.telegram_id, up.categories, up.min_priority
      FROM users u
      JOIN user_preferences up ON u.id = up.user_id
      WHERE up.notify_telegram = 1 AND u.telegram_id IS NOT NULL
    `).all();

    for (const user of users) {
      // Check if user wants this category
      const wantedCategories = user.categories ? JSON.parse(user.categories) : null;
      if (wantedCategories && !wantedCategories.includes(opportunity.category)) {
        continue;
      }

      // Check priority threshold
      if (opportunity.priority < (user.min_priority || 0)) {
        continue;
      }

      // Send notification
      const message = this.formatOpportunityMessage(opportunity);
      const sent = await this.sendTelegramNotification(user.telegram_id, message);

      // Log notification
      if (sent) {
        this.db.db.prepare(`
          INSERT INTO notifications (user_id, opportunity_id, type, message)
          VALUES (?, ?, ?, ?)
        `).run(user.id, opportunity.id, 'new_opportunity', message);
      }
    }
  }

  formatOpportunityMessage(opportunity) {
    let message = `🚀 *New ${opportunity.category.toUpperCase()} Opportunity!*\n\n`;
    message += `📌 *${opportunity.title}*\n\n`;

    if (opportunity.description) {
      message += `${opportunity.description.substring(0, 200)}...\n\n`;
    }

    if (opportunity.estimated_value) {
      message += `💰 Value: ${opportunity.estimated_value}\n`;
    }

    if (opportunity.deadline) {
      message += `⏰ Deadline: ${opportunity.deadline}\n`;
    }

    message += `\n🔗 Priority: ${opportunity.priority}/100\n`;

    if (opportunity.legitimacy_score) {
      const legitimacy = opportunity.legitimacy_score >= 70 ? '✅ High' :
                        opportunity.legitimacy_score >= 40 ? '⚠️ Medium' : '❌ Low';
      message += `🛡️ Legitimacy: ${legitimacy}\n`;
    }

    if (opportunity.source_url) {
      message += `\n[View Source](${opportunity.source_url})`;
    }

    return message;
  }

  async notifyDeadlineReminder(userId, opportunity) {
    const user = this.db.getUserById(userId);

    if (!user || !user.telegram_id) {
      return false;
    }

    const message = `⏰ *Deadline Reminder!*\n\n` +
                   `The opportunity "${opportunity.title}" is ending soon!\n\n` +
                   `Deadline: ${opportunity.deadline}\n\n` +
                   `Don't miss out!`;

    return await this.sendTelegramNotification(user.telegram_id, message);
  }
}

export default NotificationService;
