module.exports = {
  rootDir: '..',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/Tests/backend/**/*.test.js'],
  moduleDirectories: ['node_modules', '<rootDir>/Backend/node_modules'],
  verbose: true,
  roots: ['<rootDir>'],
  collectCoverage: true,
  collectCoverageFrom: ['Backend/**/*.js'],
  coverageDirectory: 'Tests/coverage'
};
