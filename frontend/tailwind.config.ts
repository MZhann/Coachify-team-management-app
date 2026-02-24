import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        coachify: {
          sidebar: "#1e3a5f",
          sidebarHover: "#2a4a6f",
          primary: "#2563eb",
          accent: "#f59e0b",
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;

