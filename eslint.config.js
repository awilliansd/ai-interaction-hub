// eslint.config.js
const js = require("@eslint/js");
const globals = require("globals");

module.exports = [
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "coverage/**",
      "icons/**",
      "assets/icons/**",
      "assets/images/**",
    ],
  },
  js.configs.recommended,
  // Código do processo principal (CommonJS / Node)
  {
    files: ["**/*.js", "**/*.cjs"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "commonjs",
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "no-unused-vars": ["error", { argsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }],
      "no-empty": ["error", { allowEmptyCatch: true }],
      "no-console": "off",
    },
  },
  // Renderer (ES modules / navegador)
  {
    files: ["assets/js/*.js"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      "no-unused-vars": ["error", { argsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }],
      "no-empty": ["error", { allowEmptyCatch: true }],
    },
  },
  // Testes Jest
  {
    files: ["**/*.test.js"],
    languageOptions: {
      globals: {
        ...globals.jest,
        ...globals.node,
      },
    },
  },
];
