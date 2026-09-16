# SafeDrive AI Security & Privacy Design

## Overview
SafeDrive AI handles sensitive biometric metadata and user accounts. The security architecture is designed to enforce strict access controls and prioritize user privacy at the edge.

## Security Controls Implemented

- **Password Hashing**: User passwords are never stored in plaintext. They are hashed using `bcryptjs` (salt rounds = 10) before insertion into the D1 database.
- **JWT Authentication**: The API is fully stateless. Upon successful login, the server issues a JSON Web Token (JWT). All subsequent protected API requests must include this token in the `Authorization: Bearer <token>` header.
- **Secure Secret Management**: The JWT secret is injected via environment variables (`.dev.vars` locally, Cloudflare Secrets in production) and is not hardcoded in the repository.
- **Authenticated API Routes**: The Hono API enforces authentication middleware on all routes managing profiles, trips, telemetry, and events. Unauthenticated requests are rejected with `401 Unauthorized`.
- **User-Scoped Database Access**: All SQL queries involving trips and telemetry strictly filter by the authenticated user's ID. Users cannot access or enumerate records belonging to other accounts.
- **No Hardcoded Demo Accounts**: There is no hardcoded demo account bypass in the authentication logic. All users must explicitly register and log in.
- **Protected Database Export**: Any endpoints that export database analytics or JSON formats are protected behind the JWT authentication middleware.
- **Git Exclusion**: Sensitive files such as `.env`, `.dev.vars`, and `secrets.json` are explicitly excluded from version control via `.gitignore`.

## Privacy-Conscious Data Storage

- **No Raw Webcam Uploads**: The most critical privacy feature is edge-processing. Video frames are captured via `getUserMedia()`, rendered to an invisible HTML5 canvas, processed by the local browser AI models, and immediately discarded.
- **Abstracted Telemetry**: The server only receives abstracted, mathematical metadata (e.g., Risk Score: 85, Event: "Phone Detected", EAR: 0.15). No images, videos, or personally identifiable biometric point clouds ever leave the user's device.
