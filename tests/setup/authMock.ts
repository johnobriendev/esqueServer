// tests/setup/authMock.ts
// Global state for mocking auth in tests

export let mockAuthState: { auth0Id?: string; email?: string } | null = null;

export function setMockAuth(auth0Id: string, email?: string) {
  mockAuthState = {
    auth0Id,
    email: email || `${auth0Id}@test.com`,
  };
}

export function clearMockAuth() {
  mockAuthState = null;
}

export function getMockAuth() {
  return mockAuthState;
}
