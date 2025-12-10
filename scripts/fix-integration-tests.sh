#!/bin/bash
# Script to update all integration test files to pass user object to setMockAuth

TEST_FILES=(
  "tests/integration/comments.test.ts"
  "tests/integration/projects.test.ts"
  "tests/integration/tasks.test.ts"
  "tests/integration/team.test.ts"
)

for file in "${TEST_FILES[@]}"; do
  echo "Updating $file..."

  # Find all patterns like setMockAuth(variable.authProviderId, variable.email)
  # and add the user object as third parameter

  # Pattern 1: setMockAuth(user.authProviderId, user.email) -> setMockAuth(user.authProviderId, user.email, user)
  perl -i -pe 's/setMockAuth\((\w+)\.authProviderId,\s*\1\.email\)/setMockAuth($1.authProviderId, $1.email, $1)/g' "$file"

  # Remove getMockAuth from imports if it exists
  perl -i -pe 's/(import.*\{[^}]*),\s*getMockAuth([^}]*\}.*from.*authMock)/$1$2/g' "$file"
done

echo "All test files updated!"
