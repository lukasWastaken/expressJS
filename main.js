const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

// Proxy für Webseiten-Server
app.use('/', createProxyMiddleware({
  target: 'http://localhost:3001',
  changeOrigin: true,
  pathRewrite: { '^/': '/' }
}));

// Proxy für Datei-Server
app.use('/files', createProxyMiddleware({
  target: 'http://localhost:3002',
  changeOrigin: true,
  pathRewrite: { '^/files': '/' }
}));

// Proxy für Auth-Server
app.use('/auth', createProxyMiddleware({
  target: 'http://localhost:3003',
  changeOrigin: true,
  pathRewrite: { '^/auth': '/' }
}));

app.listen(3000, () => {
  console.log('Load Balancer running on http://localhost:3000');
});
