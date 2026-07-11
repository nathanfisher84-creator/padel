import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Racquet-club professional palette: pine/club greens, warm bone
        // neutrals, cream background and a padel-ball chartreuse accent.
        // `court` is the brand green scale, `ball` the accent, and `slate`
        // is overridden with warm stone greys so the whole UI inherits it.
        court: {
          50: "#f1f7f2",
          100: "#e0ede3",
          200: "#c2dbc9",
          300: "#9ac2a7",
          400: "#6da583",
          500: "#4b8765",
          600: "#35704f",
          700: "#2a5a40",
          800: "#234a36",
          900: "#1d3d2d",
          950: "#10241a",
        },
        ball: {
          300: "#e6ef86",
          400: "#dce75f",
          500: "#cfe23f",
          600: "#7c8f0e",
        },
        slate: {
          50: "#f7f6f1",
          100: "#efede4",
          200: "#e3dfd2",
          300: "#cfc9b8",
          400: "#a49d8a",
          500: "#7f7867",
          600: "#665f50",
          700: "#4f483c",
          800: "#37322a",
          900: "#23201a",
          950: "#161410",
        },
        cream: {
          50: "#fcfaf4",
          100: "#f8f4e9",
          200: "#f1ead7",
        },
        bone: {
          100: "#f0ece0",
          200: "#e5decd",
          300: "#d8cfba",
        },
        white: "#fffefa",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
