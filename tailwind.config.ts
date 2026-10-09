import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        "primary-hover": "hsl(var(--primary-hover))",
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        info: "hsl(var(--info))",
        warning: "hsl(var(--warning))",
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar))",
          foreground: "hsl(var(--sidebar-foreground))",
        },
        tertiary: "#696969",
      },
      fontFamily: {
        sans: ["var(--font-body)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-body)", "ui-sans-serif", "sans-serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(.22,1,.36,1)",
      },
      keyframes: {
        "rise-in": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "none" },
        },
        "view-in": {
          from: { opacity: "0", transform: "translateY(14px) scale(.992)", filter: "blur(6px)" },
          to: { opacity: "1", transform: "none", filter: "blur(0)" },
        },
        "sheet-in": {
          from: { opacity: "0", transform: "translateY(24px) scale(.97)" },
          to: { opacity: "1", transform: "none" },
        },
        "modal-in": {
          from: { opacity: "0", transform: "translateY(16px) scale(.96)" },
          to: { opacity: "1", transform: "none" },
        },
        "scrim-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "cover-in": {
          from: { opacity: "0", backdropFilter: "blur(0)" },
          to: { opacity: "1", backdropFilter: "blur(8px)" },
        },
        "bar-grow": {
          from: { transform: "scaleY(0)" },
          to: { transform: "scaleY(1)" },
        },
        "bar-grow-x": {
          from: { transform: "scaleX(0)" },
          to: { transform: "scaleX(1)" },
        },
        shimmer: { to: { transform: "translateX(100%)" } },
        float: { "50%": { transform: "translateY(-9px)" } },
      },
      animation: {
        "rise-in": "rise-in .5s cubic-bezier(.22,1,.36,1) both",
        "view-in": "view-in .5s cubic-bezier(.22,1,.36,1) both",
        "sheet-in": "sheet-in .45s cubic-bezier(.22,1,.36,1) both",
        "modal-in": "modal-in .45s cubic-bezier(.22,1,.36,1) both",
        "scrim-in": "scrim-in .25s cubic-bezier(.4,0,.2,1) both",
        "cover-in": "cover-in .45s cubic-bezier(.4,0,.2,1) both",
        shimmer: "shimmer 1.5s infinite",
        float: "float 5.5s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
