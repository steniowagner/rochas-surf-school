const jestExpoPreset = require("jest-expo/jest-preset");

// Same transform as jest-expo, with the React Compiler on as in the app (experiments.reactCompiler in app.json).
// Without it, tests would miss bugs that only the compiler's caching causes.
const [transformer, babelOptions] = jestExpoPreset.transform["\\.[jt]sx?$"];

/** @type {import('jest').Config} */
module.exports = {
  preset: "jest-expo",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  transform: {
    "\\.[jt]sx?$": [
      transformer,
      {
        ...babelOptions,
        caller: { ...babelOptions.caller, supportsReactCompiler: true },
      },
    ],
  },
  // Same aliases as tsconfig.json ("@/assets/*" must come before "@/*").
  moduleNameMapper: {
    // jest-expo resolves uuid (used by @rochas-surf-school/shared) to its browser ESM build, which Jest can't parse.
    "^uuid$": require.resolve("uuid", {
      paths: [require.resolve("@rochas-surf-school/shared")],
    }),
    "^@/assets/(.*)$": "<rootDir>/assets/$1",
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  testMatch: ["<rootDir>/src/**/*.test.{ts,tsx}"],
};
