module.exports = {
  clearMocks: true,
  testEnvironment: "jsdom",
  testEnvironmentOptions: { url: "http://localhost/" },
  testMatch: ["<rootDir>/tests/**/*.test.[jt]s?(x)"],
  testPathIgnorePatterns: [
    "<rootDir>/tests/adminAccessPolicy.test.ts",
    "<rootDir>/tests/AdminAccessPage.test.tsx",
  ],
  transform: {
    "^.+\\.[tj]sx?$": [
      "ts-jest",
      {
        tsconfig: {
          module: "CommonJS",
          jsx: "react-jsx",
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          strict: true,
        },
      },
    ],
  },
  moduleNameMapper: {
    "^@prosolutions/ui$": "<rootDir>/tests/mocks/prosolutionsUi.tsx",
  },
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
};
