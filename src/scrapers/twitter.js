import axios from 'axios';
import * as cheerio from 'cheerio';
import OpportunityClassifier from '../classifier.js';
import { config } from '../config.js';

class TwitterScraper {
  constructor(database) {
    this.db = database;
    this.classifier = new OpportunityClassifier();
    this.scrapedCount = 0;

    // Use Nitter instances (free Twitter frontend)
    this.nitterInstances = [
      'https://nitter.net',
      'https://nitter.privacydev.net',
      'https://nitter.poast.org',
      'https://nitter.1d4.us'
    ];
    this.currentInstanceIndex = 0;
  }

  // Get a working Nitter instance
  async getWorkingInstance() {
    for (let i = 0; i < this.nitterInstances.length; i++) {
      const instance = this.nitterInstances[this.currentInstanceIndex];
      try {
        await axios.get(instance, { timeout: 5000 });
        return instance;
      } catch (error) {
        console.log(`⚠️  ${instance} not responding, trying next...`);
        this.currentInstanceIndex = (this.currentInstanceIndex + 1) % this.nitterInstances.length;
      }
    }
    throw new Error('No working Nitter instances available');
  }

  // Scrape tweets from a user
  async scrapeUser(username) {
    try {
      const instance = await this.getWorkingInstance();
      const url = `${instance}/${username}`;

      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000
      });

      const $ = cheerio.load(response.data);
      const tweets = [];

      // Parse tweets from Nitter HTML
      $('.timeline-item').each((i, elem) => {
        const $tweet = $(elem);
        const text = $tweet.find('.tweet-content').text().trim();
        const link = $tweet.find('.tweet-link').attr('href');

        if (text && text.length > 20) {
          tweets.push({
            text,
            url: link ? `https://twitter.com${link}` : `https://twitter.com/${username}`
          });
        }
      });

      return tweets;
    } catch (error) {
      console.error(`❌ Error scraping @${username}:`, error.message);
      return [];
    }
  }

  // Process tweets and find opportunities
  async processTweets(username, tweets) {
    let foundCount = 0;

    for (const tweet of tweets) {
      const opportunity = this.classifier.processMessage(
        { text: tweet.text },
        'twitter',
        `@${username}`,
        tweet.url
      );

      if (opportunity) {
        const result = this.db.addOpportunity(opportunity);
        if (result) {
          foundCount++;
          this.scrapedCount++;
          console.log(`✨ New ${opportunity.category} found from @${username}`);
        }
      }
    }

    return foundCount;
  }

  // Scrape all configured accounts
  async scrapeAll() {
    console.log('🐦 Starting Twitter scraping...');
    console.log(`📡 Scraping ${config.twitter.accounts.length} accounts:`);

    let totalFound = 0;

    for (const username of config.twitter.accounts) {
      try {
        console.log(`   Scraping @${username}...`);
        const tweets = await this.scrapeUser(username);
        const found = await this.processTweets(username, tweets);
        totalFound += found;

        // Rate limiting - wait between requests
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`❌ Failed to scrape @${username}:`, error.message);
      }
    }

    console.log(`✅ Twitter scraping complete. Found ${totalFound} new opportunities.`);
    return totalFound;
  }

  getStats() {
    return {
      opportunitiesFound: this.scrapedCount,
      accountsMonitored: config.twitter.accounts.length
    };
  }
}

export default TwitterScraper;
