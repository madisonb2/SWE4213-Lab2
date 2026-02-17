const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { rateLimit } = require('express-rate-limit');

const app = express();
const PORT = 3000;
const SECRET_KEY = "lab2_secret_key";
const limiter = rateLimit({
  windowMs: 15*60*1000, 
  limit: 100, 
  standardHeaders: true, 
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({message: "Too many requests.", "Retry-After": Math.round(req.rateLimit.resetTime / 1000)})
  }});

app.use(limiter);

function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) {
    return res.status(401).json({error: "Missing authorization header."});
  }

  const [scheme, token] = header.split(" ");
  if (!token) {
    return res.status(401).json({error: "Missing token"});
  }

  if (token !== SECRET_KEY) {
    return res.status(401).json({error: "Invalid token."});
  }

  next();

}

app.use(auth);

// Proxy routes to microservices
app.use('/api/users', createProxyMiddleware({
  target: 'http://user-service:3001',
  changeOrigin: true,
  pathRewrite: { '^/api/users': '/users' },
}));

app.use('/api/products', createProxyMiddleware({
  target: 'http://product-service:3002',
  changeOrigin: true,
  pathRewrite: { '^/api/products': '/products' },
}));

app.use('/api/orders', createProxyMiddleware({
  target: 'http://order-service:3003',
  changeOrigin: true,
  pathRewrite: { '^/api/orders': '/orders' },
}));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'Gateway is running' });
});

app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
});
