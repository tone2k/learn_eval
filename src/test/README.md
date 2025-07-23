# Integration Test Suite

This directory contains comprehensive integration tests for the application, covering database operations, API endpoints, authentication, rate limiting, and end-to-end workflows.

## 📁 Directory Structure

```
src/test/
├── README.md                 # This file
├── setup.ts                  # Global test setup and mocks
├── environment.ts            # Test environment management
├── config.ts                 # Test configuration and utilities
├── database.ts               # Database test utilities
├── redis.ts                  # Redis test utilities
├── utils.ts                  # Common test utilities
└── integration/              # Integration test files
    ├── db.test.ts           # Database query tests
    ├── rate-limit.test.ts   # Rate limiting tests
    ├── chat-api.test.ts     # Chat API endpoint tests
    ├── auth.test.ts         # Authentication tests
    ├── utils.test.ts        # Utility function tests
    └── e2e.test.ts          # End-to-end workflow tests
```

## 🚀 Quick Start

### Prerequisites

1. **Database**: PostgreSQL instance running
2. **Redis**: Redis instance running
3. **Environment Variables**: Test environment configured

### Running Tests

```bash
# Run all integration tests
pnpm test:integration

# Run specific test file
pnpm test src/test/integration/db.test.ts

# Run tests with coverage
pnpm test:coverage

# Run tests in watch mode
pnpm test --watch

# Run tests with verbose output
pnpm test --reporter=verbose
```

## 🔧 Test Environment Setup

### Environment Variables

Create a `.env.test` file with the following variables:

```env
# Database
DATABASE_URL=postgresql://test:test@localhost:5432/test_db

# Redis
REDIS_URL=redis://localhost:6379

# Authentication (test values)
AUTH_SECRET=test-secret-key
AUTH_DISCORD_ID=test-discord-id
AUTH_DISCORD_SECRET=test-discord-secret

# External Services (test keys)
GOOGLE_GENERATIVE_AI_API_KEY=test-google-ai-key
SERPER_API_KEY=test-serper-key
LANGFUSE_SECRET_KEY=test-langfuse-secret
LANGFUSE_PUBLIC_KEY=test-langfuse-public
LANGFUSE_BASEURL=https://test.langfuse.com

# Test Configuration
NODE_ENV=test
EVAL_DATASET=dev
SEARCH_RESULTS_COUNT=3
MAX_PAGES_TO_SCRAPE=6
TEST_TIMEOUT=30000
```

### Database Setup

1. **Create test database**:
   ```sql
   CREATE DATABASE test_db;
   CREATE USER test WITH PASSWORD 'test';
   GRANT ALL PRIVILEGES ON DATABASE test_db TO test;
   ```

2. **Run migrations**:
   ```bash
   pnpm db:push
   ```

### Redis Setup

1. **Start Redis server**:
   ```bash
   redis-server
   ```

2. **Verify connection**:
   ```bash
   redis-cli ping
   ```

## 📋 Test Categories

### 1. Database Tests (`db.test.ts`)

Tests database query functions and data integrity:

- **Chat Operations**: Create, read, update, delete chats
- **Message Operations**: Store and retrieve messages
- **User Isolation**: Ensure users can only access their own data
- **Data Integrity**: Verify foreign key constraints and relationships
- **Transaction Handling**: Test database transactions and rollbacks

**Key Functions Tested**:
- `upsertChat()` - Create or update chats with messages
- `getChat()` - Retrieve chat with messages
- `getChats()` - List user's chats
- `generateChatTitle()` - Generate chat titles from messages

### 2. Rate Limiting Tests (`rate-limit.test.ts`)

Tests Redis-based rate limiting functionality:

- **Request Counting**: Track requests within time windows
- **Limit Enforcement**: Block requests when limits exceeded
- **Window Management**: Handle sliding window rate limits
- **Retry Mechanism**: Test retry functionality
- **Key Expiration**: Verify TTL behavior

**Key Functions Tested**:
- `checkRateLimit()` - Check if request is allowed
- `recordRateLimit()` - Record a request
- Window reset behavior
- Error handling

### 3. Chat API Tests (`chat-api.test.ts`)

Tests Next.js API route handlers:

- **Authentication**: Verify user authentication requirements
- **Request Handling**: Test GET and POST endpoints
- **Data Validation**: Validate request/response formats
- **Error Handling**: Test error scenarios
- **Rate Limiting**: Verify rate limiting integration

**Endpoints Tested**:
- `GET /api/chat` - Retrieve chat messages
- `POST /api/chat` - Create/update chats and send messages

### 4. Authentication Tests (`auth.test.ts`)

Tests NextAuth.js configuration and handlers:

- **Provider Configuration**: Verify Discord provider setup
- **Session Management**: Test session and JWT callbacks
- **Handler Functions**: Test GET and POST handlers
- **Environment Variables**: Validate auth configuration

### 5. Utility Tests (`utils.test.ts`)

Tests utility functions:

- **Markdown Processing**: Test markdown transformation
- **Data Transformation**: Verify data format conversions
- **Error Handling**: Test edge cases and error scenarios

### 6. End-to-End Tests (`e2e.test.ts`)

Tests complete user workflows:

- **Complete Chat Flow**: Full chat creation and message flow
- **Multi-User Scenarios**: Multiple users with separate chats
- **Rate Limiting Integration**: Rate limiting in real scenarios
- **Data Consistency**: Concurrent operations and data integrity
- **Performance**: Large datasets and rapid requests

## 🛠️ Test Utilities

### Test Environment (`environment.ts`)

Manages the overall test environment:

