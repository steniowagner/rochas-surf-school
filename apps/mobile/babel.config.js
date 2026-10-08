module.exports = function (api) {
  api.cache(true);

  return {
    // jsxImportSource lets core components take `className`; nativewind/babel compiles the Tailwind classes.
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
  };
};
