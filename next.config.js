/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Use serverExternalPackages to prevent bundling libsql packages on client-side
  serverExternalPackages: ['@libsql/client', '@prisma/adapter-libsql', 'libsql'],
  
  // Security: Block test files in production
  async redirects() {
    if (process.env.NODE_ENV === 'production') {
      return [
        {
          source: '/test-activities.html',
          destination: '/404',
          permanent: false,
        },
        {
          source: '/test-:path*.html',
          destination: '/404', 
          permanent: false,
        }
      ];
    }
    return [];
  },
}

module.exports = nextConfig
