module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/rules.test.ts', '**/emulator-smoke.test.ts'],
  // rules.test.ts and emulator-smoke.test.ts both write to
  // households/demo-household against the same emulator instance, and
  // rules.test.ts's afterEach clears the entire emulator project. Run
  // serially so a bare `jest --config jest.rules.config.js` (no
  // --testPathPattern) can't race the two suites against each other.
  maxWorkers: 1,
};
