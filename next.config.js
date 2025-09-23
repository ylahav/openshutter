/** @type {import('next').NextConfig} */

const withBundleAnalyzer = (() => {
  try {
    return require('@next/bundle-analyzer')({
      enabled: process.env.ANALYZE === 'true',
    })
  } catch {
    return (config) => config
  }
})()

const nextConfig = {
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

  // Webpack configuration for optimization
  webpack: (config, { dev, isServer }) => {
    // SVG handling
    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack'],
    })
    
    // Handle other file types
    config.module.rules.push({
      test: /\.(png|jpe?g|gif|webp)$/i,
      type: 'asset/resource',
    })

    // Bundle optimization
    if (!dev && !isServer) {
      // Enable tree shaking
      config.optimization.usedExports = true
      config.optimization.sideEffects = false

      // Split chunks more aggressively
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          // Vendor chunk for large libraries
          vendor: {
            name: 'vendor',
            chunks: 'all',
            test: /[\\/]node_modules[\\/]/,
            priority: 20,
            maxSize: 50000, // 50KB max
          },
          // Common chunk for shared code
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            priority: 10,
            maxSize: 30000, // 30KB max
          },
          // React and Next.js specific
          react: {
            name: 'react',
            test: /[\\/]node_modules[\\/](react|react-dom|next)[\\/]/,
            chunks: 'all',
            priority: 30,
            maxSize: 40000, // 40KB max
          },
          // UI components
          ui: {
            name: 'ui',
            test: /[\\/]node_modules[\\/](@radix-ui|lucide-react|framer-motion)[\\/]/,
            chunks: 'all',
            priority: 25,
            maxSize: 35000, // 35KB max
          }
        }
      }
    }
    
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

  // Experimental features for better performance
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons', 'framer-motion'],
  },

  // Turbopack configuration (replaces experimental.turbo)
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },

  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
}

module.exports = withBundleAnalyzer(nextConfig)
