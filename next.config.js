/** @type {import('next').NextConfig} */

// Debug logging for environment variables
console.log('🔍 Next.js Config Debug:')
console.log('  - MONGODB_URI:', process.env.MONGODB_URI)
console.log('  - MONGODB_DB:', process.env.MONGODB_DB)
console.log('  - NODE_ENV:', process.env.NODE_ENV)
console.log('  - All env vars:', Object.keys(process.env).filter(key => key.includes('MONGODB')))

const nextConfig = {
  // Remove swcMinify as it's deprecated in Next.js 15
  // Remove experimental.turbo as it's deprecated
  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'drive.google.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
    ],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Environment variables are handled at runtime by Docker Compose

  // Webpack configuration for SVG handling
  webpack: (config) => {
    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack'],
    })
    
    // Handle other file types
    config.module.rules.push({
      test: /\.(png|jpe?g|gif|webp)$/i,
      type: 'asset/resource',
    })
    
    return config
  },

  // TypeScript and ESLint
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },

  // Output and optimization
  output: 'standalone',
  outputFileTracingRoot: process.cwd(),
  trailingSlash: false,
  reactStrictMode: true,
}

module.exports = nextConfig
