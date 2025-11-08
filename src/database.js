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
    // Create opportunities table
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
        unique_hash TEXT UNIQUE
      )
    `);

    // Create index for faster queries
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_category ON opportunities(category);
      CREATE INDEX IF NOT EXISTS idx_status ON opportunities(status);
      CREATE INDEX IF NOT EXISTS idx_created_at ON opportunities(created_at);
      CREATE INDEX IF NOT EXISTS idx_unique_hash ON opportunities(unique_hash);
    `);

    console.log('✅ Database initialized');
  }

  // Add a new opportunity
  addOpportunity(opportunity) {
    const stmt = this.db.prepare(`
      INSERT INTO opportunities (
        title, description, source_platform, source_name, source_url,
        category, deadline, priority, raw_content, unique_hash
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        opportunity.unique_hash
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
