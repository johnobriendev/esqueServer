#!/bin/bash
# Apply all necessary mocks to integration test files

TEST_FILES=(
  "tests/integration/comments.test.ts"
  "tests/integration/projects.test.ts"
  "tests/integration/tasks.test.ts"
  "tests/integration/team.test.ts"
  "tests/integration/urgentTasks.test.ts"
)

PRISMA_MOCK="// Mock prisma to use test database client
jest.mock('../../src/models/prisma', () => {
  const { prisma } = require('../setup/testDb');
  return {
    __esModule: true,
    default: prisma(),
  };
});"

AUTH_MOCK="jest.mock('../../src/utils/auth', () => {
  const actualAuth = jest.requireActual<typeof import('../../src/utils/auth')>('../../src/utils/auth');
  return {
    ...actualAuth,
    getAuthenticatedUser: async (req: any) => {
      const { getMockUser } = require('../setup/authMock');
      const mockUser = getMockUser();
      if (!mockUser) {
        throw new Error('Unauthorized');
      }
      return mockUser;
    },
  };
});"

for file in "${TEST_FILES[@]}"; do
  echo "Processing $file..."

  # Check if prisma mock already exists
  if ! grep -q "jest.mock('../../src/models/prisma'" "$file"; then
    # Add prisma mock after the imports, before first jest.mock
    awk -v prisma_mock="$PRISMA_MOCK" '
      /^jest\.mock\(/ && !added { print prisma_mock; print ""; added=1 }
      { print }
    ' "$file" > "$file.tmp" && mv "$file.tmp" "$file"
  fi

  # Check if auth utils mock exists
  if ! grep -q "jest.mock('../../src/utils/auth'" "$file"; then
    # Add after prisma mock or after middleware mock
    awk -v auth_mock="$AUTH_MOCK" '
      /^\}\);$/ && /jest\.mock/ && !added { print; print ""; print auth_mock; added=1; next }
      { print }
    ' "$file" > "$file.tmp" && mv "$file.tmp" "$file"
  fi
done

echo "All files processed!"
