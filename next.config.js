/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    outputFileTracingRoot: undefined,
    serverComponentsExternalPackages: ['ssh2', 'ssh2-sftp-client'],
    // Allow large video uploads (up to 500 MB) without 413 Payload Too Large errors
    serverActions: {
      bodySizeLimit: '500mb',
    },
  },
  // Disable source maps in production for smaller builds
  productionBrowserSourceMaps: false,
  // Optimize for static hosting
  trailingSlash: false,
  // Disable x-powered-by header
  poweredByHeader: false,
  webpack: (config, { dev }) => {
    config.externals = config.externals || []
    config.externals.push({
      'ssh2-sftp-client': 'commonjs ssh2-sftp-client',
      ssh2: 'commonjs ssh2',
    })

    if (dev) {
      config.watchOptions = {
        ...(config.watchOptions || {}),
        ignored: [
          // Defaults
          '**/node_modules/**',
          '**/.git/**',
          '**/.next/**',
          // Custom: Ignore public uploads to prevent reloads
          '**/public/uploads/**',
        ],
      }
    }

    return config
  },
}

module.exports = nextConfig
