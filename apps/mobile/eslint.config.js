// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    // Every push is singular (spec 087): a repeated tap must not stack the same screen twice.
    files: ['src/**/*.{js,jsx,ts,tsx}'],
    ignores: ['src/navigation/push-screen.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "CallExpression[callee.object.name='router'][callee.property.name='push']",
          message:
            "Use pushScreen from @/navigation/push-screen so a repeated tap doesn't open the screen twice.",
        },
      ],
    },
  },
]);
