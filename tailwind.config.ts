import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          50: "#e6f6f9",
          100: "#ccedf2",
          200: "#99dbe6",
          300: "#66c9d9",
          400: "#33b7cc",
          500: "#00a5bf", // Primary teal color
          600: "#008499",
          700: "#006373",
          800: "#00424c",
          900: "#002126",
        },
        secondary: {
          50: "#e6eef3",
          100: "#ccdde8",
          200: "#99bbd0",
          300: "#6699b9",
          400: "#3377a1",
          500: "#00558a", // Secondary blue color 
          600: "#004470",
          700: "#003353",
          800: "#002237",
          900: "#00111c",
        },
        gray: {
          50: "#f9fafb",
          100: "#f3f4f6",
          200: "#e5e7eb",
          300: "#d1d5db",
          400: "#9ca3af",
          500: "#6b7280",
          600: "#4b5563",
          700: "#374151",
          800: "#1f2937",
          900: "#111827",
        },
      },
    },
  },
  plugins: [],
};
export default config;
