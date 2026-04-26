/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    outputFileTracingRoot: undefined,
    serverComponentsExternalPackages: ['ssh2', 'ssh2-sftp-client'],
    // Allow large uploads (up to 20 MB) as per GCP migration notes
    serverActions: {
      bodySizeLimit: '20mb',
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
