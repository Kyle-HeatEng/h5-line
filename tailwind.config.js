/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#00C300",
        "primary-hover": "#00B300",
        secondary: "#80868B",
        "line-green": "#00C300",
        "line-black": "#000000",
        "line-white": "#FFFFFF",
        "line-dark-gray": "#202124",
        "line-gray": "#80868B",
        "line-light-gray": "#F1F3F4",
        "line-blue": "#007AFF",
        "line-red": "#FF3B30",
        "line-yellow": "#FFCC00",
      },
      spacing: {
        section: "2rem",
      },
      borderRadius: {
        container: "0.75rem",
      },
    },
  },
  plugins: [],
}
