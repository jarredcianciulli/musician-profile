/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "var(--color-ink)",
        "ink-soft": "var(--color-ink-soft)",
        paper: "var(--color-paper)",
        "paper-muted": "var(--color-paper-muted)",
        sky: "var(--color-sky)",
        "sky-deep": "var(--color-sky-deep)",
        gold: "var(--color-gold)",
        "gold-deep": "var(--color-gold-deep)",
        accent: "var(--color-accent)",
        "accent-hover": "var(--color-accent-hover)",
        line: "var(--color-line)",
        muted: "var(--color-muted)",
        // Keep legacy keys mapped so older sections don't break while we migrate
        primary: {
          50: "var(--color-paper)",
          100: "var(--color-paper-muted)",
          200: "var(--color-line)",
          300: "var(--color-gold)",
          400: "var(--color-gold-deep)",
          500: "var(--color-ink-soft)",
          600: "var(--color-ink)",
          700: "var(--color-ink)",
          800: "var(--color-ink)",
          900: "var(--color-ink)",
        },
        burgundy: {
          50: "#fef2f2",
          100: "#fee2e2",
          200: "#fecaca",
          300: "#fca5a5",
          400: "#f87171",
          500: "#ef4444",
          600: "var(--color-accent)",
          700: "var(--color-accent-hover)",
          800: "#6B1A1A",
          900: "#5C1616",
        },
      },
      fontFamily: {
        sans: ["Source Sans 3", "system-ui", "sans-serif"],
        display: ["Cormorant Garamond", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};
