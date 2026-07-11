import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Warm editorial palette: light pink, bone and cream.
        // `court` is the brand scale (rosewood → deep plum), `ball` the
        // blush-pink accent, and `slate` is overridden with bone-toned
        // warm greys so the whole UI inherits the palette.
        court: {
          50: "#fdf7f5",
          100: "#faedea",
          200: "#f5dcd6",
          300: "#edc3bc",
          400: "#de9d96",
          500: "#c97b76",
          600: "#b25e5e",
          700: "#96484d",
          800: "#7a3a42",
          900: "#5c2d36",
          950: "#2e181d",
        },
        ball: {
          400: "#f4c6cf",
          500: "#efb2bf",
          600: "#c9798d",
        },
        slate: {
          50: "#faf7f1",
          100: "#f3eee4",
          200: "#e7dfd1",
          300: "#d6cbb8",
          400: "#a99c87",
          500: "#857a67",
          600: "#6b6152",
          700: "#55493d",
          800: "#3b322a",
          900: "#2a231d",
          950: "#1c1712",
        },
        cream: {
          50: "#fdfbf4",
          100: "#fbf5e9",
          200: "#f6ecd8",
        },
        bone: {
          100: "#f2ede1",
          200: "#e8e0d2",
          300: "#ddd3c0",
        },
        white: "#fffdf8",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};
export default config;
