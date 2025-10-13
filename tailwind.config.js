export default {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./popup.html",
  ],
  theme: {
    extend: {
      colors: {
        'compre-purple': {
          500: '#667eea',
          600: '#764ba2',
        },
      },
    },
  },
  plugins: [],
  // important: "#compre-ai-root"
};
