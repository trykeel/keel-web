import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ['@tremor/react', 'lucide-react'],
  },
}

export default nextConfig
