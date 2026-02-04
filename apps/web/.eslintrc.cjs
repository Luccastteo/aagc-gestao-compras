module.exports = {
  root: true,
  extends: ['next/core-web-vitals', 'plugin:jsx-a11y/recommended'],
  plugins: ['jsx-a11y'],
  rules: {
    // Ajustes práticos pro MVP (sem deixar de alertar o essencial)
    'jsx-a11y/anchor-is-valid': 'off', // Next <Link> patterns variam
  },
};

