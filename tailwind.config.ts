import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Boutique racquet-club palette: dusty rose brand tones over warm
        // bone neutrals and a cream background, with a champagne-gold
        // accent. `court` is the brand rose scale, `ball` the gold accent,
        // and `slate` is overridden with warm stone greys so the whole UI
        // inherits it.
        court: {
          50: "#fbf4f5",
          100: "#f7e8ea",
          200: "#f0d4d8",
          300: "#e3b4bc",
          400: "#d18d99",
          500: "#bc6a7a",
          600: "#a45162",
          700: "#884050",
          800: "#713744",
          900: "#60303b",
          950: "#38181f",
        },
        ball: {
          300: "#eedcb2",
          400: "#e4ca90",
          500: "#d9b873",
          // 600 is used only as text on light surfaces; dark bronze keeps
          // WCAG AA (~6:1 on white / cream). The champagne accent
          // background stays ball-500.
          600: "#7d6234",
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
        display: ["var(--font-display)", "Georgia", "serif"],
      },
      keyframes: {
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
      },
      animation: {
        marquee: "marquee 30s linear infinite",
      },
    },
  },
  plugins: [],
};
export default config;
