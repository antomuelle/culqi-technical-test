/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        culqi: {
          a: "#763383",
          b: "#00A19B",
          c: "#EB6F25",
          d: "#F5A800",
        }
      },
    },
  },
  plugins: [],
}

