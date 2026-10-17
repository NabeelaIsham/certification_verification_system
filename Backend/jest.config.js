module.exports = {
  rootDir: '..',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/Tests/backend/**/*.test.js'],
  moduleDirectories: ['node_modules', '<rootDir>/Backend/node_modules'],
  verbose: true,
  roots: ['<rootDir>/Backend', '<rootDir>/Tests/backend'],
  collectCoverage: true,
  collectCoverageFrom: ['Backend/**/*.js'],
  coverageDirectory: 'Tests/coverage'
};
