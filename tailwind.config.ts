import { type Config } from "tailwindcss";
import { fontFamily } from "tailwindcss/defaultTheme";
import typography from "@tailwindcss/typography";

export default {
  content: ["./src/**/*.tsx"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-geist-sans)", ...fontFamily.sans],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      colors: {
        background: "#0a0a0f",
        foreground: "#fafafa",
        card: {
          DEFAULT: "rgba(17, 17, 27, 0.8)",
          hover: "rgba(24, 24, 37, 0.9)",
        },
        primary: {
          50: "#f0f9ff",
          100: "#e0f2fe",
          200: "#bae6fd",
          300: "#7dd3fc",
          400: "#38bdf8",
          500: "#0ea5e9",
          600: "#0284c7",
          700: "#0369a1",
          800: "#075985",
          900: "#0c4a6e",
          950: "#082f49",
        },
        accent: {
          DEFAULT: "#8b5cf6",
          light: "#a78bfa",
          dark: "#7c3aed",
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-glass': 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(139, 92, 246, 0.5), 0 0 20px rgba(139, 92, 246, 0.3)' },
          '100%': { boxShadow: '0 0 10px rgba(139, 92, 246, 0.8), 0 0 30px rgba(139, 92, 246, 0.5)' },
        },
      },
      typography: {
        invert: {
          css: {
            "--tw-prose-body": "rgba(229, 231, 235, 0.9)",
            "--tw-prose-headings": "#f3f4f6",
            "--tw-prose-links": "#8b5cf6",
            "--tw-prose-links-hover": "#a78bfa",
            "--tw-prose-bold": "#f3f4f6",
            "--tw-prose-counters": "#9ca3af",
            "--tw-prose-bullets": "#6b7280",
            "--tw-prose-hr": "rgba(75, 85, 99, 0.3)",
            "--tw-prose-quote-borders": "#8b5cf6",
            "--tw-prose-captions": "#9ca3af",
            "--tw-prose-code": "#f3f4f6",
            "--tw-prose-code-bg": "rgba(31, 41, 55, 0.5)",
            "--tw-prose-pre-code": "#e5e7eb",
            "--tw-prose-pre-bg": "rgba(17, 17, 27, 0.9)",
            "--tw-prose-pre-border": "rgba(75, 85, 99, 0.3)",
            "--tw-prose-th-borders": "rgba(75, 85, 99, 0.3)",
            "--tw-prose-td-borders": "rgba(55, 65, 81, 0.3)",
          },
        },
      },
    },
  },
  plugins: [require("tailwind-scrollbar"), typography],
} satisfies Config;
