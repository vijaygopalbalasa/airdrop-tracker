import Database from 'better-sqlite3';
import { mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';
import { config } from './config.js';

class OpportunityDB {
  constructor() {
    // Ensure data directory exists
    const dbDir = dirname(config.database.path);
    if (!existsSync(dbDir)) {
      mkdirSync(dbDir, { recursive: true });
    }

    this.db = new Database(config.database.path);
    this.initTables();
  }

  initTables() {
    // Create users table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        telegram_id TEXT UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME,
        is_active INTEGER DEFAULT 1
      )
    `);

    // Create user preferences table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        user_id INTEGER PRIMARY KEY,
        categories TEXT,
        min_priority INTEGER DEFAULT 0,
        platforms TEXT,
        notify_telegram INTEGER DEFAULT 0,
        notify_email INTEGER DEFAULT 0,
        auto_filter_scams INTEGER DEFAULT 1,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Create opportunities table with enhanced fields
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS opportunities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        source_platform TEXT NOT NULL,
        source_name TEXT NOT NULL,
        source_url TEXT,
        category TEXT,
        deadline TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        discovered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'new',
        priority INTEGER DEFAULT 0,
        raw_content TEXT,
        unique_hash TEXT UNIQUE,
        requirements TEXT,
        estimated_value TEXT,
        legitimacy_score INTEGER DEFAULT 50,
        ai_reasoning TEXT,
        views INTEGER DEFAULT 0,
        avg_rating REAL DEFAULT 0,
        rating_count INTEGER DEFAULT 0
      )
    `);

    // Create user opportunity tracking table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS user_opportunities (
        user_id INTEGER,
        opportunity_id INTEGER,
        status TEXT DEFAULT 'new',
        notes TEXT,
        completed_at DATETIME,
        reward_received TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, opportunity_id),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (opportunity_id) REFERENCES opportunities(id)
      )
    `);

    // Create ratings table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ratings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        opportunity_id INTEGER,
        rating INTEGER CHECK(rating >= 1 AND rating <= 5),
        is_legit INTEGER,
        comment TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (opportunity_id) REFERENCES opportunities(id),
        UNIQUE(user_id, opportunity_id)
      )
    `);

    // Create notifications table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        opportunity_id INTEGER,
        type TEXT,
        message TEXT,
        is_read INTEGER DEFAULT 0,
        sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (opportunity_id) REFERENCES opportunities(id)
      )
    `);

    // Create indexes for faster queries
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_opportunities_category ON opportunities(category);
      CREATE INDEX IF NOT EXISTS idx_opportunities_status ON opportunities(status);
      CREATE INDEX IF NOT EXISTS idx_opportunities_created_at ON opportunities(created_at);
      CREATE INDEX IF NOT EXISTS idx_opportunities_unique_hash ON opportunities(unique_hash);
      CREATE INDEX IF NOT EXISTS idx_opportunities_legitimacy ON opportunities(legitimacy_score);
      CREATE INDEX IF NOT EXISTS idx_user_opportunities_user ON user_opportunities(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_opportunities_status ON user_opportunities(status);
      CREATE INDEX IF NOT EXISTS idx_ratings_opportunity ON ratings(opportunity_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
    `);

    console.log('✅ Database initialized with enhanced schema');
  }

  // Add a new opportunity
  addOpportunity(opportunity) {
    const stmt = this.db.prepare(`
      INSERT INTO opportunities (
        title, description, source_platform, source_name, source_url,
        category, deadline, priority, raw_content, unique_hash,
        requirements, estimated_value, legitimacy_score, ai_reasoning
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    try {
      const result = stmt.run(
        opportunity.title,
        opportunity.description || '',
        opportunity.source_platform,
        opportunity.source_name,
        opportunity.source_url || '',
        opportunity.category || 'unknown',
        opportunity.deadline || null,
        opportunity.priority || 0,
        opportunity.raw_content || '',
        opportunity.unique_hash,
        opportunity.requirements || null,
        opportunity.estimated_value || null,
        opportunity.legitimacy_score || 50,
        opportunity.ai_reasoning || null
      );
      return result.lastInsertRowid;
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        // Duplicate - already exists
        return null;
      }
      throw error;
    }
  }

  // User management methods
  createUser(username, email, passwordHash, telegramId = null) {
    const stmt = this.db.prepare(`
      INSERT INTO users (username, email, password_hash, telegram_id)
      VALUES (?, ?, ?, ?)
    `);
    try {
      const result = stmt.run(username, email, passwordHash, telegramId);
      return result.lastInsertRowid;
    } catch (error) {
      return null; // User already exists
    }
  }

  getUserByEmail(email) {
    const stmt = this.db.prepare('SELECT * FROM users WHERE email = ?');
    return stmt.get(email);
  }

  getUserById(id) {
    const stmt = this.db.prepare('SELECT * FROM users WHERE id = ?');
    return stmt.get(id);
  }

  // Rating methods
  addRating(userId, opportunityId, rating, isLegit, comment = null) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO ratings (user_id, opportunity_id, rating, is_legit, comment)
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = stmt.run(userId, opportunityId, rating, isLegit, comment);

    // Update opportunity average rating
    this.updateOpportunityRating(opportunityId);

    return result.lastInsertRowid;
  }

  updateOpportunityRating(opportunityId) {
    const stats = this.db.prepare(`
      SELECT AVG(rating) as avg_rating, COUNT(*) as count
      FROM ratings WHERE opportunity_id = ?
    `).get(opportunityId);

    this.db.prepare(`
      UPDATE opportunities
      SET avg_rating = ?, rating_count = ?
      WHERE id = ?
    `).run(stats.avg_rating || 0, stats.count || 0, opportunityId);
  }

  getRatings(opportunityId) {
    const stmt = this.db.prepare(`
      SELECT r.*, u.username
      FROM ratings r
      JOIN users u ON r.user_id = u.id
      WHERE r.opportunity_id = ?
      ORDER BY r.created_at DESC
    `);
    return stmt.all(opportunityId);
  }

  // User opportunity tracking
  trackOpportunity(userId, opportunityId, status, notes = null) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO user_opportunities
      (user_id, opportunity_id, status, notes)
      VALUES (?, ?, ?, ?)
    `);
    return stmt.run(userId, opportunityId, status, notes);
  }

  getUserOpportunities(userId, status = null) {
    let query = `
      SELECT o.*, uo.status as user_status, uo.notes, uo.completed_at, uo.reward_received
      FROM opportunities o
      JOIN user_opportunities uo ON o.id = uo.opportunity_id
      WHERE uo.user_id = ?
    `;
    const params = [userId];

    if (status) {
      query += ' AND uo.status = ?';
      params.push(status);
    }

    query += ' ORDER BY o.created_at DESC';

    return this.db.prepare(query).all(...params);
  }

  // Analytics methods
  getUserStats(userId) {
    const tracked = this.db.prepare('SELECT COUNT(*) as count FROM user_opportunities WHERE user_id = ?').get(userId);
    const completed = this.db.prepare('SELECT COUNT(*) as count FROM user_opportunities WHERE user_id = ? AND status = "completed"').get(userId);
    const applied = this.db.prepare('SELECT COUNT(*) as count FROM user_opportunities WHERE user_id = ? AND status = "applied"').get(userId);

    return {
      tracked: tracked.count,
      completed: completed.count,
      applied: applied.count,
      completionRate: tracked.count > 0 ? (completed.count / tracked.count * 100).toFixed(1) : 0
    };
  }

  // Get all opportunities with filters
  getOpportunities(filters = {}) {
    let query = 'SELECT * FROM opportunities WHERE 1=1';
    const params = [];

    if (filters.category) {
      query += ' AND category = ?';
      params.push(filters.category);
    }

    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    if (filters.platform) {
      query += ' AND source_platform = ?';
      params.push(filters.platform);
    }

    query += ' ORDER BY created_at DESC';

    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }

    const stmt = this.db.prepare(query);
    return stmt.all(...params);
  }

  // Update opportunity status
  updateStatus(id, status) {
    const stmt = this.db.prepare('UPDATE opportunities SET status = ? WHERE id = ?');
    return stmt.run(status, id);
  }

  // Get statistics
  getStats() {
    const total = this.db.prepare('SELECT COUNT(*) as count FROM opportunities').get();
    const byCategory = this.db.prepare('SELECT category, COUNT(*) as count FROM opportunities GROUP BY category').all();
    const byPlatform = this.db.prepare('SELECT source_platform, COUNT(*) as count FROM opportunities GROUP BY source_platform').all();
    const recent = this.db.prepare('SELECT COUNT(*) as count FROM opportunities WHERE created_at >= datetime("now", "-7 days")').get();

    return {
      total: total.count,
      byCategory,
      byPlatform,
      lastWeek: recent.count
    };
  }

  close() {
    this.db.close();
  }
}

export default OpportunityDB;
