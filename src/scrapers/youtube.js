import axios from 'axios';
import * as cheerio from 'cheerio';
import OpportunityClassifier from '../classifier.js';
import { config } from '../config.js';

class YouTubeScraper {
  constructor(database) {
    this.db = database;
    this.classifier = new OpportunityClassifier();
    this.scrapedCount = 0;
  }

  // Scrape YouTube community posts and video descriptions
  async scrapeChannel(channelHandle) {
    try {
      // Use RSS feed (free, no API key needed)
      const channelUrl = `https://www.youtube.com/@${channelHandle}`;
      const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelHandle}`;

      // Try to get recent videos via RSS
      const response = await axios.get(rssUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000
      });

      const posts = [];

      // Parse RSS XML
      const $ = cheerio.load(response.data, { xmlMode: true });

      $('entry').each((i, elem) => {
        const $entry = $(elem);
        const title = $entry.find('title').text();
        const description = $entry.find('media\\:description').text();
        const link = $entry.find('link').attr('href');
        const published = $entry.find('published').text();

        // Only process recent posts (last 7 days)
        const pubDate = new Date(published);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);

        if (pubDate > weekAgo && (title || description)) {
          posts.push({
            text: `${title}\n\n${description}`,
            url: link
          });
        }
      });

      return posts;
    } catch (error) {
      // If RSS fails, try scraping the community page
      try {
        return await this.scrapeCommunityPage(channelHandle);
      } catch (error2) {
        console.error(`❌ Error scraping YouTube @${channelHandle}:`, error.message);
        return [];
      }
    }
  }

  async scrapeCommunityPage(channelHandle) {
    try {
      const url = `https://www.youtube.com/@${channelHandle}/community`;

      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000
      });

      const posts = [];
      const $ = cheerio.load(response.data);

      // YouTube's community posts are loaded dynamically, so we look for text in the initial HTML
      $('script').each((i, elem) => {
        const scriptContent = $(elem).html();
        if (scriptContent && scriptContent.includes('backstagePostThreadRenderer')) {
          // Try to extract post text from the JSON data
          const matches = scriptContent.match(/"text":\{"runs":\[{"text":"([^"]+)"/g);
          if (matches) {
            matches.forEach(match => {
              const text = match.match(/"text":"([^"]+)"/)?.[1];
              if (text && text.length > 20) {
                posts.push({
                  text: text.replace(/\\n/g, '\n'),
                  url: url
                });
              }
            });
          }
        }
      });

      return posts.slice(0, 5); // Limit to 5 most recent
    } catch (error) {
      return [];
    }
  }

  // Process posts and find opportunities
  async processPosts(channelHandle, posts) {
    let foundCount = 0;

    for (const post of posts) {
      const opportunity = this.classifier.processMessage(
        { text: post.text },
        'youtube',
        `@${channelHandle}`,
        post.url
      );

      if (opportunity) {
        const result = this.db.addOpportunity(opportunity);
        if (result) {
          foundCount++;
          this.scrapedCount++;
          console.log(`✨ New ${opportunity.category} found from YouTube @${channelHandle}`);
        }
      }
    }

    return foundCount;
  }

  // Scrape all configured channels
  async scrapeAll() {
    const channels = config.youtube?.channels || [];

    if (channels.length === 0) {
      console.log('⚠️  No YouTube channels configured');
      return 0;
    }

    console.log('🎥 Starting YouTube scraping...');
    console.log(`📡 Scraping ${channels.length} channels:`);

    let totalFound = 0;

    for (const channelHandle of channels) {
      try {
        console.log(`   Scraping @${channelHandle}...`);
        const posts = await this.scrapeChannel(channelHandle);
        const found = await this.processPosts(channelHandle, posts);
        totalFound += found;

        // Rate limiting - wait between requests
        await new Promise(resolve => setTimeout(resolve, 3000));
      } catch (error) {
        console.error(`❌ Failed to scrape @${channelHandle}:`, error.message);
      }
    }

    console.log(`✅ YouTube scraping complete. Found ${totalFound} new opportunities.`);
    return totalFound;
  }

  getStats() {
    return {
      opportunitiesFound: this.scrapedCount,
      channelsMonitored: config.youtube?.channels?.length || 0
    };
  }
}

export default YouTubeScraper;
