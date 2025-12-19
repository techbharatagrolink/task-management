// Token utilities (Edge runtime compatible - no database dependencies)
import jwt from 'jsonwebtoken';

// Verify JWT token
export function verifyToken(token) {
  try {
    return jwt.verify(
      token,
      process.env.JWT_SECRET || 'your_super_secret_jwt_key_change_this_in_production'
    );
  } catch (error) {
    return null;
  }
}

// Generate JWT token
export function generateToken(userId, email, role) {
  return jwt.sign(
    { userId, email, role },
    process.env.JWT_SECRET || 'your_super_secret_jwt_key_change_this_in_production',
    { expiresIn: '24h' }
  );
}

