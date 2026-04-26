import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "#0a0a0a",
        "bg-secondary": "#111111",
        card: "#161616",
        "card-hover": "#1c1c1c",
        "bg-elevated": "#1a1a1a",
        foreground: "#f5f5f5",
        "text-secondary": "#a3a3a3",
        "text-muted": "#666666",
        "text-faint": "#404040",
        accent: "#ffffff",
        danger: "#ef4444",
        warning: "#eab308",
        safe: "#22c55e",
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        serif: ["Playfair Display", "Georgia", "serif"],
        mono: ["JetBrains Mono", "SF Mono", "monospace"],
      },
      borderRadius: {
        "2xl": "16px",
        "3xl": "20px",
      },
    },
  },
  plugins: [],
};
export default config;