```typescript
import { testEnvironment } from "~/test/environment";

// Get environment status
const status = testEnvironment.getStatus();

// Initialize environment
await testEnvironment.initialize();

// Cleanup environment
await testEnvironment.cleanup();
```

### Database Utilities (`database.ts`)

Provides database test helpers:

```typescript
import { testDatabase } from "~/test/database";

// Create test chat
const result = await testDatabase.createTestChat({
  userId: "user-123",
  title: "Test Chat",
  messages: [
    { role: "user", content: "Hello" },
    { role: "assistant", content: "Hi there!" }
  ]
});

// Get test chat
const chat = await testDatabase.getTestChat("chat-123", "user-123");

// Clean up test data
await testDatabase.cleanup();
```

### Redis Utilities (`redis.ts`)

Provides Redis test helpers:

```typescript
import { testRedis } from "~/test/redis";

// Set test key
await testRedis.setTestKey("counter", "5", 60);

// Get test key
const result = await testRedis.getTestKey("counter");

// Increment counter
await testRedis.incrementTestCounter("requests", 3600);

// Clean up test keys
await testRedis.cleanup();
```

### Test Configuration (`config.ts`)

Provides test configuration and utilities:

```typescript
import { testEnvUtils } from "~/test/config";

// Generate test data
const user = testEnvUtils.generateTestUser();
const chat = testEnvUtils.generateTestChat();
const message = testEnvUtils.generateTestMessage();

// Create test environment variables
const envVars = testEnvUtils.createTestEnvVars({
  DATABASE_URL: "postgresql://test:test@localhost:5432/test_db"
});
```

## 🔍 Test Patterns

### Test Structure

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { testEnvironment } from "~/test/environment";

describe("Feature Tests", () => {
  beforeEach(async () => {
    // Setup test data
  });

  afterEach(async () => {
    // Cleanup test data
  });

  it("should perform expected behavior", async () => {
    // Test implementation
    expect(result).toBe(expected);
  });
});
```

### Mocking External Services

External services are automatically mocked in the test environment:

- **Google AI**: Mocked text generation and streaming
- **Serper API**: Mocked search results
- **Langfuse**: Mocked tracing and observability
- **Vercel Functions**: Mocked geolocation

### Performance Testing

```typescript
import { testEnvironment } from "~/test/environment";

it("should handle large datasets efficiently", async () => {
  const { result, duration } = await testEnvironment.utils.measurePerformance(
    async () => {
      // Performance test operation
    },
    5000 // 5 second timeout
  );

  expect(duration).toBeLessThan(1000); // Should complete within 1 second
});
```

### Error Scenario Testing

```typescript
it("should handle database connection failures", async () => {
  // Mock database failure
  vi.mock("~/server/db", () => ({
    db: {
      execute: vi.fn().mockRejectedValue(new Error("Connection failed"))
    }
  }));

  // Test error handling
  await expect(operation()).rejects.toThrow("Connection failed");
});
```

## 📊 Test Coverage

The test suite aims for comprehensive coverage:

- **Lines**: 80% minimum
- **Functions**: 80% minimum
- **Branches**: 80% minimum
- **Statements**: 80% minimum

### Coverage Report

Run coverage analysis:

```bash
pnpm test:coverage
```

This generates:
- Console report
- HTML report in `coverage/` directory
- JSON report for CI/CD integration

## 🚨 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Verify PostgreSQL is running
   - Check `DATABASE_URL` in environment
   - Ensure test database exists

2. **Redis Connection Failed**
   - Verify Redis is running
   - Check `REDIS_URL` in environment
   - Test connection with `redis-cli ping`

3. **Test Timeouts**
   - Increase timeout in `vitest.config.ts`
   - Check for slow database queries
   - Verify external service mocks

4. **Test Data Cleanup Issues**
   - Check database permissions
   - Verify cleanup patterns in config
   - Run manual cleanup: `pnpm test:cleanup`

### Debug Mode

Run tests with debug output:

```bash
DEBUG=* pnpm test:integration
```

### Manual Cleanup

If tests fail to cleanup properly:

```bash
# Clean database
psql -d test_db -c "DELETE FROM messages WHERE chat_id LIKE 'test-%';"
psql -d test_db -c "DELETE FROM chats WHERE id LIKE 'test-%';"

# Clean Redis
redis-cli KEYS "test_*" | xargs redis-cli DEL
```

## 🔄 CI/CD Integration

### GitHub Actions Example

```yaml
name: Integration Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: test_db
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: pnpm install
      - run: pnpm test:integration
      - run: pnpm test:coverage
```

## 📈 Performance Benchmarks

The test suite includes performance benchmarks:

- **Database Operations**: < 100ms per operation
- **Redis Operations**: < 50ms per operation
- **API Responses**: < 500ms per request
- **Large Dataset Handling**: < 5s for 1000 records

## 🤝 Contributing

When adding new tests:

1. **Follow the existing patterns** in the test files
2. **Use the provided utilities** for database and Redis operations
3. **Mock external services** consistently
4. **Add appropriate error scenarios**
5. **Update this README** with new test categories
6. **Ensure test isolation** - tests should not depend on each other

### Adding New Test Files

1. Create test file in `src/test/integration/`
2. Import required utilities
3. Follow the test structure pattern
4. Add comprehensive test cases
5. Update the test index if needed

### Test Naming Conventions

- **File names**: `feature.test.ts` or `feature.spec.ts`
- **Describe blocks**: Feature or component name
- **Test names**: Should describe expected behavior
- **Variables**: Use descriptive names with test prefixes

Example:
```typescript
describe("Chat API Integration Tests", () => {
  it("should create new chat with messages", async () => {
    const testChatId = "test-chat-123";
    // Test implementation
  });
});
```