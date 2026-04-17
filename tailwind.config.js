/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        "bg-dark": "#0B0F19",
        "bg-light-dark": "#151A26",
        "bg-gray": "#2A3040",
        primary: "#6C63FF",
        secondary: "#00E5FF",
        error: "#FF5252",
        "text-white": "#FFFFFF",
        "text-gray": "#8F9BB3",
        "text-light-gray": "#C5CEE0",
        "glass-border": "rgba(255,255,255,0.2)",
        "glass-surface": "rgba(255,255,255,0.1)",
      },
    },
  },
  plugins: [],
};
