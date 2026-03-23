import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "#FF4E17",
          contrast: "#2B2B2B",
          text: "#2B2B2B",
          bg: "#F0EDE4",
          surface: "#FFFFFF",
          error: "#E6311B",
          success: "#6DD193",
          alert: "#FAD02C",
          "white-soft": "#F4F4F4",
          orange2: "#FD8A46",
          saumon: "#FDC6AE",
          blue: "#CAD5FE",
        },
      },
      fontFamily: {
        sans: ["var(--font-atkinson)", "sans-serif"],
        title: ["var(--font-inter)", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
