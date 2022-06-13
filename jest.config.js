module.exports = {
  verbose: true,
  transform: { '\\.ts$': ['ts-jest'] },
  testPathIgnorePatterns: ['/.build/'],
  transformIgnorePatterns: ['<rootDir>/node_modules/'],
  coverageDirectory: '<rootDir>/coverage/',
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  testResultsProcessor: 'jest-sonar-reporter',
};
