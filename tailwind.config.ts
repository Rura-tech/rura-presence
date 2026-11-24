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
        // ── Les seize couleurs ───────────────────────────────────────────
        orange: "#FF4E17",
        saumon: "#FDC6AE",
        orange2: "#FD8A46",
        jaune2: "#FAD02C",
        bleu: "#CAD5FE",
        noir: "#2B2B2B",
        creme: "#F0EDE4",
        blanc2: "#F4F4F4",
        rouge: "#E6311B",
        vert: "#6DD193",
        blanc: "#FFFFFF",
        black100: "#010101",
        black60: "#808080",
        "gris-disabled": "#D8D8D8",
        contour: "#D8D8D8",
        // Le piège assumé : bg-white rend Blanc2, le blanc pur est bg-blanc.
        white: "#F4F4F4",
      },
      borderRadius: {
        champ: "4px",
        carte: "8px",
        bloc: "24px",
        rond: "9999px",
      },
      fontFamily: {
        sans: ["var(--font-atkinson)", "sans-serif"],
        title: ["var(--font-inter)", "sans-serif"],
        editorial: ["var(--font-playfair)", "serif"],
        // Montserrat pas encore embarquée : l'Overline emprunte Inter.
        overline: ["var(--font-inter)", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
