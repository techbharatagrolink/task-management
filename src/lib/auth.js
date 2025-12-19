// Authentication utilities
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from './db.js';
import { cookies } from 'next/headers';

// Hash password
async function hashPassword(password) {
  return await bcrypt.hash(password, 10);
}

// Compare password
async function comparePassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

// Generate JWT token
function generateToken(userId, email, role) {
  return jwt.sign(
    { userId, email, role },
    process.env.JWT_SECRET || 'your_super_secret_jwt_key_change_this_in_production',
    { expiresIn: '24h' }
  );
}

// Verify JWT token
function verifyToken(token) {
  try {
    return jwt.verify(
      token,
      process.env.JWT_SECRET || 'your_super_secret_jwt_key_change_this_in_production'
    );
  } catch (error) {
    return null;
  }
}

// Check if user has NDA accepted
async function checkNDAAccepted(userId) {
  const result = await query(
    'SELECT accepted FROM ndas WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
    [userId]
  );
  return result.length > 0 && result[0].accepted === 1;
}

// Get user by email
async function getUserByEmail(email) {
  const users = await query('SELECT * FROM users WHERE email = ? AND is_active = 1', [email]);
  return users.length > 0 ? users[0] : null;
}

// Get user by ID
async function getUserById(userId) {
  const users = await query('SELECT * FROM users WHERE id = ? AND is_active = 1', [userId]);
  return users.length > 0 ? users[0] : null;
}

// Middleware to verify authentication
// Accepts either a token string or a request object
async function verifyAuth(tokenOrRequest) {
  let token = null;
  
  // If it's a string, treat it as a token
  if (typeof tokenOrRequest === 'string') {
    token = tokenOrRequest;
  } else {
    // Otherwise, it's a request object - extract token from cookies
    try {
      const cookieStore = await cookies();
      token = cookieStore.get('token')?.value;
    } catch (e) {
      // If cookies() fails (e.g., not in API route context), try to read from request object (fallback)
      const request = tokenOrRequest;
      token = request?.cookies?.get?.('token')?.value || 
              request?.cookies?.token || 
              request?.headers?.get?.('authorization')?.replace('Bearer ', '') ||
              request?.headers?.authorization?.replace('Bearer ', '');
    }
  }
  
  if (!token) {
    return null;
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return null;
  }

  const user = await getUserById(decoded.userId);
  return user;
}

// Check role permissions
function hasPermission(userRole, requiredRoles) {
  if (!Array.isArray(requiredRoles)) {
    requiredRoles = [requiredRoles];
  }
  return requiredRoles.includes(userRole);
}

export {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
  checkNDAAccepted,
  getUserByEmail,
  getUserById,
  verifyAuth,
  hasPermission
};

