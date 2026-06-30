import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // ShieldGrid brand palette
        brand: {
          50: "#eef3ff",
          100: "#dce7ff",
          200: "#b2ccff",
          300: "#7aa8ff",
          400: "#4080ff",
          500: "#1a5cff",  // primary
          600: "#0040f0",
          700: "#0030c0",
          800: "#002899",
          900: "#001a66",
          950: "#000f3d",
        },
        threat: {
          critical: "#dc2626",
          high: "#ea580c",
          medium: "#d97706",
          low: "#65a30d",
          info: "#0891b2",
        },
      },
      fontFamily: {
        sans: ["Inter var", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Menlo", "monospace"],
      },
      borderRadius: {
        lg: "0.625rem",
        md: "0.5rem",
        sm: "0.375rem",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};

export default config;
