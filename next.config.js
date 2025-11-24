/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    outputFileTracingRoot: undefined,
    serverComponentsExternalPackages: ['ssh2', 'ssh2-sftp-client'],
  },
  // Disable source maps in production for smaller builds
  productionBrowserSourceMaps: false,
  // Optimize for static hosting
  trailingSlash: false,
  // Disable x-powered-by header
  poweredByHeader: false,
  webpack: (config) => {
    config.externals = config.externals || []
    config.externals.push({
      'ssh2-sftp-client': 'commonjs ssh2-sftp-client',
      ssh2: 'commonjs ssh2',
    })
    return config
  },
}

module.exports = nextConfig
