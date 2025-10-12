/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use standalone for Docker builds, but not for Cloudflare
  output: process.env.BUILDING_FOR_CLOUDFLARE ? undefined : 'standalone',
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },
  // Skip collecting page data for API routes during build
  // This prevents database connection errors at build time
  staticPageGenerationTimeout: 1000,

  // Optimise for containerised development with webpack configuration
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      }
    }
    return config
  },
}

module.exports = nextConfig