import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load sources configuration
const sourcesPath = join(__dirname, '../config/sources.json');
let sources;

try {
  sources = JSON.parse(readFileSync(sourcesPath, 'utf-8'));
} catch (error) {
  console.error('Error loading sources.json:', error.message);
  sources = { telegram: { channels: [] }, twitter: { accounts: [], hashtags: [] }, keywords: { opportunities: [], exclude: [] } };
}

export const config = {
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    channels: sources.telegram.channels || []
  },
  twitter: {
    accounts: sources.twitter.accounts || [],
    hashtags: sources.twitter.hashtags || []
  },
  keywords: {
    opportunities: sources.keywords.opportunities || [],
    exclude: sources.keywords.exclude || []
  },
  claude: {
    apiKey: process.env.CLAUDE_API_KEY
  },
  server: {
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'development'
  },
  database: {
    path: process.env.DATABASE_PATH || './data/opportunities.db'
  },
  scraping: {
    intervalMinutes: parseInt(process.env.SCRAPE_INTERVAL_MINUTES) || 30
  }
};
