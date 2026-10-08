export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    url: process.env.DATABASE_URL,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  },
  cors: {
    origins: (process.env.CORS_ORIGIN || '')
      .split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0),
  },
  trustProxyHops: parseInt(process.env.TRUST_PROXY_HOPS || '0', 10),
  auth: {
    throttleLimit: parseInt(process.env.AUTH_RATE_LIMIT || '10', 10),
    throttleTtl: parseInt(process.env.AUTH_RATE_LIMIT_TTL || '60000', 10),
  },
});
