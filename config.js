module.exports = {
  proxyPort: process.env.PROXY_PORT ? Number(process.env.PROXY_PORT) : 8080,
  uiPort: process.env.UI_PORT ? Number(process.env.UI_PORT) : 8081,
  target: process.env.TARGET || 'https://api.enable3.io',
  maxLogSize: 200,
};
