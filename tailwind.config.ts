import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Padel court blue + ball lime.
        court: {
          50: "#eef7ff",
          100: "#d9edff",
          200: "#bce0ff",
          300: "#8ecdff",
          400: "#59b0ff",
          500: "#338eff",
          600: "#1b6ef5",
          700: "#1457e1",
          800: "#1747b6",
          900: "#193f8f",
          950: "#142857",
        },
        ball: {
          400: "#c8f230",
          500: "#aadd12",
          600: "#84b309",
        },
      },
    },
  },
  plugins: [],
};
export default config;
