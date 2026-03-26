/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'ink-black': '#01161E',
        'dark-teal': '#124559',
        'air-force-blue': '#598392',
        'ash-grey': '#AEC3B0',
        'ash-grey-pale': '#D8EAD3',
        'beige': '#EFF6E0',
      },
    },
  },
  plugins: [],
}

