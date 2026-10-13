import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // Paleta inspirada en Magneto: azul noche corporativo + menta para acciones.
      // Neutros: slate de Tailwind (900 #0F172A, 800 #1E293B, 700 #334155, 500 #64748B, 50 #F8FAFC).
      colors: {
        marca: { DEFAULT: "#0F172A", claro: "#1E293B" },
        acento: {
          DEFAULT: "#00D2A2",
          hover: "#00BA90",
          suave: "#E6FAF5",
          // Variante oscura para texto sobre blanco (el menta puro no da contraste).
          texto: "#047857",
        },
      },
    },
  },
  plugins: [],
};

export default config;
