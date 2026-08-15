/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        jaama: {
          50: "#f0f4ff",
          100: "#e0e9ff",
          200: "#c7d7fe",
          300: "#a4bdfe",
          400: "#7a9afd",
          500: "#5171fc",
          600: "#002b9a", // Official JAAMA Royal Navy
          700: "#00227b",
          800: "#001a61",
          900: "#06183b",
          950: "#0b1936",
        },
      },
      fontFamily: {
        sans: ["var(--font-plus-jakarta)", "system-ui", "-apple-system", "sans-serif"],
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(0, 43, 154, 0.06)',
        'card': '0 1px 3px 0 rgba(15, 23, 42, 0.03), 0 1px 2px -1px rgba(15, 23, 42, 0.03)',
        'card-hover': '0 10px 25px -5px rgba(0, 43, 154, 0.08), 0 8px 10px -6px rgba(0, 43, 154, 0.04)',
      }
    },
  },
  plugins: [],
};
