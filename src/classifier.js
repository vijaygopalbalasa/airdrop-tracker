import { config } from './config.js';
import crypto from 'crypto';

class OpportunityClassifier {
  constructor() {
    this.opportunityKeywords = config.keywords.opportunities.map(k => k.toLowerCase());
    this.excludeKeywords = config.keywords.exclude.map(k => k.toLowerCase());
  }

  // Create unique hash for deduplication
  createHash(text, source) {
    const content = `${text}-${source}`.toLowerCase().trim();
    return crypto.createHash('md5').update(content).digest('hex');
  }

  // Check if text contains opportunity keywords
  isOpportunity(text) {
    const lowerText = text.toLowerCase();

    // Check for excluded keywords (scams, etc.)
    for (const keyword of this.excludeKeywords) {
      if (lowerText.includes(keyword)) {
        return false;
      }
    }

    // Check for opportunity keywords
    for (const keyword of this.opportunityKeywords) {
      if (lowerText.includes(keyword)) {
        return true;
      }
    }

    return false;
  }

  // Classify opportunity type
  classifyType(text) {
    const lowerText = text.toLowerCase();

    if (lowerText.includes('airdrop')) return 'airdrop';
    if (lowerText.includes('hackathon')) return 'hackathon';
    if (lowerText.includes('grant') || lowerText.includes('funding')) return 'grant';
    if (lowerText.includes('bounty')) return 'bounty';
    if (lowerText.includes('testnet')) return 'testnet';
    if (lowerText.includes('whitelist')) return 'whitelist';
    if (lowerText.includes('nft') || lowerText.includes('mint')) return 'nft';

    return 'other';
  }

  // Calculate priority score (0-100)
  calculatePriority(text, source) {
    let score = 50; // base score

    const lowerText = text.toLowerCase();

    // High value keywords
    const highValue = ['retroactive', 'confirmed', 'official', 'announced', 'mainnet'];
    const mediumValue = ['potential', 'likely', 'expected', 'testnet'];
    const lowValue = ['rumor', 'speculation', 'possible'];

    highValue.forEach(word => {
      if (lowerText.includes(word)) score += 15;
    });

    mediumValue.forEach(word => {
      if (lowerText.includes(word)) score += 5;
    });

    lowValue.forEach(word => {
      if (lowerText.includes(word)) score -= 10;
    });

    // Deadline urgency
    if (lowerText.includes('today') || lowerText.includes('ending soon')) score += 20;
    if (lowerText.includes('this week')) score += 10;

    // Cap at 0-100
    return Math.max(0, Math.min(100, score));
  }

  // Extract title from text (first meaningful sentence)
  extractTitle(text) {
    // Clean up text
    const cleaned = text.trim().replace(/\n+/g, ' ').replace(/\s+/g, ' ');

    // Try to get first sentence or first 100 chars
    const firstSentence = cleaned.split(/[.!?]/)[0];
    if (firstSentence.length > 10 && firstSentence.length < 200) {
      return firstSentence.trim();
    }

    // Fallback to first 100 chars
    return cleaned.substring(0, 100).trim() + (cleaned.length > 100 ? '...' : '');
  }

  // Process and classify a message
  processMessage(message, sourcePlatform, sourceName, sourceUrl = '') {
    const text = message.text || message.caption || '';

    if (!text || text.length < 10) {
      return null; // Too short
    }

    // Check if it's an opportunity
    if (!this.isOpportunity(text)) {
      return null;
    }

    const category = this.classifyType(text);
    const priority = this.calculatePriority(text, sourcePlatform);
    const title = this.extractTitle(text);
    const unique_hash = this.createHash(text, sourceName);

    return {
      title,
      description: text.substring(0, 500), // Limit description
      source_platform: sourcePlatform,
      source_name: sourceName,
      source_url: sourceUrl,
      category,
      priority,
      raw_content: text,
      unique_hash,
      deadline: this.extractDeadline(text)
    };
  }

  // Try to extract deadline from text
  extractDeadline(text) {
    const lowerText = text.toLowerCase();

    // Simple date pattern matching
    const datePatterns = [
      /deadline[:\s]+([^\n]+)/i,
      /ends?[:\s]+([^\n]+)/i,
      /until[:\s]+([^\n]+)/i,
      /before[:\s]+([^\n]+)/i
    ];

    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim().substring(0, 100);
      }
    }

    return null;
  }
}

export default OpportunityClassifier;
