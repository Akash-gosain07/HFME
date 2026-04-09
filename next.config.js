/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Disabled in dev: Strict Mode double-mounts components, creating two
  // simultaneous SSE EventSource connections which fight each other and
  // cause the "reconnecting" loop in the live dashboard.
  reactStrictMode: false,
  serverExternalPackages: ['@prisma/client', 'bcryptjs', 'ioredis'],
};

module.exports = nextConfig;
