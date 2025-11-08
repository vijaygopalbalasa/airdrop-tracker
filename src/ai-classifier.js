import Anthropic from '@anthropic-ai/sdk';
import { config } from './config.js';

class AIClassifier {
  constructor() {
    this.useAI = !!config.claude.apiKey;
    this.client = this.useAI ? new Anthropic({ apiKey: config.claude.apiKey }) : null;
    console.log(this.useAI ? '🤖 AI Classification: ENABLED (Claude API)' : '🤖 AI Classification: Keyword-based (set CLAUDE_API_KEY for AI)');
  }

  async classifyWithAI(text, sourcePlatform, sourceName) {
    if (!this.useAI) {
      return null; // Fallback to keyword matching
    }

    try {
      const prompt = `Analyze this Web3/crypto social media post and extract opportunity information.

POST:
${text}

SOURCE: ${sourcePlatform} - ${sourceName}

Extract the following as JSON:
{
  "isOpportunity": boolean (true if this is an airdrop, hackathon, grant, bounty, testnet, or Web3 opportunity),
  "category": string (one of: "airdrop", "hackathon", "grant", "bounty", "testnet", "whitelist", "nft", "contest", "job", "other"),
  "title": string (concise title, max 100 chars),
  "description": string (summary in 1-2 sentences),
  "priority": number (0-100, where 100 is most urgent/valuable),
  "deadline": string or null (extracted deadline if mentioned),
  "requirements": array of strings (what user needs to do),
  "estimatedValue": string or null (potential reward if mentioned),
  "isLegit": number (0-100 confidence this is legitimate, not a scam),
  "reasoning": string (why you classified it this way)
}

Consider:
- Red flags: "send me", "double your", obvious scams
- Green flags: official announcements, verified projects, clear requirements
- Urgency: deadlines, limited spots
- Value: token amounts, prize pools, funding amounts`;

      const message = await this.client.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const response = message.content[0].text;
      const jsonMatch = response.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        return result;
      }

      return null;
    } catch (error) {
      console.error('❌ AI Classification error:', error.message);
      return null; // Fallback to keyword matching
    }
  }

  async enhance(opportunity) {
    if (!this.useAI) {
      return opportunity; // No enhancement
    }

    try {
      const aiResult = await this.classifyWithAI(
        opportunity.raw_content,
        opportunity.source_platform,
        opportunity.source_name
      );

      if (aiResult && aiResult.isOpportunity) {
        return {
          ...opportunity,
          title: aiResult.title || opportunity.title,
          description: aiResult.description || opportunity.description,
          category: aiResult.category || opportunity.category,
          priority: aiResult.priority || opportunity.priority,
          deadline: aiResult.deadline || opportunity.deadline,
          requirements: JSON.stringify(aiResult.requirements || []),
          estimated_value: aiResult.estimatedValue || null,
          legitimacy_score: aiResult.isLegit || 50,
          ai_reasoning: aiResult.reasoning || null
        };
      }

      // If AI says it's not an opportunity, return null
      if (aiResult && !aiResult.isOpportunity) {
        return null;
      }

      return opportunity;
    } catch (error) {
      console.error('❌ AI Enhancement error:', error.message);
      return opportunity; // Return original on error
    }
  }
}

export default AIClassifier;
