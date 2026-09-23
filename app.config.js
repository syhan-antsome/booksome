const { expo } = require('./app.json');

module.exports = {
  ...expo,
  web: { ...expo.web, output: 'single', bundler: 'metro' },
  experiments: { ...expo.experiments, ...(process.env.BOOKSOME_WEB_EXPORT === 'true' ? { baseUrl: '/app' } : {}) },
};
