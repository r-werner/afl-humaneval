module.exports = {
  roots: ['<rootDir>/tests'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  },
  testRegex: '.*\\.test\\.(ts|tsx|js|jsx)$',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  // Automatically clear mock calls and instances between every test
  clearMocks: true,
  // Use ts-jest for TypeScript files
  preset: 'ts-jest',
};
