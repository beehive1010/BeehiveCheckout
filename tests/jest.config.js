// Jest Configuration for Beehive Platform Testing

module.exports = {
  // Test environment
  testEnvironment: 'jsdom',
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Transform configuration
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
    '^.+\\.(js|jsx)$': 'babel-jest',
  },
  
  // Module name mapping for path aliases
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@shared/(.*)$': '<rootDir>/shared/$1',
    '^@assets/(.*)$': '<rootDir>/attached_assets/$1',
  },
  
  // Test file patterns
  testMatch: [
    '<rootDir>/tests/**/*.test.{ts,tsx,js,jsx}',
    '<rootDir>/src/**/__tests__/**/*.{ts,tsx,js,jsx}',
  ],
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{ts,tsx}',
    '!src/**/__tests__/**',
    '!src/types/**',
  ],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    // Critical business logic requires higher coverage
    'src/lib/web3/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    'src/hooks/': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },
  
  // Test timeout (important for blockchain tests)
  testTimeout: 60000, // 60 seconds
  
  // Modules to ignore during testing
  modulePathIgnorePatterns: ['<rootDir>/dist/', '<rootDir>/build/'],
  
  // Mock configuration for external dependencies
  moduleNameMapping: {
    // Mock Supabase client for testing
    '^@supabase/supabase-js$': '<rootDir>/tests/mocks/supabase.ts',
    // Mock Thirdweb SDK for testing
    '^thirdweb$': '<rootDir>/tests/mocks/thirdweb.ts',
    '^thirdweb/(.*)$': '<rootDir>/tests/mocks/thirdweb.ts',
  },
  
  // Global test variables
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.json',
    },
  },
  
  // Verbose output for debugging
  verbose: true,
  
  // Fail fast on first test failure (for CI)
  bail: false,
  
  // Automatically clear mock calls and instances between every test
  clearMocks: true,
  
  // Automatically restore mock state and implementation before every test
  restoreMocks: true,
  
  // Error on deprecated APIs
  errorOnDeprecated: true,
  
  // Test reporters
  reporters: [
    'default',
    ['jest-html-reporters', {
      publicPath: './test-results',
      filename: 'test-report.html',
      openReport: false,
      expand: true,
    }],
    ['jest-junit', {
      outputDirectory: './test-results',
      outputName: 'junit.xml',
    }],
  ],
  
  // Test categories for different test types
  projects: [
    {
      displayName: 'Unit Tests',
      testMatch: ['<rootDir>/tests/unit/**/*.test.{ts,tsx}'],
      testEnvironment: 'jsdom',
    },
    {
      displayName: 'Integration Tests',
      testMatch: ['<rootDir>/tests/integration/**/*.test.{ts,tsx}'],
      testEnvironment: 'node',
      testTimeout: 120000, // Longer timeout for integration tests
    },
    {
      displayName: 'E2E Tests',
      testMatch: ['<rootDir>/tests/e2e/**/*.test.{ts,tsx}'],
      testEnvironment: 'node',
      testTimeout: 300000, // 5 minutes for E2E tests
    },
  ],
};