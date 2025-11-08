import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import AuthService from './auth.js';

class APIv2 {
  constructor(database, notificationService) {
    this.db = database;
    this.notifications = notificationService;
    this.auth = new AuthService(database);
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.static('public'));
  }

  setupRoutes() {
    // Health check
    this.app.get('/api/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // Authentication endpoints
    this.app.post('/api/auth/register', async (req, res) => {
      const { username, email, password, telegramId } = req.body;
      const result = await this.auth.register(username, email, password, telegramId);
      res.json(result);
    });

    this.app.post('/api/auth/login', async (req, res) => {
      const { email, password } = req.body;
      const result = await this.auth.login(email, password);
      res.json(result);
    });

    // Protected routes (require authentication)
    const authenticate = this.auth.authenticateMiddleware.bind(this.auth);

    // Get opportunities with optional user-specific filtering
    this.app.get('/api/opportunities', (req, res) => {
      try {
        const filters = {
          category: req.query.category,
          status: req.query.status,
          platform: req.query.platform,
          limit: req.query.limit ? parseInt(req.query.limit) : 100,
          minLegitimacy: req.query.minLegitimacy ? parseInt(req.query.minLegitimacy) : 0
        };

        let query = 'SELECT * FROM opportunities WHERE legitimacy_score >= ?';
        const params = [filters.minLegitimacy];

        if (filters.category) {
          query += ' AND category = ?';
          params.push(filters.category);
        }

        if (filters.platform) {
          query += ' AND source_platform = ?';
          params.push(filters.platform);
        }

        query += ' ORDER BY priority DESC, created_at DESC';

        if (filters.limit) {
          query += ' LIMIT ?';
          params.push(filters.limit);
        }

        const opportunities = this.db.db.prepare(query).all(...params);

        res.json({
          success: true,
          count: opportunities.length,
          data: opportunities
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Get single opportunity with ratings
    this.app.get('/api/opportunities/:id', (req, res) => {
      try {
        const opportunity = this.db.db.prepare('SELECT * FROM opportunities WHERE id = ?')
          .get(parseInt(req.params.id));

        if (!opportunity) {
          return res.status(404).json({
            success: false,
            error: 'Opportunity not found'
          });
        }

        // Get ratings
        const ratings = this.db.getRatings(opportunity.id);

        res.json({
          success: true,
          data: {
            ...opportunity,
            ratings
          }
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Track opportunity (authenticated)
    this.app.post('/api/opportunities/:id/track', authenticate, (req, res) => {
      try {
        const { status, notes } = req.body;
        this.db.trackOpportunity(req.userId, parseInt(req.params.id), status, notes);

        res.json({
          success: true,
          message: 'Opportunity tracked'
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Rate opportunity (authenticated)
    this.app.post('/api/opportunities/:id/rate', authenticate, (req, res) => {
      try {
        const { rating, isLegit, comment } = req.body;

        if (!rating || rating < 1 || rating > 5) {
          return res.status(400).json({
            success: false,
            error: 'Rating must be between 1 and 5'
          });
        }

        this.db.addRating(
          req.userId,
          parseInt(req.params.id),
          rating,
          isLegit ? 1 : 0,
          comment
        );

        res.json({
          success: true,
          message: 'Rating added'
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Get user's tracked opportunities (authenticated)
    this.app.get('/api/user/opportunities', authenticate, (req, res) => {
      try {
        const status = req.query.status;
        const opportunities = this.db.getUserOpportunities(req.userId, status);

        res.json({
          success: true,
          count: opportunities.length,
          data: opportunities
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Get user statistics (authenticated)
    this.app.get('/api/user/stats', authenticate, (req, res) => {
      try {
        const stats = this.db.getUserStats(req.userId);

        res.json({
          success: true,
          data: stats
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Get global statistics
    this.app.get('/api/stats', (req, res) => {
      try {
        const stats = this.db.getStats();

        // Add more detailed stats
        const highPriority = this.db.db.prepare('SELECT COUNT(*) as count FROM opportunities WHERE priority >= 70').get();
        const highLegitimacy = this.db.db.prepare('SELECT COUNT(*) as count FROM opportunities WHERE legitimacy_score >= 70').get();

        res.json({
          success: true,
          data: {
            ...stats,
            highPriority: highPriority.count,
            highLegitimacy: highLegitimacy.count
          }
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Get user preferences (authenticated)
    this.app.get('/api/user/preferences', authenticate, (req, res) => {
      try {
        const prefs = this.db.db.prepare('SELECT * FROM user_preferences WHERE user_id = ?')
          .get(req.userId);

        res.json({
          success: true,
          data: prefs || {}
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Update user preferences (authenticated)
    this.app.put('/api/user/preferences', authenticate, (req, res) => {
      try {
        const { categories, minPriority, platforms, notifyTelegram, notifyEmail, autoFilterScams } = req.body;

        this.db.db.prepare(`
          INSERT OR REPLACE INTO user_preferences
          (user_id, categories, min_priority, platforms, notify_telegram, notify_email, auto_filter_scams)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          req.userId,
          categories ? JSON.stringify(categories) : null,
          minPriority || 0,
          platforms ? JSON.stringify(platforms) : null,
          notifyTelegram ? 1 : 0,
          notifyEmail ? 1 : 0,
          autoFilterScams ? 1 : 0
        );

        res.json({
          success: true,
          message: 'Preferences updated'
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Get configuration (public)
    this.app.get('/api/config', (req, res) => {
      res.json({
        success: true,
        data: {
          telegram: {
            channels: config.telegram.channels,
            enabled: !!config.telegram.botToken
          },
          twitter: {
            accounts: config.twitter.accounts,
            hashtags: config.twitter.hashtags
          },
          discord: {
            enabled: !!config.discord?.botToken,
            channelCount: config.discord?.channels?.length || 0
          },
          youtube: {
            channels: config.youtube?.channels || []
          },
          aiEnabled: !!config.claude.apiKey
        }
      });
    });
  }

  async start() {
    return new Promise((resolve) => {
      this.server = this.app.listen(config.server.port, () => {
        console.log(`🌐 API v2 server running on http://localhost:${config.server.port}`);
        console.log(`📊 Dashboard: http://localhost:${config.server.port}`);
        resolve();
      });
    });
  }

  stop() {
    if (this.server) {
      this.server.close();
      console.log('🛑 API server stopped');
    }
  }
}

export default APIv2;
