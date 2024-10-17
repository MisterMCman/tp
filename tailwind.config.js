/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx}', // Füge den Pfad zum App-Verzeichnis hinzu
    './src/components/**/*.{js,ts,jsx,tsx}', // Falls du einen Components-Ordner hast
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
