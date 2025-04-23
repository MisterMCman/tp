module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}', // Include all app directory files
    './components/**/*.{js,ts,jsx,tsx}', // Include all components
    './pages/**/*.{js,ts,jsx,tsx}', // If using the pages directory
    './src/**/*.{js,ts,jsx,tsx}', // Include all src directory files
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#4361ee', // Primary blue
          600: '#3a56d4', // Hover state
          700: '#2948c7',
          800: '#1e3a8a',
          900: '#1e3a8a',
        },
        secondary: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
        },
      },
    },
  },
  plugins: [],
};
