# Esque Server

Backend API for the Esque project and task management application.

## Overview

This is the server-side component that powers Esque, providing:
- Multi-user projects with role-based access control
- Task management with Kanban board views
- Team collaboration features
- End-to-end encryption for sensitive data
- Auth0 authentication

## Tech Stack

Node.js 18 • TypeScript • Express • PostgreSQL • Prisma • Auth0 • Jest

## Development Setup

```bash
# Install dependencies
npm install

# Copy environment template and configure
cp .env.example .env

# Run database migrations
npx prisma migrate deploy

# Start development server
npm run dev
```

Server runs on `http://localhost:3001`

### Required Environment Variables

See `.env.example` for the full list. Key variables:
- `DATABASE_URL` - PostgreSQL connection string
- `AUTH0_DOMAIN` / `AUTH0_AUDIENCE` - Auth0 configuration
- `ENCRYPTION_KEY` - 256-bit key for data encryption (generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)

## Available Scripts

- `npm run dev` - Start dev server with hot reload
- `npm run build` - Compile TypeScript
- `npm test` - Run all tests
- `npm run test:unit` - Unit tests only
- `npm run test:coverage` - Generate coverage report

## Project Structure

- `src/controllers/` - Request handlers
- `src/routes/` - API route definitions
- `src/middleware/` - Auth, validation, rate limiting
- `src/services/` - Business logic (encryption, etc.)
- `src/utils/` - Helpers (permissions, auth)
- `prisma/` - Database schema and migrations

## API Documentation

See [/docs/API.md](docs/API.md) for endpoint documentation.

Base URL: `/api`

All endpoints require Auth0 JWT authentication via `Authorization: Bearer <token>` header.

## Contributing

1. Create a feature branch from `main`
2. Make your changes
3. Write/update tests (`npm test`)
4. Open a PR

### Development Guidelines

- Run tests before committing (`npm test`)
- Follow existing TypeScript patterns
- Add tests for new features
- Update API docs if adding/changing endpoints

## Deployment

The `main` branch automatically deploys to Render via GitHub Actions when tests pass.

## License

ISC
