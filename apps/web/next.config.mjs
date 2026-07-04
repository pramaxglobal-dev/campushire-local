/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  compress: true,
  poweredByHeader: false,
  transpilePackages: ["@campushire/ui", "@campushire/types", "@campushire/utils"],
  eslint: {
    ignoreDuringBuilds: true
  },
  images: {
    formats: ["image/avif", "image/webp"],
    domains: [
      "your-s3-bucket.s3.ap-south-1.amazonaws.com",
      "lh3.googleusercontent.com",
      "media.licdn.com"
    ],
    remotePatterns: [{ protocol: "https", hostname: "**.amazonaws.com" }]
  },
  experimental: { typedRoutes: false },
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-XSS-Protection", value: "1; mode=block" }
      ]
    }
  ]
};

export default nextConfig;
