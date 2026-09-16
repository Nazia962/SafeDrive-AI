/**
 * SafeDrive AI - Cloudflare Worker Entry
 * Replaces Express Backend
 */
import { Hono } from 'hono';
import { serveStatic } from 'hono/cloudflare-workers';
import { apiRouter } from './server/routes';

type Bindings = {
  safedrive_db: D1Database;
  JWT_SECRET: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// Mount API routes
app.route('/api', apiRouter);

// Serve static assets from /dist in Cloudflare
app.get('/*', serveStatic({ root: './' }));

export default app;
