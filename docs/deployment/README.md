# SafeDrive AI Deployment Guide

## Overview
SafeDrive AI is deployed using a modern, serverless architecture on Cloudflare. The backend utilizes Cloudflare Workers to serve the Hono REST API and static React assets, while the database runs on Cloudflare D1 (a serverless SQLite database).

## Architecture
- **Frontend**: Built with Vite and React. The `dist/` bundle is uploaded as Cloudflare Worker assets.
- **Backend**: Hono framework running on Cloudflare Workers edge nodes.
- **Database**: Cloudflare D1 relational database.

## Prerequisites
- Cloudflare Account
- Node.js (v18+)
- Wrangler CLI (`npm install -g wrangler`)

## Authentication & Secrets
The API relies on JWT for authentication. A secure secret must be provided to the worker.

**DO NOT hardcode secrets or commit `.dev.vars` / `.env` to Git.**

To set the secret in production:
```bash
npx wrangler secret put JWT_SECRET
```
*When prompted, paste your secure, randomly generated string.*

## D1 Database Configuration

1. Create the D1 Database:
```bash
npx wrangler d1 create safedrive-db
```

2. Update `wrangler.jsonc` with the output `database_name` and `database_id`.

## Migrations
Migrations define the SQL schemas for Users, Trips, Telemetry, and Events.

Apply migrations locally (for development):
```bash
npx wrangler d1 migrations apply safedrive-db --local
```

Apply migrations to production:
```bash
npx wrangler d1 migrations apply safedrive-db --remote
```

## Build and Deploy

1. Build the frontend assets:
```bash
npm run build
```

2. Deploy the Worker and Assets to Cloudflare:
```bash
npm run deploy
```

## Preview and Production
- **Local Preview**: Run `npm run preview` to simulate the Cloudflare Worker environment locally.
- **Production URL**: The live application is accessible at `https://safedrive-ai.naziasultana0430.workers.dev`.
