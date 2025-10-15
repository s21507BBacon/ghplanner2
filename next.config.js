/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use standalone for Docker builds, but not for Cloudflare
  output: process.env.BUILDING_FOR_CLOUDFLARE ? undefined : 'standalone',
  // Disable image optimization for Cloudflare Pages
  images: {
    unoptimized: process.env.BUILDING_FOR_CLOUDFLARE === 'true',
  },
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
    // For Cloudflare builds, disable ISR cache
    ...(process.env.BUILDING_FOR_CLOUDFLARE === 'true' && {
      isrMemoryCacheSize: 0,
    }),
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