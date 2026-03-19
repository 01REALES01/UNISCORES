import type { Config } from 'jest';
import nextJest from 'next/jest.js';

const createJestConfig = nextJest({
    dir: './',
});

const config: Config = {
    displayName: 'project_olympics',
    testEnvironment: 'jsdom',
    setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
    },
    testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/.next/'],
    collectCoverageFrom: [
        'src/**/*.{ts,tsx}',
        '!src/**/*.d.ts',
        '!src/**/layout.tsx',
        '!src/**/providers.tsx',
        '!src/middleware.ts',
    ],
    coverageThreshold: {
        global: {
            branches: 0.9,
            functions: 1,
            lines: 1,
            statements: 1,
        },
    },
};

export default createJestConfig(config);
