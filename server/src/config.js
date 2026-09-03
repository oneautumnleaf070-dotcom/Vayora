// Loads runtime configuration from environment variables (populated by
// docker-compose or a local .env file via dotenv). Mirrors the Go version's
// internal/config/config.go field-for-field, port default changed to 5000
// per the Node/Express rebuild.
require('dotenv').config();

function getEnv(key, fallback) {
  const v = process.env[key];
  return v !== undefined && v !== '' ? v : fallback;
}

const config = {
  port: getEnv('PORT', '5000'),
  databaseUrl: getEnv(
    'DATABASE_URL',
    'postgres://postgres:vayora_dev@localhost:5432/vayora?sslmode=disable'
  ),
  jwtSecret: getEnv('JWT_SECRET', 'vayora-dev-secret-change-in-production'),
  otpMockMode: getEnv('OTP_MOCK_MODE', 'true') === 'true',
  corsOrigin: getEnv('CORS_ORIGIN', '*'),
  environment: getEnv('ENVIRONMENT', 'development'),
};

module.exports = config;
