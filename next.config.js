/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Use serverExternalPackages to prevent bundling libsql packages on client-side
  serverExternalPackages: ['@libsql/client', '@prisma/adapter-libsql', 'libsql'],
}

module.exports = nextConfig
