/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        sticky: {
          yellow: "#fff9c4",
          orange: "#ffe0b2",
          green: "#c8e6c9",
          blue: "#bbdefb",
          pink: "#f8bbd0",
        },
      },
      fontFamily: {
        sans: ["Microsoft YaHei", "PingFang SC", "sans-serif"],
      },
    },
  },
  plugins: [],
};
