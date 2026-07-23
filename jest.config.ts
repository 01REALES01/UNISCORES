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
        // Páginas y route handlers: territorio de integración, no de unit tests
        '!src/app/**',
        // Scratch de desarrollo, no es código de producción
        '!src/shared/scratch/**',
    ],
    // Tripwire para que la cobertura no caiga a cero, no una meta de calidad.
    // Subir a medida que crezcan las suites.
    coverageThreshold: {
        global: {
            branches: 0.25,
            functions: 0.25,
            lines: 0.25,
            statements: 0.25,
        },
    },
};

export default createJestConfig(config);
