module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/Tests/backend/**/*.test.js'],
  verbose: true,
  roots: ['<rootDir>'],
  collectCoverage: true,
  collectCoverageFrom: ['Backend/**/*.js'],
  coverageDirectory: 'Tests/coverage'
};
