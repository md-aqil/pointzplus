// server/middleware/auth.js – Shared JWT authentication
import jwt from 'jsonwebtoken';

// Fail fast: never fall back to a hardcoded secret (forged-token risk).
if (!process.env.JWT_SECRET) {
  throw new Error(
    'JWT_SECRET is not set. Define it in server/.env (e.g. `openssl rand -hex 32`) before starting the server.'
  );
}

export const JWT_SECRET = process.env.JWT_SECRET;

export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    req.userEmail = decoded.email;
  } catch {
    // ignore
  }
  next();
}

export default { authenticate, optionalAuth, JWT_SECRET };
