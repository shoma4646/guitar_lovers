/** @type {import('tailwindcss').Config} */
/**
 * NativeWind v4 のテーマ拡張。
 *
 * 色の正本は `src/shared/theme/tokens.js`。ここでは kebab-case へ変換して展開するだけで、
 * HEX を直接書かない。spacing と radius は Tailwind 側だけの命名体系なのでここに置く。
 * tokens.js を変更したら Metro のキャッシュを落とす（`npx expo start -c`）。
 */
const { colors, toKebabColors } = require("./src/shared/theme/tokens");

module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        ...toKebabColors(colors),
      },

      spacing: {
        base: "4px",
        xs: "8px",
        sm: "12px",
        md: "16px",
        lg: "24px",
        xl: "32px",
        "margin-mobile": "20px",
        "gutter-mobile": "16px",
      },

      borderRadius: {
        DEFAULT: "0.5rem",
        sm: "0.25rem",
        md: "0.75rem",
        lg: "1rem",
        xl: "1.5rem",
        full: "9999px",
      },

      fontFamily: {
        // expo-font で `Inter` 名で登録する想定
        inter: ["Inter"],
        "display-numeric": ["Inter"],
        "headline-xl": ["Inter"],
        "headline-lg": ["Inter"],
        "body-lg": ["Inter"],
        "body-md": ["Inter"],
        "label-sm": ["Inter"],
      },

      fontSize: {
        "display-numeric": [
          "64px",
          {
            lineHeight: "1",
            letterSpacing: "-0.04em",
            fontWeight: "800",
          },
        ],
        "headline-xl": [
          "32px",
          {
            lineHeight: "1.2",
            letterSpacing: "-0.02em",
            fontWeight: "700",
          },
        ],
        "headline-lg": ["24px", { lineHeight: "1.3", fontWeight: "700" }],
        "body-lg": ["18px", { lineHeight: "1.5", fontWeight: "400" }],
        "body-md": ["16px", { lineHeight: "1.5", fontWeight: "400" }],
        "label-sm": [
          "13px",
          {
            lineHeight: "1",
            letterSpacing: "0.02em",
            fontWeight: "600",
          },
        ],
      },

      boxShadow: {
        // Level 1 — カード
        layered: "0 4px 12px rgba(0,0,0,0.03), 0 1px 2px rgba(0,0,0,0.02)",
        // Level 2 — モーダル
        elevated: "0 12px 32px rgba(0,0,0,0.08)",
      },
    },
  },
  plugins: [],
};
