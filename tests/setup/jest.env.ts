// tests/setup/jest.env.ts
// Set up environment variables for Jest tests

// Set ENCRYPTION_KEY for encryption tests
process.env.ENCRYPTION_KEY = '01e88d6c845afa37063caa40aa23f970bb4aa865f1f56ed5187eccc199afd6d4';

// Auth0 config for middleware initialization
process.env.AUTH0_DOMAIN = 'test.auth0.com';
process.env.AUTH0_AUDIENCE = 'https://test-api.example.com';

// Test database URL (only set if not already set in environment)
if (!process.env.TEST_DATABASE_URL) {
  process.env.TEST_DATABASE_URL = 'postgresql://test_user:test_password@localhost:5432/test_db';
}

// Ensure we're in test mode
process.env.NODE_ENV = 'test';
