/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './src/pages/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    './src/app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        white: "#FFFFFF",
        gray: {
          100: "#F8F8F8",
          900: "#121212",
        },
        // 기본 색상
        background: {
          light: "#F8F8F8",
          dark: "#121212",
        },
        card: {
          light: "#FFFFFF",
          dark: "#1E1E1E",
        },
        border: {
          light: "#E0E0E0",
          dark: "#333333",
        },
        text: {
          light: "#1E1E1E",
          dark: "#EAEAEA",
        },
        // 포인트 컬러
        primary: "#4A90E2",
        accent: "#E63946",
        secondary: "#F4A261",
        neon: "#9b5de5",
      },
      backgroundImage: {
        'gradient-blue': 'linear-gradient(to right, #4A90E2, #1E3A8A)',
        'gradient-neon': 'linear-gradient(135deg, #ff007f, #7400b8)',
        'gradient-brown': 'linear-gradient(to bottom, #654321, #D2B48C)',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} 