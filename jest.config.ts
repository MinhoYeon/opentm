// jest.config.ts
import nextJest from 'next/jest';

const createJestConfig = nextJest({ dir: './' });

const customConfig = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/tests/setup/jest-dom.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};

export default createJestConfig(customConfig);
