# Testing Guide

## Overview

This project uses Jest for testing with two types of tests:
- **Unit Tests**: Test individual functions in isolation (no database)
- **Integration Tests**: Test complete API endpoints with database

## Running Tests

### Unit Tests (Safe - No Database)
```bash
npm run test:unit
```

### Integration Tests (Requires Test Database)
```bash
npm run test:integration
```

### All Tests
```bash
npm test
```

### Watch Mode (for development)
```bash
npm run test:watch
```

### Coverage Report
```bash
npm run test:coverage
```

## Setting Up Integration Tests

Integration tests require a **separate test database**. Never use your production database!

### Option 1: Local PostgreSQL
```bash
# Install PostgreSQL
sudo apt install postgresql  # Linux
brew install postgresql      # macOS

# Create test database
createdb notionesque_test

# Create .env.test file
cat > .env.test << EOF
TEST_DATABASE_URL=postgresql://user:password@localhost:5432/notionesque_test
ENCRYPTION_KEY=01e88d6c845afa37063caa40aa23f970bb4aa865f1f56ed5187eccc199afd6d4
AUTH0_AUDIENCE=https://notionesque
AUTH0_DOMAIN=dev-cq7yg11c20313sse.us.auth0.com
EOF

# Run migrations on test database
DATABASE_URL=postgresql://user:password@localhost:5432/notionesque_test npx prisma migrate deploy
```

### Option 2: Neon Test Database
1. Create a separate Neon project for testing
2. Copy the connection string to `.env.test` as `TEST_DATABASE_URL`
3. Run migrations: `DATABASE_URL=<test-db-url> npx prisma migrate deploy`

### Option 3: Docker PostgreSQL
```bash
# Start PostgreSQL container
docker run --name postgres-test -e POSTGRES_PASSWORD=test -p 5432:5432 -d postgres:15

# Run migrations
DATABASE_URL=postgresql://postgres:test@localhost:5432/postgres npx prisma migrate deploy
```

## Safety Features

Integration tests have multiple safety checks:
- ✅ Requires `TEST_DATABASE_URL` to be set
- ✅ Blocks if URL contains "neondb" (production indicator)
- ✅ Throws error before connecting if safety checks fail

## Test Structure

```
tests/
├── unit/                            # 7 test files
│   ├── auth.test.ts                # Auth middleware
│   ├── encryptionService.test.ts   # Encryption/decryption
│   ├── errorHandler.test.ts        # Error handling
│   ├── rateLimiter.test.ts         # Rate limiting
│   └── validation.test.ts          # Input validation
├── integration/                     # 5 test files
│   ├── comments.test.ts            # Comments API
│   ├── projects.test.ts            # Projects API (NEW)
│   ├── tasks.test.ts               # Tasks API (NEW)
│   ├── team.test.ts                # Team/collaboration API (NEW)
│   └── urgentTasks.test.ts         # Cross-project tasks
└── setup/
    ├── testDb.ts                   # Database helpers
    ├── testHelpers.ts              # Test data factories
    └── jest.env.ts                 # Environment setup
```

## CI/CD with GitHub Actions

The repository includes a GitHub Actions workflow that:
1. Runs unit tests on every push/PR
2. Spins up a PostgreSQL container for integration tests
3. Runs all tests in a clean environment

### Setting Up GitHub Secrets

Add these secrets to your GitHub repository (Settings → Secrets → Actions):
- `ENCRYPTION_KEY` - Your encryption key
- `AUTH0_AUDIENCE` - Auth0 audience
- `AUTH0_DOMAIN` - Auth0 domain

## Writing New Tests

### Unit Test Example
```typescript
// tests/unit/myFunction.test.ts
import { myFunction } from '../../src/utils/myFunction';

describe('myFunction', () => {
  it('should do something', () => {
    expect(myFunction('input')).toBe('expected');
  });
});
```

### Integration Test Example
```typescript
// tests/integration/myEndpoint.test.ts
import request from 'supertest';
import app from '../../src/app';
import { clearDatabase } from '../setup/testDb';
import { createTestUser } from '../setup/testHelpers';

describe('My Endpoint', () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  it('should return data', async () => {
    const user = await createTestUser();

    const response = await request(app)
      .get('/api/endpoint')
      .expect(200);

    expect(response.body).toHaveProperty('data');
  });
});
```

## Best Practices

1. **Always run unit tests first** - They're fast and catch most issues
2. **Clear database before each integration test** - Ensures test isolation
3. **Use test helpers** - Create reusable test data factories
4. **Mock external services** - Auth0, email services, etc.
5. **Test edge cases** - Not just happy paths
6. **Keep tests focused** - One concept per test

## Troubleshooting

### "TEST_DATABASE_URL is not set"
Create a `.env.test` file with your test database URL.

### "Tests are slow"
Run only unit tests during development: `npm run test:unit`

### "Database connection failed"
Ensure your test database is running and migrations are applied.

## Coverage Goals & Status

**Current Thresholds**: 70% (branches, functions, lines, statements)

**Coverage Status**:
- ✅ Unit Tests: Auth, encryption, validation, error handling, rate limiting
- ✅ Integration Tests: Projects, tasks, team, comments, urgent tasks APIs
- ⚠️ Missing: User endpoints, utilities (auth.ts, permissions.ts)

**Next Steps**:
1. Add user API integration tests (GET/PATCH /api/users/me)
2. Test utility functions (auth.ts, permissions.ts)
3. Add edge case tests (concurrent updates, DB failures)
4. Increase threshold to 80%
