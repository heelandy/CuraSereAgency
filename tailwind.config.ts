import type { Config } from "tailwindcss";

/**
 * Brand palette derived from the Cura_Sera / HomeWell UI:
 * teal/green "compassionate care" tones on warm neutral surfaces.
 * Re-theming the whole app = change `brand` + `surface` here and the
 * component classes in globals.css.
 */
const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#effaf6",
          100: "#d8f1e6",
          200: "#b3e3ce",
          300: "#82cdb0",
          400: "#4fb08e",
          500: "#2d9472",
          600: "#1f775c", // primary teal (buttons, headers)
          700: "#1b5f4b",
          800: "#194c3d",
          900: "#163f34",
          950: "#0a241e",
        },
        surface: {
          50: "#fbfaf8",
          100: "#f5f3ef",
          200: "#ebe7e0",
          300: "#dcd6cb",
          400: "#b8afa1",
          500: "#938a7b",
          600: "#736b5e",
          700: "#5b554b",
          800: "#3d3933",
          900: "#28251f",
        },
        accent: {
          rose: "#e9a8a8",
          amber: "#e6b566",
          sky: "#7fb6c9",
          violet: "#a899c9",
        },
      },
      borderRadius: {
        xl: "0.9rem",
        "2xl": "1.25rem",
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,40,34,0.04), 0 8px 24px -12px rgba(16,40,34,0.12)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
