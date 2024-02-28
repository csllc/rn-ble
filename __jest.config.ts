import type {Config} from 'jest';

const config: Config = {
  verbose: true,
  preset: 'react-native',
  roots: ['<rootDir>/src'],
  testMatch: [
    './src/**/__tests__/**/*.+(ts|tsx|js)',
    './src/**/?(*.)+(spec|test).+(ts|tsx|js)',
  ],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
};

export default config;
