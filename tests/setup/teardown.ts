// tests/setup/teardown.ts
import { disconnectDatabase } from './testDb';

// Clean up after all tests
afterAll(async () => {
  await disconnectDatabase();
});
