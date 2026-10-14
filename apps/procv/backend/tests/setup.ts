// Jest setup file
// This file is executed before running tests

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only-32chars';
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/procv_test?schema=public';

// Global test setup can go here
// For example, setting up test database, mocking external services, etc.

// Increase timeout for integration tests
// Note: This will be available after Jest types are properly configured
if (typeof jest !== 'undefined') {
  jest.setTimeout(30000);
}
