module.exports = {
  rootDir: '..',
  roots: ['<rootDir>/Backend', '<rootDir>/Tests/integration'],
  testEnvironment: 'node',
  testMatch: ['<rootDir>/Tests/integration/**/*.test.js'],
  moduleDirectories: ['node_modules', '<rootDir>/Backend/node_modules'],
  testTimeout: 120000,
  verbose: true
};
