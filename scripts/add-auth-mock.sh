#!/bin/bash
# Add getAuthenticatedUser mock to all integration test files

TEST_FILES=(
  "tests/integration/comments.test.ts"
  "tests/integration/tasks.test.ts"
  "tests/integration/team.test.ts"
  "tests/integration/urgentTasks.test.ts"
)

MOCK_CODE="
jest.mock('../../src/utils/auth', () => ({
  getAuthenticatedUser: jest.fn(async (req: any) => {
    const { getMockUser } = require('../setup/authMock');
    const mockUser = getMockUser();
    if (!mockUser) {
      throw new Error('Unauthorized');
    }
    return mockUser;
  }),
}));"

for file in "${TEST_FILES[@]}"; do
  echo "Updating $file..."

  # Find the line after the last jest.mock and add our mock
  # Using awk to find the last jest.mock block and add after it
  awk -v mock="$MOCK_CODE" '
    /^jest\.mock\(/ { in_mock=1; last_mock_end=NR }
    in_mock && /^\}\);$/ { in_mock=0; last_mock_line=NR }
    { lines[NR] = $0 }
    END {
      for (i=1; i<=NR; i++) {
        print lines[i]
        if (i == last_mock_line && lines[i] ~ /^\}\);$/) {
          print ""
          print mock
        }
      }
    }
  ' "$file" > "$file.tmp" && mv "$file.tmp" "$file"
done

echo "All test files updated with auth mock!"
