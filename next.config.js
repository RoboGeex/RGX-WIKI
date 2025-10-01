/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  // Remove standalone output for Vercel deployment
  // output: 'standalone',
  experimental: {
    outputFileTracingRoot: undefined,
  },
  // Disable source maps in production for smaller builds
  productionBrowserSourceMaps: false,
  // Optimize for static hosting
  trailingSlash: false,
  // Disable x-powered-by header
  poweredByHeader: false,
  // Add redirects for better routing
  async redirects() {
    return [
      {
        source: '/',
        destination: '/en/student-kit',
        permanent: false,
      },
    ]
  },
}

module.exports = nextConfig
