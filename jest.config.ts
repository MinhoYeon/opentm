// jest.config.ts
import nextJest from 'next/jest.js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

function resolveTestEnvironment() {
  try {
    require.resolve('jest-environment-jsdom');
    return 'jest-environment-jsdom';
  } catch (error) {
    console.warn(
      'jest-environment-jsdom is not installed; falling back to the "node" test environment. ' +
        'Install it with "npm install --save-dev jest-environment-jsdom" to run DOM-based tests.',
      error,
    );
    return 'node';
  }
}

const createJestConfig = nextJest({ dir: './' });

const customConfig = {
  testEnvironment: resolveTestEnvironment(),
  setupFilesAfterEnv: ['<rootDir>/tests/setup/jest-dom.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testPathIgnorePatterns: ['<rootDir>/tests/status-transition.test.mjs'],
};

export default createJestConfig(customConfig);
