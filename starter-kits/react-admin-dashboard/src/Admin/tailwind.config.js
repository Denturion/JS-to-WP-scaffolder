/** @type {import('tailwindcss').Config} */
module.exports = {
  // Scope Tailwind to only the plugin's admin wrapper to avoid conflicts
  // with WordPress core styles. Every Tailwind utility will be prefixed
  // with .react-admin-dashboard-app so it can't leak into WP's own UI.
  important: '.react-admin-dashboard-app',

  content: [
    './src/**/*.{js,jsx,ts,tsx}',
  ],

  // Safelist dynamic classes (e.g. bg-blue-600 set from PHP settings)
  safelist: [
    { pattern: /^bg-(slate|gray|red|orange|yellow|green|blue|indigo|purple|pink)-[0-9]+$/ },
    { pattern: /^text-(slate|gray|red|orange|yellow|green|blue|indigo|purple|pink)-[0-9]+$/ },
    { pattern: /^border-(slate|gray|red|orange|yellow|green|blue|indigo|purple|pink)-[0-9]+$/ },
  ],

  theme: {
    extend: {
      // Override WordPress admin's font stack
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['"SFMono-Regular"', 'Consolas', '"Liberation Mono"', 'monospace'],
      },
    },
  },

  plugins: [],
};
