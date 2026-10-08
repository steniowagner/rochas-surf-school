const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, {
  input: "./src/global.css",
  configPath: "./tailwind.config.ts",
  // Same rem as the web app (16px), so a class like `min-h-11` is the same size on both platforms.
  inlineRem: 16,
});
