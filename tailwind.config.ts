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
        // CSS-variable-backed so a single per-agency primary color re-themes the
        // entire app at runtime (white-label). Channel format preserves Tailwind
        // alpha utilities (bg-brand-600/50). Defaults live in globals.css :root;
        // per-agency overrides are emitted by <BrandStyle/>.
        brand: {
          50: "rgb(var(--brand-50) / <alpha-value>)",
          100: "rgb(var(--brand-100) / <alpha-value>)",
          200: "rgb(var(--brand-200) / <alpha-value>)",
          300: "rgb(var(--brand-300) / <alpha-value>)",
          400: "rgb(var(--brand-400) / <alpha-value>)",
          500: "rgb(var(--brand-500) / <alpha-value>)",
          600: "rgb(var(--brand-600) / <alpha-value>)", // primary
          700: "rgb(var(--brand-700) / <alpha-value>)",
          800: "rgb(var(--brand-800) / <alpha-value>)",
          900: "rgb(var(--brand-900) / <alpha-value>)",
          950: "rgb(var(--brand-950) / <alpha-value>)",
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
