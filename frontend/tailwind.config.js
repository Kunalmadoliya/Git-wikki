/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Poppins", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        display: ["Poppins", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      colors: {
        brand: {
          50: "#EFF6FF",
          100: "#DBEAFE",
          500: "#3B82F6",
          600: "#2563EB",
          700: "#1D4ED8",
        },
      },
      borderRadius: {
        'bento': '16px',
        'bento-lg': '24px',
      },
      backgroundImage: {
        'dot-grid': 'radial-gradient(rgba(148, 163, 184, 0.15) 1.5px, transparent 1.5px)',
        'dot-grid-dense': 'radial-gradient(rgba(148, 163, 184, 0.25) 1px, transparent 1px)',
      },
      backgroundSize: {
        'dot-24': '24px 24px',
        'dot-16': '16px 16px',
      },
    },
  },
  plugins: [],
}
