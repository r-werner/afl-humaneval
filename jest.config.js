module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node', // Or 'jsdom' for browser-based tests
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testMatch: ['<rootDir>/test/**/*.test.(ts|tsx|js|jsx)'],
  collectCoverage: true, // Enable coverage reports
  coverageDirectory: 'coverage',
};
