import express from 'express';
import cors from 'cors';
import { config } from './config.js';

class API {
  constructor(database) {
    this.db = database;
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());

    // Serve static files from frontend
    this.app.use(express.static('public'));
  }

  setupRoutes() {
    // Health check
    this.app.get('/api/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // Get all opportunities with filters
    this.app.get('/api/opportunities', (req, res) => {
      try {
        const filters = {
          category: req.query.category,
          status: req.query.status,
          platform: req.query.platform,
          limit: req.query.limit ? parseInt(req.query.limit) : 100
        };

        const opportunities = this.db.getOpportunities(filters);
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

    // Get single opportunity
    this.app.get('/api/opportunities/:id', (req, res) => {
      try {
        const opportunity = this.db.getOpportunities({ limit: 1 })
          .find(o => o.id === parseInt(req.params.id));

        if (!opportunity) {
          return res.status(404).json({
            success: false,
            error: 'Opportunity not found'
          });
        }

        res.json({
          success: true,
          data: opportunity
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Update opportunity status
    this.app.patch('/api/opportunities/:id/status', (req, res) => {
      try {
        const { status } = req.body;

        if (!['new', 'interested', 'applied', 'completed', 'ignored'].includes(status)) {
          return res.status(400).json({
            success: false,
            error: 'Invalid status'
          });
        }

        this.db.updateStatus(parseInt(req.params.id), status);

        res.json({
          success: true,
          message: 'Status updated'
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Get statistics
    this.app.get('/api/stats', (req, res) => {
      try {
        const stats = this.db.getStats();
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

    // Get configuration
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
          }
        }
      });
    });
  }

  start() {
    return new Promise((resolve) => {
      this.server = this.app.listen(config.server.port, () => {
        console.log(`🌐 API server running on http://localhost:${config.server.port}`);
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

export default API;
