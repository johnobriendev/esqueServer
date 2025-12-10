// tests/setup/jest.env.ts
// Set up environment variables for Jest tests
import dotenv from 'dotenv';
import path from 'path';

// Load .env.test file
dotenv.config({ path: path.resolve(__dirname, '../../.env.test') });

// Ensure we're in test mode
process.env.NODE_ENV = 'test';
