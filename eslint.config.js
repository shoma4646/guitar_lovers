// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    files: ["jest.setup.js"],
    languageOptions: {
      globals: { jest: "readonly" },
    },
  },
  {
    files: ["src/**/*.tsx"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "JSXOpeningElement[name.name='Pressable'] > JSXAttribute[name.name='style'] > JSXExpressionContainer > :matches(ArrowFunctionExpression, FunctionExpression)",
          message:
            "NativeWindのcss-interopはPressableの関数形式styleを呼ばずに捨て、見た目が全て消える。静的なstyleと className=\"active:opacity-80\" で押下表現を書く",
        },
      ],
    },
  },
]);
