// tests/setup/authMock.ts
// Global state for mocking auth in tests
import { User } from '@prisma/client';

export let mockAuthState: { auth0Id?: string; email?: string; user?: User } | null = null;

export function setMockAuth(auth0Id: string, email?: string, user?: User) {
  mockAuthState = {
    auth0Id,
    email: email || `${auth0Id}@test.com`,
    user,
  };
}

export function clearMockAuth() {
  mockAuthState = null;
}

export function getMockAuth() {
  return mockAuthState;
}

export function getMockUser(): User | undefined {
  return mockAuthState?.user;
}
