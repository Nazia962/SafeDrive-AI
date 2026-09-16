import { Context, Next } from 'hono';
import { sign, verify } from 'hono/jwt';
import type { User } from '../src/types';

export async function generateToken(user: User, secret: string): Promise<string> {
  return await sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60 // 7 days
    },
    secret,
    'HS256'
  );
}

export async function requireAuth(c: Context, next: Next) {
  const authHeader = c.req.header('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized: Missing or invalid token' }, 401);
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = await verify(token, c.env.JWT_SECRET, 'HS256') as { id: string; email: string };
    
    // Check if user exists in DB
    const { results } = await c.env.safedrive_db.prepare('SELECT id, email, name, role, created_at as createdAt FROM users WHERE id = ?')
      .bind(decoded.id)
      .all();
      
    if (!results || results.length === 0) {
      return c.json({ error: 'User session expired or not found' }, 401);
    }
    
    c.set('user', results[0] as User);
    await next();
  } catch (err) {
    return c.json({ error: 'Invalid authentication token' }, 401);
  }
}
