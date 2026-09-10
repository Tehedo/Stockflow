import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#0B1220",
          800: "#121B2E",
          700: "#1A2438",
          600: "#243149",
          500: "#3A4C6B",
          400: "#5B6E8C",
          300: "#8996AD",
          200: "#AEB8CB",
          100: "#D6DBE5",
        },
        brand: {
          50: "#EFFBF9",
          100: "#D6F3EE",
          200: "#ACE6DC",
          300: "#78D3C3",
          400: "#43B8A6",
          500: "#22998A",
          600: "#157A6F",
          700: "#0F6259",
          800: "#0F4F49",
          900: "#0C3F3B",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          muted: "#F6F7F9",
          subtle: "#F0F2F5",
        },
        border: {
          DEFAULT: "#E4E7EC",
          strong: "#D0D5DD",
        },
        ok: { DEFAULT: "#15803D", bg: "#E7F6ED" },
        warn: { DEFAULT: "#B45309", bg: "#FEF3E2" },
        danger: { DEFAULT: "#B91C1C", bg: "#FDECEC" },
        info: { DEFAULT: "#1D4ED8", bg: "#EAF0FE" },
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 1px 2px 0 rgba(11, 18, 32, 0.04), 0 1px 6px -1px rgba(11, 18, 32, 0.06)",
        pop: "0 12px 32px -8px rgba(11, 18, 32, 0.22)",
      },
      borderRadius: {
        lg: "10px",
        xl: "14px",
      },
    },
  },
  plugins: [],
};

export default config;
