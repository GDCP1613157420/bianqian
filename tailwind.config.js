/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        sticky: {
          yellow: "#fdf6e3", // 柔和米黄（降饱和度）
          orange: "#f5e6d3",
          green: "#e8f0e0",
          blue: "#e0e8f0",
          pink: "#f0e0e8",
          purple: "#e8e0f0",
        },
      },
      fontFamily: {
        sans: ["Microsoft YaHei", "PingFang SC", "sans-serif"],
      },
    },
  },
  plugins: [],
};
