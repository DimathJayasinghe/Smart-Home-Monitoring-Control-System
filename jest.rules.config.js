module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/rules.test.ts', '**/emulator-smoke.test.ts'],
};
