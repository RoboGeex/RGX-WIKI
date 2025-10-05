/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    outputFileTracingRoot: undefined,
  },
  // Disable source maps in production for smaller builds
  productionBrowserSourceMaps: false,
  // Optimize for static hosting
  trailingSlash: false,
  // Disable x-powered-by header
  poweredByHeader: false,
}

module.exports = nextConfig
