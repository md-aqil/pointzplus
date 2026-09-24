// server/services/auth.service.js – registration, login, profile business logic.
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../middleware/auth.js';
import { ApiError } from '../lib/errors.js';
import { UsersRepo } from '../repositories/users.repo.js';
import { query } from '../db.js';

const TOKEN_TTL = '30d';

function signToken(user) {
  return jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
    expiresIn: TOKEN_TTL,
  });
}

function toPublicUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.full_name,
    phone: user.phone_number,
    avatarUrl: user.avatar_url,
  };
}

export const authService = {
  async register({ email, password, fullName, phoneNumber }) {
    const existing = await UsersRepo.findByEmail(email);
    if (existing) {
      throw ApiError.conflict('User already exists');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await UsersRepo.create({
      email,
      passwordHash,
      fullName,
      phoneNumber,
    });

    return { user: toPublicUser(user), token: signToken(user) };
  },

  async login({ email, password }) {
    // Fetch the full row – password_hash is required for comparison.
    const result = await query('SELECT * FROM users WHERE email = $1', [
      email,
    ]);
    const user = result.rows[0];
    if (!user) {
      throw ApiError.unauthorized('Invalid credentials');
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      throw ApiError.unauthorized('Invalid credentials');
    }

    return { user: toPublicUser(user), token: signToken(user) };
  },

  async getProfile(userId) {
    const user = await UsersRepo.findById(userId);
    if (!user) throw ApiError.notFound('User not found');
    return user;
  },

  async updateProfile(userId, fields) {
    const user = await UsersRepo.updateProfile(userId, fields);
    if (!user) throw ApiError.notFound('User not found');
    return user;
  },

  async deleteAccount(userId) {
    const removed = await UsersRepo.remove(userId);
    if (!removed) throw ApiError.notFound('User not found');
    return { message: 'Account deleted successfully' };
  },
};
