import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const SALT_ROUNDS = 10;

class AuthService {
  constructor(database) {
    this.db = database;
  }

  async register(username, email, password, telegramId = null) {
    try {
      // Hash password
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

      // Create user
      const userId = this.db.createUser(username, email, passwordHash, telegramId);

      if (!userId) {
        return { success: false, error: 'User already exists' };
      }

      // Create default preferences
      this.db.db.prepare(`
        INSERT INTO user_preferences (user_id) VALUES (?)
      `).run(userId);

      // Generate token
      const token = this.generateToken(userId);

      return {
        success: true,
        user: { id: userId, username, email },
        token
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async login(email, password) {
    try {
      const user = this.db.getUserByEmail(email);

      if (!user) {
        return { success: false, error: 'Invalid credentials' };
      }

      // Verify password
      const isValid = await bcrypt.compare(password, user.password_hash);

      if (!isValid) {
        return { success: false, error: 'Invalid credentials' };
      }

      // Update last login
      this.db.db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);

      // Generate token
      const token = this.generateToken(user.id);

      return {
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          telegram_id: user.telegram_id
        },
        token
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  generateToken(userId) {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' });
  }

  verifyToken(token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      return { valid: true, userId: decoded.userId };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  // Middleware for Express
  authenticateMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const result = this.verifyToken(token);

    if (!result.valid) {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }

    req.userId = result.userId;
    next();
  }
}

export default AuthService;
