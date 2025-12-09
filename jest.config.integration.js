module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/integration'],
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  verbose: true,
  testTimeout: 10000,
  setupFiles: ['<rootDir>/tests/setup/jest.env.ts'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup/teardown.ts'],
  maxWorkers: 1, // Prevent parallel test execution causing DB deadlocks
};
